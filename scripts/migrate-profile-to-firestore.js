// Script de uso único: migra um perfil que hoje vive em data/profiles/<profileId>/
// pra uma conta Firebase (users/{uid} no Firestore), e renomeia a pasta de
// currículos gerados de output/<profileId>/ pra output/<uid>/. Não faz parte
// do fluxo normal do app — roda uma vez, na mão, depois de criar a conta.
//
// Uso: node scripts/migrate-profile-to-firestore.js <profileId> <uid>

const fs = require('fs');
const path = require('path');
const { db } = require('../server/firebase-admin');

async function main() {
  const [profileId, uid] = process.argv.slice(2);
  if (!profileId || !uid) {
    console.error('Uso: node scripts/migrate-profile-to-firestore.js <profileId> <uid>');
    process.exit(1);
  }

  const projectRoot = path.join(__dirname, '..');
  const databasePath = path.join(projectRoot, 'data', 'profiles', profileId, 'database.json');
  const oldOutputDir = path.join(projectRoot, 'output', profileId);
  const newOutputDir = path.join(projectRoot, 'output', uid);

  if (!fs.existsSync(databasePath)) {
    console.error(`Não encontrei ${databasePath}`);
    process.exit(1);
  }

  const database = JSON.parse(fs.readFileSync(databasePath, 'utf8'));
  await db.collection('users').doc(uid).set({
    ...database,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  console.log(`Fatos de "${profileId}" gravados em users/${uid} no Firestore.`);

  if (fs.existsSync(oldOutputDir)) {
    if (fs.existsSync(newOutputDir)) {
      console.error(`${newOutputDir} já existe — não vou sobrescrever. Mova manualmente se precisar.`);
    } else {
      fs.renameSync(oldOutputDir, newOutputDir);
      console.log(`Currículos gerados movidos de output/${profileId}/ pra output/${uid}/.`);
    }
  } else {
    console.log(`Nenhuma pasta output/${profileId}/ encontrada — nada pra mover.`);
  }

  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
