import initStorex from './storex'

export default (dbName = 'parsegarden') => {
    console.log('VIJX', '(DEXIE)', 'search', 'memex-storex', 'default =>')
    return initStorex({
        dbName,
    })
}
