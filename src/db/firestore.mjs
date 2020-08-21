import Firestore from '@google-cloud/firestore'

const db = new Firestore();

const docRef = db.collection('bot').doc();

 docRef.set({
    first: 'Ada',
    last: 'Lovelace',
    born: 1815
});
