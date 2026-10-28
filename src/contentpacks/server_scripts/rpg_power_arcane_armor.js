// RPG Power - Arcane Armor
// Every caster tome gets a native first spell (rpg_power:armor_<tome>, data/rpg_power/spell/):
//   - targets the caster or a friendly player; costs 1 rune of the tome's type
//   - the target takes 20% less damage; +10% for each extra spell in the caster's tome,
//     up to 80% (7 spells)
//   - lasts 10 s with a 30 s cooldown; +5 s and +15 s for each extra spell, up to 40 s and 120 s
//     (Evasion too). The spell JSON holds the base values; the script lengthens them.
//   - visual: particles in the tome's main color and the rpg_power:arcane_armor effect icon
// The spell is added to the front of the tome's spell list the first time the tome is carried; the
// tome's spell limit grows by one so the native spell does not take a slot.
// The spell only applies the effect: the percentage is worked out here, from the caster's tome, the
// moment the effect is (re)applied. The caster is the nearest player (within 32 blocks, the target
// included) with the spell in an equipped tome.
//
// Everything lives inside a function: KubeJS scripts share one global scope.

;(() => {

const NbtOps = Java.loadClass('net.minecraft.nbt.NbtOps')
const StringTag = Java.loadClass('net.minecraft.nbt.StringTag')
const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
const SpellContainer = Java.loadClass('net.spell_engine.api.spell.container.SpellContainer')
const SpellRegistry = Java.loadClass('net.spell_engine.api.spell.registry.SpellRegistry')
const MobEffectInstance = Java.loadClass('net.minecraft.world.effect.MobEffectInstance')
const Mob = Java.loadClass('net.minecraft.world.entity.Mob')

const BASE_STUN_RADIUS = 3 // blocks; +1 per extra spell, up to 8
const MAX_STUN_RADIUS = 8
const BASE_STUN_SECONDS = 3 // +1 s per extra spell, up to 8 s
const MAX_STUN_SECONDS = 8
const STUN_KEY = 'rpg_power_stun_end'
const BASE_EVASION = 0.2
const EVADED_DAMAGE = 0.5 // damage taken when a hit is evaded
const BASE_ABSORPTION = 0.2
const PER_EXTRA_SPELL = 0.1
const MAX_ABSORPTION = 0.8
const BASE_DURATION = 10 // seconds; Arcane Armor and Evasion
const PER_EXTRA_DURATION = 5
const BASE_COOLDOWN = 30
const PER_EXTRA_COOLDOWN = 15
const MAX_EXTRA_SPELLS = 6 // 7 spells in the tome
const CASTER_RANGE_SQR = 32 * 32
const PCT_KEY = 'rpg_power_aa_pct'
const LAST_KEY = 'rpg_power_aa_last'
const COLOR_KEY = 'rpg_power_aa_color'
const EVA_KEY = 'rpg_power_eva_pct'
const EVA_LAST_KEY = 'rpg_power_eva_last'

// Tome (spell pool) -> native spell and particle color (RGB 0-255)
const TOMES = {
  'wizards:spell_book/arcane': { spell: 'rpg_power:armor_arcane', color: [176, 102, 255] },
  'wizards:spell_book/fire': { spell: 'rpg_power:armor_fire', color: [255, 122, 26] },
  'wizards:spell_book/frost': { spell: 'rpg_power:armor_frost', color: [127, 217, 255] },
  'elemental_wizards_rpg:spell_book/aqua': { spell: 'rpg_power:armor_aqua', color: [47, 140, 255] },
  'elemental_wizards_rpg:spell_book/terra': { spell: 'rpg_power:armor_terra', color: [156, 107, 58] },
  'elemental_wizards_rpg:spell_book/wind': { spell: 'rpg_power:armor_wind', color: [184, 242, 230] },
  'paladins:spell_book/priest': { spell: 'rpg_power:armor_priest', color: [255, 242, 176] },
  'paladins:spell_book/paladin': { spell: 'rpg_power:armor_paladin', color: [255, 216, 74] },
  'bards_rpg:spell_book/bard': { spell: 'rpg_power:armor_bard', color: [255, 122, 203] },
  // Hunters get Evasion instead: self only, chance to dodge; a dodged hit still deals half damage
  'archers:spell_book/archer': { spell: 'rpg_power:evasion_archer', color: [110, 200, 80], kind: 'evasion' },
  'archers_expansion:spell_book/deadeye': { spell: 'rpg_power:evasion_deadeye', color: [200, 160, 60], kind: 'evasion' },
  'archers_expansion:spell_book/tundra_hunter': { spell: 'rpg_power:evasion_tundra_hunter', color: [150, 210, 240], kind: 'evasion' },
  'archers_expansion:spell_book/war_archer': { spell: 'rpg_power:evasion_war_archer', color: [220, 90, 50], kind: 'evasion' },
  'rogues:spell_book/rogue': { spell: 'rpg_power:evasion_rogue', color: [110, 110, 130], kind: 'evasion' },
  // Melee fighters (except Rogue and Paladin) get Stun: pulse that immobilizes nearby creatures
  'rogues:spell_book/warrior': { spell: 'rpg_power:stun_warrior', color: [200, 200, 210], kind: 'stun' },
  'berserker_rpg:spell_book/berserker': { spell: 'rpg_power:stun_berserker', color: [180, 60, 40], kind: 'stun' },
  'forcemaster_rpg:spell_book/forcemaster': { spell: 'rpg_power:stun_forcemaster', color: [224, 72, 72], kind: 'stun' },
  'witcher_rpg:spell_book/fencing': { spell: 'rpg_power:stun_fencing', color: [150, 190, 230], kind: 'stun' },
  'witcher_rpg:spell_book/signs': { spell: 'rpg_power:stun_signs', color: [130, 90, 200], kind: 'stun' },
}

const SET_COMPONENT = 'set(net.minecraft.core.component.DataComponentType,java.lang.Object)'
const CONTAINER_TYPE = BuiltInRegistries.DATA_COMPONENT_TYPE.get(ResourceLocation.parse('spell_engine:spell_container'))

const effectHolders = {}
function effectHolder(id) {
  const key = id || 'rpg_power:arcane_armor'
  if (!effectHolders[key]) {
    const h = BuiltInRegistries.MOB_EFFECT.getHolder(ResourceLocation.parse(key))
    if (!h.isPresent()) return null
    effectHolders[key] = h.get()
  }
  return effectHolders[key]
}

function encode(container) {
  return SpellContainer.CODEC.encodeStart(NbtOps.INSTANCE, container).result().orElse(null)
}

function decode(tag) {
  return SpellContainer.CODEC.parse(NbtOps.INSTANCE, tag).result().orElse(null)
}

function spellIds(tag) {
  const list = tag.getList('spell_ids', 8)
  const ids = []
  for (let i = 0; i < list.size(); i++) ids.push(String(list.getString(i)))
  return ids
}

function tomeOf(stack) {
  if (!stack || stack.isEmpty() || !CONTAINER_TYPE) return null
  const container = stack.get(CONTAINER_TYPE)
  if (!container) return null
  const tag = encode(container)
  if (!tag) return null
  const pool = String(tag.getString('pool'))
  return TOMES[pool] ? { tome: TOMES[pool], tag: tag } : null
}

// Puts the native spell first in the tome, once
function addNativeSpell(stack) {
  const found = tomeOf(stack)
  if (!found || spellIds(found.tag).indexOf(found.tome.spell) >= 0) return
  const tag = found.tag
  const list = tag.getList('spell_ids', 8)
  list['add(int,net.minecraft.nbt.Tag)'](0, StringTag.valueOf(found.tome.spell))
  tag.put('spell_ids', list)
  if (tag.contains('max_spell_count')) tag.putInt('max_spell_count', tag.getInt('max_spell_count') + 1)
  const next = decode(tag)
  if (next) stack[SET_COMPONENT](CONTAINER_TYPE, next)
}

function equippedTomeStacks(player) {
  const stacks = []
  const inv = CuriosApi.getCuriosInventory(player)
  if (!inv.isPresent()) return stacks
  const handler = inv.get().getStacksHandler('spell_book')
  if (!handler.isPresent()) return stacks
  const slots = handler.get().getStacks()
  for (let i = 0; i < slots.getSlots(); i++) stacks.push(slots.getStackInSlot(i))
  return stacks
}

function addNativeSpells(player) {
  const inv = player.getInventory()
  for (let i = 0; i < inv.getContainerSize(); i++) addNativeSpell(inv.getItem(i))
  equippedTomeStacks(player).forEach(addNativeSpell)
}

// The caster's equipped tome that carries the native spell: { tome, count } or null
function casterTome(player, kind) {
  const stacks = equippedTomeStacks(player)
  for (let i = 0; i < stacks.length; i++) {
    const found = tomeOf(stacks[i])
    if (!found) continue
    const ids = spellIds(found.tag)
    if (ids.indexOf(found.tome.spell) >= 0 && (found.tome.kind || 'armor') === kind) {
      return { tome: found.tome, count: ids.length, player: player }
    }
  }
  return null
}

function evasion(count) {
  return Math.min(MAX_ABSORPTION, BASE_EVASION + PER_EXTRA_SPELL * Math.max(0, count - 1))
}

// Stunned mobs: uuid -> { entity, end (server tick) }. Mobs are frozen with NoAI, which also stops
// their attacks and abilities; the end time is kept on the mob so a reload can release it.
const stunned = {}

function stun(e, player, radius, now, end, bosses) {
  // Only mobs have AI to switch off (armor stands are living entities too)
  if (!(e instanceof Mob) || e === player || !e.isAlive()) return
  if (e.distanceTo(player) > radius) return
  // KubeJS turns entity.type into the ID string, so look the EntityType up for the tag check
  const type = BuiltInRegistries.ENTITY_TYPE.get(ResourceLocation.parse(String(e.type)))
  if (type && type['is(net.minecraft.tags.TagKey)'](bosses)) return
  if (!e.persistentData.contains(STUN_KEY)) {
    // Mobs without AI on purpose (e.g. map NPCs) are left alone, so the release never wakes them up
    if (e.isNoAi()) return
    e.setNoAi(true)
  }
  e.persistentData.putLong(STUN_KEY, end)
  stunned[String(e.uuid)] = { entity: e, end: end }
  // Visible status effect: Jade lists it with the time left; particles come from the server tick
  const holder = effectHolder('rpg_power:stunned')
  if (holder) {
    e['addEffect(net.minecraft.world.effect.MobEffectInstance)'](
      new MobEffectInstance(holder, end - now, 0, false, false, true))
  }
}

function stunPulse(player, found) {
  const extra = Math.max(0, found.count - 1)
  const radius = Math.min(MAX_STUN_RADIUS, BASE_STUN_RADIUS + extra)
  const seconds = Math.min(MAX_STUN_SECONDS, BASE_STUN_SECONDS + extra)
  const now = player.server.tickCount
  const box = player.getBoundingBox().inflate(radius)
  const bosses = Java.loadClass('net.minecraft.tags.TagKey').create(
    Java.loadClass('net.minecraft.core.registries.Registries').ENTITY_TYPE, ResourceLocation.parse('c:bosses'))
  player.level.getEntities(player, box).forEach(e => {
    // One odd entity must not stop the pulse for the others
    try {
      stun(e, player, radius, now, now + seconds * 20, bosses)
    } catch (err) {
      console.warn(`rpg_power: stun skipped ${e.type}: ${err}`)
    }
  })
  const c = found.tome.color.map(v => (v / 255).toFixed(2))
  player.server.runCommandSilent(
    `execute as ${player.stringUuid} at @s run particle minecraft:dust{color:[${c[0]},${c[1]},${c[2]}],scale:1.5} ~ ~0.2 ~ ${radius / 2} 0.1 ${radius / 2} 0 ${Math.min(200, 20 * radius)} normal`)
}

function releaseStun(e) {
  e.persistentData.remove(STUN_KEY)
  e.setNoAi(false)
  const holder = effectHolder('rpg_power:stunned')
  if (holder) e['removeEffect(net.minecraft.core.Holder)'](holder)
}

// Stars over the head of a stunned mob
function stunParticles(e) {
  e.server.runCommandSilent(
    `execute as ${String(e.uuid)} at @s run particle minecraft:crit ~ ~${(e.getBbHeight() + 0.3).toFixed(2)} ~ 0.3 0.1 0.3 0.05 4 normal`)
}

function trackStunCast(player) {
  const holder = effectHolder('rpg_power:stun_cast')
  if (!holder || !player['hasEffect(net.minecraft.core.Holder)'](holder)) return
  player['removeEffect(net.minecraft.core.Holder)'](holder)
  const found = casterTome(player, 'stun')
  if (found) stunPulse(player, found)
}

ServerEvents.tick(event => {
  const server = event.server
  if (server.tickCount % 5 !== 0) return
  const now = server.tickCount
  Object.keys(stunned).forEach(id => {
    const s = stunned[id]
    if (!s.entity.isAlive()) { delete stunned[id]; return }
    if (now >= s.end) { releaseStun(s.entity); delete stunned[id]; return }
    stunParticles(s.entity)
  })
})

// A mob loaded with a stun left over from before a restart or an unload is released
EntityEvents.spawned(event => {
  const e = event.entity
  if (e.isPlayer() || !e.persistentData.contains(STUN_KEY)) return
  if (!stunned[String(e.uuid)]) releaseStun(e)
})

function absorption(count) {
  return Math.min(MAX_ABSORPTION, BASE_ABSORPTION + PER_EXTRA_SPELL * Math.max(0, count - 1))
}

function extraSpells(count) {
  return Math.min(MAX_EXTRA_SPELLS, Math.max(0, count - 1))
}

// Lengthens the effect just applied by the spell and sets the caster's cooldown, both from the
// number of spells in the caster's tome. Returns the new duration in ticks.
function scale(target, holder, found) {
  const extra = extraSpells(found.count)
  const ticks = (BASE_DURATION + PER_EXTRA_DURATION * extra) * 20
  if (extra > 0) {
    target['addEffect(net.minecraft.world.effect.MobEffectInstance)'](
      new MobEffectInstance(holder, ticks, 0, false, false, true))
  }
  const spell = SpellRegistry.from(found.player.level).getHolder(ResourceLocation.parse(found.tome.spell))
  if (spell.isPresent()) {
    found.player.getCooldownManager()['set(net.minecraft.core.Holder,int)'](
      spell.get(), (BASE_COOLDOWN + PER_EXTRA_COOLDOWN * extra) * 20)
  }
  return ticks
}

function applied(target, holder, fresh) {
  let best = null
  let bestDist = CASTER_RANGE_SQR
  target.server.players.forEach(p => {
    if (p.level !== target.level) return
    const dist = p.distanceToSqr(target)
    if (dist > bestDist) return
    const found = casterTome(p, 'armor')
    if (!found) return
    best = found
    bestDist = dist
  })
  const data = target.persistentData
  // No caster in range (e.g. the effect came from a command): base reduction and the effect's own color
  const found = best || { tome: TOMES['wizards:spell_book/arcane'], count: 1 }
  data.putDouble(PCT_KEY, absorption(found.count))
  data.putString(COLOR_KEY, found.tome.color.join(','))
  return fresh && best ? scale(target, holder, best) : 0
}

// Evasion: self only, so the chance comes from the player's own tome
function trackEvasion(player) {
  const holder = effectHolder('rpg_power:evasion')
  if (!holder) return
  const data = player.persistentData
  const inst = player['getEffect(net.minecraft.core.Holder)'](holder)
  if (!inst) {
    if (data.getDouble(EVA_KEY) !== 0) data.putDouble(EVA_KEY, 0)
    data.putInt(EVA_LAST_KEY, 0)
    return
  }
  let duration = inst.getDuration()
  const fresh = duration > data.getInt(EVA_LAST_KEY)
  if (fresh || data.getDouble(EVA_KEY) === 0) {
    const found = casterTome(player, 'evasion')
    data.putDouble(EVA_KEY, evasion(found ? found.count : 1))
    if (found) data.putString(COLOR_KEY, found.tome.color.join(','))
    if (fresh && found) duration = scale(player, holder, found)
  }
  data.putInt(EVA_LAST_KEY, duration)
}

function track(player) {
  const holder = effectHolder()
  if (!holder) return
  const data = player.persistentData
  const inst = player['getEffect(net.minecraft.core.Holder)'](holder)
  if (!inst) {
    if (data.getInt(LAST_KEY) !== 0 || data.getDouble(PCT_KEY) !== 0) {
      data.putInt(LAST_KEY, 0)
      data.putDouble(PCT_KEY, 0)
    }
    return
  }
  let duration = inst.getDuration()
  // A longer duration than last time means the spell was just (re)applied
  const fresh = duration > data.getInt(LAST_KEY)
  if (fresh || data.getDouble(PCT_KEY) === 0) duration = applied(player, holder, fresh) || duration
  data.putInt(LAST_KEY, duration)
}

function aura(player) {
  const rgb = String(player.persistentData.getString(COLOR_KEY)).split(',')
  if (rgb.length !== 3) return
  const c = rgb.map(v => (Number(v) / 255).toFixed(2))
  player.server.runCommandSilent(
    `execute as ${player.stringUuid} at @s run particle minecraft:dust{color:[${c[0]},${c[1]},${c[2]}],scale:1.0} ~ ~1 ~ 0.4 0.7 0.4 0 6 normal`)
}

PlayerEvents.tick(event => {
  const player = event.player
  if (player.level.isClientSide() || player.tickCount % 5 !== 0) return
  try {
    if (player.tickCount % 20 === 0) addNativeSpells(player)
    track(player)
    trackEvasion(player)
    trackStunCast(player)
    // No const/let inside try: Rhino reports "redeclaration of var" on the next tick
    if (player.tickCount % 10 === 0 && (player.persistentData.getDouble(PCT_KEY) > 0 ||
      player.persistentData.getDouble(EVA_KEY) > 0)) aura(player)
  } catch (e) {
    console.error(`rpg_power: arcane armor: ${e}`)
  }
})

EntityEvents.beforeHurt(event => {
  if (!event.entity.isPlayer()) return
  const eva = event.entity.persistentData.getDouble(EVA_KEY)
  const evaHolder = effectHolder('rpg_power:evasion')
  if (eva > 0 && evaHolder && event.entity['hasEffect(net.minecraft.core.Holder)'](evaHolder) && Math.random() < eva) {
    event.damage = event.damage * EVADED_DAMAGE
  }
  const pct = event.entity.persistentData.getDouble(PCT_KEY)
  if (pct <= 0) return
  const holder = effectHolder()
  if (!holder || !event.entity['hasEffect(net.minecraft.core.Holder)'](holder)) return
  event.damage = event.damage * (1 - pct)
})

})()
