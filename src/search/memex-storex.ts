import initStorex from './storex'

console.log('VIJX', '(DEXIE)', 'search', 'memex-storex', 'default =>')
export default (dbName = 'parsegarden') => {
    return initStorex({
        dbName,
    })
}
