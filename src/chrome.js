import { browser } from 'webextension-polyfill-ts'

export const initContextMenu = () => {
    console.log('VIJX', '(EXTENSION)', 'chrome', 'initContextMenu =>')

    browser.contextMenus.removeAll().then(function() {
        const rootId = browser.contextMenus.create({
            id: 'container',
            contexts: ['all'],
            title: 'Current page',
            type: 'normal',
        })

        const pageId = browser.contextMenus.create({
            id: 'page',
            contexts: ['all'],
            title: 'Page',
            type: 'normal',
            parentId: rootId,
        })
        browser.contextMenus.create({
            id: 'addPage',
            contexts: ['all'],
            title: 'Add Page',
            type: 'normal',
            parentId: pageId,
        })

        const visitId = browser.contextMenus.create({
            id: 'visits',
            contexts: ['all'],
            title: 'Visits',
            type: 'normal',
            parentId: rootId,
        })
        browser.contextMenus.create({
            id: 'addVisit',
            contexts: ['all'],
            title: 'Add Visit',
            type: 'normal',
            parentId: visitId,
        })

        browser.contextMenus.create({
            id: 'tokens',
            contexts: ['all'],
            title: 'Tokens',
            type: 'normal',
            parentId: rootId,
        })
    })
}

export const updatePageContextMenu = (page, visits) => {
    console.log(
        'VIJX',
        '(EXTENSION)',
        'chrome',
        'updatePageContextMenu => (A)',
        {
            page,
            visits,
        },
    )

    browser.contextMenus.removeAll().then(function() {
        const firstVisit = new Date(visits[0].time)
        const lastVisit = new Date(visits[visits.length - 1].time)

        const rootId = browser.contextMenus.create({
            id: 'container',
            contexts: ['all'],
            title: 'Current page',
            type: 'normal',
        })

        /* Page Submenu */
        const pageId = browser.contextMenus.create({
            id: 'page',
            contexts: ['all'],
            title: 'Page',
            type: 'normal',
            parentId: rootId,
        })
        browser.contextMenus.create({
            id: 'pageUrl',
            contexts: ['all'],
            title: `URL: ${page.url}`,
            type: 'normal',
            parentId: pageId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'pageTitle',
            contexts: ['all'],
            title: `Title: ${page.fullTitle}`,
            type: 'normal',
            parentId: pageId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'pageTerms',
            contexts: ['all'],
            title: `# of Terms: ${page.parsegardenTerms.length}`,
            type: 'normal',
            parentId: pageId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'pageSeparator1',
            type: 'separator',
            contexts: ['all'],
            parentId: pageId,
        })
        browser.contextMenus.create({
            id: 'removePage',
            contexts: ['all'],
            title: 'Remove Page',
            type: 'normal',
            parentId: pageId,
        })

        /* Visit Submenu */
        const visitId = browser.contextMenus.create({
            id: 'visits',
            contexts: ['all'],
            title: 'Visits',
            type: 'normal',
            parentId: rootId,
        })
        browser.contextMenus.create({
            id: 'numVisits',
            contexts: ['all'],
            title: `# of Visits: ${visits.length}`,
            type: 'normal',
            parentId: visitId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'firstVisit',
            contexts: ['all'],
            title: `First Visit: ${firstVisit}`,
            type: 'normal',
            parentId: visitId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'lastVisit',
            contexts: ['all'],
            title: `Last Visit: ${lastVisit}`,
            type: 'normal',
            parentId: visitId,
            enabled: false,
        })
        browser.contextMenus.create({
            id: 'visitSeparator1',
            type: 'separator',
            contexts: ['all'],
            parentId: visitId,
        })
        browser.contextMenus.create({
            id: 'removeVisit',
            contexts: ['all'],
            title: 'Remove Visit',
            type: 'normal',
            parentId: visitId,
        })

        browser.contextMenus.create({
            id: 'tokens',
            contexts: ['all'],
            title: 'Tokens',
            type: 'normal',
            parentId: rootId,
        })
    })
}
