import { SignalTransport } from 'simple-signalling/lib/types'
import { FirebaseSignalTransport } from 'simple-signalling/lib/firebase'
import { getFirebase } from 'src/util/firebase-app-initialized'

export function createFirebaseSignalTransport(): SignalTransport {
    console.log(
        'VIJX',
        'src',
        'sync',
        'background',
        'signalling',
        'createFirebaseSignalTransport',
    )
    return new FirebaseSignalTransport({
        database: getFirebase().database() as any,
        collectionName: 'signalling',
    })
}
