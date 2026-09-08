const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const serviceAccount = require('../firebase-key.json');

if (getApps().length === 0) {
  initializeApp({
    credential: cert(serviceAccount)
  });
}

const db = getFirestore();

// Mantenemos la estructura 'admin.firestore.FieldValue' que busca server.js
const admin = {
  firestore: {
    FieldValue
  }
};

module.exports = { admin, db };