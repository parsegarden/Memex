import {
    Runtime,
    WebNavigation,
    Tabs,
    Browser,
    Windows,
} from 'webextension-polyfill-ts'

import { makeRemotelyCallable } from 'src/util/webextensionRPC'
import { mapChunks } from 'src/util/chunk'
import initPauser from './pause-logging'
import { updateVisitInteractionData } from './util'
import { TabManager } from './tab-manager'
import { TabChangeListener } from './types'
import TabChangeListeners from './tab-change-listeners'
import PageVisitLogger from './log-page-visit'
import { CONCURR_TAB_LOAD } from '../constants'
import { SearchIndex } from 'src/search'
import PageStorage from 'src/page-indexing/background/storage'
import { url } from 'src/popup/selectors'
import { updatePageContextMenu } from '../../chrome'

let parsegardenSingleton = {
    map: {},
    array: [],
}

export default class ActivityLoggerBackground {
    static SCROLL_UPDATE_FN = 'updateScrollState'

    tabManager: TabManager
    private searchIndex: SearchIndex
    private tabsAPI: Tabs.Static
    private runtimeAPI: Runtime.Static
    private webNavAPI: WebNavigation.Static
    private windowsAPI: Windows.Static
    private tabChangeListener: TabChangeListeners
    private pageVisitLogger: PageVisitLogger
    private toggleLoggingPause = initPauser()
    private pageStorage: PageStorage

    /**
     * Used to stop of tab updated event listeners while the
     * tracking of existing tabs is happening.
     */
    private tabQueryP = new Promise(resolve => resolve())

    constructor(options: {
        tabManager: TabManager
        searchIndex: SearchIndex
        browserAPIs: Pick<
            Browser,
            'tabs' | 'runtime' | 'webNavigation' | 'storage' | 'windows'
        >
        pageStorage: PageStorage
    }) {
        this.tabManager = options.tabManager
        this.tabsAPI = options.browserAPIs.tabs
        this.runtimeAPI = options.browserAPIs.runtime
        this.webNavAPI = options.browserAPIs.webNavigation
        this.windowsAPI = options.browserAPIs.windows
        this.searchIndex = options.searchIndex
        this.pageStorage = options.pageStorage

        this.pageVisitLogger = new PageVisitLogger({
            searchIndex: options.searchIndex,
            tabManager: this.tabManager,
        })
        this.tabChangeListener = new TabChangeListeners({
            tabManager: this.tabManager,
            searchIndex: options.searchIndex,
            pageVisitLogger: this.pageVisitLogger,
            browserAPIs: options.browserAPIs,
        })

        this.setupParsegardenTokenCompilation()
    }

    async parsegardenCompilation() {
        parsegardenSingleton = {
            map: {},
            array: [],
        }

        const pageCount = await this.pageStorage.countPages()
        const visitCount = await this.pageStorage.countVisits()
        const allPages = await this.pageStorage.getAllPages()
        const allVisits = await this.pageStorage.getAllVisits()

        allPages.forEach(page => {
            if (!page.parsegardenTerms) {
                return
            }

            /*
            console.log('VIJX', 'DEBUG', '(PARSEGARDEN)', {
                url: page.url,
                parsegardenTerms: page.parsegardenTerms,
            })
            */

            page.parsegardenTerms.forEach(token => {
                if (
                    parsegardenSingleton.map[token] &&
                    parsegardenSingleton.map[token].urls
                ) {
                    parsegardenSingleton.map[token].urls.push(page.url)
                } else {
                    parsegardenSingleton.map[token] = {
                        token,
                        visitCount: 0,
                        urls: [page.url],
                    }
                }
            })
        })

        parsegardenSingleton.array = Object.entries(
            parsegardenSingleton.map,
        ).map(([key, value]) => {
            return value
        })

        parsegardenSingleton.array = parsegardenSingleton.array.sort((a, b) => {
            return b.urls.length - a.urls.length
        })

        console.log(
            'VIJX',
            '(PARSEGARDEN)',
            '<ActivityLoggerBackground>',
            'parsegardenCompilation =>',
            {
                pageCount,
                visitCount,
                allPages,
                allVisits,
                parsegardenSingleton,
            },
        )
    }

