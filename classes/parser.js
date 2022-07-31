(function (factory) {
    if (typeof module === "object" && typeof module.exports === "object") {
        var v = factory(require, exports);
        if (v !== undefined) module.exports = v;
    }
    else if (typeof define === "function" && define.amd) {
        define(["require", "exports"], factory);
    }
})(function (require, exports) {
    "use strict";
    exports.__esModule = true;
    exports.PARSERS = exports.EventParser = void 0;
    var EventParser = /** @class */ (function () {
        function EventParser(raw_patt, types) {
            this.patt = new RegExp(raw_patt);
            this.types = types;
            this.groupCount = (new RegExp(this.patt.toString() + '|')).exec('').length - 1;
            if (this.groupCount !== this.types.length)
                throw Error();
        }
        EventParser.prototype.parse = function (line) {
            var _this = this;
            var match = this.patt.exec(line);
            if (match === null)
                return null;
            var keys = Object.keys(match.groups);
            var result = Object.fromEntries(keys.map(function (k, i) {
                var converter = _this.types[i];
                return [k, converter(match.groups[k])];
            }));
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
    var Resist = "(?: \\\((?<resist>\d+)% resisted\\\))?";
    var EnemySpell = "".concat(Word('monster'), " ").concat(Group('spell_type', 'casts|uses'), " ").concat(Word('skill'));
    exports.PARSERS = {
        // Actions
        PLAYER_BASIC: new EventParser("".concat(Word('name'), " ").concat(Mult('hits', 'crits'), " (?!you)").concat(Word('monster'), " for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage\\."), [String, String, String, Number, String]),
        PLAYER_MISS: new EventParser("".concat(Word('monster'), " ").concat(Mult('parries'), " your attack."), [String, String]),
        PLAYER_ITEM: new EventParser("You use ".concat(Word('name'), "\\."), [String]),
        PLAYER_SKILL: new EventParser("You cast ".concat(Word('name'), "\\."), [String]),
        PLAYER_DODGE: new EventParser("You ".concat(Mult('evade', 'parry'), " the attack from ").concat(Word('monster'), "\\."), [String, String]),
        ENEMY_BASIC: new EventParser("".concat(Word('monster'), " ").concat(Mult('hits', 'crits'), " you for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage\\."), [String, String, Number, String]),
        ENEMY_SKILL_ABSORB: new EventParser("".concat(EnemySpell, ", but is ").concat(Mult('absorb'), "ed\\. You gain ").concat(Word('mana')), [String, String, String, String, String]),
        ENEMY_SKILL_MISS: new EventParser("".concat(EnemySpell, "\\. You ").concat(Mult('evade', 'parry'), " the attack\\."), [String, String, String, String]),
        ENEMY_SKILL_SUCCESS: new EventParser("".concat(EnemySpell, ", and ").concat(Mult('hits', 'crits'), " you for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage").concat(Resist, "\\.?"), [String, String, String, String, Number, String, Number]),
        // Effects
        PLAYER_BUFF: new EventParser("You gain the effect ".concat(Word('name'), "\\."), [String]),
        PLAYER_SKILL_DAMAGE: new EventParser("".concat(Word('name'), " ").concat(Mult('hits', 'blasts'), " ").concat(Word('monster'), " for ").concat(Num('value'), " ").concat(Word('damage_type'), " damage").concat(Resist), [String, String, String, Number, String, Number]),
        RIDDLE_RESTORE: new EventParser("Time Bonus: recovered ".concat(Num('hp'), " HP and ").concat(Num('mp'), " MP\\."), [Number, Number]),
        EFFECT_RESTORE: new EventParser("".concat(Word('name'), " restores ").concat(Num('value'), " points of ").concat(Word('type'), "\\."), [String, Number, String]),
        ITEM_RESTORE: new EventParser("Recovered ".concat(Num('value'), " points of ").concat(Word('type'), "\\."), [Number, String]),
        CURE_RESTORE: new EventParser("You are healed for ".concat(Num('value'), " Health Points\\."), [Number]),
        SPIRIT_SHIELD: new EventParser("Your spirit shield absorbs ".concat(Num('damage'), " points of damage from the attack into ").concat(Num('spirit_damage'), " points of spirit damage\\."), [Number, Number]),
        SPARK_TRIGGER: new EventParser("Your Spark of Life restores you from the brink of defeat\\.", []),
        DISPEL: new EventParser("The effect ".concat(Word('name'), " was dispelled\\."), [String]),
        COOLDOWN_EXPIRE: new EventParser("Cooldown expired for ".concat(Word('name')), [String]),
        DEBUFF_EXPIRE: new EventParser("The effect ".concat(Word('name'), " has expired\\."), [String]),
        // Info
        ROUND_END: new EventParser("".concat(Word('monster'), " resists your spell\\."), [String]),
        ROUND_START: new EventParser("Initializing ".concat(Group('battle_type', '[\\w\\s\\d#]+'), " \\(Round ").concat(Num('current'), " / ").concat(Num('max'), "\\) \\.\\.\\."), [String, Number, Number]),
        SPAWN: new EventParser("Spawned Monster ".concat(Group('letter', '[A-Z]'), ": MID=").concat(Num('mid'), " \\(").concat(Word('monster'), "\\) LV=").concat(Num('level'), " HP=").concat(Num('hp')), [String, Number, String, Number, Number]),
        DEATH: new EventParser("".concat(Word('monster'), " has been defeated\\."), [String]),
        GEM: new EventParser("".concat(Word('monster'), " drops a ").concat(Word('type'), " Gem powerup!"), [String, String]),
        DROP: new EventParser("You gain ".concat(Num('value'), " Credits!"), [Number]),
        PROFICIENCY: new EventParser("".concat(Word('monster'), " dropped \\[").concat(Group('item', '.*'), "\\]"), [String, String]),
        EXPERIENCE: new EventParser("You gain $".concat(Float('value'), " points of $").concat(Word('type'), " proficiency\\."), [Number, String]),
        AUTO_SALVAGE: new EventParser("You gain $".concat(Num('value'), " EXP!"), [Number]),
        AUTO_SELL: new EventParser("A traveling salesmoogle salvages it into $".concat(Num('value'), "x \\[").concat(Word('item'), "\\]"), [Number, String]),
        GRINDFEST_CREDITS: new EventParser("A traveling salesmoogle gives you \\[".concat(Num('value'), " Credits\\] for it\\."), [Number]),
        CLEAR_BONUS: new EventParser("Battle Clear Bonus! \\[".concat(Word('item'), "\\]"), [String]),
        TOKEN_BONUS: new EventParser("Arena Token Bonus! \\[".concat(Word('item'), "\\]"), [String]),
        EVENT_ITEM: new EventParser("You found a \\[".concat(Word('item'), "\\]"), [String]),
        MB_USAGE: new EventParser("Used: ".concat(Group('value', '.*')), [String])
    };
});
