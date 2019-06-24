import { browser } from 'webextension-polyfill-ts'

import { delayed, getPositionState, getTooltipState } from './utils'
import {
    createAndCopyDirectLink,
    createAnnotation,
} from 'src/direct-linking/content_script/interactions'
import { remoteFunction, makeRemotelyCallable } from 'src/util/webextensionRPC'
import ToolbarNotifications from 'src/toolbar-notification/content_script'
import { conditionallyShowHighlightNotification } from './onboarding-interactions'
import { setupUIContainer, destroyUIContainer } from './components'
import { Position } from './types'

const openOptionsRPC = remoteFunction('openOptionsTab')
let mouseupListener = null

export function setupTooltipTrigger({
    eventName,
    callback,
}: {
    eventName: string
    callback: (e: Event) => void
}) {
    mouseupListener = callback
    document.body.addEventListener(eventName, mouseupListener)
}

export function destroyTooltipTrigger({ eventName }: { eventName: string }) {
    document.body.removeEventListener(eventName, mouseupListener)
    mouseupListener = null
}

const CLOSE_MESSAGESHOWN_KEY = 'tooltip.close-message-shown'

async function _setCloseMessageShown() {
    await browser.storage.local.set({
        [CLOSE_MESSAGESHOWN_KEY]: true,
    })
}

async function _getCloseMessageShown() {
    const {
        [CLOSE_MESSAGESHOWN_KEY]: closeMessageShown,
    } = await browser.storage.local.get({ [CLOSE_MESSAGESHOWN_KEY]: false })

    return closeMessageShown
}

// Target container for the Tooltip.
let target = null
let showTooltip = null

/* Denotes whether the user inserted/removed tooltip by his/her own self. */
let manualOverride = false

/**
 * Creates target container for Tooltip.
 * Injects content_script.css.
 * Mounts Tooltip React component.
 * Sets up Container <---> webpage Remote functions.
 */
export async function insertTooltip({
    toolbarNotifications,
    loadStyles,
    triggerEventName,
}: {
    toolbarNotifications: ToolbarNotifications
    loadStyles: () => void
    triggerEventName: string
}) {
    // If target is set, Tooltip has already been injected.
    if (target) {
        return
    }

    target = document.createElement('div')
    target.setAttribute('id', 'memex-direct-linking-tooltip')
    document.body.appendChild(target)

    loadStyles()

    showTooltip = await setupUIContainer(target, {
        createAndCopyDirectLink,
        createAnnotation,
        openSettings: () => openOptionsRPC('settings'),
        destroyTooltip: async () => {
            manualOverride = true
            removeTooltip({ triggerEventName })

            const closeMessageShown = await _getCloseMessageShown()
            if (!closeMessageShown) {
                toolbarNotifications.showToolbarNotification(
                    'tooltip-first-close',
                )
                _setCloseMessageShown()
            }
        },
    })

    setupTooltipTrigger({
        eventName: triggerEventName,
        callback: event => {
            conditionallyTriggerTooltip(
                { callback: showTooltip, toolbarNotifications },
                event,
            )
        },
    })
    conditionallyTriggerTooltip({ callback: showTooltip, toolbarNotifications })
}

export const removeTooltip = ({
    triggerEventName,
}: {
    triggerEventName: string
}) => {
    if (!target) {
        return
    }
    destroyTooltipTrigger({ eventName: triggerEventName })
    destroyUIContainer(target)
    target.remove()

    target = null
    showTooltip = null
}

/**
 * Inserts or removes tooltip from the page (if not overridden manually).
 * Should either be called through the RPC, or pass the `toolbarNotifications`
 * wrapped in an object.
 */
const insertOrRemoveTooltip = async ({ toolbarNotifications, loadStyles }) => {
    if (manualOverride) {
        return
    }

    const isTooltipEnabled = await getTooltipState()
    const isTooltipPresent = !!target

    if (isTooltipEnabled && !isTooltipPresent) {
        insertTooltip({
            toolbarNotifications,
            loadStyles,
            triggerEventName: 'mouseup',
        })
    } else if (!isTooltipEnabled && isTooltipPresent) {
        removeTooltip({ triggerEventName: 'mouseup' })
    }
}

