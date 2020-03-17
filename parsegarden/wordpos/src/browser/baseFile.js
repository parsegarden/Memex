/**
 * browser/baseFile.js
 *
 * Copyright (c) 2012-2019 mooster@42at.com
 * https://github.com/moos/wordpos
 *
 * Released under MIT license
 */
// import dict from '../../dict/index.noun'
// console.log('VIJX', 'parsegarden', 'wordpos', 'src', 'browser', { dict })

class BaseFile {
    /**
     * file contents - in browser it's just a string & not a file!
     * @type {Object}
     */
    file = {}

    /**
     * constructor
     * @param {type} type - 'index' or 'data'
     * @param {string} dictPath - path to dict db
     * @param {string} posName - one of 'noun', 'verb', 'adj', 'adv'
     * @param {object} [options] - @see WordPOS options
     */

    constructor(type, dictPath, posName, options) {
        this.type = type
        this.filePath = `${dictPath}/${type}.${posName}.json`
        this.posName = posName
        this.loadError = null
        this.options = Object.assign({}, options)
    }

    load() {
        if (this.loadError) return Promise.reject(this.loadError)
        if (this.loaded) return this.loaded

        this.options.debug && console.time('index load ' + this.posName)

        const url = chrome.runtime.getURL(this.filePath)

        this.options.debug && console.timeEnd('index load ' + this.posName)
        return (this.loaded = fetch(url)
            .then(response => response.json())
            .then(json => {
                // eslint-disable-next-line no-eval
                this.file = json
                return this
            })
            .catch(err => {
                console.error(
                    `Error loading "${this.type}" file ${this.filePath}.`,
                    err,
                )
                this.loadError = err
                throw err
            }))
    }

    ready(fn, args) {
        return this.load().then(res => (fn && fn.apply(this, args)) || res)
    }
}

// export default BaseFile;
module.exports = BaseFile
