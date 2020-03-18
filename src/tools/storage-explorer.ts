import mapValues from 'lodash/mapValues'
import util from 'util'
import { URL } from 'whatwg-url'

import initStorex from 'src/search/memory-storex'
import {
    createBackgroundModules,
    getBackgroundStorageModules,
    registerBackgroundModuleCollections,
} from 'src/background-script/setup'
import { MemoryLocalStorage } from 'src/util/tests/local-storage'
import { MockFetchPageDataProcessor } from 'src/page-analysis/background/mock-fetch-page-data-processor'
import PageStorage from 'src/page-indexing/background/storage'

type CommandLineArguments =
    | { command: 'list-collections' }
    | { command: 'list-operations' }
const COMMAND_MAP: { [Key in CommandLineArguments['command']]: true } = {
    'list-collections': true,
    'list-operations': true,
}
function printUsage() {
    console.error(`USAGE:`)
    console.error(`  storage-explorer list-collections`)
    console.error(`  storage-explorer list-operations`)
}

function parseCommandLineArgs():
    | { success: false; args: null }
    | { success: true; args: CommandLineArguments } {
    const command = process.argv[2] as CommandLineArguments['command']
    if (!command) {
        printUsage()
        return { success: false, args: null }
    }
    if (!COMMAND_MAP[command]) {
        console.error(`Unknown command '${command}'`)
        printUsage()
        return { success: false, args: null }
    }

    return { success: true, args: { command } }
}

async function main() {
    const { success: areArgsValid, args } = parseCommandLineArgs()
    if (!areArgsValid) {
        return
    }

    if (typeof window === 'undefined') {
        global['URL'] = URL
    }

    const storageManager = initStorex()
    const backgroundModules = createBackgroundModules({
        getSharedSyncLog: null,
        signalTransportFactory: null,
        storageManager,
        localStorageChangesManager: null,
        browserAPIs: {
            storage: {
                local: new MemoryLocalStorage(),
            },
            bookmarks: {
                onCreated: { addListener: () => {} },
                onRemoved: { addListener: () => {} },
            },
        } as any,
        fetchPageDataProcessor: new MockFetchPageDataProcessor(),
    })

    registerBackgroundModuleCollections(storageManager, backgroundModules)
    const storageModules = getBackgroundStorageModules(backgroundModules)

    console.log('DEBUG(A)')
    await storageManager.finishInitialization()
    console.log('DEBUG(B)')
    const testPage = {
        pageDoc: {
            url:
                'http://highscalability.com/blog/2019/7/19/stuff-the-internet-says-on-scalability-for-july-19th-2019.html',
            content: {
                fullText: 'home page content',
                title: 'bla.com title',
            },
        },
        visits: [],
    }
    await backgroundModules.search.searchIndex.addPage(testPage)
    console.log('DEBUG(C)')

    const display = console['log'].bind(console) // Circumvent linter
    if (args.command === 'list-operations') {
        const report = mapValues(storageModules, storageModule =>
            mapValues(storageModule.operations, operation => {
                operation = { ...operation }
                if (operation.operation === 'createObject') {
                    delete operation.args
                }
                return operation
            }),
        )
        display(util.inspect(report, false, null, true))
    } else if (args.command === 'list-collections') {
        const pageStorageModule: PageStorage = storageModules[
            'pages'
        ] as PageStorage
        console.log(
            'VIJX',
            'list-collections',
            'pageStorageModule',
            pageStorageModule,
        )
        const existingPage = await pageStorageModule.getPage(
            testPage.pageDoc.url,
        )
        console.log('VIJX', 'list-collections', 'existingPage', existingPage)
        for (const [storageModuleName, storageModule] of Object.entries(
            storageModules,
        )) {
            if (storageModuleName !== 'pages') continue
            display(`MODULE ${storageModuleName}:`)
            for (const collectionName of Object.keys(
                storageModule.getConfig().collections || {},
            )) {
                const collection = storageModule.getConfig().collections[
                    collectionName
                ]
                display(`  COLLECTION: ${collectionName}`)
                for (const fieldName of Object.keys(collection.fields || {})) {
                    display(`  FIELD: ${fieldName}`)
                }
                for (const indexName of Object.keys(collection.indices || {})) {
                    const indexObj = collection.indices[indexName]
                    display(
                        `  INDEX: ${indexObj.field} ${indexObj.fullTextIndexName}`,
                    )
                }
            }
        }
    }
}

if (require.main === module) {
    main()
}
