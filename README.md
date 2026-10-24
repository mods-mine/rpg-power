# RPG Power

**Dress for your tome.** RPG Power ties the RPG Series spell books to their class armor: wear the armor set of the tome you have equipped and you get stronger; wear someone else's armor and you get weaker.

*Unofficial addon. Not affiliated with the RPG Series authors.*

## How it works

With a spell book in the **Curios spell book slot**, each of your 4 armor pieces is scored:

| Armor piece | Score |
|---|---|
| From the equipped tome's armor set | **+1** |
| From any other set (another class, vanilla, other mods) | **-1** |
| Empty slot | 0 |

For every point (from -4 to +4) you get:

- **±10%** max health
- **±10%** armor
- **±5%** class damage (melee, ranged or the tome's spell school)
- **±2%** critical chance (physical and/or spell critical, depending on the class)
- **±2%** damage reduction (a negative score means you take extra damage)

Caster tomes (Wizard, Elemental Wizard, Priest, Paladin, Bard and Forcemaster) also get **+2% spell power** per piece of their own set. Wrong pieces do not reduce it.

Hunter tomes (Archer, Deadeye, Tundra Hunter, War Archer, Rogue and Berserker) get **+2% movement speed** per piece of their own set, also without penalty for wrong pieces.

Melee tomes (Warrior, Rogue, Berserker, Paladin, Forcemaster and Witcher) get **+0.5 block of attack reach** per piece of their own set while holding a class melee weapon, also without penalty. Better Combat reads the same vanilla reach attribute, so the bonus applies there too.

### Class weapons

Holding a weapon of the tome's class in the main hand, each point also gives:

- **±2%** damage
- **±3%** speed: attack speed for melee weapons, draw speed for bows and crossbows, casting speed for staves, wands, lutes and lyres
- **±4%** projectile velocity (bows and crossbows)
- **±3%** extra protection while holding the class shield (either hand) or while the **Deflection** parry effect is active

Weapons from other classes get neither bonus nor penalty.

### Tome descriptions

Hover a supported tome to see all of this in game: the bonuses for its armor set, the penalties for other armor, the class weapon and shield/parry effects, the accepted armor sets and the class weapons. The description is written by the server, so it works for every player; installing RPG Power on the client shows it in the player's language (English and Brazilian Portuguese included).

A full matching set gives **+40% health and armor, +20% damage, +8% critical chance and 8% damage reduction**. A full set of the wrong armor applies the same values as penalties. Without a tome equipped, nothing changes.

The values are refreshed every second and use fixed attribute modifier IDs, so they never stack.

## Supported tomes

| Tome | Armor sets | Damage bonus | Critical |
|---|---|---|---|
| Wizard: Arcane / Fire / Frost | Wizard Robe (all three) + the school's robes | Arcane / Fire / Frost power | Spell |
| Elemental Wizard: Aqua / Terra / Wind | Elemental (all three) + Kelp / Dripstone / Wind and their variants | Water / Earth / Air power | Spell |
| Paladin | Paladin, Crusader | Melee + Healing | Physical + Spell |
| Priest | Priest, Prior | Healing | Spell |
| Rogue | Rogue, Assassin | Melee | Physical |
| Warrior | Warrior, Berserker | Melee | Physical |
| Berserker | Wildling, Northling, Warlord | Melee | Physical |
| Forcemaster | Oriene, Aken, Billporon, Phasleb | Melee + Arcane | Physical + Spell |
| Bard | Entertainer, Storyteller, Troubadour | Arcane | Spell |
| Archer, Deadeye, Tundra Hunter, War Archer | Archer + each tome's own set | Ranged (+ Frost / Fire for Tundra Hunter / War Archer) | Physical |
| Witcher: Fencing / Signs | Every Witcher school armor | Melee (+ Sign Intensity for Signs) | Physical |

Class weapons: Wizard staves and wands of the same school (generic ones count for every school), Elemental staves and wands of the same element, Paladin maces, hammers, claymores and shields, Priest holy staves and wands, Rogue daggers and sickles, Warrior double axes and glaives, Berserker axes, Forcemaster knuckles, Bard lutes, lyres, harp crossbows and rapiers, Archer bows, crossbows and spears (vanilla bow and crossbow included), Witcher swords. Arsenal unique weapons of the same type count too.

Vanilla weapons count as their class equivalent: swords for Witcher, axes for Warrior and Berserker, hoes (as sickles) for Rogue, the mace for Paladin, the trident (as a spear) for the archer tomes and the crossbow (as a harp crossbow) for Bard. Only Minecraft's own items count; swords and axes from other mods are not treated as vanilla.

Netherite and loot variants of each set are included. Class mods that are not installed are simply ignored.

## Requirements

- Minecraft **1.21.1**, **NeoForge**
- [KubeJS](https://modrinth.com/mod/kubejs) (2101.7.2-build.374 or newer)
- [KubeLoader](https://modrinth.com/mod/kubeloader) (21-0.1.0-Alpha-3 or newer)
- [Curios API](https://modrinth.com/mod/curios)
- [Spell Engine](https://modrinth.com/mod/spell-engine) and [Spell Power Attributes](https://modrinth.com/mod/spell-power)
- Optional: [Critical Strike](https://modrinth.com/mod/critical-strike) (physical critical chance) and [Ranged Weapon API](https://modrinth.com/mod/ranged-weapon-api) (ranged damage)
- At least one RPG Series class mod: [Wizards](https://modrinth.com/mod/wizards), [Paladins & Priests](https://modrinth.com/mod/paladins-and-priests), [Rogues & Warriors](https://modrinth.com/mod/rogues-and-warriors), [Archers](https://modrinth.com/mod/archers), [Archers Expansion](https://modrinth.com/mod/archers-expansion), [Elemental Wizards](https://modrinth.com/mod/elemental-wizards-rpg), [Berserker](https://modrinth.com/mod/berserker-rpg-class), [Forcemaster](https://modrinth.com/mod/forcemaster-rpg-class), [Bard](https://modrinth.com/mod/bard-more-rpg-classes), [Witcher](https://modrinth.com/mod/witcher-rpg-class)

RPG Power runs on the **server**. In single player it runs on the integrated server; on a dedicated server, players do not need it installed (installing it on the client only translates the tome descriptions).

## Customizing

The mod is a KubeLoader content pack: the logic is a single KubeJS script at `contentpacks/server_scripts/rpg_power.js` inside the jar. To change the percentages, edit the `PER_PIECE_*` values. To add armor sets or tomes from other mods, edit the `TOMES` table. Then re-zip the jar.

## Compatibility

Everything is looked up by ID at runtime, so regular RPG Series updates keep working. If a mod renames an item or attribute, that piece or bonus is skipped (a warning is written to the KubeJS server log) until the table is updated. Minecraft 1.20.1 is not supported.

## Building

The jar is just the contents of `src/` zipped, with `META-INF/MANIFEST.MF` as the first entry:

```sh
cd src
zip -X ../rpg_power-<version>.jar META-INF/MANIFEST.MF
zip -X -r ../rpg_power-<version>.jar . -x META-INF/MANIFEST.MF
```

## License

[MIT](LICENSE)

---

# RPG Power (Português)

**Vista-se para o seu tomo.** O RPG Power liga os tomos do RPG Series às armaduras de cada classe: com a armadura do tomo equipado você fica mais forte; com a armadura de outra classe, mais fraco.

Com um tomo no **slot de tomo do Curios**, cada peça do conjunto do tomo vale **+1**, cada peça de outro conjunto (outra classe, vanilla ou outros mods) vale **-1** e slot vazio vale 0. Por ponto (de -4 a +4): **±10%** de vida máxima e de armadura, **±5%** de dano da classe, **±2%** de chance de crítico e **±2%** de redução de dano. Tomos de conjuradores (mago, mago elemental, sacerdote, paladino, bardo e forcemaster) ganham também **+2% de poder mágico** por peça certa, sem penalidade pelas erradas; tomos de caçadores (arqueiros, ladino e berserker) ganham **+2% de velocidade de deslocamento** por peça certa, também sem penalidade; tomos de combate corpo a corpo (guerreiro, ladino, berserker, paladino, forcemaster e witcher) ganham **+0,5 bloco de alcance** por peça certa ao usar uma arma corpo a corpo da classe. Com uma arma da classe na mão principal, cada ponto também dá **±2%** de dano, **±3%** de velocidade (ataque, puxada ou conjuração) e **±4%** de velocidade do projétil; com o escudo da classe ou o Deflection (aparar) ativo, **±3%** de proteção. Sem tomo equipado, nada muda. Passe o mouse sobre o tomo para ver todos esses efeitos no jogo.

Requisitos: Minecraft 1.21.1 NeoForge, KubeJS, KubeLoader, Curios API, Spell Engine e Spell Power Attributes (Critical Strike e Ranged Weapon API são opcionais). Roda só no servidor.