/**
 * Sets up RPC functions to insert and remove Tooltip from Popup.
 */
export async function setupRPC({
    toolbarNotifications,
    loadStyles,
}: {
    toolbarNotifications: ToolbarNotifications
    loadStyles: () => void
}) {
    makeRemotelyCallable({
        showContentTooltip: async () => {
            if (!showTooltip) {
                await insertTooltip({
                    toolbarNotifications,
                    loadStyles,
                    triggerEventName: 'mouseup',
                })
            }
            if (userSelectedText()) {
                const position = calculateTooltipPosition()
                showTooltip(position)
            }
        },
        insertTooltip: ({ override } = {}) => {
            manualOverride = !!override
            insertTooltip({
                toolbarNotifications,
                loadStyles,
                triggerEventName: 'mouseup',
            })
        },
        removeTooltip: ({ override } = {}) => {
            manualOverride = !!override
            removeTooltip({ triggerEventName: 'mouseup' })
        },
        insertOrRemoveTooltip: async () => {
            await insertOrRemoveTooltip({ toolbarNotifications, loadStyles })
        },
    })
}

/**
 * Checks for certain conditions before triggering the tooltip.
 * i) Whether the selection made by the user is just text.
 * ii) Whether the selected target is not inside the tooltip itself.
 *
 * Event is undefined in the scenario of user selecting the text before the
 * page has loaded. So we don't need to check for condition ii) since the
 * tooltip wouldn't have popped up yet.
 */
export const conditionallyTriggerTooltip: (
    args: {
        callback(p: Position): void
        toolbarNotifications: ToolbarNotifications
    },
    event?: Event,
) => void = delayed(async ({ callback, toolbarNotifications }, event) => {
    if (!userSelectedText() || (event && isTargetInsideTooltip(event))) {
        return
    }

    /*
    If all the conditions passed, then this returns the position to anchor the
    tooltip. The positioning is based on the user's preferred method. But in the
    case of tooltip popping up before page load, it resorts to text based method
    */
    const positioning = await getPositionState()
    let position: Position
    if (positioning === 'text' || !event) {
        position = calculateTooltipPosition()
    } else if (positioning === 'mouse' && event) {
        position = { x: event.pageX, y: event.pageY }
    }
    callback(position)

    conditionallyShowHighlightNotification({
        toolbarNotifications,
        position,
    })
}, 300)

export function calculateTooltipPosition() {
    const range = document.getSelection().getRangeAt(0)
    const boundingRect = range.getBoundingClientRect()
    // x = position of element from the left + half of it's width
    const x = boundingRect.left + boundingRect.width / 2
    // y = scroll height from top + pixels from top + height of element - offset
    const y = window.pageYOffset + boundingRect.top + boundingRect.height - 10
    return {
        x,
        y,
    }
}

function isAnchorOrContentEditable(selected) {
    // Returns true if the any of the parent is an anchor element
    // or is content editable.
    let parent = selected.parentElement
    while (parent) {
        if (parent.contentEditable === 'true' || parent.nodeName === 'A') {
            return true
        }
        parent = parent.parentElement
    }
    return false
}

export function userSelectedText() {
    const selection = document.getSelection()
    if (selection.type === 'None') {
        return false
    }

    const selectedString = selection.toString().trim()
    const container = selection.getRangeAt(0).commonAncestorContainer
    const extras = isAnchorOrContentEditable(container)

    return !!selection && !selection.isCollapsed && !!selectedString && !extras
}

function isTargetInsideTooltip(event) {
    const $tooltipContainer = document.querySelector(
        '#memex-direct-linking-tooltip',
    )
    if (!$tooltipContainer) {
        // edge case, where the destroy() is called
        return true
    }
    return $tooltipContainer.contains(event.target)
}
