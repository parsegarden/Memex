import { normalizeUrl } from '@worldbrain/memex-url-utils'

import extractPageContent from 'src/page-analysis/content_script/extract-page-content'
import extractFavIcon from 'src/page-analysis/content_script/extract-fav-icon'
import extractPdfContent from 'src/page-analysis/content_script/extract-pdf-content'
import { PageDataResult } from './types'
import { FetchPageDataError } from './fetch-page-data-error'

export type FetchPageData = (args: {
    url: string
    timeout?: number
    opts?: FetchPageDataOpts
}) => FetchPageDataReturnValue
export type RunXHR = () => Promise<PageDataResult>
export type CancelXHR = () => void

export interface FetchPageDataOpts {
    /** Denotes whether to attempt page text + metadata fetch. */
    includePageContent: boolean
    /** Denotes whether to attempt favicon fetch. */
    includeFavIcon: boolean
}

export interface FetchPageDataReturnValue {
    run: RunXHR
    cancel: CancelXHR
}

export const defaultOpts: FetchPageDataOpts = {
    includePageContent: false,
    includeFavIcon: false,
}

/**
 * Given a URL will attempt an async fetch of the text and metadata from the page
 * which the URL points to.
 */
const fetchPageData: FetchPageData = ({
    url,
    timeout = 10000,
    opts = defaultOpts,
}) => {
    console.log(
        'VIJX',
        'page-analysis',
        'background',
        'fetch-page-data',
        'fetchPageData =>',
        { url },
    )
    let normalizedUrl

    try {
        normalizedUrl = normalizeUrl(url, {
            removeQueryParameters: [/.*/i],
        })
    } catch (err) {
        normalizedUrl = url
    }

    let run: RunXHR
    let cancel: CancelXHR

    // Check if pdf and run code for pdf instead
    if (normalizedUrl.endsWith('.pdf')) {
        run = async () => ({
            content: opts.includePageContent
                ? await extractPdfContent({ url })
                : undefined,
        })
        cancel = () => undefined
    } else {
        const req = fetchDOMFromUrl(url, timeout)
        cancel = req.cancel

        /**
         * @return {Promise<any>} Resolves to an object containing `content` and `favIconURI` data
         *  fetched from the DOM pointed at by the `url` of `fetchPageData` call.
         */
        run = async function() {
            const doc = await req.run()

            if (!doc) {
                throw new FetchPageDataError('Cannot fetch DOM', 'temporary')
            }

            return {
                favIconURI: opts.includeFavIcon
                    ? await extractFavIcon(doc)
                    : undefined,
                content: opts.includePageContent
                    ? await extractPageContent(doc, url)
                    : undefined,
            }
        }
    }

    return { run, cancel }
}

export default fetchPageData

/**
 * Async function that given a URL will attempt to grab the current DOM which it points to.
 * Uses native XMLHttpRequest API, as newer Fetch API doesn't seem to support fetching of
 * the DOM; the Response object must be parsed.
 */
function fetchDOMFromUrl(
    url: string,
    timeout: number,
): { run: () => Promise<Document>; cancel: CancelXHR } {
    const req = new XMLHttpRequest()

    console.log(
        'VIJX',
        'page-analysis',
        'background',
        'fetch-page-data',
        'fetchDOMFromUrl =>',
        { url, timeout },
    )
    return {
        cancel: () => req.abort(),
        run: () =>
            new Promise((resolve, reject) => {
                const tempFailureHandler = reason =>
                    reject(new FetchPageDataError(reason, 'temporary'))
                const permanentFailureHandler = () =>
                    reject(
                        new FetchPageDataError(
                            'Data fetch failed',
                            'permanent',
                        ),
                    )

                // Set up timeout handling
                req.timeout = timeout
                req.ontimeout = () => tempFailureHandler('Data fetch timeout')

                // General non-HTTP errors; eg: a URL pointing at something that doesn't exist
                req.onerror = permanentFailureHandler

                req.onreadystatechange = function() {
                    if (this.readyState === 4) {
                        switch (this.status) {
                            case 200:
                                return resolve(this.responseXML)
                            case 429:
                                return tempFailureHandler('Too many requests')
                            case 500:
                            case 503:
                            case 504:
                                return tempFailureHandler(
                                    'Server currently unavailable',
                                )
                            default:
                                return permanentFailureHandler()
                        }
                    }
                }

                req.open('GET', url)

                // Sets the responseXML to be of Document/DOM type
                req.responseType = 'document'
                req.send()
            }),
    }
}
