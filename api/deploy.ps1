# Azure Functions Deployment Script
param(
    [Parameter(Mandatory=$true)]
    [string]$FunctionAppName
)

Write-Host "🚀 Starting deployment for $FunctionAppName" -ForegroundColor Green

# Clean and install dependencies
Write-Host '📦 Installing production dependencies...' -ForegroundColor Yellow
npm ci --only=production

# Remove dev dependencies and test files
Write-Host '🧹 Cleaning up (escludo script di test)...' -ForegroundColor Yellow
# Manteniamo la cartella tests per poter rieseguire i load test post-deploy
Remove-Item -Path "*.test.js" -Force -ErrorAction SilentlyContinue
Remove-Item -Path "*.spec.js" -Force -ErrorAction SilentlyContinue

# Deploy to Azure
Write-Host '☁️ Deploying to Azure...' -ForegroundColor Blue
func azure functionapp publish $FunctionAppName --build remote --javascript

Write-Host 'Deployment completed!' -ForegroundColor Green
