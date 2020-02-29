import * as firebase from 'firebase/app'

const firebaseConfig = {
    apiKey: process.env.FIREBASE_MEMEX_API_KEY,
    authDomain: process.env.FIREBASE_MEMEX_AUTH_DOMAIN,
    databaseURL: process.env.FIREBASE_MEMEX_DATABSE_URL,
    projectId: process.env.FIREBASE_MEMEX_PROJECT_ID,
    messagingSenderId: process.env.FIREBASE_MEMEX_MESSAGING_SENDER_ID,
    appId: process.env.FIREBASE_MEMEX_APP_ID,
}

export const getFirebase = () => {
    console.log(
        'VIJX',
        'src',
        'util',
        'firebase-app-initialized',
        'getFirebase',
        firebase.apps,
    )
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig)
    }
    return firebase
}
