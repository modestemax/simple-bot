import Firestore from '@google-cloud/firestore'

debugger;
const db = new Firestore();

const config = db.collection('bot').doc('config');

function init(config) {
    return config.get().then(ref => {
        const config = ref.data();
        return (config)
    })
}

export const initFireStore = init;


/*
 docRef.set({
    first: 'Ada',
    last: 'Lovelace',
    born: 1815
});
*/
