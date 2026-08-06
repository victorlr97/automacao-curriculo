const fs = require('fs');
const path = require('path');
const { initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

// Localmente (e ainda no Render) usa o JSON da service account, do repo
// (gitignorado) ou de um caminho passado por FIREBASE_SERVICE_ACCOUNT_PATH.
// No Cloud Run não existe esse arquivo — a service account do próprio
// serviço já tem as roles IAM necessárias, então o Admin SDK resolve a
// credencial sozinho via Application Default Credentials, sem precisar de
// mais um secret pra gerenciar.
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || './firebase-service-account.json';
const resolvedServiceAccountPath = path.isAbsolute(serviceAccountPath)
  ? serviceAccountPath
  : path.join(__dirname, serviceAccountPath);
const credential = fs.existsSync(resolvedServiceAccountPath)
  ? cert(require(resolvedServiceAccountPath))
  : applicationDefault();

const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || 'automacao-curriculo-app.firebasestorage.app';

const app = initializeApp({
  credential,
  storageBucket
});

module.exports = {
  auth: getAuth(app),
  db: getFirestore(app),
  bucket: getStorage(app).bucket()
};
