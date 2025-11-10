param(
    [string]$SourceApp = "skincare-advisor-demo-neutral",
    [string]$SourceRG = "rg-prd-shopify-westeurope",
    [string]$TargetApp = "new-skincare-advisor-web",
    [string]$TargetRG = "rg-prd-shopify-westeurope"
)

Write-Host "Copia Variabili di Ambiente" -ForegroundColor Cyan
Write-Host "DA: $SourceApp" -ForegroundColor Yellow
Write-Host "A:  $TargetApp" -ForegroundColor Green
Write-Host ""

# Leggi source
Write-Host "Lettura configurazione source..." -ForegroundColor Cyan
$sourceJson = az staticwebapp appsettings list --name $SourceApp --resource-group $SourceRG 2>&1
$source = $sourceJson | ConvertFrom-Json

if (-not $source.properties) {
    Write-Host "Errore: impossibile leggere source" -ForegroundColor Red
    exit 1
}

$props = $source.properties.PSObject.Properties
$total = ($props | Measure-Object).Count

Write-Host "Trovate $total variabili" -ForegroundColor Green
Write-Host ""

foreach ($p in $props) {
    Write-Host "  $($p.Name)" -ForegroundColor White
}

Write-Host ""
$conf = Read-Host "Continuare? (si/no)"
if ($conf -ne "si") {
    Write-Host "Annullato" -ForegroundColor Red
    exit 0
}

Write-Host ""
Write-Host "Copia in corso..." -ForegroundColor Cyan

$ok = 0
$err = 0

foreach ($p in $props) {
    $k = $p.Name
    $v = $p.Value
    
    Write-Host "  $k..." -NoNewline
    
    az staticwebapp appsettings set --name $TargetApp --resource-group $TargetRG --setting-names "$k=$v" --output none 2>&1 | Out-Null
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host " OK" -ForegroundColor Green
        $ok++
    } else {
        Write-Host " ERRORE" -ForegroundColor Red
        $err++
    }
}

Write-Host ""
Write-Host "Completato: $ok OK, $err errori" -ForegroundColor Cyan

