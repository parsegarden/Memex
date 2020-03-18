import initStorex from './storex'

console.log('VIJX', '(DEXIE)', 'search', 'memex-storex', 'default =>')
export default () => {
    return initStorex({
        dbName: 'memex',
    })
}
