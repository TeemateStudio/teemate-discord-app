# Déploiement Sécurisé avec Cloudflare Tunnel sur Synology NAS

## Pourquoi Cloudflare Tunnel ?

✅ **Aucun port ouvert** sur votre routeur
✅ **Réseau privé protégé** - Connexions sortantes uniquement
✅ **Protection DDoS** de Cloudflare incluse
✅ **SSL/TLS automatique** avec certificats Cloudflare
✅ **IP publique cachée** - Impossible de la découvrir
✅ **100% Gratuit**
✅ **Firewall et rate limiting** via dashboard Cloudflare

## Architecture

```
Discord → bot.teemate.gg (Cloudflare) → Tunnel chiffré → Synology NAS (localhost:3000)
          ☁️ Edge + Protection            🔒 TLS          🏠 Réseau privé
```

## Guide Rapide (TL;DR)

Pour les pressés, voici les commandes essentielles :

```bash
# 1. SSH dans le NAS
ssh admin@192.168.1.100

# 2. Créer les dossiers
mkdir -p /volume1/docker/discord-bot /volume1/docker/cloudflared

# 3. Uploader le code via File Station

# 4. Configurer Cloudflare Tunnel
docker run -it --rm -v /volume1/docker/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel login
docker run -it --rm -v /volume1/docker/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel create discord-bot
docker run -it --rm -v /volume1/docker/cloudflared:/etc/cloudflared cloudflare/cloudflared:latest tunnel route dns discord-bot bot.teemate.gg

# 5. Créer docker-compose.yml et lancer
cd /volume1/docker/discord-bot
docker-compose up -d

# ✅ Terminé !
```

## Prérequis sur Synology

### 1. Activer SSH

Dans DSM (interface web Synology) :
1. **Panneau de configuration** → **Terminal & SNMP**
2. Cocher **Activer le service SSH**
3. Port : 22 (par défaut)
4. Cliquer **Appliquer**

Connectez-vous ensuite :
```bash
ssh votre-username@ip-du-nas
# Exemple: ssh admin@192.168.1.100
```

**Note de sécurité :** Une fois la configuration terminée, vous pouvez désactiver SSH ou limiter l'accès par IP.

### 2. Installer Container Manager (Docker)

Dans DSM :
1. **Centre de paquets**
2. Rechercher **Container Manager** (anciennement Docker)
3. Cliquer **Installer**

**Modèles compatibles :** La plupart des NAS Synology modernes (DS218+, DS920+, DS1522+, etc.). Vérifiez sur https://www.synology.com/fr-fr/dsm/packages/ContainerManager

## Installation - Méthode 1 : Docker (Recommandé)

### Étape 1 : Préparer la structure

```bash
# Se connecter en SSH
ssh votre-username@ip-du-nas

# Créer les dossiers nécessaires
mkdir -p /volume1/docker/discord-bot
mkdir -p /volume1/docker/cloudflared

# Naviguer vers le dossier
cd /volume1/docker/discord-bot
```

### Étape 2 : Installer l'application Discord Bot

```bash
# Cloner ou uploader votre code
# Option 1 : Via git (si installé)
git clone https://github.com/votre-repo/teemate-discord-app.git .

# Option 2 : Upload via File Station (DSM)
# - Ouvrir File Station
# - Naviguer vers docker/discord-bot
# - Glisser-déposer les fichiers (app.js, package.json, etc.)

# Créer le fichier .env
nano .env
```

Contenu du `.env` :
```env
APP_ID=votre_app_id
DISCORD_TOKEN=votre_token
PUBLIC_KEY=votre_public_key
PORT=3000
```

### Étape 3 : Créer le Dockerfile pour l'app Discord

```bash
nano /volume1/docker/discord-bot/Dockerfile
```

Contenu :
```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
```

### Étape 4 : Configurer Cloudflare Tunnel (première fois)

```bash
# Lancer un conteneur temporaire pour la configuration
docker run -it --rm \
  -v /volume1/docker/cloudflared:/etc/cloudflared \
  cloudflare/cloudflared:latest \
  tunnel login
```

**Note :** Cela affichera une URL. Copiez-la et ouvrez-la dans votre navigateur pour autoriser le tunnel.

