// RPG Power - tome and armor affinity for RPG Series
// KubeLoader content pack (https://modrinth.com/mod/kubeloader), MIT License
//
// With a spell book in the Curios spell book slot, each armor piece counts as:
//   - piece from the tome's own armor set: +1 (bonus)
//   - piece from any other set (other class, vanilla or other mods): -1 (penalty)
//   - empty slot: 0
// Per point (from -4 to +4): +/-10% max health and armor, +/-5% class damage,
// +/-2% critical chance and +/-2% incoming damage reduction.
// Holding a weapon of the tome's class in the main hand, each point also gives:
// +/-2% damage, +/-3% speed (attack, bow draw or casting, depending on the weapon)
// and +/-4% projectile velocity (bows and crossbows). Holding the class shield in either hand,
// or with Deflection (parry) active, each point gives +/-3% extra protection.
// Weapons from other classes get neither bonus nor penalty.
// Without a tome equipped nothing is applied.
// Recalculated every second; modifiers use fixed IDs, so they never stack.
//
// Tuning: change the PER_PIECE_* values below. Add new armor sets to TOMES.
//
// Everything lives inside a function: KubeJS scripts share one global scope, and a constant
// with the same name in another script would stop this one from loading.

;(() => {

const Attributes = Java.loadClass('net.minecraft.world.entity.ai.attributes.Attributes')
const AttributeModifier = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier')
const Operation = Java.loadClass('net.minecraft.world.entity.ai.attributes.AttributeModifier$Operation')
const ResourceLocation = Java.loadClass('net.minecraft.resources.ResourceLocation')
const BuiltInRegistries = Java.loadClass('net.minecraft.core.registries.BuiltInRegistries')
const EquipmentSlot = Java.loadClass('net.minecraft.world.entity.EquipmentSlot')
const CuriosApi = Java.loadClass('top.theillusivec4.curios.api.CuriosApi')
const TagKey = Java.loadClass('net.minecraft.tags.TagKey')
const Registries = Java.loadClass('net.minecraft.core.registries.Registries')

const PER_PIECE_HEALTH = 0.10
const PER_PIECE_ARMOR = 0.10
const PER_PIECE_DAMAGE = 0.05
const PER_PIECE_CRIT = 0.02
const PER_PIECE_REDUCTION = 0.02
const PER_PIECE_WEAPON_DAMAGE = 0.02
const PER_PIECE_WEAPON_SPEED = 0.03
const PER_PIECE_PROJECTILE = 0.04
const PER_PIECE_PROTECTION = 0.03
const PER_PIECE_SPELL_POWER = 0.02 // casters only, matching pieces only (no penalty)
const PER_PIECE_MOVEMENT = 0.02 // hunters only, matching pieces only (no penalty)
const PER_PIECE_REACH = 0.5 // blocks; melee classes holding a class melee weapon, matching pieces only
const SCORE_KEY = 'rpg_power_score'
const PROTECTION_KEY = 'rpg_power_protection'

const SLOTS = [EquipmentSlot.HEAD, EquipmentSlot.CHEST, EquipmentSlot.LEGS, EquipmentSlot.FEET]

// Melee damage, ranged damage and the two critical chance attributes
const MELEE = 'minecraft:generic.attack_damage'
const RANGED = 'ranged_weapon:damage'
const CRIT_PHYSICAL = 'critical_strike:chance'
const CRIT_SPELL = 'spell_power:critical_chance'

// Tome (spell book pool) -> armor sets (item ID without _head/_chest/_legs/_feet),
// plus the damage and critical chance attributes that receive the bonus.
const TOMES = {
  'wizards:spell_book/arcane': {
    sets: ['wizards:wizard_robe', 'wizards:arcane_robe', 'wizards:netherite_arcane_robe'],
    damage: ['spell_power:arcane'], crit: [CRIT_SPELL] },
  'wizards:spell_book/fire': {
    sets: ['wizards:wizard_robe', 'wizards:fire_robe', 'wizards:netherite_fire_robe'],
    damage: ['spell_power:fire'], crit: [CRIT_SPELL] },
  'wizards:spell_book/frost': {
    sets: ['wizards:wizard_robe', 'wizards:frost_robe', 'wizards:netherite_frost_robe'],
    damage: ['spell_power:frost'], crit: [CRIT_SPELL] },
  'elemental_wizards_rpg:spell_book/aqua': {
    sets: ['elemental_wizards_rpg:elemental', 'elemental_wizards_rpg:kelp',
      'elemental_wizards_rpg:netherite_kelp', 'elemental_wizards_rpg:ocean_robe'],
    damage: ['spell_power:water'], crit: [CRIT_SPELL] },
  'elemental_wizards_rpg:spell_book/terra': {
    sets: ['elemental_wizards_rpg:elemental', 'elemental_wizards_rpg:dripstone',
      'elemental_wizards_rpg:netherite_dripstone', 'elemental_wizards_rpg:mountain_robe'],
    damage: ['spell_power:earth'], crit: [CRIT_SPELL] },
  'elemental_wizards_rpg:spell_book/wind': {
    sets: ['elemental_wizards_rpg:elemental', 'elemental_wizards_rpg:wind',
      'elemental_wizards_rpg:netherite_wind', 'elemental_wizards_rpg:hurricane_robe'],
    damage: ['spell_power:air'], crit: [CRIT_SPELL] },
  'paladins:spell_book/paladin': {
    sets: ['paladins:paladin_armor', 'paladins:crusader_armor', 'paladins:netherite_crusader_armor'],
    damage: [MELEE, 'spell_power:healing'], crit: [CRIT_PHYSICAL, CRIT_SPELL] },
  'paladins:spell_book/priest': {
    sets: ['paladins:priest_robe', 'paladins:prior_robe', 'paladins:netherite_prior_robe'],
    damage: ['spell_power:healing'], crit: [CRIT_SPELL] },
  'rogues:spell_book/rogue': {
    sets: ['rogues:rogue_armor', 'rogues:assassin_armor', 'rogues:netherite_assassin_armor'],
    damage: [MELEE], crit: [CRIT_PHYSICAL] },
  'rogues:spell_book/warrior': {
    sets: ['rogues:warrior_armor', 'rogues:berserker_armor', 'rogues:netherite_berserker_armor'],
    damage: [MELEE], crit: [CRIT_PHYSICAL] },
  'berserker_rpg:spell_book/berserker': {
    sets: ['berserker_rpg:wildling', 'berserker_rpg:northling', 'berserker_rpg:netherite_northling',
      'berserker_rpg:warlord'],
    damage: [MELEE], crit: [CRIT_PHYSICAL] },
  'forcemaster_rpg:spell_book/forcemaster': {
    sets: ['forcemaster_rpg:oriene', 'forcemaster_rpg:aken', 'forcemaster_rpg:billporon',
      'forcemaster_rpg:phasleb'],
    damage: [MELEE, 'spell_power:arcane'], crit: [CRIT_PHYSICAL, CRIT_SPELL] },
  'bards_rpg:spell_book/bard': {
    sets: ['bards_rpg:entertainer_garb', 'bards_rpg:storyteller_garb', 'bards_rpg:troubadour_garb',
      'bards_rpg:netherite_troubadour_garb'],
    damage: ['spell_power:arcane'], crit: [CRIT_SPELL] },
  'archers:spell_book/archer': {
    sets: ['archers:archer_armor', 'archers:ranger_armor', 'archers:netherite_ranger_armor'],
    damage: [RANGED], crit: [CRIT_PHYSICAL] },
  'archers_expansion:spell_book/deadeye': {
    sets: ['archers:archer_armor', 'archers_expansion:deadeye', 'archers_expansion:netherite_deadeye',
      'archers_expansion:bounty_hunter'],
    damage: [RANGED], crit: [CRIT_PHYSICAL] },
  'archers_expansion:spell_book/tundra_hunter': {
    sets: ['archers:archer_armor', 'archers_expansion:tundra_hunter',
      'archers_expansion:netherite_tundra_hunter', 'archers_expansion:polar_stalker'],
    damage: [RANGED, 'spell_power:frost'], crit: [CRIT_PHYSICAL] },
  'archers_expansion:spell_book/war_archer': {
    sets: ['archers:archer_armor', 'archers_expansion:war_archer', 'archers_expansion:netherite_war_archer',
      'archers_expansion:sentinel_archer'],
    damage: [RANGED, 'spell_power:fire'], crit: [CRIT_PHYSICAL] },
}

// Witcher: both tomes accept every witcher school armor
const WITCHER = ['witcher_rpg:witcher']
;['feline', 'griffin', 'ursine', 'wolven'].forEach(school => {
  ;['', 'enhanced_', 'superior_', 'mastercrafted_', 'grandmaster_'].forEach(grade => {
    WITCHER.push(`witcher_rpg:${grade}${school}`)
  })
})
TOMES['witcher_rpg:spell_book/fencing'] = { sets: WITCHER, damage: [MELEE], crit: [CRIT_PHYSICAL] }
TOMES['witcher_rpg:spell_book/signs'] = {
  sets: WITCHER, damage: [MELEE, 'witcher_rpg:sign_intensity'], crit: [CRIT_PHYSICAL] }

// Weapons of each tome: weapon type tags and single items; `mods` limits to the listed mods and
// `exclude` drops IDs naming another school (e.g. a frost staff does not count for the fire tome).
const T = id => TagKey.create(Registries.ITEM, ResourceLocation.parse(id))
const STAFF = T('rpg_series:weapon_type/damage_staff')
const WAND = T('rpg_series:weapon_type/damage_wand')
const LONG_BOW = T('rpg_series:weapon_type/long_bow')
const SHORT_BOW = T('rpg_series:weapon_type/short_bow')
const HEAVY_CROSSBOW = T('rpg_series:weapon_type/heavy_crossbow')
const RAPID_CROSSBOW = T('rpg_series:weapon_type/rapid_crossbow')
const HARP_CROSSBOW = T('bards_rpg:harp_crossbows')
const LUTE = T('bards_rpg:lutes')
const LYRE = T('bards_rpg:lyres')
const HEALING_STAFF = T('rpg_series:weapon_type/healing_staff')
const HEALING_WAND = T('rpg_series:weapon_type/healing_wand')
const SHIELD = T('rpg_series:weapon_type/shield')
const COMMON_SHIELD = T('c:shields')

const WIZARD = { tags: [STAFF, WAND], mods: ['wizards', 'arsenal'] }
const ELEMENTAL = { tags: [STAFF, WAND], mods: ['elemental_wizards_rpg', 'arsenal'] }
const ARCHER = {
  tags: [LONG_BOW, SHORT_BOW, HEAVY_CROSSBOW, RAPID_CROSSBOW, T('rpg_series:weapon_type/spear')],
  items: ['minecraft:bow', 'minecraft:crossbow'], mods: ['archers', 'arsenal', 'minecraft'] }
const WITCHER_WEAPONS = { tags: [T('rpg_series:weapon_type/spell_blade')] }
const WEAPONS = {
  'wizards:spell_book/arcane': Object.assign({ exclude: ['fire', 'frost'] }, WIZARD),
  'wizards:spell_book/fire': Object.assign({ exclude: ['arcane', 'frost'] }, WIZARD),
  'wizards:spell_book/frost': Object.assign({ exclude: ['arcane', 'fire'] }, WIZARD),
  'elemental_wizards_rpg:spell_book/aqua': Object.assign({ exclude: ['terra', 'clay', 'wind', 'feather'] }, ELEMENTAL),
  'elemental_wizards_rpg:spell_book/terra': Object.assign({ exclude: ['aqua', 'kelp', 'wind', 'feather'] }, ELEMENTAL),
  'elemental_wizards_rpg:spell_book/wind': Object.assign({ exclude: ['aqua', 'kelp', 'terra', 'clay'] }, ELEMENTAL),
  'paladins:spell_book/paladin': {
    tags: [T('rpg_series:weapon_type/mace'), T('rpg_series:weapon_type/hammer'),
      T('rpg_series:weapon_type/claymore'), SHIELD, COMMON_SHIELD], items: ['minecraft:shield'] },
  'paladins:spell_book/priest': { tags: [HEALING_STAFF, HEALING_WAND] },
  'rogues:spell_book/rogue': { tags: [T('rpg_series:weapon_type/dagger'), T('rpg_series:weapon_type/sickle')] },
  'rogues:spell_book/warrior': { tags: [T('rpg_series:weapon_type/double_axe'), T('rpg_series:weapon_type/glaive')] },
  'berserker_rpg:spell_book/berserker': { tags: [T('berserker_rpg:berserker_axes')], items: ['berserker_rpg:unique_sword_1'] },
  'forcemaster_rpg:spell_book/forcemaster': { tags: [T('forcemaster_rpg:knuckles')] },
  'bards_rpg:spell_book/bard': {
    tags: [LUTE, LYRE, HARP_CROSSBOW, T('rpg_series:weapon_type/sword')], mods: ['bards_rpg'] },
  'archers:spell_book/archer': ARCHER,
  'archers_expansion:spell_book/deadeye': ARCHER,
  'archers_expansion:spell_book/tundra_hunter': ARCHER,
  'archers_expansion:spell_book/war_archer': ARCHER,
  'witcher_rpg:spell_book/fencing': WITCHER_WEAPONS,
  'witcher_rpg:spell_book/signs': WITCHER_WEAPONS,
}
// Vanilla equivalents: sword = witcher sword, axe = double/berserker axe, hoe = sickle,
// mace = paladin mace, trident = spear, crossbow = harp crossbow.
// Only Minecraft's own items count: vanilla tags also hold swords and axes from other mods.
const VANILLA_EQUIVALENTS = {
  'witcher_rpg:spell_book/fencing': { tags: [T('minecraft:swords')] },
  'witcher_rpg:spell_book/signs': { tags: [T('minecraft:swords')] },
  'rogues:spell_book/warrior': { tags: [T('minecraft:axes')] },
  'berserker_rpg:spell_book/berserker': { tags: [T('minecraft:axes')] },
  'rogues:spell_book/rogue': { tags: [T('minecraft:hoes')] },
  'paladins:spell_book/paladin': { items: ['minecraft:mace'] },
  'bards_rpg:spell_book/bard': { items: ['minecraft:crossbow'] },
  'archers:spell_book/archer': { items: ['minecraft:trident'] },
  'archers_expansion:spell_book/deadeye': { items: ['minecraft:trident'] },
  'archers_expansion:spell_book/tundra_hunter': { items: ['minecraft:trident'] },
  'archers_expansion:spell_book/war_archer': { items: ['minecraft:trident'] },
}
Object.keys(WEAPONS).forEach(k => { TOMES[k].weapons = Object.assign({ vanilla: VANILLA_EQUIVALENTS[k] }, WEAPONS[k]) })
Object.keys(TOMES).forEach(k => { TOMES[k].pool = k })

// The weapon type decides which speed attribute gets the bonus
const RANGED_TAGS = [LONG_BOW, SHORT_BOW, HEAVY_CROSSBOW, RAPID_CROSSBOW, HARP_CROSSBOW]
const RANGED_ITEMS = ['minecraft:bow', 'minecraft:crossbow']
const SPELL_TAGS = [STAFF, WAND, HEALING_STAFF, HEALING_WAND, LUTE, LYRE]
const SHIELD_TAGS = [SHIELD, COMMON_SHIELD]
const SPEED_MELEE = 'minecraft:generic.attack_speed'
const SPEED_RANGED = 'ranged_weapon:haste'
const SPEED_SPELL = 'spell_power:haste'
const PROJECTILE_VELOCITY = 'ranged_weapon:velocity'
const PARRY_EFFECT = 'skill_tree_rpgs:deflection'

const ID_HEALTH = ResourceLocation.parse('rpg_power:health')
const ID_ARMOR = ResourceLocation.parse('rpg_power:armor')
const ID_DAMAGE = ResourceLocation.parse('rpg_power:damage')
const ID_CRIT = ResourceLocation.parse('rpg_power:crit')
const ID_WEAPON_DAMAGE = ResourceLocation.parse('rpg_power:weapon_damage')
const ID_WEAPON_SPEED = ResourceLocation.parse('rpg_power:weapon_speed')
const ID_PROJECTILE = ResourceLocation.parse('rpg_power:projectile_velocity')
const ID_SPELL_POWER = ResourceLocation.parse('rpg_power:spell_power')
const SPELL_POWER = 'spell_power:generic'
const ID_MOVEMENT = ResourceLocation.parse('rpg_power:movement_speed')
const MOVEMENT = 'minecraft:generic.movement_speed'
const ID_REACH = ResourceLocation.parse('rpg_power:reach')
// Vanilla attack reach; Better Combat reads this attribute too
const REACH = 'minecraft:player.entity_interaction_range'
// Melee tomes: gain reach with a class melee weapon, per matching piece
const MELEE_TOMES = [
  'rogues:spell_book/warrior', 'rogues:spell_book/rogue', 'berserker_rpg:spell_book/berserker',
  'paladins:spell_book/paladin', 'forcemaster_rpg:spell_book/forcemaster',
  'witcher_rpg:spell_book/fencing', 'witcher_rpg:spell_book/signs',
]
// Hunter tomes (archers, rogue and berserker): gain movement speed per matching piece
const HUNTERS = [
  'archers:spell_book/archer', 'archers_expansion:spell_book/deadeye',
  'archers_expansion:spell_book/tundra_hunter', 'archers_expansion:spell_book/war_archer',
  'rogues:spell_book/rogue', 'berserker_rpg:spell_book/berserker',
]
// Caster tomes: gain generic spell power per matching piece
const CASTERS = [
  'wizards:spell_book/arcane', 'wizards:spell_book/fire', 'wizards:spell_book/frost',
  'elemental_wizards_rpg:spell_book/aqua', 'elemental_wizards_rpg:spell_book/terra', 'elemental_wizards_rpg:spell_book/wind',
  'paladins:spell_book/priest', 'paladins:spell_book/paladin', 'bards_rpg:spell_book/bard',
  'forcemaster_rpg:spell_book/forcemaster',
]

// Every attribute this script may touch (so stale ones are cleared when the tome changes)
const ALL_DAMAGE = []
const ALL_CRIT = []
Object.keys(TOMES).forEach(k => {
  TOMES[k].damage.forEach(a => { if (ALL_DAMAGE.indexOf(a) < 0) ALL_DAMAGE.push(a) })
  TOMES[k].crit.forEach(a => { if (ALL_CRIT.indexOf(a) < 0) ALL_CRIT.push(a) })
})

const holders = {}
function attribute(id) {
  if (!(id in holders)) {
    const h = BuiltInRegistries.ATTRIBUTE.getHolder(ResourceLocation.parse(id))
    holders[id] = h.isPresent() ? h.get() : null
    if (!holders[id]) console.warn(`rpg_power: attribute ${id} not found, skipped`)
  }
  return holders[id]
}

const CONTAINER_TYPE = BuiltInRegistries.DATA_COMPONENT_TYPE.get(ResourceLocation.parse('spell_engine:spell_container'))

function bookPool(stack) {
  if (!stack || stack.isEmpty() || !CONTAINER_TYPE) return null
  const container = stack.get(CONTAINER_TYPE)
  if (!container) return null
  try {
    return String(container.pool())
  } catch (e) {
    const m = String(container).match(/pool=([a-z0-9_.-]+:[a-z0-9_./-]+)/)
    return m ? m[1] : null
  }
}

// Tome whose pool is not in the table (e.g. a new mod): warn once per pool
const warnedPools = {}
function warnUnknownPool(pool) {
  if (warnedPools[pool]) return
  warnedPools[pool] = true
  console.warn(`rpg_power: tome ${pool} is not in the table, skipped`)
}

function equippedTome(player) {
  const inv = CuriosApi.getCuriosInventory(player)
  if (!inv.isPresent()) return null
  const handler = inv.get().getStacksHandler('spell_book')
  if (!handler.isPresent()) return null
  const stacks = handler.get().getStacks()
  for (let i = 0; i < stacks.getSlots(); i++) {
    const pool = bookPool(stacks.getStackInSlot(i))
    if (pool && TOMES[pool]) return TOMES[pool]
    if (pool) warnUnknownPool(pool)
  }
  return null
}

function matchingPieces(player, tome) {
  let matching = 0
  SLOTS.forEach(slot => {
    const stack = player.getItemBySlot(slot)
    if (stack.isEmpty()) return
    if (tome.sets.indexOf(itemId(stack).replace(/_(head|chest|legs|feet)$/, '')) >= 0) matching++
  })
  return matching
}

function score(player, tome) {
  let total = 0
  SLOTS.forEach(slot => {
    const stack = player.getItemBySlot(slot)
    if (stack.isEmpty()) return
    const id = String(BuiltInRegistries.ITEM.getKey(stack.getItem()))
    const set = id.replace(/_(head|chest|legs|feet)$/, '')
    total += tome.sets.indexOf(set) >= 0 ? 1 : -1
  })
  return total
}

function itemId(stack) {
  return String(BuiltInRegistries.ITEM.getKey(stack.getItem()))
}

// ItemStack.is() is overloaded; pick the TagKey one explicitly
function hasTag(stack, tags) {
  return tags.some(t => stack['is(net.minecraft.tags.TagKey)'](t))
}

function isClassWeapon(stack, tome) {
  const weapons = tome.weapons
  if (!weapons || stack.isEmpty()) return false
  const id = itemId(stack)
  const vanilla = weapons.vanilla
  if (vanilla && id.startsWith('minecraft:') &&
    ((vanilla.items && vanilla.items.indexOf(id) >= 0) || hasTag(stack, vanilla.tags || []))) return true
  if (!((weapons.items && weapons.items.indexOf(id) >= 0) || hasTag(stack, weapons.tags || []))) return false
  if (weapons.mods && weapons.mods.indexOf(id.split(':')[0]) < 0) return false
  if (weapons.exclude && weapons.exclude.some(name => id.indexOf(name) >= 0)) return false
  return true
}

function isShield(stack) {
  return !stack.isEmpty() && (itemId(stack) === 'minecraft:shield' || hasTag(stack, SHIELD_TAGS))
}

let parryEffect
function isParrying(player) {
  if (parryEffect === undefined) {
    const h = BuiltInRegistries.MOB_EFFECT.getHolder(ResourceLocation.parse(PARRY_EFFECT))
    parryEffect = h.isPresent() ? h.get() : null
  }
  return parryEffect !== null && player.hasEffect(parryEffect)
}

function apply(player, idAttr, idMod, value, operation) {
  const holder = attribute(idAttr)
  if (!holder) return
  const inst = player.getAttribute(holder)
  if (!inst) return
  const current = inst.getModifier(idMod)
  if (value === 0) {
    if (current) inst['removeModifier(net.minecraft.resources.ResourceLocation)'](idMod)
    return
  }
  if (current && Math.abs(current.amount() - value) < 1e-9) return
  // removeModifier is overloaded (ResourceLocation/AttributeModifier); pick the ResourceLocation one explicitly
  inst['removeModifier(net.minecraft.resources.ResourceLocation)'](idMod)
  inst.addPermanentModifier(new AttributeModifier(idMod, value, operation || Operation.ADD_MULTIPLIED_BASE))
}

function update(player) {
  const tome = equippedTome(player)
  const p = tome ? score(player, tome) : 0
  apply(player, 'minecraft:generic.max_health', ID_HEALTH, p * PER_PIECE_HEALTH)
  apply(player, 'minecraft:generic.armor', ID_ARMOR, p * PER_PIECE_ARMOR)
  ALL_DAMAGE.forEach(a => apply(player, a, ID_DAMAGE, tome && tome.damage.indexOf(a) >= 0 ? p * PER_PIECE_DAMAGE : 0))
  ALL_CRIT.forEach(a => apply(player, a, ID_CRIT, tome && tome.crit.indexOf(a) >= 0 ? p * PER_PIECE_CRIT : 0))
  const caster = tome !== null && CASTERS.indexOf(tome.pool) >= 0
  const hunter = tome !== null && HUNTERS.indexOf(tome.pool) >= 0
  const matching = tome !== null ? matchingPieces(player, tome) : 0
  apply(player, SPELL_POWER, ID_SPELL_POWER, caster ? matching * PER_PIECE_SPELL_POWER : 0)
  apply(player, MOVEMENT, ID_MOVEMENT, hunter ? matching * PER_PIECE_MOVEMENT : 0)

  // Class weapon in the main hand
  const mainHand = player.getMainHandItem()
  const weaponOk = tome !== null && isClassWeapon(mainHand, tome)
  let speed = null
  let projectile = false
  if (weaponOk) {
    if (RANGED_ITEMS.indexOf(itemId(mainHand)) >= 0 || hasTag(mainHand, RANGED_TAGS)) {
      speed = SPEED_RANGED
      projectile = true
    } else {
      speed = hasTag(mainHand, SPELL_TAGS) ? SPEED_SPELL : SPEED_MELEE
    }
  }
  ALL_DAMAGE.forEach(a => apply(player, a, ID_WEAPON_DAMAGE, weaponOk && tome.damage.indexOf(a) >= 0 ? p * PER_PIECE_WEAPON_DAMAGE : 0))
  ;[SPEED_MELEE, SPEED_RANGED, SPEED_SPELL].forEach(a =>
    apply(player, a, ID_WEAPON_SPEED, a === speed ? p * PER_PIECE_WEAPON_SPEED : 0))
  apply(player, PROJECTILE_VELOCITY, ID_PROJECTILE, projectile ? p * PER_PIECE_PROJECTILE : 0)
  const reach = speed === SPEED_MELEE && MELEE_TOMES.indexOf(tome.pool) >= 0
  apply(player, REACH, ID_REACH, reach ? matching * PER_PIECE_REACH : 0, Operation.ADD_VALUE)

  // Protection: class shield in either hand, or parry (Deflection) active
  const shield = tome !== null && [mainHand, player.getOffhandItem()].some(s => isShield(s) && isClassWeapon(s, tome))
  const protection = tome !== null && (shield || isParrying(player)) ? p : 0

  if (player.getHealth() > player.getMaxHealth()) player.setHealth(player.getMaxHealth())
  // Log only when the score changes, to make it easy to check in game
  if (player.persistentData.getInt(SCORE_KEY) !== p) {
    console.info(`rpg_power: ${player.username} has ${p} affinity point(s)`)
  }
  player.persistentData.putInt(SCORE_KEY, p)
  player.persistentData.putInt(PROTECTION_KEY, protection)
}

// --- Tome description (lore) ---
// The server writes on the item itself what the tome gives with the right armor and weapons (and
// what it takes away with the wrong ones). Nothing is needed on the client: texts are translatable
// with an English fallback, so clients with RPG Power installed see them in their own language.
// Only tomes without lore, or with this mod's lore, are touched, so other texts are never erased.
const DataComponents = Java.loadClass('net.minecraft.core.component.DataComponents')
const ItemLore = Java.loadClass('net.minecraft.world.item.component.ItemLore')
const Component = Java.loadClass('net.minecraft.network.chat.Component')
const Style = Java.loadClass('net.minecraft.network.chat.Style')
const ChatFormatting = Java.loadClass('net.minecraft.ChatFormatting')
const ArrayList = Java.loadClass('java.util.ArrayList')

// Weapon list text of each tome: [translation key suffix, English fallback]
const WEAPON_TEXT = {
  'wizards:spell_book/arcane': ['arcane', 'arcane and wizard staves and wands'],
  'wizards:spell_book/fire': ['fire', 'fire and wizard staves and wands'],
  'wizards:spell_book/frost': ['frost', 'frost and wizard staves and wands'],
  'elemental_wizards_rpg:spell_book/aqua': ['aqua', 'water and elemental staves and wands'],
  'elemental_wizards_rpg:spell_book/terra': ['terra', 'earth and elemental staves and wands'],
  'elemental_wizards_rpg:spell_book/wind': ['wind', 'wind and elemental staves and wands'],
  'paladins:spell_book/paladin': ['paladin', 'maces (vanilla included), hammers, claymores and shields'],
  'paladins:spell_book/priest': ['priest', 'holy staves and wands'],
  'rogues:spell_book/rogue': ['rogue', 'daggers, sickles and vanilla hoes'],
  'rogues:spell_book/warrior': ['warrior', 'double axes, glaives and vanilla axes'],
  'berserker_rpg:spell_book/berserker': ['berserker', 'berserker axes and vanilla axes'],
  'forcemaster_rpg:spell_book/forcemaster': ['forcemaster', 'knuckles'],
  'bards_rpg:spell_book/bard': ['bard', 'lutes, lyres, harp crossbows, rapiers and the vanilla crossbow'],
  'archers:spell_book/archer': ['archer', 'bows, crossbows, spears and the vanilla trident'],
  'archers_expansion:spell_book/deadeye': ['archer', 'bows, crossbows, spears and the vanilla trident'],
  'archers_expansion:spell_book/tundra_hunter': ['archer', 'bows, crossbows, spears and the vanilla trident'],
  'archers_expansion:spell_book/war_archer': ['archer', 'bows, crossbows, spears and the vanilla trident'],
  'witcher_rpg:spell_book/fencing': ['witcher', 'witcher swords and vanilla swords'],
  'witcher_rpg:spell_book/signs': ['witcher', 'witcher swords and vanilla swords'],
}
// Source of the extra protection of each tome (class shield or the archer's Deflection passive)
const PROTECTION_TEXT = {
  'paladins:spell_book/paladin': ['shield', 'Class shield in hand'],
  'archers:spell_book/archer': ['parry', 'Deflection (parry) active'],
  'archers_expansion:spell_book/deadeye': ['parry', 'Deflection (parry) active'],
  'archers_expansion:spell_book/tundra_hunter': ['parry', 'Deflection (parry) active'],
  'archers_expansion:spell_book/war_archer': ['parry', 'Deflection (parry) active'],
}

const pct = v => `${Math.round(v * 100)}%`

function styled(component, color) {
  return component.setStyle(Style.EMPTY['withColor(net.minecraft.ChatFormatting)'](color).withItalic(false))
}
// Translatable line; extra arguments fill the %s placeholders
function tr(key, fallback, color) {
  const args = Array.prototype.slice.call(arguments, 3)
  const c = args.length === 0
    ? Component['translatableWithFallback(java.lang.String,java.lang.String)'](`rpg_power.lore.${key}`, fallback)
    : Component['translatableWithFallback(java.lang.String,java.lang.String,java.lang.Object[])'](`rpg_power.lore.${key}`, fallback, args)
  return styled(c, color)
}

// Set names from the chestplate item, translated on the client (e.g. "Fire Robe Top")
function setName(set) {
  const item = BuiltInRegistries.ITEM['getOptional(net.minecraft.resources.ResourceLocation)'](ResourceLocation.parse(`${set}_chest`))
  return item.isPresent() ? item.get().getDescription() : null
}

const TITLE = tr('title', 'Class affinity (RPG Power)', ChatFormatting.GOLD)
const TITLE_TEXT = String(TITLE.getString())

const builtLore = {}
function tomeLore(pool) {
  if (pool in builtLore) return builtLore[pool]
  const tome = TOMES[pool]
  const lines = new ArrayList()
  const h = pct(PER_PIECE_HEALTH), d = pct(PER_PIECE_DAMAGE), c = pct(PER_PIECE_CRIT), r = pct(PER_PIECE_REDUCTION)
  lines.add(TITLE)
  lines.add(tr('matching', 'Per piece of the tome\'s set:', ChatFormatting.GRAY))
  lines.add(tr('matching.values', ' +%s health and armor, +%s damage, +%s critical, -%s damage taken', ChatFormatting.GREEN, h, d, c, r))
  if (CASTERS.indexOf(pool) >= 0) lines.add(tr('matching.spell_power', ' +%s spell power (caster)', ChatFormatting.GREEN, pct(PER_PIECE_SPELL_POWER)))
  if (HUNTERS.indexOf(pool) >= 0) lines.add(tr('matching.movement', ' +%s movement speed (hunter)', ChatFormatting.GREEN, pct(PER_PIECE_MOVEMENT)))
  if (MELEE_TOMES.indexOf(pool) >= 0) lines.add(tr('matching.reach', ' +%s block reach with a class melee weapon', ChatFormatting.GREEN, String(PER_PIECE_REACH)))
  lines.add(tr('other', 'Per piece of another set:', ChatFormatting.GRAY))
  lines.add(tr('other.values', ' -%s health and armor, -%s damage, -%s critical, +%s damage taken', ChatFormatting.RED, h, d, c, r))
  lines.add(tr('weapon', 'With the class weapon, per right (or wrong) piece:', ChatFormatting.GRAY))
  const weapons = tome.weapons || {}
  const ranged = (weapons.tags || []).some(t => RANGED_TAGS.indexOf(t) >= 0) ||
    (weapons.items || []).some(i => RANGED_ITEMS.indexOf(i) >= 0)
  if (ranged) {
    lines.add(tr('weapon.values.ranged', ' ±%s damage, ±%s speed, ±%s projectile velocity', ChatFormatting.YELLOW,
      pct(PER_PIECE_WEAPON_DAMAGE), pct(PER_PIECE_WEAPON_SPEED), pct(PER_PIECE_PROJECTILE)))
  } else {
    lines.add(tr('weapon.values', ' ±%s damage, ±%s speed', ChatFormatting.YELLOW,
      pct(PER_PIECE_WEAPON_DAMAGE), pct(PER_PIECE_WEAPON_SPEED)))
  }
  const protection = PROTECTION_TEXT[pool]
  if (protection) {
    lines.add(tr(`protection.${protection[0]}`, `${protection[1]}: ±%s protection per piece`, ChatFormatting.YELLOW, pct(PER_PIECE_PROTECTION)))
  }
  lines.add(tr('sets', 'Armor sets:', ChatFormatting.GRAY))
  if (tome.sets === WITCHER) {
    lines.add(tr('sets.witcher', ' every Witcher school armor', ChatFormatting.AQUA))
  } else {
    tome.sets.forEach(set => {
      const name = setName(set)
      if (name) lines.add(styled(Component.literal(' '), ChatFormatting.AQUA)['append(net.minecraft.network.chat.Component)'](name))
    })
  }
  const w = WEAPON_TEXT[pool]
  lines.add(tr(`weapons.${w[0]}`, `Weapons: ${w[1]}`, ChatFormatting.GRAY))
  builtLore[pool] = { lore: new ItemLore(lines), text: linesText(lines) }
  return builtLore[pool]
}

function linesText(lines) {
  let s = ''
  for (let i = 0; i < lines.size(); i++) s += String(lines.get(i).getString()) + '\n'
  return s
}

function describeTome(stack) {
  const pool = bookPool(stack)
  if (!pool || !TOMES[pool]) return
  const ready = tomeLore(pool)
  const current = stack.get(DataComponents.LORE)
  if (current && current.lines().size() > 0) {
    // Already up to date, or lore from somewhere else: leave it alone
    if (String(current.lines().get(0).getString()) !== TITLE_TEXT) return
    if (linesText(current.lines()) === ready.text) return
  }
  stack['set(net.minecraft.core.component.DataComponentType,java.lang.Object)'](DataComponents.LORE, ready.lore)
}

function describeTomes(player) {
  const inv = player.getInventory()
  for (let i = 0; i < inv.getContainerSize(); i++) describeTome(inv.getItem(i))
  const curios = CuriosApi.getCuriosInventory(player)
  if (!curios.isPresent()) return
  const handler = curios.get().getStacksHandler('spell_book')
  if (!handler.isPresent()) return
  const stacks = handler.get().getStacks()
  for (let i = 0; i < stacks.getSlots(); i++) describeTome(stacks.getStackInSlot(i))
}

PlayerEvents.tick(event => {
  const player = event.player
  if (player.level.isClientSide() || player.tickCount % 20 !== 0) return
  try {
    update(player)
    describeTomes(player)
  } catch (e) {
    console.error(`rpg_power: ${e}`)
  }
})

// Damage reduction: 2% less damage taken per positive point, 2% more per negative point,
// plus +/-3% per point with the class shield or parry active
EntityEvents.beforeHurt(event => {
  if (!event.entity.isPlayer()) return
  const data = event.entity.persistentData
  const p = data.getInt(SCORE_KEY)
  if (p === 0) return
  const protection = data.getInt(PROTECTION_KEY)
  event.damage = event.damage * (1 - p * PER_PIECE_REDUCTION) * (1 - protection * PER_PIECE_PROTECTION)
})

})()
