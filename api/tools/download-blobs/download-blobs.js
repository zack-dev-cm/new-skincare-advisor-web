'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { BlobServiceClient, StorageSharedKeyCredential } = require('@azure/storage-blob');
const { DefaultAzureCredential } = require('@azure/identity');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT;
const ACCOUNT_KEY = process.env.AZURE_STORAGE_KEY || '';
const DEST_PATH = process.env.DOWNLOAD_DEST_PATH;
const CONTAINERS = (process.env.CONTAINERS || 'selfies,user-images')
  .split(',')
  .map((c) => c.trim())
  .filter(Boolean);
const STATE_FILE = process.env.STATE_FILE_PATH
  ? path.resolve(process.env.STATE_FILE_PATH)
  : path.join(__dirname, 'download-state.json');

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------
if (!ACCOUNT_NAME) {
  console.error('[ERROR] AZURE_STORAGE_ACCOUNT è obbligatorio. Imposta la variabile d\'ambiente o crea un file .env.');
  process.exit(1);
}
if (!DEST_PATH) {
  console.error('[ERROR] DOWNLOAD_DEST_PATH è obbligatorio. Imposta la variabile d\'ambiente o crea un file .env.');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// State helpers
// ---------------------------------------------------------------------------
function readState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(raw);
      return state;
    }
  } catch (err) {
    console.warn(`[WARN] Impossibile leggere il file di stato (${STATE_FILE}): ${err.message}`);
  }
  return { lastSuccessfulRun: null };
}

function writeState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ---------------------------------------------------------------------------
// Azure Blob Storage client
// ---------------------------------------------------------------------------
function createBlobServiceClient() {
  let credential;
  if (ACCOUNT_KEY) {
    credential = new StorageSharedKeyCredential(ACCOUNT_NAME, ACCOUNT_KEY);
    console.log('[AUTH] Usando StorageSharedKeyCredential (chiave account)');
  } else {
    credential = new DefaultAzureCredential();
    console.log('[AUTH] Usando DefaultAzureCredential (Managed Identity / Azure CLI)');
  }
  return new BlobServiceClient(
    `https://${ACCOUNT_NAME}.blob.core.windows.net`,
    credential
  );
}

// ---------------------------------------------------------------------------
// Download a single blob — salva direttamente nella root con il basename del blob
// ---------------------------------------------------------------------------
async function downloadBlob(containerClient, blobName, containerName, destDir) {
  const localFileName = path.basename(blobName);
  const localFilePath = path.join(destDir, localFileName);

  const blobClient = containerClient.getBlobClient(blobName);
  await blobClient.downloadToFile(localFilePath);
  return localFilePath;
}

// ---------------------------------------------------------------------------
// Process one container
// ---------------------------------------------------------------------------
async function processContainer(blobServiceClient, containerName, sinceDate, destDir) {
  console.log(`\n[CONTAINER] ${containerName}`);

  const containerClient = blobServiceClient.getContainerClient(containerName);

  // Verify container exists
  const exists = await containerClient.exists();
  if (!exists) {
    console.warn(`[WARN] Container "${containerName}" non trovato. Skip.`);
    return { downloaded: 0, skipped: 0, errors: 0 };
  }

  let downloaded = 0;
  let skipped = 0;
  let errors = 0;

  for await (const blob of containerClient.listBlobsFlat({ includeMetadata: false })) {
    const lastModified = blob.properties.lastModified;

    // Incremental filter
    if (sinceDate && lastModified <= sinceDate) {
      skipped++;
      continue;
    }

    try {
      const localPath = await downloadBlob(containerClient, blob.name, containerName, destDir);
      console.log(`  [OK] ${blob.name}  ->  ${path.basename(localPath)}  (${formatDate(lastModified)})`);
      downloaded++;
    } catch (err) {
      console.error(`  [ERR] ${blob.name}: ${err.message}`);
      errors++;
    }
  }

  console.log(`  Scaricati: ${downloaded} | Saltati: ${skipped} | Errori: ${errors}`);
  return { downloaded, skipped, errors };
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------
function formatDate(date) {
  return date ? date.toISOString() : 'N/A';
}

function ensureDestDir(destDir) {
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(`[INFO] Cartella di destinazione creata: ${destDir}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  console.log('='.repeat(60));
  console.log('  Dermaself Blob Storage Incremental Downloader');
  console.log('='.repeat(60));
  console.log(`Account  : ${ACCOUNT_NAME}`);
  console.log(`Container: ${CONTAINERS.join(', ')}`);
  console.log(`Dest     : ${DEST_PATH}`);
  console.log(`State    : ${STATE_FILE}`);

  const state = readState();
  const sinceDate = state.lastSuccessfulRun ? new Date(state.lastSuccessfulRun) : null;

  if (sinceDate) {
    console.log(`\n[INFO] Download incrementale — blob modificati dopo: ${formatDate(sinceDate)}`);
  } else {
    console.log('\n[INFO] Nessuno stato precedente — scarico tutti i blob (full sync)');
  }

  ensureDestDir(DEST_PATH);

  const blobServiceClient = createBlobServiceClient();

  const runStart = new Date();
  let totalDownloaded = 0;
  let totalErrors = 0;

  for (const containerName of CONTAINERS) {
    const result = await processContainer(blobServiceClient, containerName, sinceDate, DEST_PATH);
    totalDownloaded += result.downloaded;
    totalErrors += result.errors;
  }

  console.log('\n' + '='.repeat(60));
  console.log(`  Totale scaricati: ${totalDownloaded} | Totale errori: ${totalErrors}`);

  if (totalErrors > 0) {
    console.warn(`\n[WARN] Si sono verificati ${totalErrors} errori. Il file di stato NON verrà aggiornato.`);
    console.warn('       Correggi gli errori e riesegui lo script per riprovare.');
    process.exit(1);
  }

  // Update state only on full success
  const newState = {
    lastSuccessfulRun: runStart.toISOString(),
    containers: CONTAINERS,
  };
  writeState(newState);
  console.log(`\n[OK] Stato aggiornato: lastSuccessfulRun = ${newState.lastSuccessfulRun}`);
  console.log('='.repeat(60));
}

main().catch((err) => {
  console.error('\n[FATAL]', err.message || err);
  process.exit(1);
});