```bash
# Créer le tunnel
docker run -it --rm \
  -v /volume1/docker/cloudflared:/etc/cloudflared \
  cloudflare/cloudflared:latest \
  tunnel create discord-bot

# Notez le TUNNEL-ID affiché (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
```

### Étape 5 : Créer la configuration du tunnel

```bash
nano /volume1/docker/cloudflared/config.yml
```

Contenu (remplacez `<TUNNEL-ID>` par votre ID) :
```yaml
tunnel: <TUNNEL-ID>
credentials-file: /etc/cloudflared/<TUNNEL-ID>.json

ingress:
  # Route bot.teemate.gg vers le conteneur Discord
  - hostname: bot.teemate.gg
    service: http://discord-bot:3000

  # Route par défaut (obligatoire)
  - service: http_status:404
```

### Étape 6 : Créer le DNS record

```bash
docker run -it --rm \
  -v /volume1/docker/cloudflared:/etc/cloudflared \
  cloudflare/cloudflared:latest \
  tunnel route dns discord-bot bot.teemate.gg
```

### Étape 7 : Créer le docker-compose.yml

```bash
nano /volume1/docker/discord-bot/docker-compose.yml
```

Contenu :
```yaml
version: '3.8'

services:
  discord-bot:
    build: .
    container_name: discord-bot
    restart: unless-stopped
    environment:
      - APP_ID=${APP_ID}
      - DISCORD_TOKEN=${DISCORD_TOKEN}
      - PUBLIC_KEY=${PUBLIC_KEY}
      - PORT=3000
    networks:
      - discord-network
    volumes:
      - .:/app
      - /app/node_modules

  cloudflared:
    image: cloudflare/cloudflared:latest
    container_name: cloudflared-tunnel
    restart: unless-stopped
    command: tunnel run discord-bot
    volumes:
      - /volume1/docker/cloudflared:/etc/cloudflared
    networks:
      - discord-network
    depends_on:
      - discord-bot

networks:
  discord-network:
    driver: bridge
```

### Étape 8 : Lancer les conteneurs

```bash
cd /volume1/docker/discord-bot
docker-compose up -d

# Vérifier les logs
docker-compose logs -f

# Vérifier le status
docker-compose ps
```

### Étape 9 : Configurer le démarrage automatique dans DSM

1. Ouvrir **Container Manager** dans DSM
2. Aller dans l'onglet **Projet**
3. Vous devriez voir `discord-bot`
4. Les conteneurs se relanceront automatiquement au redémarrage du NAS (grâce à `restart: unless-stopped`)

## Installation - Méthode 2 : Installation Native (Alternative)

### Étape 1 : Télécharger cloudflared

```bash
# Se connecter en SSH
ssh votre-username@ip-du-nas

# Créer un dossier pour les binaires
mkdir -p /volume1/@appstore/cloudflared
cd /volume1/@appstore/cloudflared

# Télécharger cloudflared (architecture selon votre NAS)
# Pour la plupart des Synology modernes (x86_64) :
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64

# Pour les anciens modèles (ARM) :
# wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64

# Renommer et rendre exécutable
mv cloudflared-linux-amd64 cloudflared
chmod +x cloudflared

# Vérifier
./cloudflared --version
```

### Étape 2 : Configurer le tunnel

```bash
# Créer le dossier de configuration
mkdir -p /volume1/@appstore/cloudflared/.cloudflared

# Login Cloudflare
./cloudflared tunnel login

# Créer le tunnel
./cloudflared tunnel create discord-bot

# Notez le TUNNEL-ID affiché
```

### Étape 3 : Créer le fichier de configuration

```bash
nano /volume1/@appstore/cloudflared/.cloudflared/config.yml
```

Contenu :
```yaml
tunnel: <TUNNEL-ID>
credentials-file: /volume1/@appstore/cloudflared/.cloudflared/<TUNNEL-ID>.json

ingress:
  - hostname: bot.teemate.gg
    service: http://localhost:3000
  - service: http_status:404
```

### Étape 4 : Créer le DNS record

```bash
./cloudflared tunnel route dns discord-bot bot.teemate.gg
```

