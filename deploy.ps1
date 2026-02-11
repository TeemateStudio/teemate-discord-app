# Script de deploiement sur NAS (PowerShell)
# Usage: .\deploy.ps1 -Destination "user@nas-ip:/path/to/discord-app"

param(
    [Parameter(Mandatory=$true)]
    [string]$Destination
)

$ErrorActionPreference = "Stop"

Write-Host "Debut du deploiement vers $Destination" -ForegroundColor Green

# Verifier que .env existe
if (-not (Test-Path .env)) {
    Write-Host "Fichier .env manquant. Creation depuis .env.example..." -ForegroundColor Yellow
    if (Test-Path .env.example) {
        Copy-Item .env.example .env
        Write-Host "IMPORTANT: Editez le fichier .env avec vos vraies valeurs !" -ForegroundColor Yellow
        exit 1
    } else {
        Write-Host "Fichier .env.example introuvable" -ForegroundColor Red
        exit 1
    }
}

# Verifier que les variables importantes sont definies
Write-Host "Verification du fichier .env" -ForegroundColor Green
$envContent = Get-Content .env -Raw
if ($envContent -match "your_discord_app_id" -or $envContent -match "your_cloudflare_tunnel_token") {
    Write-Host "Le fichier .env contient encore des valeurs d'exemple !" -ForegroundColor Red
    Write-Host "Editez .env avec vos vraies valeurs avant de deployer."
    exit 1
}

# Extraire l'utilisateur@hote et le chemin
$parts = $Destination -split ":"
$sshHost = $parts[0]
$remotePath = $parts[1]

# Creer le repertoire distant si necessaire
Write-Host "Creation du repertoire distant..." -ForegroundColor Green
& ssh $sshHost "mkdir -p $remotePath"

# Creer et transferer l'archive en streaming (methode la plus fiable)
Write-Host "Creation et transfert de l'archive..." -ForegroundColor Green

# Utiliser tar en streaming directement vers SSH (evite fichier temporaire local)
# Temporairement ignorer les erreurs pour tar
$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$excludes = "--exclude=node_modules --exclude=.git --exclude=*.log --exclude=logs --exclude=deploy.tar.gz --exclude=deploy.ps1 --exclude=dashboard/node_modules --exclude=dashboard/.vite"
$tarCommand = "tar -czf - $excludes . | ssh $sshHost `"cat > $remotePath/deploy.tar.gz`""

# Executer via cmd pour que le pipe fonctionne correctement
$null = cmd /c $tarCommand 2>$null

$ErrorActionPreference = $prevErrorAction

# Verifier que l'archive a ete transferee
$remoteSize = & ssh $sshHost "stat -c %s $remotePath/deploy.tar.gz 2>/dev/null || echo 0"
if ([int]$remoteSize -eq 0) {
    Write-Host "Erreur lors du transfert de l'archive" -ForegroundColor Red
    exit 1
}

Write-Host "Archive transferee avec succes ($('{0:N2}' -f ([int]$remoteSize / 1MB)) MB)" -ForegroundColor Green

# Deployer sur le NAS
Write-Host "Deploiement sur le NAS..." -ForegroundColor Green

# Executer les commandes sequentiellement
Write-Host "Decompression de l'archive..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && tar -xzf deploy.tar.gz && rm deploy.tar.gz"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la decompression" -ForegroundColor Red
    exit 1
}

Write-Host "Creation du dossier logs..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && mkdir -p logs"

Write-Host "Arret des conteneurs existants..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && /usr/local/bin/docker-compose down 2>/dev/null" | Out-Null

Write-Host "Construction des images..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && /usr/local/bin/docker-compose build"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la construction" -ForegroundColor Red
    exit 1
}

Write-Host "Demarrage des conteneurs..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && /usr/local/bin/docker-compose up -d"
if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du demarrage" -ForegroundColor Red
    exit 1
}

Write-Host "Attente du demarrage..." -ForegroundColor Cyan
Start-Sleep -Seconds 5

Write-Host "Verification du statut..." -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && /usr/local/bin/docker-compose ps"

Write-Host ""
Write-Host "Logs recents:" -ForegroundColor Cyan
& ssh $sshHost "cd $remotePath && /usr/local/bin/docker-compose logs --tail=20"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du deploiement" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "================================================" -ForegroundColor Green
Write-Host "Deploiement termine avec succes !" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Green
Write-Host ""
Write-Host "Pour voir les logs: ssh $sshHost 'cd $remotePath && docker-compose logs -f'" -ForegroundColor Yellow
