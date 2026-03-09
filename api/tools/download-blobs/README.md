# Dermaself — Blob Storage Incremental Downloader

Script Node.js per scaricare in locale tutti i file dai container Azure Blob Storage `selfies` e `user-images` dell'account `stdermaselfprdwesteurope`. Supporta download incrementale: alla seconda esecuzione scarica solo i blob modificati dopo l'ultimo run completato con successo.

## Struttura

```
api/tools/download-blobs/
├── download-blobs.js       ← script principale
├── package.json
├── .env.example            ← template configurazione
├── download-state.json     ← creato automaticamente dopo il primo run
└── README.md
```

## Prerequisiti

- Node.js >= 20
- Accesso all'account Azure Blob Storage `stdermaselfprdwesteurope`

## Setup

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
# Nome account storage (obbligatorio)
AZURE_STORAGE_ACCOUNT=stdermaselfprdwesteurope

# Chiave account (opzionale — vedi sezione Autenticazione)
AZURE_STORAGE_KEY=<la-tua-chiave>

# Cartella di destinazione locale (obbligatorio)
DOWNLOAD_DEST_PATH=C:\Dermaself\blobs-local

# Container da scaricare (default: selfies,user-images)
CONTAINERS=selfies,user-images
```

## Autenticazione

Lo script supporta due modalità:

| Scenario | Configurazione |
|---|---|
| **Chiave account** (più semplice per uso locale) | Imposta `AZURE_STORAGE_KEY` nel file `.env` |
| **Azure CLI / Managed Identity** | Lascia `AZURE_STORAGE_KEY` vuoto e autenticati con `az login` |

Per usare Azure CLI:

```bash
az login
# oppure, se hai più subscription:
az account set --subscription <subscription-id>
```

## Esecuzione

```bash
# dalla cartella dello script
npm run download

# oppure direttamente
node download-blobs.js
```

## Comportamento

### Primo run (full sync)
- Non esiste `download-state.json`
- Scarica **tutti** i blob da tutti i container configurati

### Run successivi (incremental)
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

I file vengono salvati tutti nella stessa cartella (`DOWNLOAD_DEST_PATH`) con il path del blob "appiattito":

| Blob originale | File locale |
|---|---|
| `selfies/uploads/2026-03-01/abc123.jpg` | `selfies__uploads__2026-03-01__abc123.jpg` |
| `user-images/profiles/user42/avatar.png` | `user-images__profiles__user42__avatar.png` |

## Configurazione avanzata

| Variabile | Default | Descrizione |
|---|---|---|
| `AZURE_STORAGE_ACCOUNT` | *(obbligatorio)* | Nome account storage |
| `AZURE_STORAGE_KEY` | *(vuoto)* | Chiave account (opzionale) |
| `DOWNLOAD_DEST_PATH` | *(obbligatorio)* | Cartella locale di destinazione |
| `CONTAINERS` | `selfies,user-images` | Container da scaricare, separati da virgola |
| `STATE_FILE_PATH` | `./download-state.json` | Path del file di stato |

## Reset del file di stato

Per forzare un full sync, elimina semplicemente `download-state.json`:

```bash
rm download-state.json
node download-blobs.js
```
