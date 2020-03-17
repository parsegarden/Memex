import { normalizeUrl } from '@worldbrain/memex-url-utils'

import transformPageText from '../util/transform-page-text'
import { DEFAULT_TERM_SEPARATOR, extractContent } from './util'
import { PipelineReq, PipelineRes } from './types'

import { wait } from '../../parsegarden/utils'
import loadModels from '../../parsegarden'
let wordEmbeddings
loadModels().then(value => {
    wordEmbeddings = value.wordEmbeddings
    console.log('VIJX', 'search', 'pipeline', 'DEBUG(wordEmbeddings)', {
        wordEmbeddings,
        getVector: wordEmbeddings.getVector,
    })
})

import WordPOS from '../../parsegarden/wordpos/src/wordpos'
const wordpos: any = new WordPOS({
    preload: true,
    includeData: true,
    dictPath: 'parsegarden/wordpos/dict',
    profile: true,
})
console.log('VIJX', 'search', 'pipeline', 'DEBUG(wordpos)', {
    WordPOS,
    wordpos,
})

import nlp from 'compromise'
nlp.extend(require('compromise-dates'))
nlp.extend(require('compromise-numbers'))

async function testPOSTaggers() {
    const words = [
        'run',
        'apple',
        'reported',
        'finally',
        'javascript',
        'exciting',
        'coronavirus',
        'Cate',
        'stock',
        'Vijay',
        'candies',
        'nov',
        'march',
        'twelve',
        '1992',
    ]
    const wordposMethods = [
        wordpos.isNoun.bind(wordpos),
        wordpos.isVerb.bind(wordpos),
        wordpos.isAdverb.bind(wordpos),
        wordpos.isAdjective.bind(wordpos),
    ]

    const wordposObj = {}
    words.forEach(async word => {
        wordposObj[word] = await Promise.all(
            wordposMethods.map(method => method(word)),
        )
    })
    const compromiseObj = {}
    words.forEach(async word => {
        const nlpWord = nlp(word)
        compromiseObj[word] = nlpWord.json('0')[0].terms[0].tags
    })
    console.log(
        'VIJX',
        'TEST',
        'WORDPOS & COMPROMISE',
        wordposObj,
        compromiseObj,
    )
}
testPOSTaggers()

import humannames from 'humannames'

export type PagePipeline = (req: PipelineReq) => Promise<PipelineRes>

export class PipelineError extends Error {}

/**
 * Derived from answer in: https://stackoverflow.com/a/23945027
 */
function extractRootDomain(hostname: string) {
    const splitArr = hostname.split('.')
    const len = splitArr.length

    // Extracting the root domain here if there is a subdomain
    if (len > 2) {
        hostname = `${splitArr[len - 2]}.${splitArr[len - 1]}`

        // Check to see if it's using a ccTLD (i.e. ".me.uk")
        if (
            splitArr[len - 1].length === 2 &&
            [2, 3].includes(splitArr[len - 2].length)
        ) {
            hostname = `${splitArr[len - 3]}.${hostname}`
        }
    }

    return hostname
}

/**
 * @param url A raw URL string to attempt to extract parts from.
 * @returns Object containing `hostname` and `pathname` props. Values should be the `domain.tld.cctld` part and
 *  everything after, respectively. If regex matching failed on given URL, error will be logged and simply
 *  the URL with protocol and opt. `www` parts removed will be returned for both values.
 */
export function transformUrl(
    url: string,
): {
    hostname: string
    pathname: string
    domain: string
} {
    let normalized: string

    try {
        normalized = normalizeUrl(url, { skipProtocolTrim: true })
    } catch (error) {
        normalized = url
    }

    try {
        const parsed = new URL(normalized)

        return {
            hostname: parsed.hostname,
            pathname: parsed.pathname,
            domain: extractRootDomain(parsed.hostname),
        }
    } catch (error) {
        console.error(`cannot parse URL: ${normalized}`)
        return {
            hostname: normalized,
            pathname: normalized,
            domain: normalized,
        }
    }
}

