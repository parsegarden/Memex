import cheerio from 'cheerio'

import { nodeIsSufficient } from '../../../utils/dom'
import { cleanContent } from '../../../cleaners'
import { normalizeSpaces } from '../../../utils/text'

import extractBestNode from './extract-best-node'

const GenericContentExtractor = {
    defaultOpts: {
        stripUnlikelyCandidates: true,
        weightNodes: true,
        cleanConditionally: true,
    },

    // Extract the content for this resource - initially, pass in our
    // most restrictive opts which will return the highest quality
    // content. On each failure, retry with slightly more lax opts.
    //
    // :param return_type: string. If "node", should return the content
    // as a cheerio node rather than as an HTML string.
    //
    // Opts:
    // stripUnlikelyCandidates: Remove any elements that match
    // non-article-like criteria first.(Like, does this element
    //   have a classname of "comment")
    //
    // weightNodes: Modify an elements score based on whether it has
    // certain classNames or IDs. Examples: Subtract if a node has
    // a className of 'comment', Add if a node has an ID of
    // 'entry-content'.
    //
    // cleanConditionally: Clean the node to return of some
    // superfluous content. Things like forms, ads, etc.
    extract({ $, html, title, url }, opts) {
        opts = { ...this.defaultOpts, ...opts }

        $ = $ || cheerio.load(html)

        console.log(
            'VIJX',
            'DEBUG',
            '(PROCESS)',
            'parsegarden',
            'parser',
            'extractors',
            'generic',
            '<GenericContentExtractor>',
            'extract =>',
            'getContentNode =>',
            {
                html,
                title,
                url,
                opts,
            },
        )

        try {
            $('iframe').remove()
            $('script').remove()
            $('head').remove()
            $('img').remove()
            $('button').remove()
            $('svg').remove()
            $('time').remove()
            $('figure').remove()
            $('noscript').remove()
            $('nav').remove()
            $('header').remove()
            $('footer').remove()
            $('div')
                .filter((i, el) => {
                    let elem = $(el)
                    const trimText = $(el)
                        .text()
                        .trim()
                    let levels = 1
                    while ((elem = elem.children().first()).length) {
                        levels++
                    }
                    return (
                        trimText.split(' ').length < 2 ||
                        trimText.length < 10 ||
                        (levels >= 3 && trimText.length < 40)
                    )
                })
                .remove()
            console.log('VIJX', 'DEBUG', {
                doc: $.html(),
            })
            const root = $.root()
            const body = root.find('body')
            const bodyChildren = body.contents()
            /*
            console.log(
                'VIJX',
                'DEBUG',
                {
                    root: $.html(),
                    numRootChildren: $(':root').contents().length,
                    rootChildren: $(':root').html(),
                    numBodyChildren: $(':root body').contents(':not(iframe)').length,
                    bodyChildren: $(':root body :not(iframe)').html(),
                }
            )
            */
            console.log('VIJX', 'DEBUG', {
                body: body.html(),
            })
            /*
            bodyChildren.each((i, elem) => {
                console.log(
                    'VIJX',
                    'DEBUG',
                    i,
                    {
                        parent: $(elem).parent().html(),
                        elem: $(elem).html(),
                    }
                )
            })
            */
        } catch (err) {
            console.log('VIJX', 'DEBUG', {
                err,
            })
        }

        // Cascade through our extraction-specific opts in an ordered fashion,
        // turning them off as we try to extract content.
        let node = this.getContentNode($, title, url, opts)

        /*
        if (nodeIsSufficient(node)) {
            return this.cleanAndReturnNode(node, $)
        }
        
        // We didn't succeed on first pass, one by one disable our
        // extraction opts and try again.
        // eslint-disable-next-line no-restricted-syntax
        for (const key of Reflect.ownKeys(opts).filter(k => opts[k] === true)) {
            opts[key] = false
            $ = cheerio.load(html)
        
            node = this.getContentNode($, title, url, opts)
        
            if (nodeIsSufficient(node)) {
                break
            }
        }
        */

        return this.cleanAndReturnNode(node, $)
    },

    // Get node given current options
    getContentNode($, title, url, opts) {
        return cleanContent(extractBestNode($, opts), {
            $,
            cleanConditionally: opts.cleanConditionally,
            title,
            url,
        })
    },

    // Once we got here, either we're at our last-resort node, or
    // we broke early. Make sure we at least have -something- before we
    // move forward.
    cleanAndReturnNode(node, $) {
        if (!node) {
            return null
        }

        return normalizeSpaces($.html(node))
    },
}

export default GenericContentExtractor
