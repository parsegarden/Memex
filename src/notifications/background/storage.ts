import { FeatureStorage } from '../../search/search-index-new/storage'

export default class NotificationStorage extends FeatureStorage {
    constructor(storageManager) {
        super(storageManager)

        this.storageManager.registerCollection('notifications', {
            version: new Date(2018, 7, 4),
            fields: {
                id: { type: 'string' },
                title: { type: 'string' },
                message: { type: 'string' },
                buttonText: {type: 'string'},
                link: {type: 'string'},
                sentTime: {type: 'datetime'},
                deliveredTime: {type: 'datetime'},
                readTime: {type: 'datetime'},
            },
            indices: [
                { field: 'id', pk: true },
            ],
        })
    }

    async storeNotification(notification) {
        await this.storageManager.putObject('notifications', notification)
    }

    async getNotifications(isRead) {
        return await this.storageManager.findAll(
            'notifications',
            { readTime: { $exists: isRead } },
        )
    }

    async getUnreadCount() {
        return await this.storageManager.countAll(
            'notifications',
            { readTime: { $exists: false } },
        )
    }
}
