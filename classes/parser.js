"use strict";
exports.__esModule = true;
exports.parse_events = exports.PARSERS = exports.EventParser = void 0;
var EventParser = /** @class */ (function () {
    function EventParser(name, raw_patt, types) {
        this.name = name;
        this.patt = new RegExp(raw_patt);
        this.types = types;
        this.groupCount = (new RegExp(this.patt.toString() + '|')).exec('').length - 1;
        if (this.groupCount !== this.types.length)
            throw Error(this.name);
    }
    EventParser.prototype.parse = function (line) {
        var _this = this;
        var match = this.patt.exec(line);
        if (match === null)
            return null;
        match.groups = match.groups || {};
        var keys = Object.keys(match.groups);
        var result = Object.fromEntries(keys.map(function (k, i) {
            var converter = _this.types[i];
            return [k, converter(match.groups[k])];
        }));
        result.event_type = this.name;
        return result;
    };
    return EventParser;
}());
exports.EventParser = EventParser;
var Group = function (name, patt) { return "(?<".concat(name, ">").concat(patt, ")"); };
var Float = function (name) { return Group(name, '\\d+(?:\\.\\d*)?'); };
var Mult = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    return Group('multiplier_type', args.join('|'));
};
var Num = function (name) { return Group(name, '\\d+?'); };
var Word = function (name) { return Group(name, '[\\w\\s-]+'); };
var Words = function (name) { return Group(name, '[\\w\\s- ]+'); };
var Monster = function () { return Group('monster', '[\\w\\s-+]+'); }; // "New Game +" is a valid monster name
var Resist = "(?: \\\((?<resist>\d+)% resisted\\\))?";
var EnemySpell = "".concat(Monster(), " ").concat(Group('spell_type', 'casts|uses'), " ").concat(Words('skill'));
exports.PARSERS = {
    // Actions
    PLAYER_BASIC: new EventParser('PLAYER_BASIC', "".concat(Words('spell'), " ").concat(Mult('hits', 'crits'), " (?!you)").concat(Monster(), " for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage\\."), [String, String, String, Number, String]),
    PLAYER_MISS: new EventParser('PLAYER_MISS', "".concat(Monster(), " ").concat(Mult('parries'), " your attack."), [String, String]),
    PLAYER_ITEM: new EventParser('PLAYER_ITEM', "You use ".concat(Words('item'), "\\."), [String]),
    PLAYER_SKILL: new EventParser('PLAYER_SKILL', "You cast ".concat(Words('spell'), "\\."), [String]),
    PLAYER_DODGE: new EventParser('PLAYER_DODGE', "You ".concat(Mult('evade', 'parry'), " the attack from ").concat(Monster(), "\\."), [String, String]),
    ENEMY_BASIC: new EventParser('ENEMY_BASIC', "".concat(Monster(), " ").concat(Mult('hits', 'crits'), " you for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage\\."), [String, String, Number, String]),
    ENEMY_SKILL_ABSORB: new EventParser('ENEMY_SKILL_ABSORB', "".concat(EnemySpell, ", but is ").concat(Mult('absorb'), "ed\\. You gain ").concat(Word('mp')), [String, String, String, String, String]),
    ENEMY_SKILL_MISS: new EventParser('ENEMY_SKILL_MISS', "".concat(EnemySpell, "\\. You ").concat(Mult('evade', 'parry'), " the attack\\."), [String, String, String, String]),
    ENEMY_SKILL_SUCCESS: new EventParser('ENEMY_SKILL_SUCCESS', "".concat(EnemySpell, ", and ").concat(Mult('hits', 'crits'), " you for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage").concat(Resist, "\\.?"), [String, String, String, String, Number, String, Number]),
    // Effects
    PLAYER_BUFF: new EventParser('PLAYER_BUFF', "You gain the effect ".concat(Words('effect'), "\\."), [String]),
    PLAYER_SPELL_DAMAGE: new EventParser('PLAYER_SPELL_DAMAGE', "".concat(Words('spell'), " ").concat(Mult('hits', 'blasts'), " ").concat(Monster(), " for ").concat(Num('value'), "(?: ").concat(Word('damage_type'), ")? damage").concat(Resist), [String, String, String, Number, String, Number]),
    RIDDLE_RESTORE: new EventParser('RIDDLE_RESTORE', "Time Bonus: Recovered ".concat(Num('hp'), " HP, ").concat(Num('mp'), " MP and ").concat(Num('sp'), " SP\\."), [Number, Number, Number]),
    EFFECT_RESTORE: new EventParser('EFFECT_RESTORE', "".concat(Words('effect'), " restores ").concat(Num('value'), " points of ").concat(Word('type'), "\\."), [String, Number, String]),
    ITEM_RESTORE: new EventParser('ITEM_RESTORE', "Recovered ".concat(Num('value'), " points of ").concat(Word('type'), "\\."), [Number, String]),
    CURE_RESTORE: new EventParser('CURE_RESTORE', "You are healed for ".concat(Num('value'), " Health Points\\."), [Number]),
    SPIRIT_SHIELD: new EventParser('SPIRIT_SHIELD', "Your spirit shield absorbs ".concat(Num('damage'), " points of damage from the attack into ").concat(Num('spirit_damage'), " points of spirit damage\\."), [Number, Number]),
    SPARK_TRIGGER: new EventParser('SPARK_TRIGGER', "Your Spark of Life restores you from the brink of defeat\\.", []),
    DISPEL: new EventParser('DISPEL', "The effect ".concat(Words('effect'), " was dispelled\\."), [String]),
    COOLDOWN_EXPIRE: new EventParser('COOLDOWN_EXPIRE', "Cooldown expired for ".concat(Words('spell')), [String]),
    BUFF_EXPIRE: new EventParser('DEBUFF_EXPIRE', "The effect ".concat(Words('effect'), " has expired\\."), [String]),
    RESIST: new EventParser('RESIST', "".concat(Monster(), " resists your spell\\."), [String]),
    DEBUFF: new EventParser('DEBUFF', "".concat(Monster(), " gains the effect ").concat(Words('name'), "\\."), [String, String]),
    DEBUFF_EXPIRE: new EventParser('DEBUFF_EXPIRE', "The effect ".concat(Words('effect'), " on ").concat(Monster(), " has expired\\."), [String, String]),
    // Info
    ROUND_START: new EventParser('ROUND_START', "Initializing ".concat(Group('battle_type', '[\\w\\s\\d#]+'), " \\(Round ").concat(Num('current'), " / ").concat(Num('max'), "\\) \\.\\.\\."), [String, Number, Number]),
    ROUND_END: new EventParser('ROUND_END', "You are Victorious!", []),
    FLEE: new EventParser('FLEE', 'You have escaped from the battle\\.', []),
    SPAWN: new EventParser('SPAWN', "Spawned Monster ".concat(Group('letter', '[A-Z]'), ": MID=").concat(Num('mid'), " \\(").concat(Monster(), "\\) LV=").concat(Num('level'), " HP=").concat(Num('hp')), [String, Number, String, Number, Number]),
    DEATH: new EventParser('DEATH', "".concat(Monster(), " has been defeated\\."), [String]),
    RIDDLE_MASTER: new EventParser('RIDDLE_MASTER', "The Riddlemaster listens.*", []),
    GEM: new EventParser('GEM', "".concat(Monster(), " drops a ").concat(Words('type'), " powerup!"), [String, String]),
    CREDITS: new EventParser('CREDITS', "You gain ".concat(Num('value'), " Credits!"), [Number]),
    DROP: new EventParser('DROP', "".concat(Monster(), " dropped \\[").concat(Group('item', '.*'), "\\]"), [String, String]),
    PROFICIENCY: new EventParser('PROFICIENCY', "You gain ".concat(Float('value'), " points of ").concat(Words('type'), "\\."), [Number, String]),
    EXPERIENCE: new EventParser('EXPERIENCE', "You gain ".concat(Num('value'), " EXP!"), [Number]),
    AUTO_SALVAGE: new EventParser('AUTO_SALVAGE', "A traveling salesmoogle salvages it into ".concat(Num('value'), "x \\[").concat(Words('item'), "\\]"), [Number, String]),
    AUTO_SELL: new EventParser('AUTO_SELL', "A traveling salesmoogle gives you \\[".concat(Num('value'), " Credits\\] for it\\."), [Number]),
    CLEAR_BONUS: new EventParser('CLEAR_BONUS', "Battle Clear Bonus! \\[".concat(Words('item'), "\\]"), [String]),
    TOKEN_BONUS: new EventParser('TOKEN_BONUS', "Arena Token Bonus! \\[".concat(Words('item'), "\\]"), [String]),
    EVENT_ITEM: new EventParser('EVENT_ITEM', "You found a \\[".concat(Words('item'), "\\]"), [String]),
    MB_USAGE: new EventParser('MB_USAGE', "Used: ".concat(Group('value', '.*')), [String])
};
function parse_events(lines) {
    var ps = Object.values(exports.PARSERS);
    var result = lines.map(function (l) {
        for (var _i = 0, ps_1 = ps; _i < ps_1.length; _i++) {
            var parser = ps_1[_i];
            var result_1 = parser.parse(l);
            if (result_1)
                return result_1;
        }
        return null;
    });
    return JSON.stringify(result);
}
exports.parse_events = parse_events;
