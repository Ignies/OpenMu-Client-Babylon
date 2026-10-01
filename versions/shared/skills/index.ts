import { registerBuffLooks, registerLauncherArrows, registerSkills } from '@/controllers/skills';
import { LAUNCHER_ARROWS } from '../items/launcher_arrows';
import commonBuffLooks from './common/buff_looks';
import common_cancel_invisibility from './common/cancel_invisibility';
import common_cancel_stun from './common/cancel_stun';
import common_improve_ag from './common/improve_ag';
import common_invisibility from './common/invisibility';
import common_iron_defense from './common/iron_defense';
import common_plasma_storm from './common/plasma_storm';
import common_shield_burn from './common/shield_burn';
import common_spell_of_protection from './common/spell_of_protection';
import common_spell_of_pursuit from './common/spell_of_pursuit';
import common_spell_of_restriction from './common/spell_of_restriction';
import common_stun from './common/stun';
import common_swell_mana from './common/swell_mana';
import dark_knight_blood_storm from './dark_knight/blood_storm';
import dark_knight_combo from './dark_knight/combo';
import dark_knight_crescent_moon_slash from './dark_knight/crescent_moon_slash';
import dark_knight_cyclone from './dark_knight/cyclone';
import dark_knight_death_stab from './dark_knight/death_stab';
import dark_knight_defense from './dark_knight/defense';
import dark_knight_falling_slash from './dark_knight/falling_slash';
import dark_knight_fire_breath from './dark_knight/fire_breath';
import dark_knight_impale from './dark_knight/impale';
import dark_knight_lunge from './dark_knight/lunge';
import dark_knight_rageful_blow from './dark_knight/rageful_blow';
import dark_knight_slash from './dark_knight/slash';
import dark_knight_strike_of_destruction from './dark_knight/strike_of_destruction';
import dark_knight_swell_life from './dark_knight/swell_life';
import dark_knight_twisting_slash from './dark_knight/twisting_slash';
import dark_knight_uppercut from './dark_knight/uppercut';
import dark_lord_abolish_magic from './dark_lord/abolish_magic';
import dark_lord_brand_of_skill from './dark_lord/brand_of_skill';
import dark_lord_chaotic_diseier from './dark_lord/chaotic_diseier';
import dark_lord_earthshake from './dark_lord/earthshake';
import dark_lord_electric_spike from './dark_lord/electric_spike';
import dark_lord_fire_blast from './dark_lord/fire_blast';
import dark_lord_fire_burst from './dark_lord/fire_burst';
import dark_lord_fire_scream from './dark_lord/fire_scream';
import dark_lord_force from './dark_lord/force';
import dark_lord_force_wave from './dark_lord/force_wave';
import dark_lord_increase_critical_damage from './dark_lord/increase_critical_damage';
import dark_lord_iron_defense from './dark_lord/iron_defense';
import dark_lord_iron_defense_strengthener from './dark_lord/iron_defense/strengthener';
import dark_lord_summon from './dark_lord/summon';
import dark_wizard_aqua_beam from './dark_wizard/aqua_beam';
import dark_wizard_cometfall from './dark_wizard/cometfall';
import dark_wizard_decay from './dark_wizard/decay';
import dark_wizard_earth_prison from './dark_wizard/earth_prison';
import dark_wizard_energy_ball from './dark_wizard/energy_ball';
import dark_wizard_evil_spirit from './dark_wizard/evil_spirit';
import dark_wizard_expansion_of_wizardry from './dark_wizard/expansion_of_wizardry';
import dark_wizard_fire_ball from './dark_wizard/fire_ball';
import dark_wizard_flame from './dark_wizard/flame';
import dark_wizard_hellfire from './dark_wizard/hellfire';
import dark_wizard_ice from './dark_wizard/ice';
import dark_wizard_ice_storm from './dark_wizard/ice_storm';
import dark_wizard_inferno from './dark_wizard/inferno';
import dark_wizard_lance from './dark_wizard/lance';
import dark_wizard_lightning from './dark_wizard/lightning';
import dark_wizard_meteorite from './dark_wizard/meteorite';
import dark_wizard_nova from './dark_wizard/nova';
import dark_wizard_nova_start from './dark_wizard/nova/start';
import dark_wizard_poison from './dark_wizard/poison';
import dark_wizard_power_wave from './dark_wizard/power_wave';
import dark_wizard_soul_barrier from './dark_wizard/soul_barrier';
import dark_wizard_teleport from './dark_wizard/teleport';
import dark_wizard_teleport_ally from './dark_wizard/teleport_ally';
import dark_wizard_twister from './dark_wizard/twister';
import fairy_elf_bless from './fairy_elf/bless';
import fairy_elf_bless_strengthener from './fairy_elf/bless/strengthener';
import fairy_elf_cure from './fairy_elf/cure';
import fairy_elf_greater_damage from './fairy_elf/greater_damage';
import fairy_elf_greater_defense from './fairy_elf/greater_defense';
import fairy_elf_heal from './fairy_elf/heal';
import fairy_elf_ice_arrow from './fairy_elf/ice_arrow';
import fairy_elf_infinity_arrow from './fairy_elf/infinity_arrow';
import fairy_elf_multi_shot from './fairy_elf/multi_shot';
import fairy_elf_party_healing from './fairy_elf/party_healing';
import fairy_elf_party_healing_strengthener from './fairy_elf/party_healing/strengthener';
import fairy_elf_penetration from './fairy_elf/penetration';
import fairy_elf_poison_arrow from './fairy_elf/poison_arrow';
import fairy_elf_poison_arrow_strengthener from './fairy_elf/poison_arrow/strengthener';
import fairy_elf_recovery from './fairy_elf/recovery';
import fairy_elf_starfall from './fairy_elf/starfall';
import fairy_elf_summon_assassin from './fairy_elf/summon_assassin';
import fairy_elf_summon_bali from './fairy_elf/summon_bali';
import fairy_elf_summon_dark_knight from './fairy_elf/summon_dark_knight';
import fairy_elf_summon_elite_yeti from './fairy_elf/summon_elite_yeti';
import fairy_elf_summon_goblin from './fairy_elf/summon_goblin';
import fairy_elf_summon_satyros from './fairy_elf/summon_satyros';
import fairy_elf_summon_soldier from './fairy_elf/summon_soldier';
import fairy_elf_summon_stone_golem from './fairy_elf/summon_stone_golem';
import fairy_elf_triple_shot from './fairy_elf/triple_shot';
import magic_gladiator_fire_slash from './magic_gladiator/fire_slash';
import magic_gladiator_flame_strike from './magic_gladiator/flame_strike';
import magic_gladiator_gigantic_storm from './magic_gladiator/gigantic_storm';
import magic_gladiator_mana_rays from './magic_gladiator/mana_rays';
import magic_gladiator_power_slash from './magic_gladiator/power_slash';
import magic_gladiator_spiral_slash from './magic_gladiator/spiral_slash';
import monsters_doppelganger_self_explosion from './monsters/doppelganger_self_explosion';
import monsters_explosion from './monsters/explosion';
import monsters_flame_of_evil from './monsters/flame_of_evil';
import monsters_magic_attack_immunity from './monsters/magic_attack_immunity';
import monsters_physical_attack_immunity from './monsters/physical_attack_immunity';
import monsters_potion_of_bless from './monsters/potion_of_bless';
import monsters_potion_of_soul from './monsters/potion_of_soul';
import monsters_summon_monster from './monsters/summon_monster';
import rage_fighter_beast_uppercut from './rage_fighter/beast_uppercut';
import rage_fighter_chain_drive from './rage_fighter/chain_drive';
import rage_fighter_charge from './rage_fighter/charge';
import rage_fighter_dark_side from './rage_fighter/dark_side';
import rage_fighter_dragon_roar from './rage_fighter/dragon_roar';
import rage_fighter_dragon_slasher from './rage_fighter/dragon_slasher';
import rage_fighter_ignore_defense from './rage_fighter/ignore_defense';
import rage_fighter_increase_block from './rage_fighter/increase_block';
import rage_fighter_increase_health from './rage_fighter/increase_health';
import rage_fighter_killing_blow from './rage_fighter/killing_blow';
import rage_fighter_phoenix_shot from './rage_fighter/phoenix_shot';
import summoner_berserker from './summoner/berserker';
import summoner_blind from './summoner/blind';
import summoner_chain_lightning from './summoner/chain_lightning';
import summoner_damage_reflection from './summoner/damage_reflection';
import summoner_drain_life from './summoner/drain_life';
import summoner_explosion from './summoner/explosion';
import summoner_innovation from './summoner/innovation';
import summoner_lightning_orb from './summoner/lightning_orb';
import summoner_lightning_shock from './summoner/lightning_shock';
import summoner_pollution from './summoner/pollution';
import summoner_requiem from './summoner/requiem';
import summoner_sleep from './summoner/sleep';
import summoner_weakness from './summoner/weakness';

