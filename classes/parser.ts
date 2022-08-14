export class EventParser {
    name: string
    patt: RegExp
    types: Array<StringConstructor | NumberConstructor>
    groupCount: number

    constructor(name: string, raw_patt: string, types: Array<StringConstructor | NumberConstructor>) {
        this.name = name
        this.patt = new RegExp(raw_patt)
        this.types = types
        this.groupCount = (new RegExp(this.patt.toString() + '|')).exec('').length - 1;

        if (this.groupCount !== this.types.length) throw Error(this.name)
    }

    parse(line: string) {
        const match = this.patt.exec(line)
        if(match === null) return null

        match.groups = match.groups || {}
        const keys = Object.keys(match.groups)
        const result = Object.fromEntries(keys.map((k,i) => {
            const converter = this.types[i]
            return [k, converter(match.groups[k])]
        }))
        result.event_type = this.name
        return result
    }
}

const Group = (name: string, patt: string) => `(?<${name}>${patt})`
const Float = (name) => Group(name, '\\d+(?:\\.\\d*)?')
const Mult = (...args) => Group('multiplier_type', args.join('|'))
const Num = (name) => Group(name, '\\d+?')
const Word = (name) => Group(name, '[\\w\\s-]+')
const Words = (name) => Group(name, '[\\w\\s- ]+')
const Monster = () => Group('monster', '[\\w\\s-+]+') // "New Game +" is a valid monster name

const Resist = "(?: \\\((?<resist>\d+)% resisted\\\))?"
const EnemySpell = `${Monster()} ${Group('spell_type', 'casts|uses')} ${Words('skill')}`

