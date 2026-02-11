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

# Creer une archive temporaire
Write-Host "Creation de l'archive de deploiement..." -ForegroundColor Green
$tempArchive = "deploy.tar.gz"

# Utiliser tar (disponible sur Windows 10+)
& tar -czf $tempArchive --exclude=node_modules --exclude=.git --exclude=*.log --exclude=logs --exclude=deploy.tar.gz --exclude=deploy.ps1 .

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors de la creation de l'archive" -ForegroundColor Red
    exit 1
}

# Creer le repertoire distant si necessaire
Write-Host "Creation du repertoire distant..." -ForegroundColor Green
& ssh $sshHost "mkdir -p $remotePath"

# Transferer l'archive vers le NAS
Write-Host "Transfert vers le NAS..." -ForegroundColor Green

# Utiliser une methode compatible: creer un script temporaire et l'executer
$transferScript = @"
#!/bin/bash
cd $remotePath
cat > deploy.tar.gz
"@

$transferScript | & ssh $sshHost "cat > /tmp/receive.sh && chmod +x /tmp/receive.sh && /tmp/receive.sh && rm /tmp/receive.sh" -ErrorAction SilentlyContinue
Get-Content $tempArchive -Raw -Encoding Byte | & ssh $sshHost "cat > $remotePath/deploy.tar.gz"

if ($LASTEXITCODE -ne 0) {
    Write-Host "Echec du transfert. Essai avec une methode alternative..." -ForegroundColor Yellow

    # Methode alternative: utiliser base64
    $base64Content = [Convert]::ToBase64String([IO.File]::ReadAllBytes($tempArchive))
    $base64Content | & ssh $sshHost "base64 -d > $remotePath/deploy.tar.gz"

    if ($LASTEXITCODE -ne 0) {
        Write-Host "Echec du transfert via SSH" -ForegroundColor Red
        Remove-Item $tempArchive
        exit 1
    }
}

Write-Host "Transfert reussi" -ForegroundColor Green

# Deployer sur le NAS
Write-Host "Deploiement sur le NAS..." -ForegroundColor Green

$deployScript = @'
cd {0}
echo "Decompression de l'archive..."
tar -xzf deploy.tar.gz
rm deploy.tar.gz

echo "Creation du dossier logs..."
mkdir -p logs

echo "Arret des conteneurs existants..."
/usr/local/bin/docker-compose down 2>/dev/null || true

echo "Construction des images..."
/usr/local/bin/docker-compose build

echo "Demarrage des conteneurs..."
/usr/local/bin/docker-compose up -d

echo "Verification du statut..."
sleep 5
/usr/local/bin/docker-compose ps

echo "Logs recents:"
/usr/local/bin/docker-compose logs --tail=20
'@ -f $remotePath

& ssh $sshHost $deployScript

if ($LASTEXITCODE -ne 0) {
    Write-Host "Erreur lors du deploiement" -ForegroundColor Red
    Remove-Item $tempArchive
    exit 1
}

# Nettoyer l'archive locale
Remove-Item $tempArchive

Write-Host "Deploiement termine avec succes !" -ForegroundColor Green
Write-Host "Pour voir les logs: ssh $sshHost 'cd $remotePath && docker-compose logs -f'" -ForegroundColor Yellow
