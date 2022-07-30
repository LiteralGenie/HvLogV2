function _grp(name: string, patt: string) {
    return `(?<${name}>${patt})`
}

const _num = (name) => _grp(name, '\\d+')
const _float =  (name) => _grp(name, '\\d+(?:\\.\\d*)?')
const _resist = "(?: \((?<resist>\d+)% resisted\))?"
const _words =  (name) => _grp(name, '[\\w\\s-]+')
const _enemy_spell= `${_words('monster')} ${_grp('spell_type', 'casts|uses')} ${_words('skill')}`
const _mult_type= (...args) => _grp('multiplier_type', args.join('|'))

// actions
export const riddle_success= /The RiddleMaster is pleased with your answer, and grants you his blessings\./
export const riddle_fail= /You failed to correctly answer the RiddleMaster within the time limit. You lose ${_num('value')} Stamina\./

export const player_basic= new RegExp(`${_words('name')} ${_mult_type('hits', 'crits')} (?!you)${_words('monster')} for ${_num('value')} ${_words('damage_type')} damage\\.`)
export const player_miss= new RegExp(`${_words('monster')} ${_mult_type('parries')} your attack.`)

export const player_item= new RegExp(`You use ${_words('name')}\\.`)
export const player_skill= new RegExp(`You cast ${_words('name')}\\.`)

export const player_dodge= new RegExp(`You ${_mult_type('evade', 'parry')} the attack from ${_words('monster')}\\.`)
export const enemy_basic = new RegExp(`${_words('monster')} ${_mult_type('hits', 'crits')} you for ${_num('value')} ${_words('damage_type')} damage\\.`)

export const enemy_skill_absorb = new RegExp(`${_enemy_spell}, but is ${_mult_type('absorb')}ed\\. You gain ${_words('mana')}`)
export const enemy_skill_miss = new RegExp(`${_enemy_spell}\\. You ${_mult_type('evade', 'parry')} the attack\\.`)
export const enemy_skill_success = new RegExp(`${_enemy_spell}, and ${_mult_type('hits','crits')} you for ${_num('value')} ${_words('damage_type')} damage${_resist}\\.?`)


// effects
export const player_buff = new RegExp(`You gain the effect ${_words('name')}\\.`)
export const player_skill_damage = new RegExp(`${_words('name')} ${_mult_type('hits', 'blasts')} ${_words('monster')} for ${_num('value')} ${_words('damage_type')} damage${_resist}`)
export const riddle_restore = new RegExp(`Time Bonus: recovered ${_num('hp')} HP and ${_num('mp')} MP\\.`)

export const effect_restore = new RegExp(`${_words('name')} restores ${_num('value')} points of (?<type>\\w+)\\.`)
export const item_restore = new RegExp(`Recovered ${_num('value')} points of (?<type>\\w+)\\.`)
export const cure_restore = new RegExp(`You are healed for ${_num('value')} Health Points\\.`)

export const spirit_shield = new RegExp(`Your spirit shield absorbs ${_num('damage')} points of damage from the attack into ${_num('spirit_damage')} points of spirit damage\\.`)
export const spark_trigger = new RegExp(`Your Spark of Life restores you from the brink of defeat\\.`)

export const dispel = new RegExp(`The effect ${_words('name')} was dispelled\\.`)
export const cooldown = new RegExp(`Cooldown expired for ${_words('name')}`)
export const buff_expire = new RegExp(`The effect ${_words('name')}  has expired\\.`)

export const enemy_resist = new RegExp(`${_words('monster')} resists your spell\\.`)
export const enemy_debuff = new RegExp(`${_words('monster')} gains the effect ${_words('name')}\\.`)
export const debuff_expire = new RegExp(`The effect ${_words('name')} on ${_words('monster')} has expired.`)


// info
export const round_end = new RegExp(`You are Victorious!`)
export const round_start = new RegExp(`Initializing ${_grp('battle_type', '[\\w\\s\\d#]+')} \(Round ${_num('current')} / ${_num('max')}\) \\.\\.\\.`)

export const spawn = new RegExp(`Spawned Monster (?<letter>[A-Z]): MID=${_num('mid')} \(${_words('monster')}\) LV=${_num('level')} HP=${_num('hp')}`)
export const death = new RegExp(`${_words('monster')} has been defeated\\.`)

export const gem = new RegExp(`${_words('monster')} drops a (?<type>\w+) Gem powerup!`)
export const gf_credits = new RegExp(`You gain (${_num('value')}) Credits!`)
export const drop = new RegExp(`${_words('monster')} dropped \\[(?<item>.*)\\]`)
export const prof = new RegExp(`You gain $${_float('value')} points of $${_words('type')} proficiency\\.`)
export const exp = new RegExp(`You gain $${_num('value')} EXP!`)
export const auto_salvage = new RegExp(`A traveling salesmoogle salvages it into $${_num('value')}x \\[(?<item>[\\w\\s-]+)\\]`)
export const auto_sell = new RegExp(`A traveling salesmoogle gives you \\[${_num('value')} Credits\\] for it\\.`)

export const clear_bonus = new RegExp(`Battle Clear Bonus! \\[${_words('item')}\\]`)
export const token_bonus = new RegExp(`Arena Token Bonus! \\[${_words('item')}\\]`)
export const event = new RegExp(`You found a \\[${_words('item')}\\]`)

export const mb_usage = new RegExp(`Used: (.*)`)