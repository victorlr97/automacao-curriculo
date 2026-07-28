const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// No Render, o JSON da service account vem via Secret File (caminho passado
// por FIREBASE_SERVICE_ACCOUNT_PATH); localmente usa o arquivo do repo
// (gitignorado, nunca commitado).
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const serviceAccount = require(serviceAccountPath);

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'automacao-curriculo-app.firebasestorage.app';

const app = initializeApp({
  credential: cert(serviceAccount),
  storageBucket
});

module.exports = {
  auth: getAuth(app),
  db: getFirestore(app),
  bucket: getStorage(app).bucket()
};