    async setupParsegardenTokenCompilation() {
        setTimeout(this.parsegardenCompilation.bind(this), 1 * 1000)
        setInterval(this.parsegardenCompilation.bind(this), 4 * 60000)
    }

    static isTabLoaded = (tab: Tabs.Tab) => tab.status === 'complete'

    setupRemoteFunctions() {
        console.log(
            'VIJX',
            '(STARTUP)',
            'activity-logger',
            'background',
            '<ActivityLoggerBackground>',
            'setupRemoteFunctions =>',
        )
        makeRemotelyCallable({
            toggleLoggingPause: this.toggleLoggingPause,
            fetchTab: id => this.tabManager.getTabState(id),
            fetchTabByUrl: url => {
                console.log(
                    'VIJX',
                    'activity-logger',
                    'background',
                    '<ActivityLoggerBackground>',
                    'setupRemoteFunctions =>',
                    'FROM TAB fetchTabByUrl =>',
                    'fetchTabByUrl =>',
                    {
                        url,
                    },
                )
                return this.tabManager.getTabStateByUrl(url)
            },
        })
    }

    setupWebExtAPIHandlers() {
        this.setupScrollStateHandling()
        this.setupNavStateHandling()
        this.setupTabLifecycleHandling()
    }

    async trackExistingTabs({ isNewInstall = false }) {
        let resolveTabQueryP
        this.tabQueryP = new Promise(resolve => (resolveTabQueryP = resolve))
        const tabs = await this.tabsAPI.query({})

        await mapChunks<Tabs.Tab>(tabs, CONCURR_TAB_LOAD, async browserTab => {
            console.log(
                'VIJX',
                'activity-logger',
                'background',
                '<ActivityLoggerBackground>',
                'trackExistingTabs =>',
                { url: browserTab.url },
            )
            this.tabManager.trackTab(browserTab, {
                isLoaded: ActivityLoggerBackground.isTabLoaded(browserTab),
                isBookmarked: await this.tabChangeListener.checkBookmark(
                    browserTab.url,
                ),
            })

            await this.tabChangeListener
                .injectContentScripts(browserTab)
                .catch(e => e)

            if (!isNewInstall) {
                return
            }

            if (browserTab.url) {
                this.tabChangeListener._handleVisitIndexing(
                    browserTab.id,
                    browserTab,
                    browserTab,
                )
            }
        })

        resolveTabQueryP()
    }

    private async trackNewTab(id: number) {
        console.log(
            'VIJX',
            'activity-logger',
            'background',
            '<ActivityLoggerBackground>',
            'trackNewTab =>',
            {
                id,
            },
        )
        const browserTab = await this.tabsAPI.get(id)

        this.tabManager.trackTab(browserTab, {
            isLoaded: ActivityLoggerBackground.isTabLoaded(browserTab),
            isBookmarked: await this.tabChangeListener.checkBookmark(
                browserTab.url,
            ),
        })
    }

    /**
     * Ensure tab scroll states are kept in-sync with scroll events from the content script.
     */
    private setupScrollStateHandling() {
        this.runtimeAPI.onMessage.addListener(
            async ({ funcName, ...scrollState }, { tab }) => {
                if (
                    funcName !== ActivityLoggerBackground.SCROLL_UPDATE_FN ||
                    tab == null
                ) {
                    return
                }
                this.tabManager.updateTabScrollState(tab.id, scrollState)

                // PARSEGARDEN INTEGRATION POINT
                await this.tabChangeListener.handleUrl(
                    tab.id,
                    { url: tab.url },
                    tab,
                )
            },
        )
    }

