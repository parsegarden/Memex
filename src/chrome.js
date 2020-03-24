console.log('VIJX', 'DEBUG', 'chrome')

export default () => {
    chrome.contextMenus.removeAll(function() {
        const prntmid = chrome.contextMenus.create({
            id: 'container',
            contexts: ['all'],
            title: 'Save As MHTML',
            type: 'normal',
        })
        chrome.contextMenus.create({
            id: 'MHTML',
            contexts: ['all'],
            title: 'Single Page',
            type: 'normal',
            parentId: prntmid,
        })
    })
}