### Étape 5 : Installer Node.js et l'application

```bash
# Installer Node.js via Package Center dans DSM
# Ou télécharger manuellement

# Créer le dossier de l'app
mkdir -p /volume1/discord-bot
cd /volume1/discord-bot

# Uploader vos fichiers via File Station ou git

# Installer les dépendances
npm install
```

### Étape 6 : Créer les scripts de démarrage

```bash
# Script pour l'application Discord
nano /volume1/@appstore/cloudflared/start-discord-bot.sh
```

Contenu :
```bash
#!/bin/bash
cd /volume1/discord-bot
export APP_ID="votre_app_id"
export DISCORD_TOKEN="votre_token"
export PUBLIC_KEY="votre_public_key"
export PORT=3000
node app.js > /volume1/@appstore/cloudflared/discord-bot.log 2>&1
```

```bash
# Script pour cloudflared
nano /volume1/@appstore/cloudflared/start-tunnel.sh
```

Contenu :
```bash
#!/bin/bash
cd /volume1/@appstore/cloudflared
./cloudflared --config .cloudflared/config.yml tunnel run discord-bot > /volume1/@appstore/cloudflared/tunnel.log 2>&1
```

```bash
# Rendre exécutables
chmod +x /volume1/@appstore/cloudflared/start-discord-bot.sh
chmod +x /volume1/@appstore/cloudflared/start-tunnel.sh
```

### Étape 7 : Configurer le démarrage automatique dans DSM

1. Ouvrir **Panneau de configuration** → **Planificateur de tâches**
2. Créer → **Tâche déclenchée** → **Script défini par l'utilisateur**

#### Tâche 1 : Discord Bot
- **Nom de la tâche** : Start Discord Bot
- **Utilisateur** : root
- **Événement** : Démarrage
- **Script utilisateur** :
  ```bash
  /volume1/@appstore/cloudflared/start-discord-bot.sh
  ```

3. Créer une deuxième tâche pour le tunnel

#### Tâche 2 : Cloudflare Tunnel
- **Nom de la tâche** : Start Cloudflare Tunnel
- **Utilisateur** : root
- **Événement** : Démarrage
- **Script utilisateur** :
  ```bash
  sleep 10
  /volume1/@appstore/cloudflared/start-tunnel.sh
  ```

**Note :** Le `sleep 10` attend que l'app Discord soit prête.

### Étape 8 : Lancer manuellement pour tester

```bash
# Lancer l'app Discord
/volume1/@appstore/cloudflared/start-discord-bot.sh &

# Attendre quelques secondes, puis lancer le tunnel
/volume1/@appstore/cloudflared/start-tunnel.sh &

# Vérifier les logs
tail -f /volume1/@appstore/cloudflared/discord-bot.log
tail -f /volume1/@appstore/cloudflared/tunnel.log
```

### Étape 2 : Authentification Cloudflare

```bash
cloudflared tunnel login
```

Cela ouvre un navigateur pour vous connecter à Cloudflare et autoriser le tunnel.

### Étape 3 : Créer le tunnel

```bash
# Créer un tunnel nommé "discord-bot"
cloudflared tunnel create discord-bot

# Cela génère un fichier de credentials :
# ~/.cloudflared/<TUNNEL-ID>.json
```

