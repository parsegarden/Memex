import Storex from '@worldbrain/storex'
import {
    DexieStorageBackend,
    IndexedDbImplementation,
} from '@worldbrain/storex-backend-dexie'

import schemaPatcher from './storage/dexie-schema'
import stemmerSelector from './stemmers'
import { createStorexPlugins } from './storex-plugins'

export default function initStorex(options: {
    dbName: string
    idbImplementation?: IndexedDbImplementation
}): Storex {
    console.log(
        'VIJX',
        '(DEXIE)',
        'search',
        'storex',
        'initStorex => (A) new DexieStorageBackend =>',
        {
            options,
        },
    )
    const backend = new DexieStorageBackend({
        stemmerSelector,
        schemaPatcher,
        dbName: options.dbName,
        idbImplementation: options.idbImplementation,
    })

    for (const plugin of createStorexPlugins()) {
        backend.use(plugin)
    }

    console.log(
        'VIJX',
        '(DEXIE)',
        'search',
        'storex',
        'initStorex => (B) new Storex =>',
        {
            backend,
        },
    )

    const storex = new Storex({ backend })
    return storex
}
