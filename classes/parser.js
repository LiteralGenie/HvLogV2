"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parse_events = exports.PARSERS = exports.EventParser = void 0;
class EventParser {
    constructor(name, raw_patt, types) {
        this.name = name;
        this.patt = new RegExp(raw_patt);
        this.types = types;
        this.groupCount = (new RegExp(this.patt.toString() + '|')).exec('').length - 1;
        if (this.groupCount !== this.types.length)
            throw Error();
    }
    parse(line) {
        const match = this.patt.exec(line);
        if (match === null)
            return null;
        match.groups = match.groups || {};
        const keys = Object.keys(match.groups);
        const result = Object.fromEntries(keys.map((k, i) => {
            const converter = this.types[i];
            return [k, converter(match.groups[k])];
        }));
        result.event_type = this.name;
        return result;
    }
}
exports.EventParser = EventParser;
const Group = (name, patt) => `(?<${name}>${patt})`;
const Float = (name) => Group(name, '\\d+(?:\\.\\d*)?');
const Mult = (...args) => Group('multiplier_type', args.join('|'));
const Num = (name) => Group(name, '\\d+?');
const Word = (name) => Group(name, '[\\w\\s-]+');
const Resist = "(?: \\\((?<resist>\d+)% resisted\\\))?";
const EnemySpell = `${Word('monster')} ${Group('spell_type', 'casts|uses')} ${Word('skill')}`;
exports.PARSERS = {
    // Actions
    PLAYER_BASIC: new EventParser('PLAYER_BASIC', `${Word('name')} ${Mult('hits', 'crits')} (?!you)${Word('monster')} for ${Num('value')} ${Word('damage_type')} damage\\.`, [String, String, String, Number, String]),
    PLAYER_MISS: new EventParser('PLAYER_MISS', `${Word('monster')} ${Mult('parries')} your attack.`, [String, String]),
    PLAYER_ITEM: new EventParser('PLAYER_ITEM', `You use ${Word('name')}\\.`, [String]),
    PLAYER_SKILL: new EventParser('PLAYER_SKILL', `You cast ${Word('name')}\\.`, [String]),
    PLAYER_DODGE: new EventParser('PLAYER_DODGE', `You ${Mult('evade', 'parry')} the attack from ${Word('monster')}\\.`, [String, String]),
    ENEMY_BASIC: new EventParser('ENEMY_BASIC', `${Word('monster')} ${Mult('hits', 'crits')} you for ${Num('value')} ${Word('damage_type')} damage\\.`, [String, String, Number, String]),
    ENEMY_SKILL_ABSORB: new EventParser('ENEMY_SKILL_ABSORB', `${EnemySpell}, but is ${Mult('absorb')}ed\\. You gain ${Word('mana')}`, [String, String, String, String, String]),
    ENEMY_SKILL_MISS: new EventParser('ENEMY_SKILL_MISS', `${EnemySpell}\\. You ${Mult('evade', 'parry')} the attack\\.`, [String, String, String, String]),
    ENEMY_SKILL_SUCCESS: new EventParser('ENEMY_SKILL_SUCCESS', `${EnemySpell}, and ${Mult('hits', 'crits')} you for ${Num('value')} ${Word('damage_type')} damage${Resist}\\.?`, [String, String, String, String, Number, String, Number]),
    // Effects
    PLAYER_BUFF: new EventParser('PLAYER_BUFF', `You gain the effect ${Word('name')}\\.`, [String]),
    PLAYER_SKILL_DAMAGE: new EventParser('PLAYER_SKILL_DAMAGE', `${Word('name')} ${Mult('hits', 'blasts')} ${Word('monster')} for ${Num('value')} ${Word('damage_type')} damage${Resist}`, [String, String, String, Number, String, Number]),
    RIDDLE_RESTORE: new EventParser('RIDDLE_RESTORE', `Time Bonus: recovered ${Num('hp')} HP and ${Num('mp')} MP\\.`, [Number, Number]),
    EFFECT_RESTORE: new EventParser('EFFECT_RESTORE', `${Word('name')} restores ${Num('value')} points of ${Word('type')}\\.`, [String, Number, String]),
    ITEM_RESTORE: new EventParser('ITEM_RESTORE', `Recovered ${Num('value')} points of ${Word('type')}\\.`, [Number, String]),
    CURE_RESTORE: new EventParser('CURE_RESTORE', `You are healed for ${Num('value')} Health Points\\.`, [Number]),
    SPIRIT_SHIELD: new EventParser('SPIRIT_SHIELD', `Your spirit shield absorbs ${Num('damage')} points of damage from the attack into ${Num('spirit_damage')} points of spirit damage\\.`, [Number, Number]),
    SPARK_TRIGGER: new EventParser('SPARK_TRIGGER', `Your Spark of Life restores you from the brink of defeat\\.`, []),
    DISPEL: new EventParser('DISPEL', `The effect ${Word('name')} was dispelled\\.`, [String]),
    COOLDOWN_EXPIRE: new EventParser('COOLDOWN_EXPIRE', `Cooldown expired for ${Word('name')}`, [String]),
    DEBUFF_EXPIRE: new EventParser('DEBUFF_EXPIRE', `The effect ${Word('name')} has expired\\.`, [String]),
    // Info
    ROUND_END: new EventParser('ROUND_END', `${Word('monster')} resists your spell\\.`, [String]),
    ROUND_START: new EventParser('ROUND_START', `Initializing ${Group('battle_type', '[\\w\\s\\d#]+')} \\\(Round ${Num('current')} / ${Num('max')}\\\) \\.\\.\\.`, [String, Number, Number]),
    SPAWN: new EventParser('SPAWN', `Spawned Monster ${Group('letter', '[A-Z]')}: MID=${Num('mid')} \\\(${Word('monster')}\\\) LV=${Num('level')} HP=${Num('hp')}`, [String, Number, String, Number, Number]),
    DEATH: new EventParser('DEATH', `${Word('monster')} has been defeated\\.`, [String]),
    GEM: new EventParser('GEM', `${Word('monster')} drops a ${Word('type')} Gem powerup!`, [String, String]),
    DROP: new EventParser('DROP', `You gain ${Num('value')} Credits!`, [Number]),
    PROFICIENCY: new EventParser('PROFICIENCY', `${Word('monster')} dropped \\[${Group('item', '.*')}\\]`, [String, String]),
    EXPERIENCE: new EventParser('EXPERIENCE', `You gain $${Float('value')} points of $${Word('type')} proficiency\\.`, [Number, String]),
    AUTO_SALVAGE: new EventParser('AUTO_SALVAGE', `You gain $${Num('value')} EXP!`, [Number]),
    AUTO_SELL: new EventParser('AUTO_SELL', `A traveling salesmoogle salvages it into $${Num('value')}x \\[${Word('item')}\\]`, [Number, String]),
    GRINDFEST_CREDITS: new EventParser('GRINDFEST_CREDITS', `A traveling salesmoogle gives you \\[${Num('value')} Credits\\] for it\\.`, [Number]),
    CLEAR_BONUS: new EventParser('CLEAR_BONUS', `Battle Clear Bonus! \\[${Word('item')}\\]`, [String]),
    TOKEN_BONUS: new EventParser('TOKEN_BONUS', `Arena Token Bonus! \\[${Word('item')}\\]`, [String]),
    EVENT_ITEM: new EventParser('EVENT_ITEM', `You found a \\[${Word('item')}\\]`, [String]),
    MB_USAGE: new EventParser('MB_USAGE', `Used: ${Group('value', '.*')}`, [String]),
};
function parse_events(lines) {
    const ps = Object.values(exports.PARSERS);
    return lines.map(l => {
        for (let parser of ps) {
            const result = parser.parse(l);
            if (result)
                return result;
        }
        return null;
    });
}
exports.parse_events = parse_events;