    private setupTabLifecycleHandling() {
        console.log(
            'VIJX',
            '(STARTUP)',
            '(EVENT)',
            'activity-logger',
            'background',
            '<ActivityLoggerBackground>',
            'setupTabLifecycleHandling =>',
        )

        this.tabsAPI.onCreated.addListener(this.tabManager.trackTab)

        this.tabsAPI.onActivated.addListener(async ({ tabId }) => {
            console.log(
                'VIJX',
                '(EVENT)',
                'activity-logger',
                'background',
                '<ActivityLoggerBackground>',
                'tabsAPI.onActivated => (A)',
                {
                    isTracked: this.tabManager.isTracked(tabId),
                },
            )

            if (!this.tabManager.isTracked(tabId)) {
                await this.trackNewTab(tabId)
            }

            this.tabManager.activateTab(tabId)

            // PARSEGARDEN INTEGRATION POINT
            const tab = await this.tabsAPI.get(tabId)
            await this.tabChangeListener.handleUrl(tabId, { url: tab.url }, tab)

            const page = await this.pageStorage.getPage(tab.url)
            const visits = await this.pageStorage.getPageVisits(tab.url)

            console.log(
                'VIJX',
                '(EVENT)',
                'activity-logger',
                'background',
                '<ActivityLoggerBackground>',
                'tabsAPI.onActivated => (B)',
                {
                    url: page.url,
                    page,
                    visits,
                },
            )

            updatePageContextMenu(page, visits)
        })

        // Runs stage 3 of the visit indexing
        this.tabsAPI.onRemoved.addListener(tabId => {
            console.log(
                'VIJX',
                '(EVENT)',
                'activity-logger',
                'background',
                '<ActivityLoggerBackground>',
                'tabsAPI.onRemoved =>',
            )

            // Remove tab from tab tracking state and update the visit with tab-derived metadata
            const tab = this.tabManager.removeTab(tabId)

            if (tab != null) {
                updateVisitInteractionData(tab, this.searchIndex)
            }
        })

        this.tabsAPI.onUpdated.addListener(this.tabUpdatedListener)

        this.windowsAPI.onFocusChanged.addListener(async windowId => {
            const activeTabs = await this.tabsAPI.query({
                active: true,
                lastFocusedWindow: true,
            })
            console.log(
                'VIJX',
                '(EVENT)',
                'activity-logger',
                'background',
                '<ActivityLoggerBackground>',
                'windowsAPI.onFocusChanged =>',
                {
                    windowId,
                    //tabId: activeTab.id,
                    activeTab: activeTabs[0],
                },
            )
        })
    }

    /**
     * The `webNavigation.onCommitted` event gives us some useful data related to how the navigation event
     * occured (client/server redirect, user typed in address bar, link click, etc.). Might as well keep the last
     * navigation event for each tab in state for later decision making.
     */
    private setupNavStateHandling() {
        this.webNavAPI.onCommitted.addListener(
            ({ tabId, frameId, ...navData }: any) => {
                // Frame ID is always `0` for the main webpage frame, which is what we care about
                if (frameId === 0) {
                    this.tabManager.updateNavState(tabId, {
                        type: navData.transitionType,
                        qualifiers: navData.transitionQualifiers,
                    })
                }
            },
        )
    }

    private tabUpdatedListener: TabChangeListener = async (
        tabId,
        changeInfo,
        tab,
    ) => {
        console.log(
            'VIJX',
            '(BEGIN)',
            '(EVENT)',
            '(PROCESS)',
            'activity-logger',
            'background',
            '<ActivityLoggerBackground>',
            'tabsAPI.onUpdated =>',
            'tabUpdatedListener =>',
            {
                url: changeInfo.url,
                status: changeInfo.status,
                favIconUrl: changeInfo.favIconUrl,
                tabId,
                changeInfo,
                tab,
            },
        )

        await this.tabQueryP

        if (changeInfo.status) {
            this.tabManager.setTabLoaded(
                tabId,
                changeInfo.status === 'complete',
            )
        }

        if (changeInfo.favIconUrl) {
            await this.tabChangeListener.handleFavIcon(tabId, changeInfo, tab)
        }

        if (changeInfo.url) {
            await this.tabChangeListener.handleUrl(tabId, changeInfo, tab)
        }

        // PARSEGARDEN INTEGRATION POINT
        // This can be where the term index is compiled
        const page = await this.pageStorage.getPage(tab.url)
        updatePageContextMenu(page)
    }
}

export { TabManager }
