# Dermaself — Blob Storage Incremental Downloader

Script Node.js per scaricare in locale tutti i file dai container Azure Blob Storage `selfies` e `user-images` dell'account `stdermaselfprdwesteurope`. Supporta download incrementale: alla seconda esecuzione scarica solo i blob modificati dopo l'ultimo run completato con successo.

## Struttura

```
api/tools/download-blobs/
├── download-blobs.js       ← script principale
├── package.json
├── .env.example            ← template configurazione
├── .env                    ← configurazione locale (non committare)
├── download-state.json     ← creato automaticamente dopo il primo run
└── README.md
```

## Prerequisiti

- Node.js >= 20
- Azure CLI (`az`) installato e configurato
- Accesso all'account Azure Blob Storage `stdermaselfprdwesteurope` (subscription `Dermaself`)

## Setup (una tantum)

### 1. Installa le dipendenze

```bash
cd api/tools/download-blobs
npm install
```

### 2. Crea il file di configurazione

```bash
cp .env.example .env
```

Modifica `.env` con i tuoi valori:

```env
AZURE_STORAGE_ACCOUNT=stdermaselfprdwesteurope
DOWNLOAD_DEST_PATH=C:\Dermaself\blobs-local
CONTAINERS=selfies,user-images
```

### 3. Autenticati con Azure CLI

```bash
az login
# seleziona la subscription "Dermaself" (ID: 3e3c04b4-ca5e-4209-ad07-7ddb0700486c)
```

## Esecuzione

```bash
cd api/tools/download-blobs
npm run download
```

## Autenticazione

Lo script supporta due modalità:

| Scenario | Configurazione |
|---|---|
| **Azure CLI** (consigliato per uso locale) | Lascia `AZURE_STORAGE_KEY` vuoto — usa `az login` |
| **Chiave account** (alternativa) | Imposta `AZURE_STORAGE_KEY` nel file `.env` |

Con Azure CLI attivo, `DefaultAzureCredential` rileva automaticamente la sessione `az login` senza ulteriore configurazione.

## Comportamento

### Primo run (full sync)
- Non esiste `download-state.json`
- Scarica **tutti** i blob da tutti i container configurati

### Run successivi (incrementale)
- Legge `lastSuccessfulRun` da `download-state.json`
- Scarica solo i blob con `Last-Modified > lastSuccessfulRun`

### File di stato
Il file `download-state.json` viene aggiornato **solo se il run completa senza errori**:

```json
{
  "lastSuccessfulRun": "2026-03-09T10:00:00.000Z",
  "containers": ["selfies", "user-images"]
}
```

Se ci sono errori, lo script termina con exit code `1` e non aggiorna lo stato, così al prossimo run riprova dai blob non ancora scaricati.

## Naming dei file in locale

Tutti i file vengono salvati direttamente nella root di `DOWNLOAD_DEST_PATH` usando solo il nome del file originale (basename), senza sottocartelle:

| Blob originale | File locale |
|---|---|
| `selfies/uploads/2026-03-01/abc123.jpg` | `abc123.jpg` |
| `user-images/profiles/user42/avatar.png` | `avatar.png` |

## Configurazione avanzata

| Variabile | Default | Descrizione |
|---|---|---|
| `AZURE_STORAGE_ACCOUNT` | *(obbligatorio)* | Nome account storage |
| `AZURE_STORAGE_KEY` | *(vuoto)* | Chiave account (opzionale, alternativa ad `az login`) |
| `DOWNLOAD_DEST_PATH` | *(obbligatorio)* | Cartella locale di destinazione |
| `CONTAINERS` | `selfies,user-images` | Container da scaricare, separati da virgola |
| `STATE_FILE_PATH` | `./download-state.json` | Path del file di stato |

## Reset del file di stato

Per forzare un full sync, elimina `download-state.json`:

```bash
# PowerShell
Remove-Item download-state.json
npm run download
```
