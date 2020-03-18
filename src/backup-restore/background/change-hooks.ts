import Storex from '@worldbrain/storex'

export type ChangeTracker<PK = any> = (args: {
    collection: string
    pk: PK
    operation: string
}) => void

export default function setupChangeTracking(
    { registry, backend }: Storex,
    track: ChangeTracker,
) {
    const dexie = backend['dexieInstance']

    console.log(
        'VIJX',
        'backup-restore',
        'background',
        'change-hooks',
        'setupChangeTracking =>',
        { dexie },
    )

    if (dexie == null) {
        throw new Error(
            'Storex instance with Dexie backend is not yet properly initialized.',
        )
    }

    for (const collection in registry.collections) {
        if (registry.collections[collection].watch === false) {
            continue
        }

        const table = dexie[collection]
        table.hook('creating', (pk, obj, transaction) => {
            track({
                operation: 'create',
                collection,
                pk,
            })
        })
        table.hook('updating', (mods, pk, obj, transaction) => {
            track({
                operation: 'update',
                collection,
                pk,
            })
        })
        table.hook('deleting', (pk, obj, transaction) => {
            track({
                operation: 'delete',
                collection,
                pk,
            })
        })
    }
}
