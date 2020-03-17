const files = [
    './wordpos/dict/data.adj',
    './wordpos/dict/data.adv',
    './wordpos/dict/data.noun',
    './wordpos/dict/data.verb',
    './wordpos/dict/index.adj',
    './wordpos/dict/index.adv',
    './wordpos/dict/index.noun',
    './wordpos/dict/index.verb',
]
const objArr = []
files.forEach(fileName => {
    const fileObj = require(`${fileName}.js`)
    console.log('VIJX', fileName, Object.keys(fileObj).length)
    objArr.push(fileObj)
})

const fs = require('fs')
objArr.forEach((val, idx) => {
    fs.writeFile(`${files[idx]}.json`, JSON.stringify(val), err => {
        if (err) {
            console.error(err)
            return
        }
        console.log(files[idx], 'File has been created')
    })
})
