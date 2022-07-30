export enum TAGS {

}

export class RawEvent {
    constructor(
        data: {[k:string]: string | boolean | number},
        tags: TAGS[] = []
    ) {}
}

export class EventParser {
    static readonly PARSERS = []

    parse(line: string): RawEvent | null  {
        throw Error('not implemented')
    }

    static auto_parse(line: string, parsers: EventParser[] = this.PARSERS): RawEvent | null {
        for(let p of parsers) {
            let result = p.parse(line)

            if(result !== null) {
                return result
            }
        }

        return null
    }
}

export interface SimpleEventParserOptions {
    key_map: {[old_key: string]: string}
    register: boolean
    infer_types: boolean
}

// @todo explain parsing process
export class SimpleEventParser extends EventParser {
    constructor(
        readonly patts: RegExp[],
        readonly options: SimpleEventParserOptions = { key_map: {}, register: true, infer_types: true },
        readonly defaults: any = {}
    ) {
        super()

        if(options.register) EventParser.PARSERS.push(this)
    }

    parse(line: string): RawEvent | null {
        // match
        let match = null
        for(let p of this.patts) {
            if(match = line.match(p)) 
                break
        }
        if(match === null) return null


    }
}