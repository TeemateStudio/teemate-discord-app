# Script de deploiement sur NAS (PowerShell)
# Usage: .\deploy.ps1 -Destination "user@nas-ip:/path/to/discord-app"
# Mot de passe demande 2 fois max : 1x transfert, 1x deploiement

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

# --- Etape 1 : Creer le repertoire distant + transferer l'archive (1 mot de passe) ---
Write-Host "Creation du repertoire distant + transfert de l'archive..." -ForegroundColor Green
Write-Host "(mot de passe 1/2)" -ForegroundColor Yellow

$prevErrorAction = $ErrorActionPreference
$ErrorActionPreference = "Continue"

$excludes = "--exclude=node_modules --exclude=.git --exclude=*.log --exclude=logs --exclude=deploy.tar.gz --exclude=deploy.ps1 --exclude=dashboard/node_modules --exclude=dashboard/.vite"
$tarCommand = "tar -czf - $excludes . | ssh $sshHost `"mkdir -p $remotePath && cat > $remotePath/deploy.tar.gz`""

$null = cmd /c $tarCommand 2>$null

$ErrorActionPreference = $prevErrorAction

# --- Etape 2 : Deployer sur le NAS en une seule session SSH (1 mot de passe) ---
Write-Host "Deploiement sur le NAS..." -ForegroundColor Green
Write-Host "(mot de passe 2/2)" -ForegroundColor Yellow

# Toutes les commandes de deploiement en une seule connexion SSH
$deployScript = @"
set -e
cd $remotePath

# Verifier l'archive
ARCHIVE_SIZE=`$(stat -c %s deploy.tar.gz 2>/dev/null || echo 0)
if [ "`$ARCHIVE_SIZE" -eq 0 ]; then
    echo "ERREUR: Archive vide ou manquante"
    exit 1
fi
echo "Archive recue: `$((`$ARCHIVE_SIZE / 1024)) KB"

# Extraire et nettoyer
echo "--- Decompression ---"
tar -xzf deploy.tar.gz && rm deploy.tar.gz

# Preparer
mkdir -p logs

# Docker
echo "--- Arret des conteneurs ---"
/usr/local/bin/docker-compose down 2>/dev/null || true

echo "--- Construction des images ---"
/usr/local/bin/docker-compose build

echo "--- Demarrage des conteneurs ---"
/usr/local/bin/docker-compose up -d

echo "--- Attente du demarrage (5s) ---"
sleep 5

echo "--- Statut ---"
/usr/local/bin/docker-compose ps

echo "--- Logs recents ---"
/usr/local/bin/docker-compose logs --tail=20
"@

# Executer tout en une seule session SSH
$deployScript | & ssh $sshHost "bash -s"

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
Write-Host ""
Write-Host "Astuce: Pour ne plus jamais taper le mot de passe :" -ForegroundColor DarkGray
Write-Host "  ssh-keygen -t ed25519" -ForegroundColor DarkGray
Write-Host "  type `$env:USERPROFILE\.ssh\id_ed25519.pub | ssh $sshHost `"mkdir -p ~/.ssh && cat >> ~/.ssh/authorized_keys`"" -ForegroundColor DarkGray
