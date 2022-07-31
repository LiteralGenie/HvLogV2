export interface TokenOptions<T> {
    name?: string
    type?: (x: string) => T
}

class Token<T = string> {
    patt: RegExp
    name?: string
    type: (x: string) => T

    // @ts-ignore
    constructor(patt: string, { name = undefined, type = String }: TokenOptions<T> = {}) {
        this.patt = new RegExp(`^${patt}$`)
        this.name = name
        this.type = type
    }

    parse(line: string): T | null {
        const m = this.patt.exec(line)
        if(m === null) return null
        
        const parsed = this.type(line)
        return parsed
    }
}

export interface Event {
    name: string
    [attr: string]: string | number
}

class EventParser {
    constructor(public readonly tokens: Token[]) {}

    parse(line: string): Event | null {
        const bounds = this.tokens.map((_, idx) => line.length - this.tokens.length + idx + 1)
        const results: {[name: string]: any} = {}
    
        let tokenIdx = 0;
        while(tokenIdx < this.tokens.length) {
            const token = this.tokens[tokenIdx]
    
            // Slice the input string
            const startIdx = bounds[tokenIdx-1] || 0
            const endIdx = bounds[tokenIdx]
            const slice = line.slice(startIdx, endIdx)
    
            // Check for match
            const result = token.parse(slice)
            if(result === null) {
                // No match, so...
                if (bounds[tokenIdx] === tokenIdx + 1) {
                    // No more options, return null
                    return null
                } if (bounds[tokenIdx] === bounds[tokenIdx-1] + 1) {
                    // Cannot decrement current endIdx any more. So decrement endIdx for previous token
                    bounds[tokenIdx - 1] -= 1
                    tokenIdx -= 1
                    continue
                } else {
                    // Decrement endIdx for current token
                    bounds[tokenIdx] -= 1
                    continue
                }
            } else {
                // Got match, save it
                if(token.name) results[token.name] = result
                tokenIdx += 1   
            }
        }
    
        return results as Event
    }
}

function _grp(name: string, patt: string) {
    return `(?<${name}>${patt})`
}

const _num = (name) => _grp(name, '\\d+')
const _float = (name) => _grp(name, '\\d+(?:\\.\\d*)?')
const _resist = "(?: \((?<resist>\d+)% resisted\))?"
const _words = (name) => _grp(name, '[\\w\\s-]+')
const _enemy_spell= `${_words('monster')} ${_grp('spell_type', 'casts|uses')} ${_words('skill')}`
const _mult_type= (...args) => _grp('multiplier_type', args.join('|'))

export const PARSERS: {[id: string]: EventParser} = {
    // Actions
    // PLAYER_BASIC: p(`${_words('name')} ${_mult_type('hits', 'crits')} (?!you)${_words('monster')} for ${_num('value')} ${_words('damage_type')} damage\\.`),
    // PLAYER_MISS: p(`${_words('monster')} ${_mult_type('parries')} your attack.`),
    // PLAYER_ITEM: p(`You use ${_words('name')}\\.`),
    // PLAYER_SKILL: p(`You cast ${_words('name')}\\.`),
    // PLAYER_DODGE: p(`You ${_mult_type('evade', 'parry')} the attack from ${_words('monster')}\\.`),
    
    // ENEMY_BASIC: p(`${_words('monster')} ${_mult_type('hits', 'crits')} you for ${_num('value')} ${_words('damage_type')} damage\\.`),
    // ENEMY_SKILL_ABSORB: p(`${_enemy_spell}, but is ${_mult_type('absorb')}ed\\. You gain ${_words('mana')}`),
    // ENEMY_SKILL_MISS: p(`${_enemy_spell}\\. You ${_mult_type('evade', 'parry')} the attack\\.`),
    // ENEMY_SKILL_SUCCESS: p(`${_enemy_spell}, and ${_mult_type('hits','crits')} you for ${_num('value')} ${_words('damage_type')} damage${_resist}\\.?`),

    // // Effects
    // PLAYER_BUFF: p(`You gain the effect ${_words('name')}\\.`),
    // PLAYER_SKILL_DAMAGE: p(`${_words('name')} ${_mult_type('hits', 'blasts')} ${_words('monster')} for ${_num('value')} ${_words('damage_type')} damage${_resist}`),
    // RIDDLE_RESTORE: p(`Time Bonus: recovered ${_num('hp')} HP and ${_num('mp')} MP\\.`),
    // EFFECT_RESTORE: p(`${_words('name')} restores ${_num('value')} points of (?<type>\\w+)\\.`),
    // ITEM_RESTORE: p(`Recovered ${_num('value')} points of (?<type>\\w+)\\.`),
    // CURE_RESTORE: p(`You are healed for ${_num('value')} Health Points\\.`),
    
    // SPIRIT_SHIELD: p(`Your spirit shield absorbs ${_num('damage')} points of damage from the attack into ${_num('spirit_damage')} points of spirit damage\\.`),
    // SPARK_TRIGGER: p(`Your Spark of Life restores you from the brink of defeat\\.`),
    // DISPEL: p(`The effect ${_words('name')} was dispelled\\.`),
    // COOLDOWN_EXPIRE: p(`Cooldown expired for ${_words('name')}`),
    // DEBUFF_EXPIRE: p(`The effect ${_words('name')} has expired\\.`),

    // // Info
    // ROUND_END: p(`${_words('monster')} resists your spell\\.`),
    // ROUND_START: p(`Initializing ${_grp('battle_type', '[\\w\\s\\d#]+')} \(Round ${_num('current')} / ${_num('max')}\) \\.\\.\\.`),
    // SPAWN: p(`Spawned Monster (?<letter>[A-Z]): MID=${_num('mid')} \(${_words('monster')}\) LV=${_num('level')} HP=${_num('hp')}`),
    // DEATH: p(`${_words('monster')} has been defeated\\.`),

    // GEM: p(`${_words('monster')} drops a (?<type>\w+) Gem powerup!`),
    // DROP: p(`You gain (${_num('value')}) Credits!`),
    // PROFICIENCY: p(`${_words('monster')} dropped \\[(?<item>.*)\\]`),
    // EXPERIENCE: p(`You gain $${_float('value')} points of $${_words('type')} proficiency\\.`),
    // AUTO_SALVAGE: p(`You gain $${_num('value')} EXP!`),
    // AUTO_SELL: p(`A traveling salesmoogle salvages it into $${_num('value')}x \\[(?<item>[\\w\\s-]+)\\]`),
    
    // GRINDFEST_CREDITS: p(`A traveling salesmoogle gives you \\[${_num('value')} Credits\\] for it\\.`),
    // CLEAR_BONUS: p(`Battle Clear Bonus! \\[${_words('item')}\\]`),
    // TOKEN_BONUS: p(`Arena Token Bonus! \\[${_words('item')}\\]`),
    // EVENT_ITEM: p(`You found a \\[${_words('item')}\\]`),

    // MB_USAGE: p(`Used: (.*)`),
}