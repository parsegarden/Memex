export const WwwThepoliticalinsiderComExtractor = {
    domain: 'www.thepoliticalinsider.com',

    title: {
        selectors: [['meta[name="sailthru.title"]', 'value']],
    },

    author: {
        selectors: [['meta[name="sailthru.author"]', 'value']],
    },

    date_published: {
        selectors: [['meta[name="sailthru.date"]', 'value']],
        timezone: 'America/New_York',
    },

    dek: {
        selectors: [
            // enter selectors
        ],
    },

    lead_image_url: {
        selectors: [
            ['meta[name="og:image"]', 'value'], // enter selectors
        ],
    },

    content: {
        selectors: ['div#article-body'],

        // Is there anything in the content you selected that needs transformed
        // before it's consumable content? E.g., unusual lazy loaded images
        transforms: {},

        // Is there anything that is in the result that shouldn't be?
        // The clean selectors will remove anything that matches from
        // the result
        clean: [],
    },
}
