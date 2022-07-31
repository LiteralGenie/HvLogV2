export class EventParser {
    patt: RegExp
    types: Array<StringConstructor | NumberConstructor>
    groupCount: number

    constructor(raw_patt: string, types: Array<StringConstructor | NumberConstructor>) {
        this.patt = new RegExp(raw_patt)
        this.types = types
        this.groupCount = (new RegExp(this.patt.toString() + '|')).exec('').length - 1;

        if (this.groupCount !== this.types.length) throw Error()
    }

    parse(line: string) {
        const match = this.patt.exec(line)
        if(match === null) return null

        const keys = Object.keys(match.groups)
        const result = Object.fromEntries(keys.map((k,i) => {
            const converter = this.types[i]
            return [k, converter(match.groups[k])]
        }))
        return result
    }
}

const Group = (name: string, patt: string) => `(?<${name}>${patt})`
const Float = (name) => Group(name, '\\d+(?:\\.\\d*)?')
const Mult = (...args) => Group('multiplier_type', args.join('|'))
const Num = (name) => Group(name, '\\d+?')
const Word = (name) => Group(name, '[\\w\\s-]+')

const Resist = "(?: \\\((?<resist>\d+)% resisted\\\))?"
const EnemySpell = `${Word('monster')} ${Group('spell_type', 'casts|uses')} ${Word('skill')}`

export const PARSERS: {[id: string]: EventParser} = {
    // Actions
    PLAYER_BASIC: new EventParser(
        `${Word('name')} ${Mult('hits', 'crits')} (?!you)${Word('monster')} for ${Num('value')} ${Word('damage_type')} damage\\.`,
        [String, String, String, Number, String]
    ),
    PLAYER_MISS: new EventParser(
        `${Word('monster')} ${Mult('parries')} your attack.`, 
        [String, String]
    ),
    PLAYER_ITEM: new EventParser(
        `You use ${Word('name')}\\.`, 
        [String]
    ),
    PLAYER_SKILL: new EventParser(
        `You cast ${Word('name')}\\.`, 
        [String]
    ),
    PLAYER_DODGE: new EventParser(
        `You ${Mult('evade', 'parry')} the attack from ${Word('monster')}\\.`, 
        [String, String]
    ),
    
    ENEMY_BASIC: new EventParser(
        `${Word('monster')} ${Mult('hits', 'crits')} you for ${Num('value')} ${Word('damage_type')} damage\\.`, 
        [String, String, Number, String]
    ),
    ENEMY_SKILL_ABSORB: new EventParser(
        `${EnemySpell}, but is ${Mult('absorb')}ed\\. You gain ${Word('mana')}`, 
        [String, String, String, String, String]
    ),
    ENEMY_SKILL_MISS: new EventParser(
        `${EnemySpell}\\. You ${Mult('evade', 'parry')} the attack\\.`, 
        [String, String, String, String]
    ),
    ENEMY_SKILL_SUCCESS: new EventParser(
        `${EnemySpell}, and ${Mult('hits','crits')} you for ${Num('value')} ${Word('damage_type')} damage${Resist}\\.?`, 
        [String, String, String, String, Number, String, Number]
    ),

    // Effects
    PLAYER_BUFF: new EventParser(
        `You gain the effect ${Word('name')}\\.`, 
        [String]
    ),
    PLAYER_SKILL_DAMAGE: new EventParser(
        `${Word('name')} ${Mult('hits', 'blasts')} ${Word('monster')} for ${Num('value')} ${Word('damage_type')} damage${Resist}`, 
        [String, String, String, Number, String, Number]
    ),
    RIDDLE_RESTORE: new EventParser(
        `Time Bonus: recovered ${Num('hp')} HP and ${Num('mp')} MP\\.`, 
        [Number, Number]
    ),
    EFFECT_RESTORE: new EventParser(
        `${Word('name')} restores ${Num('value')} points of ${Word('type')}\\.`, 
        [String, Number, String]
    ),
    ITEM_RESTORE: new EventParser(
        `Recovered ${Num('value')} points of ${Word('type')}\\.`, 
        [Number, String]
    ),
    CURE_RESTORE: new EventParser(
        `You are healed for ${Num('value')} Health Points\\.`, 
        [Number]
    ),
    
    SPIRIT_SHIELD: new EventParser(
        `Your spirit shield absorbs ${Num('damage')} points of damage from the attack into ${Num('spirit_damage')} points of spirit damage\\.`, 
        [Number, Number]
    ),
    SPARK_TRIGGER: new EventParser(
        `Your Spark of Life restores you from the brink of defeat\\.`, 
        []
    ),
    DISPEL: new EventParser(
        `The effect ${Word('name')} was dispelled\\.`, 
        [String]
    ),
    COOLDOWN_EXPIRE: new EventParser(
        `Cooldown expired for ${Word('name')}`, 
        [String]
    ),
    DEBUFF_EXPIRE: new EventParser(
        `The effect ${Word('name')} has expired\\.`, 
        [String]
    ),

    // Info
    ROUND_END: new EventParser(
        `${Word('monster')} resists your spell\\.`, 
        [String]
    ),
    ROUND_START: new EventParser(
        `Initializing ${Group('battle_type', '[\\w\\s\\d#]+')} \\\(Round ${Num('current')} / ${Num('max')}\\\) \\.\\.\\.`, 
        [String, Number, Number]
    ),
    SPAWN: new EventParser(
        `Spawned Monster ${Group('letter', '[A-Z]')}: MID=${Num('mid')} \\\(${Word('monster')}\\\) LV=${Num('level')} HP=${Num('hp')}`, 
        [String, Number, String, Number, Number]
    ),
    DEATH: new EventParser(
        `${Word('monster')} has been defeated\\.`, 
        [String]
    ),

    GEM: new EventParser(
        `${Word('monster')} drops a ${Word('type')} Gem powerup!`, 
        [String, String]
    ),
    DROP: new EventParser(
        `You gain ${Num('value')} Credits!`, 
        [Number]
    ),
    PROFICIENCY: new EventParser(
        `${Word('monster')} dropped \\[${Group('item', '.*')}\\]`, 
        [String, String]
    ),
    EXPERIENCE: new EventParser(
        `You gain $${Float('value')} points of $${Word('type')} proficiency\\.`, 
        [Number, String]
    ),
    AUTO_SALVAGE: new EventParser(
        `You gain $${Num('value')} EXP!`, 
        [Number]
    ),
    AUTO_SELL: new EventParser(
        `A traveling salesmoogle salvages it into $${Num('value')}x \\[${Word('item')}\\]`, 
        [Number, String]
    ),
    
    GRINDFEST_CREDITS: new EventParser(
        `A traveling salesmoogle gives you \\[${Num('value')} Credits\\] for it\\.`, 
        [Number]
    ),
    CLEAR_BONUS: new EventParser(
        `Battle Clear Bonus! \\[${Word('item')}\\]`, 
        [String]
    ),
    TOKEN_BONUS: new EventParser(
        `Arena Token Bonus! \\[${Word('item')}\\]`, 
        [String]
    ),
    EVENT_ITEM: new EventParser(
        `You found a \\[${Word('item')}\\]`, 
        [String]
    ),

    MB_USAGE: new EventParser(
        `Used: ${Group('value', '.*')}`, 
        [String]
    ),
}