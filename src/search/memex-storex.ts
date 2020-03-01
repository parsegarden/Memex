import initStorex from './storex'

console.log('VIJX', 'search', 'memex-storex', 'default =>')
export default () =>
    initStorex({
        dbName: 'memex',
    })
