import SettingsContainer from './containers/settings'
import Privacy from './privacy'
import Statistics from './statistics'
import Settings from './settings'
import Overview from '../overview'
import UserScreen from '../authentication/components/UserScreen'
import { FeaturesOptInScreen } from '../feature-opt-in/ui/components/FeaturesOptInScreen'
import React from 'react'

export default [
    {
        name: 'Usage Statistics',
        pathname: '/statistics',
        component: Statistics,
        hideFromSidebar: true,
    },
    {
        name: 'Search Dashboard',
        pathname: '/overview',
        component: Overview,
        icon: 'search',
        useOwnLayout: true,
    },
    {
        name: 'Settings',
        pathname: '/settings',
        component: Settings,
        icon: 'settings',
    },
    {
        name: 'Blocklist',
        pathname: '/blocklist',
        component: SettingsContainer,
        icon: 'block',
    },
    {
        name: 'Privacy',
        pathname: '/privacy',
        component: Privacy,
        icon: 'privacy',
    },
    {
        name: 'Help',
        pathname: 'https://worldbrain.io/help',
        icon: 'help',
        isExternal: true,
    },
    {
        name: 'User Account',
        pathname: '/account',
        icon: 'settings',
        component: UserScreen,
        hideFromSidebar: true,
    },
    {
        name: 'User Account Subscriptions',
        pathname: '/account-subscriptions',
        icon: 'settings',
        component: props => (
            <UserScreen initiallyShowSubscriptionModal {...props} />
        ),
        hideFromSidebar: true,
    },
    {
        name: 'Opt In Features',
        pathname: '/features',
        icon: 'settings',
        component: FeaturesOptInScreen,
        hideFromSidebar: true,
    },
]
