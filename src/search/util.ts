import Storex from '@worldbrain/storex'

export const DEFAULT_TERM_SEPARATOR = /[|\u{A0}' .,|(\n)]+/u
export const URL_SEPARATOR = /[/?#=+& _.,\-|(\n)]+/

export const collections = (db: Storex) => Object.keys(db.registry.collections)

/**
 * Handles splitting up searchable content into indexable terms. Terms are all
 * lowercased.
 *
 * @param {string} content Searchable content text.
 * @param {string|RegExp} [separator=' '] Separator used to split content into terms.
 * @returns {string[]} Array of terms derived from `content`.
 */
export const extractContent = (
    content,
    { separator = DEFAULT_TERM_SEPARATOR },
) => {
    const lowercasedTerms = content
        .split(separator)
        .map(word => word.toLowerCase())
        .filter(term => term.length)
    console.log('VIJX', 'search', 'utils', 'extractContent =>', {
        content,
        lowercasedTerms,
    })
    return lowercasedTerms
}
