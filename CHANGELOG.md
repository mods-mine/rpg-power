# 1.7.3

Changes:
- Stun lasts 3 seconds at first (was 2): +1 second for each extra spell in the tome, up to 8 seconds (reached with 6 spells).
- Stunned creatures get a new **Stunned** status effect (`rpg_power:stunned`) for the length of the stun, so Jade shows it with the time left, and they give off star particles over the head until it ends.
- The Stun spell description shows the new duration.

# 1.7.2

Fixes:
- Stun did not affect any creature: the boss check read the entity type the wrong way (KubeJS gives it as the ID text), which failed on the first mob and stopped the pulse. Hostile and other mobs in range are now immobilized; bosses (`c:bosses`) are still skipped.
- A creature that cannot be stunned no longer stops the pulse for the others around it; it is skipped with a warning in the KubeJS server log.

# 1.7.1

Fixes:
- Arcane Armor, Evasion and Stun did nothing: the script that tracks them failed on every tick (`redeclaration of var`, a KubeJS/Rhino limitation on `const` inside `try`). The same pattern was removed from the tome detection fallback.
- Stun crashed the server tick (`getGameTime` is not available to KubeJS scripts); stun timing now uses the server tick counter.
- Stun only affects mobs: armor stands and other living entities without AI are skipped, and mobs that already had no AI on purpose (e.g. map NPCs) are left alone, so ending the stun never wakes them up.
- Evasion of the archer tomes (Archer, Deadeye, Tundra Hunter, War Archer) could not be cast with bows or crossbows, vanilla included: it now uses the ranged spell school (`spell_power:physical_ranged`), like the Archers spells.
- RPG Power is now marked as required on the client (`displayTest="MATCH_VERSION"`): the spell effects are registered by a startup script, so players without the mod could not join, and modpack tools could leave it out as server-only.
- KubeJS dependency fixed to 2101.7.2-build.368 up to build.373: KubeLoader 21-0.1.0-Alpha-3 crashes the game on start with KubeJS build.374 or newer.
- Changelog: Berserker gets Stun, not Evasion.

Changes:
- Arcane Armor and Evasion are shorter with a shorter cooldown: 10 s duration and 30 s cooldown, +5 s and +15 s for each extra spell in the tome, up to 40 s and 120 s (7 spells). The damage reduction and evade chance still scale as before (20% + 10% per extra spell, up to 80%).
- Stun starts at a 3 block radius (was 2): +1 block and +1 second for each extra spell, up to 8 blocks and 8 seconds.
- Spell descriptions (English and Brazilian Portuguese) show the new durations, cooldowns and radius.

# 1.7.0

- New native first spell for every caster tome (Wizard Arcane/Fire/Frost, Elemental Aqua/Terra/Wind, Priest, Paladin, Bard and Forcemaster): **Arcane Armor**. It targets you or a friendly player, costs 1 rune of the tome's type (Bard and Forcemaster use an arcane rune), has a 120 s cooldown and lasts 30 s.
- Arcane Armor reduces the damage the target takes by 20%, plus 10% for each extra spell in the caster's tome, up to 80% (7 spells in the tome).
- The spell shows particles in the tome's main color and a shield status effect icon.
- The spell is added to the front of the tome's spell list when the tome is carried, and the tome's spell limit grows by one so it does not use a slot. It can also be learned from the spell binding table pool.
- Hunters (Archer, Deadeye, Tundra Hunter, War Archer and Rogue tomes) get **Evasion** as their native first spell instead: self only, 120 s cooldown, 30 s. 20% chance to evade a hit, +10% for each extra spell in the tome, up to 80%; an evaded hit still deals 50% of its damage. The archer tomes spend 1 arrow; Rogue has no item cost. Same particles and shield icon style.
- Melee fighters (Warrior, Berserker, Forcemaster, Witcher Fencing and Signs tomes; not Rogue or Paladin) get **Stun** as their native first spell instead (Forcemaster no longer gets Arcane Armor). 0.5 s cast, 30 s cooldown, no item cost. It immobilizes creatures around the caster: they cannot move, attack or use abilities. 2 blocks and 2 seconds, +1 block and +1 second for each extra spell in the tome, up to 8 blocks and 8 seconds. Players and bosses (`c:bosses`) are not affected.
- Requires KubeLoader on the client too, because the effect is registered by a startup script.

# 1.6.0

- Vanilla weapons now count as the equivalent class weapons: swords for Witcher, axes for Warrior and Berserker, hoes (sickles) for Rogue, the mace for Paladin, the trident (spear) for the archer tomes and the crossbow (harp crossbow) for Bard. Bows, crossbows and shields already counted.
- Only Minecraft's own items count as equivalents; swords and axes that other mods add to the vanilla tags are not.
- The tome description lists the vanilla equivalents.

# 1.5.0

- Melee classes (Warrior, Rogue, Berserker, Paladin, Forcemaster and Witcher tomes) gain +0.5 block of attack reach per piece of the tome's armor set while holding a class melee weapon. Other armor pieces do not reduce it. Works with Better Combat, which reads the same vanilla reach attribute.
- The tome description shows the new bonus for melee tomes.

# 1.4.0

- Hunters (Archer, Deadeye, Tundra Hunter, War Archer and Rogue tomes) gain +2% movement speed per piece of the tome's armor set. Other armor pieces do not reduce it.
- The tome description shows the new bonus for hunter tomes.

# 1.3.0

- Casters (Wizard, Elemental Wizard, Priest, Paladin, Bard and Forcemaster tomes) gain +2% generic spell power per piece of the tome's armor set. Other armor pieces do not reduce it.
- The tome description shows the new bonus for caster tomes.

# 1.2.0

- Tome descriptions: every supported tome in a player's inventory or spell book slot now shows, when hovered, the bonuses for the matching armor set, the penalties for other armor, the class weapon and shield/parry effects, the accepted armor sets and the class weapons.
- The description is written by the server, so it works without the mod on the client. Texts are translatable (English and Brazilian Portuguese included); clients with RPG Power installed see them in their own language, others see English.
- Tomes that already have a description from another source are left untouched.

# 1.1.1

- Fixed: bonuses were never applied. The per-second update read a tick counter that does not exist in KubeJS (`player.age`); it now uses `player.tickCount`.
- Fixed: the script now runs in its own scope, so constants with the same name in other KubeJS scripts or content packs no longer stop it from loading.
- The KubeJS server log now shows a line when a player's affinity score changes, and a warning once for each equipped tome that is not in the table.

# 1.1.0

- Class weapons: holding a weapon of the tome's class in the main hand gives ±2% damage, ±3% speed (attack, bow draw or casting) and ±4% projectile velocity (bows and crossbows) per armor point.
- Class shield in either hand, or the Deflection parry effect, gives ±3% extra protection per armor point.
- Weapons from other classes get neither bonus nor penalty.

# 1.0.0

- First release.
- Tome and armor affinity for the RPG Series: ±10% max health and armor, ±5% class damage, ±2% critical chance and ±2% damage reduction per armor piece.
- Supports Wizards, Paladins & Priests, Rogues & Warriors, Archers, Archers Expansion, Elemental Wizards, Berserker, Forcemaster, Bard and Witcher tomes.
