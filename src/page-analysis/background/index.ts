import whenAllSettled from 'when-all-settled'
import { whenPageDOMLoaded } from 'src/util/tab-events'

import getFavIcon from './get-fav-icon'
import makeScreenshot from './make-screenshot'
import { runInTab } from 'src/util/webextensionRPC'
import { PageAnalyzerInterface } from 'src/page-analysis/types'
import extractPageMetadataFromRawContent, {
    getPageFullText,
} from './content-extraction'
import { PageContent } from 'src/search'

export interface PageAnalysis {
    favIconURI?: string
    screenshotURI?: string
    content: PageContent
    getFullText: () => Promise<string>
}

export type PageAnalyzer = (args: {
    tabId: number
    allowContent?: boolean
    allowScreenshot?: boolean
    allowFavIcon?: boolean
}) => Promise<PageAnalysis>

/**
 * Performs page content analysis on a given Tab's ID.
 */
const analysePage: PageAnalyzer = async ({
    tabId,
    allowContent = true,
    allowScreenshot = true,
    allowFavIcon = true,
}) => {
    // Wait until its DOM has loaded, in case we got invoked before that.
    await whenPageDOMLoaded({ tabId })

    console.log('VIJX', 'page-analysis', 'background', 'analysePage => (A)', {
        tabId,
        allowContent,
        allowScreenshot,
        allowFavIcon,
    })

    // Set up to run these functions in the content script in the tab.
    const extractPageContent = async () => {
        const rawContent = await runInTab<PageAnalyzerInterface>(
            tabId,
        ).extractRawPageContent()
        const metadata = await extractPageMetadataFromRawContent(rawContent)
        const getFullText = async () => getPageFullText(rawContent, metadata)
        console.log(
            'VIJX',
            'page-analysis',
            'background',
            'analysePage => (B)',
            'extractPageContent =>',
            {
                rawContent,
                metadata,
                getFullText,
            },
        )
        return { metadata, getFullText }
    }

    // Fetch the data
    const dataFetchingPromises = [
        allowContent ? extractPageContent() : Promise.resolve(),
        allowScreenshot ? makeScreenshot({ tabId }) : Promise.resolve(),
        allowFavIcon ? getFavIcon({ tabId }) : Promise.resolve(),
    ]

    // When every task has either completed or failed, return what we got
    const [content, screenshotURI, favIconURI] = await whenAllSettled(
        dataFetchingPromises,
        {
            onRejection: err => undefined,
        },
    )

    console.log('VIJX', 'page-analysis', 'background', 'analysePage => (C)', {
        favIconURI,
        screenshotURI,
        content: content.metadata || {},
        getFullText: content.getFullText,
    })

    return {
        favIconURI,
        screenshotURI,
        content: content.metadata || {},
        getFullText: content.getFullText,
    }
}

export default analysePage
