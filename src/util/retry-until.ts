export class RetryTimeoutError extends Error {
    static isRetryTimeoutError = true
}

export function retryUntil(
    promiseCreator,
    condition,
    { intervalMiliseconds, timeoutMiliseconds },
) {
    const startMs = Date.now()
    return new Promise((resolve, reject) => {
        const doTry = async () => {
            let res
            try {
                res = await promiseCreator()
            } catch (e) {
                reject(e)
                return true
            }

            const valid = condition(res)
            if (valid) {
                resolve(res)
            }
            return valid
        }

        const tryOrRetryLater = async () => {
            if (await doTry()) {
                return
            }

            if (Date.now() - startMs >= timeoutMiliseconds) {
                return reject(new RetryTimeoutError())
            }

            setTimeout(tryOrRetryLater, intervalMiliseconds)
        }

        tryOrRetryLater()
    })
}

/**
 * Keeps executing a promiseCreator function till no error is thrown.
 */
export function retryUntilErrorResolves(
    promiseCreator,
    {
        intervalMilliSeconds,
        timeoutMilliSeconds,
    }: { intervalMilliSeconds: number; timeoutMilliSeconds: number },
) {
    const startMs = Date.now()
    return new Promise((resolve, reject) => {
        const doTry = async () => {
            let res
            try {
                res = await promiseCreator()
                resolve(res)
                return true
            } catch (e) {
                return false
            }
        }

        const tryOrRetryLater = async () => {
            if (await doTry()) {
                resolve(true)
                return
            }

            if (Date.now() - startMs >= timeoutMilliSeconds) {
                return reject(new RetryTimeoutError())
            }

            setTimeout(tryOrRetryLater, intervalMilliSeconds)
        }

        tryOrRetryLater()
    })
}