/** Every shared skill, one entry per file. A version picks from this list. */
export const SHARED_SKILLS = [
  common_cancel_invisibility,
  common_cancel_stun,
  common_improve_ag,
  common_invisibility,
  common_iron_defense,
  common_plasma_storm,
  common_shield_burn,
  common_spell_of_protection,
  common_spell_of_pursuit,
  common_spell_of_restriction,
  common_stun,
  common_swell_mana,
  dark_knight_blood_storm,
  dark_knight_combo,
  dark_knight_crescent_moon_slash,
  dark_knight_cyclone,
  dark_knight_death_stab,
  dark_knight_defense,
  dark_knight_falling_slash,
  dark_knight_fire_breath,
  dark_knight_impale,
  dark_knight_lunge,
  dark_knight_rageful_blow,
  dark_knight_slash,
  dark_knight_strike_of_destruction,
  dark_knight_swell_life,
  dark_knight_twisting_slash,
  dark_knight_uppercut,
  dark_lord_abolish_magic,
  dark_lord_brand_of_skill,
  dark_lord_chaotic_diseier,
  dark_lord_earthshake,
  dark_lord_electric_spike,
  dark_lord_fire_blast,
  dark_lord_fire_burst,
  dark_lord_fire_scream,
  dark_lord_force,
  dark_lord_force_wave,
  dark_lord_increase_critical_damage,
  dark_lord_iron_defense,
  dark_lord_iron_defense_strengthener,
  dark_lord_summon,
  dark_wizard_aqua_beam,
  dark_wizard_cometfall,
  dark_wizard_decay,
  dark_wizard_earth_prison,
  dark_wizard_energy_ball,
  dark_wizard_evil_spirit,
  dark_wizard_expansion_of_wizardry,
  dark_wizard_fire_ball,
  dark_wizard_flame,
  dark_wizard_hellfire,
  dark_wizard_ice,
  dark_wizard_ice_storm,
  dark_wizard_inferno,
  dark_wizard_lance,
  dark_wizard_lightning,
  dark_wizard_meteorite,
  dark_wizard_nova,
  dark_wizard_nova_start,
  dark_wizard_poison,
  dark_wizard_power_wave,
  dark_wizard_soul_barrier,
  dark_wizard_teleport,
  dark_wizard_teleport_ally,
  dark_wizard_twister,
  fairy_elf_bless,
  fairy_elf_bless_strengthener,
  fairy_elf_cure,
  fairy_elf_greater_damage,
  fairy_elf_greater_defense,
  fairy_elf_heal,
  fairy_elf_ice_arrow,
  fairy_elf_infinity_arrow,
  fairy_elf_multi_shot,
  fairy_elf_party_healing,
  fairy_elf_party_healing_strengthener,
  fairy_elf_penetration,
  fairy_elf_poison_arrow,
  fairy_elf_poison_arrow_strengthener,
  fairy_elf_recovery,
  fairy_elf_starfall,
  fairy_elf_summon_assassin,
  fairy_elf_summon_bali,
  fairy_elf_summon_dark_knight,
  fairy_elf_summon_elite_yeti,
  fairy_elf_summon_goblin,
  fairy_elf_summon_satyros,
  fairy_elf_summon_soldier,
  fairy_elf_summon_stone_golem,
  fairy_elf_triple_shot,
  magic_gladiator_fire_slash,
  magic_gladiator_flame_strike,
  magic_gladiator_gigantic_storm,
  magic_gladiator_mana_rays,
  magic_gladiator_power_slash,
  magic_gladiator_spiral_slash,
  monsters_doppelganger_self_explosion,
  monsters_explosion,
  monsters_flame_of_evil,
  monsters_magic_attack_immunity,
  monsters_physical_attack_immunity,
  monsters_potion_of_bless,
  monsters_potion_of_soul,
  monsters_summon_monster,
  rage_fighter_beast_uppercut,
  rage_fighter_chain_drive,
  rage_fighter_charge,
  rage_fighter_dark_side,
  rage_fighter_dragon_roar,
  rage_fighter_dragon_slasher,
  rage_fighter_ignore_defense,
  rage_fighter_increase_block,
  rage_fighter_increase_health,
  rage_fighter_killing_blow,
  rage_fighter_phoenix_shot,
  summoner_berserker,
  summoner_blind,
  summoner_chain_lightning,
  summoner_damage_reflection,
  summoner_drain_life,
  summoner_explosion,
  summoner_innovation,
  summoner_lightning_orb,
  summoner_lightning_shock,
  summoner_pollution,
  summoner_requiem,
  summoner_sleep,
  summoner_weakness,
];

registerSkills(SHARED_SKILLS);
registerBuffLooks(commonBuffLooks);
registerLauncherArrows(LAUNCHER_ARROWS);
