# 1.6.0

- Vanilla weapons now count as the equivalent class weapons: swords for Witcher, axes for Warrior and Berserker, hoes (sickles) for Rogue, the mace for Paladin, the trident (spear) for the archer tomes and the crossbow (harp crossbow) for Bard. Bows, crossbows and shields already counted.
- Only Minecraft's own items count as equivalents; swords and axes that other mods add to the vanilla tags are not.
- The tome description lists the vanilla equivalents.

# 1.5.0

- Melee classes (Warrior, Rogue, Berserker, Paladin, Forcemaster and Witcher tomes) gain +0.5 block of attack reach per piece of the tome's armor set while holding a class melee weapon. Other armor pieces do not reduce it. Works with Better Combat, which reads the same vanilla reach attribute.
- The tome description shows the new bonus for melee tomes.

# 1.4.0

- Hunters (Archer, Deadeye, Tundra Hunter, War Archer, Rogue and Berserker tomes) gain +2% movement speed per piece of the tome's armor set. Other armor pieces do not reduce it.
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
