export const bindMethod = <Target, Key extends keyof Target>(
    object: Target,
    key: Key,
): Target[Key] => {
    return object ? (object[key] as any).bind(object) : () => {}
}
