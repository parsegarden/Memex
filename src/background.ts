import 'babel-polyfill'
import 'core-js/es7/symbol'
import { browser } from 'webextension-polyfill-ts'
//import { createSelfTests } from '@worldbrain/memex-common/lib/self-tests'

import initStorex from './search/memex-storex'
import getDb, { setStorex } from './search/get-db'
import { setupRemoteFunctionsImplementations } from 'src/util/webextensionRPC'
import { StorageChangesManager } from 'src/util/storage-changes'

// Features that require manual instantiation to setup
import createNotification from 'src/util/notifications'

// Features that auto-setup
import './imports/background'
import './omnibar'
import {
    createBackgroundModules,
    setupBackgroundModules,
    registerBackgroundModuleCollections,
} from './background-script/setup'
import { DevAuthState } from 'src/authentication/background/setup'
import { FetchPageDataProcessor } from 'src/page-analysis/background/fetch-page-data-processor'
import fetchPageData from 'src/page-analysis/background/fetch-page-data'
import pipeline from 'src/search/pipeline'
import { dangerousPleaseBeSureDeleteAndRecreateDatabase } from './storage/utils'
import { initContextMenu } from './chrome'

export async function main() {
    console.log('VIJX', '(BEGIN)', '(STARTUP)', 'background', 'main => (A)', {
        browser,
    })

    initContextMenu()

    const localStorageChangesManager = new StorageChangesManager({
        storage: browser.storage,
    })

    const fetchPageDataProcessor = new FetchPageDataProcessor({
        fetchPageData,
        pagePipeline: pipeline,
    })
    console.log('VIJX', '(STARTUP)', 'background', 'main => (B)', {
        fetchPageDataProcessor,
        localStorageChangesManager,
    })

    const storageManager = initStorex('parsegarden')

    console.log('VIJX', '(STARTUP)', 'background', 'main => (C)', {
        storageManager,
    })
    const backgroundModules = createBackgroundModules({
        storageManager,
        localStorageChangesManager,
        includePostSyncProcessor: false,
        browserAPIs: browser,
        signalTransportFactory: null,
        fetchPageDataProcessor,
        getSharedSyncLog: null,
        authOptions: {
            devAuthState: process.env.DEV_AUTH_STATE as DevAuthState,
        },
    })
    console.log('VIJX', '(STARTUP)', 'background', 'main => (D)', {
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
        notifications: { create: createNotification } as any,
        bookmarks: {
            addPageBookmark:
                backgroundModules.search.remoteFunctions.bookmarks
                    .addPageBookmark,
            delPageBookmark:
                backgroundModules.search.remoteFunctions.bookmarks
                    .delPageBookmark,
        },
    })

    console.log('VIJX', '(END)', '(STARTUP)', 'background', 'main => (E)', {
        storageManager,
        backgroundModules,
    })

    // Attach interesting features onto global window scope for interested users
    window['getDb'] = getDb
    window['storageMan'] = storageManager
    window['bgModules'] = backgroundModules
    window['tabMan'] = backgroundModules.activityLogger.tabManager
}

main()
