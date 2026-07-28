// Script de uso único: sobe currículos já gerados localmente (de antes da
// migração pro Firestore/Storage) pra users/{uid}/resumes/{slug} + Storage.
// Só migra entradas que têm .json (dado estruturado); PDFs soltos sem .json
// (currículos importados manualmente, sem passar pela IA) ficam de fora —
// dá pra reimportar esses depois pela função "Importar currículo" do app.
//
// Uso: node scripts/migrate-output-to-storage.js <uid> [pastaOutput]

const fs = require('fs');
const path = require('path');
const { db, bucket } = require('../server/firebase-admin');
const { buildResume } = require('./build-resume');

function slugify(text) {
  const slug = String(text || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-+|-+$)/g, '')
    .slice(0, 40);
  return slug || 'curriculo';
}

async function uniqueSlug(uid, desiredSlug) {
  let slug = desiredSlug;
  let counter = 2;
  while ((await db.collection('users').doc(uid).collection('resumes').doc(slug).get()).exists) {
    slug = `${desiredSlug}-${counter}`;
    counter++;
  }
  return slug;
}

async function main() {
  const [uid, outputDirArg] = process.argv.slice(2);
  if (!uid) {
    console.error('Uso: node scripts/migrate-output-to-storage.js <uid> [pastaOutput]');
    process.exit(1);
  }
  const dir = outputDirArg || path.join(__dirname, '..', 'output', uid);
  if (!fs.existsSync(dir)) {
    console.error(`Não encontrei ${dir}`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(dir).filter(f => f.endsWith('.json'));
  console.log(`${jsonFiles.length} currículo(s) com dado estruturado encontrados.`);

  let migrated = 0;
  let rendered = 0;
  for (const jsonFile of jsonFiles) {
    const baseName = jsonFile.replace(/\.json$/, '');
    const jsonPath = path.join(dir, jsonFile);
    const pdfPath = path.join(dir, `${baseName}.pdf`);
    const resolved = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const slug = await uniqueSlug(uid, slugify(resolved.fileLabel || baseName));

    let pdfBuffer;
    if (fs.existsSync(pdfPath)) {
      pdfBuffer = fs.readFileSync(pdfPath);
    } else {
      const tmpPdf = path.join(dir, `__tmp-${slug}.pdf`);
      await buildResume(jsonPath, tmpPdf);
      pdfBuffer = fs.readFileSync(tmpPdf);
      fs.unlinkSync(tmpPdf);
      rendered++;
    }

    await bucket.file(`resumes/${uid}/${slug}.pdf`).save(pdfBuffer, { contentType: 'application/pdf' });
    const generatedAt = fs.statSync(jsonPath).mtime.toISOString();
    await db.collection('users').doc(uid).collection('resumes').doc(slug).set({ ...resolved, generatedAt });

    migrated++;
    console.log(`  [${migrated}/${jsonFiles.length}] ${slug}`);
  }

  console.log(`Concluído: ${migrated} currículo(s) migrados (${rendered} com PDF re-renderizado a partir do JSON).`);
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
