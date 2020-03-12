import React from 'react'

import SearchInjection from './SearchInjectionContainer'
import IndexingPrefs from './IndexingPrefsContainer'
import styles from './settings.css'

export default () => (
    <React.Fragment>
        <div className={styles.block}>
            <SearchInjection />
        </div>
        <div className={styles.block}>
            <IndexingPrefs />
        </div>
    </React.Fragment>
)
