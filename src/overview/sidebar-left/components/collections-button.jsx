import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'
import styles from './collections-button.css'

class CollectionsButton extends PureComponent {
    static propTypes = {
        listBtnClick: PropTypes.func.isRequired,
    }

    render() {
        return (
            <div
                className={styles.buttonContainer}
                onDragEnter={this.props.listBtnClick}
            />
        )
    }
}

export default CollectionsButton