**Important :** Notez le `TUNNEL-ID` affiché (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

### Étape 4 : Configurer le tunnel

Créer le fichier `~/.cloudflared/config.yml` :

```yaml
tunnel: <TUNNEL-ID>
credentials-file: /home/votre-user/.cloudflared/<TUNNEL-ID>.json

ingress:
  # Route bot.teemate.gg vers l'application Discord
  - hostname: bot.teemate.gg
    service: http://localhost:3000

  # Route par défaut (obligatoire)
  - service: http_status:404
```

**Note :** Adaptez le chemin du credentials-file selon votre système.

### Étape 5 : Créer le DNS record

```bash
cloudflared tunnel route dns discord-bot bot.teemate.gg
```

Cela crée automatiquement un CNAME dans Cloudflare :
```
bot.teemate.gg → <TUNNEL-ID>.cfargotunnel.com
```

### Étape 6 : Lancer l'application Discord

```bash
cd /chemin/vers/teemate-discord-app

# Installer les dépendances
npm install

# Installer PM2 pour gérer le processus
npm install -g pm2

# Démarrer l'app
pm2 start app.js --name discord-bot

# Configurer le démarrage automatique
pm2 startup
pm2 save
```

### Étape 7 : Lancer le tunnel

```bash
# Test (mode foreground)
cloudflared tunnel run discord-bot

# Si tout fonctionne, installer comme service
cloudflared service install

# Démarrer le service
sudo systemctl start cloudflared
sudo systemctl enable cloudflared

# Vérifier le status
sudo systemctl status cloudflared
```

### Étape 8 : Vérifier que tout fonctionne

```bash
# Test de l'endpoint public
curl https://bot.teemate.gg/

# Voir les logs du tunnel
sudo journalctl -u cloudflared -f

# Voir les logs de l'app Discord
pm2 logs discord-bot
```

## Configuration de Sécurité Avancée

### 1. Firewall Cloudflare (WAF)

Dans le dashboard Cloudflare (`Security > WAF`), créer des règles :

#### Bloquer tout sauf Discord
```
(http.user_agent contains "Discord-Interactions") → Allow
else → Block
```

#### Rate Limiting
```
Expression: (http.request.uri.path eq "/interactions")
Requests: 60 per minute
Action: Block
```

### 2. Access Policies (Optionnel)

Pour protéger l'accès même en cas de fuite d'URL :

```
Security > Access > Applications > Add an Application
- Application domain: bot.teemate.gg
- Path: /interactions
- Policy: IP ranges (ajouter les IPs de Discord)
```

**IPs Discord à autoriser :**
Consultez : https://discord.com/developers/docs/reference#ip-ranges

### 3. Logs et Monitoring

Dans Cloudflare Dashboard :
- `Analytics > Traffic` : Voir le trafic en temps réel
- `Security > Events` : Voir les requêtes bloquées
- `Logs` : Logs détaillés (nécessite un plan payant)

### 4. Sécurité supplémentaire sur Synology

#### Firewall Synology

Dans DSM :
1. **Panneau de configuration** → **Sécurité** → **Pare-feu**
2. Activer le pare-feu
3. Créer des règles :
   - ✅ Autoriser : LAN local (192.168.x.x/24)
   - ❌ Bloquer : Tout le reste

**Important :** Avec Cloudflare Tunnel, vous n'avez AUCUN port à ouvrir sur le pare-feu !

#### Protection des comptes

Dans DSM :
1. **Panneau de configuration** → **Sécurité** → **Compte**
2. Activer **Protection automatique**
3. Activer **Vérification en 2 étapes** pour les comptes admin

#### Auto-blocage (Protection brute force)

Dans DSM :
1. **Panneau de configuration** → **Sécurité** → **Compte**
2. **Activer le blocage automatique**
3. Bloquer après 5 tentatives échouées
4. Durée du blocage : Permanente (débloquer manuellement si nécessaire)

#### Isolation Docker (Déjà configuré)

Le docker-compose crée un réseau bridge isolé :
- Les conteneurs ne peuvent communiquer qu'entre eux
- Le port 3000 n'est PAS exposé sur le réseau local
- Seul cloudflared peut accéder à l'application

#### Désactiver SSH après configuration

Une fois tout configuré :
1. **Panneau de configuration** → **Terminal & SNMP**
2. Décocher **Activer le service SSH**

Vous pouvez le réactiver si besoin de maintenance.

#### Notifications Synology

Configurer les alertes email :
1. **Panneau de configuration** → **Notification**
2. Configurer l'email
3. Activer les alertes pour :
   - Connexions SSH
   - Utilisation anormale CPU/RAM
   - Arrêt des conteneurs Docker

## Gestion et Maintenance sur Synology

### Arrêter/Démarrer les services

#### Docker
```bash
# Arrêter tout
cd /volume1/docker/discord-bot
docker-compose down

# Démarrer
docker-compose up -d

# Redémarrer un seul service
docker-compose restart discord-bot
docker-compose restart cloudflared

# Voir le status
docker-compose ps
```

#### Via DSM (interface web)
1. Ouvrir **Container Manager**
2. Sélectionner le conteneur
3. Cliquer sur **Action** → **Arrêter/Démarrer**

#### Native
```bash
# Trouver les PIDs
ps aux | grep cloudflared
ps aux | grep "node app.js"

# Arrêter
kill <PID>

# Relancer via Task Scheduler ou manuellement
/volume1/@appstore/cloudflared/start-discord-bot.sh &
/volume1/@appstore/cloudflared/start-tunnel.sh &
```

### Voir les logs en temps réel

#### Docker
```bash
# Tous les logs
docker-compose logs -f

# Un service spécifique
docker logs -f discord-bot
docker logs -f cloudflared-tunnel

# Dernières 100 lignes
docker logs --tail 100 discord-bot
```

#### Native
```bash
# Logs en temps réel
tail -f /volume1/@appstore/cloudflared/discord-bot.log
tail -f /volume1/@appstore/cloudflared/tunnel.log

# Dernières 50 lignes
tail -n 50 /volume1/@appstore/cloudflared/tunnel.log
```

### Mettre à jour le code de l'application

#### Docker
```bash
cd /volume1/docker/discord-bot

# Mettre à jour le code (via git ou File Station)
git pull  # ou uploadez les nouveaux fichiers

# Reconstruire et redémarrer
docker-compose down
docker-compose build --no-cache
docker-compose up -d
```

#### Native
```bash
cd /volume1/discord-bot

# Mettre à jour le code
git pull

# Réinstaller les dépendances si nécessaire
npm install

# Redémarrer (trouver le PID et kill, puis relancer)
ps aux | grep "node app.js"
kill <PID>
/volume1/@appstore/cloudflared/start-discord-bot.sh &
```

### Mettre à jour cloudflared

#### Docker
```bash
# Arrêter les conteneurs
docker-compose down

# Mettre à jour l'image
docker pull cloudflare/cloudflared:latest

# Redémarrer
docker-compose up -d
```

#### Native
```bash
cd /volume1/@appstore/cloudflared

# Sauvegarder l'ancienne version
mv cloudflared cloudflared.old

# Télécharger la nouvelle version
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
mv cloudflared-linux-amd64 cloudflared
chmod +x cloudflared

# Vérifier
./cloudflared --version

# Redémarrer le tunnel
ps aux | grep cloudflared
kill <PID>
/volume1/@appstore/cloudflared/start-tunnel.sh &
```

### Vérifier le status du tunnel

```bash
# Via Docker
docker exec cloudflared-tunnel cloudflared tunnel info discord-bot

# Via Native
cd /volume1/@appstore/cloudflared
./cloudflared tunnel info discord-bot

# Lister tous les tunnels
./cloudflared tunnel list
```

### Monitoring via Cloudflare Dashboard

1. Se connecter à https://dash.cloudflare.com
2. Sélectionner votre domaine **teemate.gg**
3. **Traffic** → Voir les requêtes en temps réel
4. **Security** → **Events** → Voir les requêtes bloquées
5. **Cloudflare Zero Trust** → **Networks** → **Tunnels** → Voir le status du tunnel

### Sauvegardes

```bash
# Sauvegarder la configuration complète
mkdir -p /volume1/backups/discord-bot-$(date +%Y%m%d)

# Docker
cp -r /volume1/docker/discord-bot /volume1/backups/discord-bot-$(date +%Y%m%d)/
cp -r /volume1/docker/cloudflared /volume1/backups/discord-bot-$(date +%Y%m%d)/

# Native
cp -r /volume1/discord-bot /volume1/backups/discord-bot-$(date +%Y%m%d)/
cp -r /volume1/@appstore/cloudflared /volume1/backups/discord-bot-$(date +%Y%m%d)/
```

**Important :** Les credentials du tunnel (`<TUNNEL-ID>.json`) sont sensibles. Protégez vos sauvegardes.

### Rotation des logs (optionnel)

Pour éviter que les logs ne remplissent le disque :

```bash
# Créer un script de rotation
nano /volume1/@appstore/cloudflared/rotate-logs.sh
```

Contenu :
```bash
#!/bin/bash
# Garder seulement les 7 derniers jours de logs
find /volume1/@appstore/cloudflared -name "*.log" -mtime +7 -delete

# Ou compresser les anciens logs
find /volume1/@appstore/cloudflared -name "*.log" -mtime +1 -exec gzip {} \;
```

Ajouter au **Planificateur de tâches** (exécution quotidienne à 3h du matin).

## Vérification et Tests

### Vérifier que tout fonctionne

#### Méthode Docker
```bash
# Voir les logs
docker-compose logs -f

# Logs du bot uniquement
docker logs discord-bot -f

# Logs du tunnel uniquement
docker logs cloudflared-tunnel -f

# Vérifier le status des conteneurs
docker-compose ps
```

#### Méthode Native
```bash
# Voir les logs
tail -f /volume1/@appstore/cloudflared/discord-bot.log
tail -f /volume1/@appstore/cloudflared/tunnel.log

# Vérifier les processus
ps aux | grep node
ps aux | grep cloudflared
```

### Test de l'endpoint

```bash
# Depuis le NAS
curl http://localhost:3000

# Depuis l'extérieur
curl https://bot.teemate.gg

# Vérifier le DNS
nslookup bot.teemate.gg
```

## Troubleshooting Synology

### Le tunnel ne se connecte pas

#### Docker
```bash
# Vérifier les logs du tunnel
docker logs cloudflared-tunnel

# Vérifier les credentials
ls -la /volume1/docker/cloudflared/
cat /volume1/docker/cloudflared/config.yml

# Recréer le tunnel
docker-compose down
docker-compose up -d
```

#### Native
```bash
# Vérifier les credentials
cat /volume1/@appstore/cloudflared/.cloudflared/<TUNNEL-ID>.json

# Tester manuellement
cd /volume1/@appstore/cloudflared
./cloudflared --config .cloudflared/config.yml tunnel run discord-bot

# Vérifier les logs
tail -f /volume1/@appstore/cloudflared/tunnel.log
```

### Discord ne reçoit pas les requêtes

```bash
# Vérifier que l'app écoute sur le bon port
netstat -an | grep 3000

# Tester localement
curl http://localhost:3000

# Dans Docker : vérifier le réseau
docker network inspect discord-bot_discord-network
```

### Erreur 502/503

**Checklist :**
- ✅ L'application Discord est-elle démarrée ?
  ```bash
  docker ps  # ou ps aux | grep node
  ```
- ✅ Le port 3000 est-il accessible ?
  ```bash
  curl http://localhost:3000
  ```
- ✅ Le tunnel est-il connecté ?
  ```bash
  docker logs cloudflared-tunnel | grep "connected"
  ```
- ✅ Le DNS est-il configuré ?
  ```bash
  nslookup bot.teemate.gg
  ```

### Permission denied sur Synology

Si vous avez des erreurs de permissions :
```bash
# Donner les permissions au dossier
sudo chown -R votre-username:users /volume1/docker/discord-bot
sudo chmod -R 755 /volume1/docker/discord-bot

# Pour cloudflared
sudo chown -R votre-username:users /volume1/docker/cloudflared
sudo chmod 600 /volume1/docker/cloudflared/*.json
```

### Le conteneur redémarre en boucle

```bash
# Voir les logs
docker logs discord-bot --tail 50

# Problèmes courants :
# 1. Variables d'environnement manquantes
# 2. Port déjà utilisé
# 3. Erreur dans le code

# Vérifier les variables d'env
docker exec discord-bot env | grep -E 'APP_ID|DISCORD_TOKEN|PUBLIC_KEY'
```

### Accéder au shell du conteneur

```bash
# Accéder au conteneur Discord
docker exec -it discord-bot sh

# Accéder au conteneur Cloudflared
docker exec -it cloudflared-tunnel sh
```

## Avantages et Inconvénients

### ✅ Avantages de cette solution (Synology + Cloudflare Tunnel)

1. **Sécurité maximale**
   - Aucun port ouvert sur votre routeur
   - IP publique jamais exposée
   - Protection DDoS de Cloudflare
   - Réseau domestique isolé

2. **Coût**
   - 100% gratuit (vous avez déjà le NAS)
   - Pas de coût d'hébergement mensuel
   - Pas de limite de bande passante

3. **Contrôle**
   - Vos données restent chez vous
   - Accès physique au serveur
   - Logs accessibles localement

4. **Performance**
   - Latence faible (NAS local)
   - Bande passante du NAS disponible
   - Edge network de Cloudflare

5. **Apprentissage**
   - Excellente expérience DevOps
   - Compétences transférables
   - Compréhension complète de la stack

### ⚠️ Inconvénients

1. **Disponibilité**
   - Dépend de votre connexion Internet
   - Dépend de l'alimentation électrique
   - Maintenance à votre charge

2. **Setup initial**
   - Plus complexe qu'un PaaS (Render, Railway)
   - Nécessite des connaissances Docker/SSH
   - Configuration initiale ~30-45 minutes

3. **Upload Internet**
   - Limité par votre FAI (généralement suffisant pour un bot)
   - Peut être un problème si beaucoup de trafic

4. **Pas de scaling automatique**
   - Si votre bot devient très populaire, limites du NAS
   - (Mais pour un bot Discord classique, largement suffisant)

## Comparaison vs Autres Solutions

| Critère | Synology + CF Tunnel | Port Forwarding | VPS Cloud | PaaS (Render) |
|---------|---------------------|-----------------|-----------|---------------|
| **Sécurité** | ⭐⭐⭐⭐⭐ | ⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Coût mensuel** | 💰 0€ | 💰 0€ | 💰💰 4-10€ | 💰 0-7€ |
| **Setup** | ⭐⭐⭐ 30min | ⭐ 10min | ⭐⭐⭐⭐ 1h+ | ⭐ 5min |
| **Ports ouverts** | ✅ Aucun | ❌ 443/80 | ⚠️ Contrôlé | ✅ N/A |
| **IP cachée** | ✅ Oui | ❌ Non | ✅ Oui | ✅ Oui |
| **DDoS Protection** | ✅ CF | ❌ Non | ⚠️ Dépend | ✅ Oui |
| **Disponibilité** | ⚠️ Votre FAI | ⚠️ Votre FAI | ✅ 99.9% | ✅ 99.9% |
| **Contrôle** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Scaling** | ⚠️ Manuel | ⚠️ Manuel | ✅ Facile | ✅ Auto |
| **Maintenance** | ⚠️ Vous | ⚠️ Vous | ⚠️ Vous | ✅ Géré |

## Checklist de Déploiement Synology

### Phase 1 : Configuration initiale (30 min)
- [ ] Activer SSH sur le NAS
- [ ] Installer Container Manager
- [ ] Créer les dossiers `/volume1/docker/discord-bot` et `/volume1/docker/cloudflared`
- [ ] Uploader le code via File Station ou git

### Phase 2 : Cloudflare Tunnel (15 min)
- [ ] Transférer le DNS vers Cloudflare (si nécessaire)
- [ ] Configurer le tunnel avec `cloudflared tunnel login`
- [ ] Créer le tunnel `discord-bot`
- [ ] Créer le record DNS `bot.teemate.gg`
- [ ] Créer le fichier `config.yml`

### Phase 3 : Docker et Démarrage (10 min)
- [ ] Créer le `Dockerfile` et `.env`
- [ ] Créer le `docker-compose.yml`
- [ ] Lancer avec `docker-compose up -d`
- [ ] Vérifier les logs

### Phase 4 : Configuration Discord (5 min)
- [ ] Aller sur Discord Developer Portal
- [ ] Configurer l'URL : `https://bot.teemate.gg/interactions`
- [ ] Enregistrer les commandes avec `npm run register`
- [ ] Tester avec `/test` dans Discord

### Phase 5 : Sécurité (10 min)
- [ ] Configurer le pare-feu Synology
- [ ] Activer la protection brute force
- [ ] Configurer les règles WAF sur Cloudflare
- [ ] Désactiver SSH (optionnel)
- [ ] Configurer les notifications email

### Phase 6 : Monitoring et Maintenance
- [ ] Vérifier les logs régulièrement
- [ ] Configurer la rotation des logs
- [ ] Tester le redémarrage automatique (redémarrer le NAS)
- [ ] Documenter les credentials dans un gestionnaire de mots de passe

## FAQ Synology

### Quel modèle de NAS est nécessaire ?

La plupart des NAS récents fonctionnent :
- ✅ DS220+, DS920+, DS1520+, DS1522+ (Intel)
- ✅ DS218, DS418 (Realtek - supporte Docker)
- ❌ DS218j, DS119j (ARM - pas de Docker, utilisez méthode native)

### Combien de ressources ça consomme ?

Pour ce bot Discord simple :
- **CPU** : < 5% en idle, ~10% pendant les requêtes
- **RAM** : ~150 MB (Node.js + bot) + ~50 MB (cloudflared)
- **Disque** : ~200 MB (app + dépendances)

C'est négligeable pour un NAS moderne.

### Puis-je avoir plusieurs bots sur le même NAS ?

Oui ! Créez simplement :
- `/volume1/docker/discord-bot-2`
- Un nouveau tunnel : `cloudflared tunnel create discord-bot-2`
- Un nouveau sous-domaine : `bot2.teemate.gg`
- Port différent (3001, 3002, etc.)

### Que se passe-t-il si le NAS redémarre ?

Avec Docker :
- ✅ Les conteneurs redémarrent automatiquement (`restart: unless-stopped`)
- ✅ Le tunnel se reconnecte automatiquement
- ✅ Aucune intervention nécessaire

Délai : ~30-60 secondes après le boot du NAS.

### Puis-je accéder aux logs depuis DSM ?

Oui, via **Container Manager** :
1. Cliquer sur le conteneur
2. **Détails** → **Logs**
3. Ou via File Station : `/volume1/docker/discord-bot/`

### Mon FAI change mon IP, est-ce un problème ?

Non ! Avec Cloudflare Tunnel :
- ✅ Pas besoin de Dynamic DNS
- ✅ Le tunnel se connecte à Cloudflare (pas l'inverse)
- ✅ Votre IP peut changer sans impact

## Prochaines Étapes

### Immédiat
1. ✅ Tunnel configuré et fonctionnel
2. ✅ Bot Discord opérationnel
3. ✅ Sécurité renforcée

### Court terme (1 semaine)
1. 🔒 Affiner les règles WAF Cloudflare
2. 📊 Surveiller les logs et les performances
3. 🧪 Tester la charge (simuler des utilisateurs)

### Moyen terme (1 mois)
1. 💾 Ajouter une base de données (Redis/PostgreSQL) pour l'état des jeux
2. 📈 Ajouter du monitoring (Uptime Robot, Prometheus)
3. 🔄 Mettre en place des backups automatiques

### Long terme
1. 🚀 Implémenter de nouvelles fonctionnalités
2. 📊 Analytics et métriques d'utilisation
3. 🌍 Considérer un failover si besoin de haute disponibilité

## Ressources et Support

### Documentation Officielle
- [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/)
- [Discord Developers](https://discord.com/developers/docs/interactions/receiving-and-responding)
- [Synology Docker](https://www.synology.com/fr-fr/dsm/feature/docker)

### Communautés
- [Discord Developers Server](https://discord.gg/discord-developers)
- [r/synology](https://reddit.com/r/synology)
- [Cloudflare Community](https://community.cloudflare.com)

### En cas de problème
1. Vérifier les logs : `docker-compose logs -f`
2. Tester localement : `curl http://localhost:3000`
3. Vérifier le DNS : `nslookup bot.teemate.gg`
4. Dashboard Cloudflare → Tunnels → Voir le status

## Conclusion

Vous avez maintenant :
- ✅ Un bot Discord hébergé sur votre NAS Synology
- ✅ Accessible via `bot.teemate.gg`
- ✅ Sécurisé (aucun port ouvert, IP cachée)
- ✅ Protection DDoS gratuite
- ✅ SSL automatique
- ✅ Monitoring via Cloudflare
- ✅ Démarrage automatique

**Félicitations !** Vous avez une infrastructure professionnelle, sécurisée et gratuite. 🎉

---

*Guide créé pour le projet Teemate Discord Bot*
*Dernière mise à jour : 2026-02-10*
