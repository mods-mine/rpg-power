// RPG Power - Arcane Armor effect
// Registers the status effect applied by the "Arcane Armor" spell (rpg_power:armor_<tome>).
// The damage reduction itself is applied in server_scripts/rpg_power_arcane_armor.js.

StartupEvents.registry('mob_effect', event => {
  event.create('rpg_power:arcane_armor')
    .color(0xB066FF)
    .beneficial()

  // Technical effect: the Stun spell applies it to the caster and the script reads it, then removes it
  event.create('rpg_power:stun_cast')
    .color(0xC8C8D2)
    .beneficial()

  // Shown on stunned mobs (Jade lists it with the time left)
  event.create('rpg_power:stunned')
    .color(0xC8C8D2)
    .harmful()

  event.create('rpg_power:evasion')
    .color(0x6EC850)
    .beneficial()
})
