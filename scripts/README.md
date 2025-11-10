# Script di Gestione Variabili di Ambiente Azure Static Web App

Script PowerShell per copiare rapidamente variabili di ambiente tra Azure Static Web Apps.

## Prerequisiti

1. **Azure CLI** installato: https://aka.ms/installazurecliwindows
2. Autenticazione Azure: `az login`

## Script: `quick-copy.ps1`

Copia tutte le variabili di ambiente da una Static Web App a un'altra.

### Uso Base

```powershell
# Naviga nella cartella scripts
cd scripts

# Esegui con i parametri di default (configurati per Dermaself)
.\quick-copy.ps1
```

### Uso con Parametri Personalizzati

```powershell
.\quick-copy.ps1 `
    -SourceApp "app-sorgente" `
    -SourceRG "resource-group-sorgente" `
    -TargetApp "app-destinazione" `
    -TargetRG "resource-group-destinazione"
```

### Parametri

| Parametro | Default | Descrizione |
|-----------|---------|-------------|
| `-SourceApp` | `skincare-advisor-demo-neutral` | Nome della Static Web App sorgente |
| `-SourceRG` | `rg-prd-shopify-westeurope` | Resource Group della app sorgente |
| `-TargetApp` | `new-skincare-advisor-web` | Nome della Static Web App destinazione |
| `-TargetRG` | `rg-prd-shopify-westeurope` | Resource Group della app destinazione |

## Esempi Pratici

### Esempio 1: Copia tra app nello stesso Resource Group

```powershell
.\quick-copy.ps1 -TargetApp "dermaself-demo-prod"
```

### Esempio 2: Copia tra app in Resource Groups diversi

```powershell
.\quick-copy.ps1 `
    -SourceApp "prod-app" `
    -SourceRG "rg-prod" `
    -TargetApp "staging-app" `
    -TargetRG "rg-staging"
```

### Esempio 3: Backup da produzione a sviluppo

```powershell
.\quick-copy.ps1 `
    -SourceApp "skin-advisor-prd-web-westeurope" `
    -SourceRG "rg-prd-web-westeurope" `
    -TargetApp "skin-advisor-dev-web-westeurope" `
    -TargetRG "rg-dev-web-westeurope"
```

## Come Funziona

1. **Login**: Verifica che sei autenticato ad Azure
2. **Lettura**: Legge tutte le variabili dalla Static Web App sorgente
3. **Anteprima**: Mostra l'elenco delle variabili che verranno copiate
4. **Conferma**: Chiede conferma prima di procedere
5. **Copia**: Copia ciascuna variabile una per una nella app destinazione
6. **Riepilogo**: Mostra quante variabili sono state copiate con successo

## Output di Esempio

```
Copia Variabili di Ambiente
DA: skincare-advisor-demo-neutral
A:  dermaself-demo-prod

Lettura configurazione source...
Trovate 17 variabili

  AZURE_STORAGE_ACCOUNT
  AZURE_STORAGE_CONTAINER
  AZURE_STORAGE_KEY
  ...

Continuare? (si/no): si

Copia in corso...
  AZURE_STORAGE_ACCOUNT... OK
  AZURE_STORAGE_CONTAINER... OK
  ...

Completato: 17 OK, 0 errori
```

## Comandi Utili Azure CLI

### Visualizzare tutte le Static Web Apps

```powershell
az staticwebapp list --output table
```

### Visualizzare le variabili di una app

```powershell
az staticwebapp appsettings list `
    --name "nome-app" `
    --resource-group "nome-rg"
```

### Impostare una singola variabile

```powershell
az staticwebapp appsettings set `
    --name "nome-app" `
    --resource-group "nome-rg" `
    --setting-names "NOME_VAR=valore"
```

### Eliminare una variabile

```powershell
az staticwebapp appsettings delete `
    --name "nome-app" `
    --resource-group "nome-rg" `
    --setting-names "NOME_VAR"
```

## Note Importanti

⚠️ **Attenzione:**
- Lo script **sovrascrive** le variabili esistenti con lo stesso nome
- Non elimina variabili che esistono solo nella destinazione
- Le modifiche richiedono 2-5 minuti per essere applicate da Azure

🔐 **Sicurezza:**
- Lo script non salva le variabili su file
- Tutto avviene direttamente tra Azure e il tuo terminale
- Assicurati di essere nel giusto tenant e subscription prima di eseguire

📝 **Best Practices:**
- Esegui sempre una verifica manuale dopo la copia
- Documenta le modifiche fatte agli ambienti
- Non condividere i valori delle variabili in chat o commit

## Troubleshooting

### "Azure CLI non trovato"

Installa Azure CLI:
```powershell
winget install Microsoft.AzureCLI
```
Oppure scarica da: https://aka.ms/installazurecliwindows

### "Non sei autenticato"

```powershell
az login
```

### "Impossibile leggere source"

Verifica che la app esista e che tu abbia i permessi:
```powershell
az staticwebapp show --name "nome-app" --resource-group "nome-rg"
```

### "Errore nel recupero delle impostazioni"

Verifica i tuoi permessi:
```powershell
# Visualizza il tuo account
az account show

# Visualizza i tuoi ruoli
az role assignment list --assignee $(az account show --query user.name -o tsv)
```

### Le variabili non sono visibili dopo la copia

- Attendi 2-5 minuti per la propagazione
- Verifica nel portale Azure: Static Web App → Configuration → Application settings
- Controlla che non ci siano errori nei log della app

## File di Configurazione

### `.gitignore`

Il file `.gitignore` nella cartella scripts impedisce di committare accidentalmente file con variabili esportate.

## Struttura della Cartella

```
scripts/
├── quick-copy.ps1    # Script principale per copiare variabili
├── README.md         # Questa documentazione
└── .gitignore        # Protezione per file sensibili
```

## Supporto e Documentazione

- **Azure Static Web Apps**: https://docs.microsoft.com/azure/static-web-apps/
- **Azure CLI Static Web App**: https://docs.microsoft.com/cli/azure/staticwebapp
- **GitHub Issues**: https://github.com/Azure/static-web-apps/issues

## Changelog

### v1.0 (Corrente)
- Script `quick-copy.ps1` per copia rapida di variabili
- Supporto per parametri configurabili
- Conferma interattiva prima della copia
- Report dettagliato di successi/errori
