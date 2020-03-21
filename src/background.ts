import 'babel-polyfill'
import 'core-js/es7/symbol'
import { browser } from 'webextension-polyfill-ts'
//import { createSelfTests } from '@worldbrain/memex-common/lib/self-tests'

import initStorex from './search/memex-storex'
import getDb, { setStorex } from './search/get-db'
import initSentry from './util/raven'
import { setupRemoteFunctionsImplementations } from 'src/util/webextensionRPC'
import { StorageChangesManager } from 'src/util/storage-changes'

// Features that require manual instantiation to setup
import createNotification from 'src/util/notifications'

// Features that auto-setup
import './analytics/background'
import './imports/background'
import './omnibar'
import analytics from './analytics'
import {
    createBackgroundModules,
    setupBackgroundModules,
    registerBackgroundModuleCollections,
} from './background-script/setup'
import { createLazySharedSyncLog } from './sync/background/shared-sync-log'
import { createFirebaseSignalTransport } from './sync/background/signalling'
import { DevAuthState } from 'src/authentication/background/setup'
//import { MemoryAuthService } from '@worldbrain/memex-common/lib/authentication/memory'
//import { TEST_USER } from '@worldbrain/memex-common/lib/authentication/dev'
import { FeatureOptIns } from 'src/feature-opt-in/background/feature-opt-ins'
import { FetchPageDataProcessor } from 'src/page-analysis/background/fetch-page-data-processor'
import fetchPageData from 'src/page-analysis/background/fetch-page-data'
import pipeline from 'src/search/pipeline'
//import StorageManager from '../external/@worldbrain/storex/ts/index'

export async function main() {
    console.log('VIJX', '(STARTUP)', 'background', 'main => (A)')

    const localStorageChangesManager = new StorageChangesManager({
        storage: browser.storage,
    })
    initSentry({ storageChangesManager: localStorageChangesManager })

    const getSharedSyncLog = createLazySharedSyncLog()
    const fetchPageDataProcessor = new FetchPageDataProcessor({
        fetchPageData,
        pagePipeline: pipeline,
    })
    console.log('VIJX', 'background', 'main => (B)', { fetchPageDataProcessor })

    const storageManager = initStorex('parsegarden')
    console.log('VIJX', 'background', 'main => (C)', { storageManager })
    const backgroundModules = createBackgroundModules({
        storageManager,
        localStorageChangesManager,
        includePostSyncProcessor: true,
        browserAPIs: browser,
        signalTransportFactory: createFirebaseSignalTransport,
        fetchPageDataProcessor,
        getSharedSyncLog,
        authOptions: {
            devAuthState: process.env.DEV_AUTH_STATE as DevAuthState,
        },
    })
    console.log('VIJX', '(DEXIE)', 'background', 'main =>', {
        storageManager,
        backgroundModules,
    })
    registerBackgroundModuleCollections(storageManager, backgroundModules)
    await storageManager.finishInitialization()

    setStorex(storageManager)

    await setupBackgroundModules(backgroundModules, storageManager)

    // Gradually moving all remote function registrations here
    setupRemoteFunctionsImplementations({
        auth: backgroundModules.auth.remoteFunctions,
        subscription: {
            getCheckoutLink:
                backgroundModules.auth.subscriptionService.getCheckoutLink,
            getManageLink:
                backgroundModules.auth.subscriptionService.getManageLink,
            getCurrentUserClaims:
                backgroundModules.auth.subscriptionService.getCurrentUserClaims,
        },
        notifications: { create: createNotification } as any,
        bookmarks: {
            addPageBookmark:
                backgroundModules.search.remoteFunctions.bookmarks
                    .addPageBookmark,
            delPageBookmark:
                backgroundModules.search.remoteFunctions.bookmarks
                    .delPageBookmark,
        },
        features: new FeatureOptIns(),
    })

    // Attach interesting features onto global window scope for interested users
    window['getDb'] = getDb
    window['storageMan'] = storageManager
    window['bgModules'] = backgroundModules
    window['analytics'] = analytics
    window['tabMan'] = backgroundModules.activityLogger.tabManager

    /*
    window['selfTests'] = await createSelfTests({
        storage: {
            manager: storageManager,
        },
        services: {
            sync: backgroundModules.sync,
        },
        intergrationTestData: {
            insert: async () => {
                console['log']('Inserting integration test data')
                const listId = await backgroundModules.customLists.createCustomList(
                    {
                        name: 'My list',
                    },
                )
                await backgroundModules.customLists.insertPageToList({
                    id: listId,
                    url:
                        'http://highscalability.com/blog/2019/7/19/stuff-the-internet-says-on-scalability-for-july-19th-2019.html',
                })
                await backgroundModules.search.searchIndex.addPage({
                    pageDoc: {
                        url:
                            'http://highscalability.com/blog/2019/7/19/stuff-the-internet-says-on-scalability-for-july-19th-2019.html',
                        content: {
                            fullText: 'home page content',
                            title: 'bla.com title',
                        },
                    },
                    visits: [],
                })
            },
        },
    })
    */
}

main()