export const PARSERS: { [id: string]: EventParser } = {
    // Actions
    PLAYER_BASIC: new EventParser(
        'PLAYER_BASIC',
        `${Words('spell')} ${Mult('hits', 'crits')} (?!you)${Monster()} for ${Num('value')} ${Word('damage_type')} damage\\.`,
        [String, String, String, Number, String]
    ),
    PLAYER_MISS: new EventParser(
        'PLAYER_MISS',
        `${Monster()} ${Mult('parries')} your attack.`,
        [String, String]
    ),
    PLAYER_ITEM: new EventParser(
        'PLAYER_ITEM',
        `You use ${Words('item')}\\.`,
        [String]
    ),
    PLAYER_SKILL: new EventParser(
        'PLAYER_SKILL',
        `You cast ${Words('spell')}\\.`,
        [String]
    ),
    PLAYER_DODGE: new EventParser(
        'PLAYER_DODGE',
        `You ${Mult('evade', 'parry')} the attack from ${Monster()}\\.`,
        [String, String]
    ),
    
    ENEMY_BASIC: new EventParser(
        'ENEMY_BASIC',
        `${Monster()} ${Mult('hits', 'crits')} you for ${Num('value')} ${Word('damage_type')} damage\\.`,
        [String, String, Number, String]
    ),
    ENEMY_SKILL_ABSORB: new EventParser(
        'ENEMY_SKILL_ABSORB',
        `${EnemySpell}, but is ${Mult('absorb')}ed\\. You gain ${Word('mp')}`,
        [String, String, String, String, String]
    ),
    ENEMY_SKILL_MISS: new EventParser(
        'ENEMY_SKILL_MISS',
        `${EnemySpell}\\. You ${Mult('evade', 'parry')} the attack\\.`,
        [String, String, String, String]
    ),
    ENEMY_SKILL_SUCCESS: new EventParser(
        'ENEMY_SKILL_SUCCESS',
        `${EnemySpell}, and ${Mult('hits', 'crits')} you for ${Num('value')} ${Word('damage_type')} damage${Resist}\\.?`,
        [String, String, String, String, Number, String, Number]
    ),

    // Effects
    PLAYER_BUFF: new EventParser(
        'PLAYER_BUFF',
        `You gain the effect ${Words('effect')}\\.`,
        [String]
    ),
    PLAYER_SPELL_DAMAGE: new EventParser(
        'PLAYER_SPELL_DAMAGE',
        `${Words('spell')} ${Mult('hits', 'blasts')} ${Monster()} for ${Num('value')}(?: ${Word('damage_type')})? damage${Resist}`,
        [String, String, String, Number, String, Number]
    ),
    RIDDLE_RESTORE: new EventParser(
        'RIDDLE_RESTORE',
        `Time Bonus: Recovered ${Num('hp')} HP, ${Num('mp')} MP and ${Num('sp')} SP\\.`,
        [Number, Number, Number]
    ),
    EFFECT_RESTORE: new EventParser(
        'EFFECT_RESTORE',
        `${Words('effect')} restores ${Num('value')} points of ${Word('type')}\\.`,
        [String, Number, String]
    ),
    ITEM_RESTORE: new EventParser(
        'ITEM_RESTORE',
        `Recovered ${Num('value')} points of ${Word('type')}\\.`,
        [Number, String]
    ),
    CURE_RESTORE: new EventParser(
        'CURE_RESTORE',
        `You are healed for ${Num('value')} Health Points\\.`,
        [Number]
    ),
    
    SPIRIT_SHIELD: new EventParser(
        'SPIRIT_SHIELD',
        `Your spirit shield absorbs ${Num('damage')} points of damage from the attack into ${Num('spirit_damage')} points of spirit damage\\.`,
        [Number, Number]
    ),
    SPARK_TRIGGER: new EventParser(
        'SPARK_TRIGGER',
        `Your Spark of Life restores you from the brink of defeat\\.`,
        []
    ),
    DISPEL: new EventParser(
        'DISPEL',
        `The effect ${Words('effect')} was dispelled\\.`,
        [String]
    ),
    COOLDOWN_EXPIRE: new EventParser(
        'COOLDOWN_EXPIRE',
        `Cooldown expired for ${Words('spell')}`,
        [String]
    ),
    BUFF_EXPIRE: new EventParser(
        'DEBUFF_EXPIRE',
        `The effect ${Words('effect')} has expired\\.`,
        [String]
    ),
    RESIST: new EventParser(
        'RESIST',
        `${Monster()} resists your spell\\.`,
        [String]
    ),
    DEBUFF: new EventParser(
        'DEBUFF',
        `${Monster()} gains the effect ${Words('name')}\\.`,
        [String, String]
    ),
    DEBUFF_EXPIRE: new EventParser(
        'DEBUFF_EXPIRE',
        `The effect ${Words('effect')} on ${Monster()} has expired\\.`,
        [String, String]
    ),

    // Info
    ROUND_START: new EventParser(
        'ROUND_START',
        `Initializing ${Group('battle_type', '[\\w\\s\\d#]+')} \\\(Round ${Num('current')} / ${Num('max')}\\\) \\.\\.\\.`,
        [String, Number, Number]
    ),
    ROUND_END: new EventParser(
        'ROUND_END',
        `You are Victorious!`,
        []
    ),
    FLEE: new EventParser(
        'FLEE',
        'You have escaped from the battle\\.',
        []
    ),
    SPAWN: new EventParser(
        'SPAWN',
        `Spawned Monster ${Group('letter', '[A-Z]')}: MID=${Num('mid')} \\\(${Monster()}\\\) LV=${Num('level')} HP=${Num('hp')}`,
        [String, Number, String, Number, Number]
    ),
    DEATH: new EventParser(
        'DEATH',
        `${Monster()} has been defeated\\.`,
        [String]
    ),
    RIDDLE_MASTER: new EventParser(
        'RIDDLE_MASTER',
        `The Riddlemaster listens.*`,
        []
    ),

    GEM: new EventParser(
        'GEM',
        `${Monster()} drops a ${Words('type')} powerup!`,
        [String, String]
    ),
    CREDITS: new EventParser(
        'CREDITS',
        `You gain ${Num('value')} Credits!`,
        [Number]
    ),
    DROP: new EventParser(
        'DROP',
        `${Monster()} dropped \\[${Group('item', '.*')}\\]`,
        [String, String]
    ),
    PROFICIENCY: new EventParser(
        'PROFICIENCY',
        `You gain ${Float('value')} points of ${Words('type')}\\.`, 
        [Number, String]
    ),
    EXPERIENCE: new EventParser(
        'EXPERIENCE',
        `You gain ${Num('value')} EXP!`, 
        [Number]
    ),
    AUTO_SALVAGE: new EventParser(
        'AUTO_SALVAGE',
        `A traveling salesmoogle salvages it into ${Num('value')}x \\[${Words('item')}\\]`, 
        [Number, String]
    ),    
    AUTO_SELL: new EventParser(
        'AUTO_SELL',
        `A traveling salesmoogle gives you \\[${Num('value')} Credits\\] for it\\.`, 
        [Number]
    ),
    CLEAR_BONUS: new EventParser(
        'CLEAR_BONUS',
        `Battle Clear Bonus! \\[${Words('item')}\\]`, 
        [String]
    ),
    TOKEN_BONUS: new EventParser(
        'TOKEN_BONUS',
        `Arena Token Bonus! \\[${Words('item')}\\]`, 
        [String]
    ),
    EVENT_ITEM: new EventParser(
        'EVENT_ITEM',
        `You found a \\[${Words('item')}\\]`, 
        [String]
    ),

    MB_USAGE: new EventParser(
        'MB_USAGE',
        `Used: ${Group('value', '.*')}`, 
        [String]
    ),
}

export function parse_events(lines: string[]) {
    const ps = Object.values(PARSERS)
    const result = lines.map(l => {
        for(let parser of ps) {
            const result = parser.parse(l)
            if (result) return result
        }
        return null
    })

    return JSON.stringify(result)
}