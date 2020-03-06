import delay from 'src/util/delay'
import { whenPageLoadComplete, whenTabActive } from 'src/util/tab-events'

// Take a screenshot of the tabId, if it is active.
// Returns a promise of the screenshot (a png image in a data URL).
// The promise rejects if the tab is not currently active!
async function snapNow({ tabId }) {
    const tab = await browser.tabs.get(tabId)
    let image = await browser.tabs.captureVisibleTab(tab.windowId, {
        format: 'jpeg',
    })
    // Reduces the size of image to save space
    image = await resizeImage(image, 0.75, 200)

    return image
}

async function resizeImage(image, scale, maxHeight) {
    return new Promise((resolve, reject) => {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')

        img.src = image
        img.onload = () => {
            const newHeight = Math.floor(img.height * scale)

            if (newHeight <= maxHeight) {
                resolve(canvas.toDataURL())
            }

            const newWidth = Math.floor((img.width / img.height) * newHeight)

            if (newHeight >= maxHeight) {
                canvas.width = newWidth
                canvas.height = newHeight

                ctx.drawImage(img, 0, 0, newWidth, newHeight)

                img.src = canvas.toDataURL()
                img.height = newHeight
            }
        }
        img.onerror = reject
    })
}

// Return the promise of an image (as data URL) of the visible area of the tab,
// but only as soon as it is active (due to a limitation of the browser API)
export default async function makeScreenshotOfTabAsap({ tabId }) {
    await whenPageLoadComplete({ tabId })
    await whenTabActive({ tabId })
    // Some delay appears required to not fail. Perhaps the browser needs
    // to complete some rendering before the screen is captured?
    await delay(300)
    const image = await snapNow({ tabId })
    console.log(
        'VIJX',
        'page-analysis',
        'background',
        'make-screenshot',
        'makeScreenshotOfTabAsap',
        {
            tabId,
            image,
        },
    )
    return image
}