/**
 * @returns Set of "words-of-interest" - determined by pre-proc logic in `transformPageText` - extracted from `text`.
 */
export function extractTerms(text: string): Set<string> {
    if (!text || !text.length) {
        return new Set()
    }

    const { text: transformedText } = transformPageText({ text })

    if (!transformedText || !transformedText.length) {
        return new Set()
    }

    return new Set(
        extractContent(transformedText, {
            separator: DEFAULT_TERM_SEPARATOR,
        }),
    )
}

/**
 * Given some page data, applies some transformations to the text and
 * returns page data ready for creation of new Page model instance.
 *
 * @returns Resolves to an object containing all data needed for Page model.
 */
const pipeline: PagePipeline = async ({
    pageDoc: { content = {}, url, ...data },
    rejectNoContent = true,
}) => {
    // First apply transformations to the URL
    const { pathname, hostname, domain } = transformUrl(url)

    // Throw error if no searchable content; we don't really want to index these (for now) so allow callers
    //  to handle (probably by ignoring)
    if (
        rejectNoContent &&
        (content == null || !content.fullText || !content.fullText.length)
    ) {
        return Promise.reject(
            new PipelineError('Page has no searchable content'),
        )
    }

    console.log('VIJX', 'search', 'pipeline', 'pipeline => (A)', {
        url,
        fullText: content.fullText,
    })

    // Extract all terms out of processed content
    const terms = [...extractTerms(content.fullText)]
    const titleTerms = [...extractTerms(content.title)]
    const urlTerms = [...extractTerms(pathname)]

    console.log('VIJX', 'search', 'pipeline', 'pipeline => (B)', {
        url,
        terms,
        titleTerms,
        urlTerms,
    })

    const wordposAsyncFunc = async term => {
        return wordpos.isNoun(term)
    }
    const wordEmbedAsyncFunc = async term => {
        const vector = await wordEmbeddings.getVector(term)
        const isEmpty = !vector.filter(num => num !== 0).length
        const neighbors = await wordEmbeddings.getNearestNeighbors(term)
        await wait(100)
        return {
            term,
            vector: isEmpty ? null : vector,
            neighbors: isEmpty ? null : neighbors,
            isEmpty,
        }
    }

    // PARSEGARDEN INTEGRATION POINT
    let finalTerms
    if (wordpos && wordEmbeddings) {
        const nlpNounTerms = terms.filter(term => {
            const nlpWord = nlp(term)
            const tags = nlpWord.json('0')[0].terms[0].tags
            return (
                term.length > 2 &&
                tags.includes('Noun') &&
                !tags.includes('Month') &&
                !tags.includes('Date') &&
                !tags.includes('Abbreviation') &&
                !tags.includes('Plural')
            )
        })

        async function nlpWrapper() {
            const wrapperTerms = []
            for (const i in nlpNounTerms) {
                const term = nlpNounTerms[i]
                const wordposRes = await wordposAsyncFunc(term)
                const humannamesRes =
                    humannames[term.charAt(0).toUpperCase() + term.slice(1)]
                if (!wordposRes && humannamesRes === 1) {
                    // console.log('VIJX', 'search', 'pipeline', 'pipeline => nlpNounTerms', term)
                } else {
                    wrapperTerms.push(term)
                }
            }
            return wrapperTerms
        }
        finalTerms = await nlpWrapper()

        console.log('VIJX', 'search', 'pipeline', 'pipeline => (C)', {
            url,
            nlpNounTerms,
            finalTerms,
        })
    }

    return Promise.resolve({
        url: normalizeUrl(url),
        fullUrl: url,
        fullTitle: content.title,
        text: content.fullText,
        terms,
        urlTerms,
        titleTerms,
        domain,
        hostname,
        tags: [],
        parsegardenTerms: finalTerms,
        ...data,
    })
}

export default pipeline
