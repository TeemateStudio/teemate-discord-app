# Guide de déploiement - Bot Discord sur NAS avec Cloudflare Tunnel

Ce guide explique comment déployer votre bot Discord sur un NAS avec Docker et Cloudflare Tunnel pour un accès sécurisé sans ouvrir de ports.

---

## 📑 Table des matières

- [🚀 Quick Start (5 minutes)](#-quick-start-5-minutes)
- [📋 Prérequis](#-prérequis)
- [📖 Guide complet étape par étape](#-guide-complet-étape-par-étape)
  - [1. Configurer Cloudflare Tunnel](#1-configurer-cloudflare-tunnel)
  - [2. Configurer les variables d'environnement](#2-configurer-les-variables-denvironnement)
  - [3. Déployer sur le NAS](#3-déployer-sur-le-nas)
  - [4. Configurer Discord Developer Portal](#4-configurer-discord-developer-portal)
  - [5. Enregistrer les commandes](#5-enregistrer-les-commandes)
- [🔄 Mettre à jour l'application](#-mettre-à-jour-lapplication)
- [🔧 Commandes utiles](#-commandes-utiles)
- [🐛 Dépannage](#-dépannage)
- [🛡️ Sécurité](#️-sécurité)

---

## 🚀 Quick Start (5 minutes)

Pour ceux qui veulent déployer rapidement :

```bash
# 1. Créer et configurer le tunnel Cloudflare
cloudflared tunnel login
cloudflared tunnel create teemate-discord
cloudflared tunnel token teemate-discord  # Copier le token

# 2. Configurer les variables
cp .env.example .env
# Éditer .env avec vos valeurs (APP_ID, DISCORD_TOKEN, PUBLIC_KEY, TUNNEL_TOKEN)

# 3. Déployer sur le NAS
.\deploy.ps1 -Destination "macoupas@nas-ip:/volume1/docker/teemate-discord-app"  # Windows
# ou
./deploy.sh macoupas@nas-ip:/volume1/docker/teemate-discord-app  # Linux/Mac
```

Ensuite :
1. Dans Cloudflare Zero Trust → votre tunnel → **Published application routes** → Configurer `discord.votredomaine.com` → `discord-app:3000`
2. Dans Discord Developer Portal → **Interactions Endpoint URL** : `https://discord.votredomaine.com/interactions`
3. Tester avec `/test` sur Discord

**Pour les détails, continuez ci-dessous** ⬇️

---

## 📋 Prérequis

### Sur votre machine locale
- [Cloudflared](https://github.com/cloudflare/cloudflared/releases) installé
- Git (pour cloner le projet)
- Accès SSH à votre NAS

### Sur le NAS
- Docker et Docker Compose installés
- Accès SSH configuré
- Synology NAS : Docker disponible via Package Center

### Comptes en ligne
- [Compte Cloudflare](https://dash.cloudflare.com/sign-up) (gratuit)
- [Application Discord](https://discord.com/developers/applications) créée
- Un domaine configuré dans Cloudflare (recommandé)

---

## 📖 Guide complet étape par étape

### 1. Configurer Cloudflare Tunnel

#### Installation de cloudflared

**Windows (manuel) / Linux / Mac :**
Télécharger depuis : https://github.com/cloudflare/cloudflared/releases

#### Créer le tunnel

```bash
# 1. S'authentifier (ouvre le navigateur)
cloudflared tunnel login

# 2. Créer le tunnel
cloudflared tunnel create teemate-discord

# 3. Obtenir le token (IMPORTANT: copier tout le token!)
cloudflared tunnel token teemate-discord
```

Le token ressemble à : `eyJhIjoiMTIzNDU2Nzg5MGFiY2RlZi...` (très long, plusieurs centaines de caractères)

**⚠️ Important :** Gardez ce token secret et ne le commitez jamais dans git !

---

### 2. Configurer les variables d'environnement

#### Créer le fichier .env

```bash
cp .env.example .env
```

#### Éditer .env avec vos valeurs

```env
# Discord Bot Configuration
APP_ID=
DISCORD_TOKEN=
PUBLIC_KEY=
PORT=3000

# Cloudflare Tunnel Token
TUNNEL_TOKEN=
```

#### Où trouver ces valeurs ?

**Discord Developer Portal** (https://discord.com/developers/applications) :
1. Sélectionnez votre application
2. **APP_ID** et **PUBLIC_KEY** : onglet **General Information**
3. **DISCORD_TOKEN** : onglet **Bot** → "Reset Token" (copiez immédiatement)

**TUNNEL_TOKEN** : Obtenu avec `cloudflared tunnel token teemate-discord`

---

### 3. Déployer sur le NAS

#### Option A : Script automatique (Recommandé)

Le script automatise tout : transfert, extraction, build Docker, et démarrage.

**PowerShell (Windows) :**
```powershell
.\deploy.ps1 -Destination "macoupas@192.168.1.60:/volume1/docker/teemate-discord-app"
```

**Ce que fait le script :**
1. ✅ Vérifie que `.env` est configuré
2. 📦 Crée une archive (exclut node_modules, .git, logs)
3. 📤 Transfère via SSH (évite les problèmes de sous-système SCP)
4. 🔧 Extrait sur le NAS
5. 🛑 Arrête les conteneurs existants
6. 🏗️ Reconstruit les images Docker
7. 🚀 Démarre les conteneurs
8. 📊 Affiche le statut et les logs

#### Option B : Déploiement manuel

Si vous préférez contrôler chaque étape :

```bash
# 1. Transférer les fichiers (méthode SSH streaming, plus fiable que SCP)
cd /chemin/vers/teemate-discord-app
tar -czf - --exclude=node_modules --exclude=.git --exclude=*.log . | \
  ssh macoupas@192.168.1.60 "cat > /volume1/docker/teemate-discord-app/deploy.tar.gz"

# 2. Se connecter au NAS
ssh macoupas@192.168.1.60

# 3. Aller dans le dossier
cd /volume1/docker/teemate-discord-app

# 4. Extraire
tar -xzf deploy.tar.gz
rm deploy.tar.gz

# 5. Créer le dossier logs (requis)
mkdir -p logs

# 6. Lancer Docker (chemin complet sur Synology NAS)
/usr/local/bin/docker-compose up -d

# 7. Vérifier les logs
/usr/local/bin/docker-compose logs -f
```

**Note Synology NAS :** Sur Synology, `docker-compose` n'est pas dans le PATH standard. Utilisez `/usr/local/bin/docker-compose`.

---

### 4. Configurer Discord Developer Portal

#### Étape 4.1 : Configurer le hostname dans Cloudflare

1. Allez sur https://one.dash.cloudflare.com/
2. **Zero Trust** → **Access** → **Tunnels**
3. Cliquez sur votre tunnel "teemate-discord"
4. Allez dans l'onglet **"Published application routes"**
5. Cliquez sur **"Add a published application route"**
6. Configurez :
   - **Subdomain** : `discord`
   - **Domain** : `teemate.gg`
   - **Path** : (laissez vide)
   - **Type** : `HTTP`
   - **URL** : `discord-app:3000`
7. **Save**

Votre URL sera : `https://discord.teemate.gg/`

#### Étape 4.2 : Configurer l'Interactions Endpoint URL

1. Allez sur https://discord.com/developers/applications
2. Sélectionnez votre application
3. Dans **General Information**, trouvez **Interactions Endpoint URL**
4. Entrez : `https://discord.teemate.gg/interactions`
5. **Save Changes**

Discord va vérifier l'URL. Si ça échoue :
- Vérifiez que les conteneurs tournent : `docker-compose ps`
- Vérifiez les logs : `docker-compose logs -f`
- Vérifiez que cloudflared est connecté : `docker-compose logs cloudflared`
- Testez l'URL : `curl https://discord.teemate.gg/interactions` (devrait retourner 404 mais avec headers Express)

---

### 5. Enregistrer les commandes

Les commandes Discord doivent être enregistrées auprès de Discord.

**Sur le NAS (via SSH) :**
```bash
cd /volume1/docker/teemate-discord-app
/usr/local/bin/docker-compose exec -T discord-app npm run register
```

**Ou depuis votre machine locale** (si `.env` est configuré) :
```bash
npm run register
```

---

## ✅ Vérification

### Tester votre bot

1. Allez sur Discord (serveur ou DM avec le bot)
2. Tapez `/` et vous devriez voir les commandes
3. Exécutez `/test` → Le bot devrait répondre "hello world" 🎉
4. Exécutez `/challenge` → Jeu pierre-feuille-ciseaux

### Vérifier les conteneurs

```bash
# Statut des conteneurs
/usr/local/bin/docker-compose ps

# Logs en direct
/usr/local/bin/docker-compose logs -f

# Logs d'un service spécifique
/usr/local/bin/docker-compose logs -f discord-app
/usr/local/bin/docker-compose logs -f cloudflared
```

**Statut attendu :**
- `discord-app` : Up, healthy, port 3000
- `cloudflared` : Up, 4 connexions enregistrées

---

## 🔄 Mettre à jour l'application

### Méthode 1 : Script automatique (Recommandé)

Après avoir modifié le code localement :

**Windows (PowerShell) :**
```powershell
.\deploy.ps1 -Destination "macoupas@192.168.1.60:/volume1/docker/teemate-discord-app"
```

**Linux/Mac/WSL (Bash) :**
```bash
./deploy.sh macoupas@192.168.1.60:/volume1/docker/teemate-discord-app
```

Le script gère tout automatiquement (voir [section 3](#3-déployer-sur-le-nas)).

### Méthode 2 : Déploiement manuel

```bash
# 1. Transférer (méthode streaming)
cd /chemin/vers/teemate-discord-app
tar -czf - --exclude=node_modules --exclude=.git --exclude=*.log . | \
  ssh macoupas@192.168.1.60 "cat > /volume1/docker/teemate-discord-app/deploy.tar.gz"

# 2. Déployer sur le NAS
ssh macoupas@192.168.1.60
cd /volume1/docker/teemate-discord-app
tar -xzf deploy.tar.gz && rm deploy.tar.gz
/usr/local/bin/docker-compose down
/usr/local/bin/docker-compose up -d --build
```

### Méthode 3 : Mise à jour mineure (sans reconstruction)

Pour des changements de code JavaScript uniquement (pas de modification de Dockerfile ou package.json) :

```bash
# Transférer seulement les fichiers modifiés
scp app.js commands.js game.js macoupas@192.168.1.60:/volume1/docker/teemate-discord-app/

# Redémarrer uniquement le bot
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose restart discord-app"
```

### Vérification après mise à jour

```bash
# Logs en direct
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs -f"

# Vérifier le statut
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose ps"

# Logs du bot uniquement
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs -f discord-app"
```

### Mettre à jour les commandes Discord

Si vous avez modifié `commands.js` :

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose exec -T discord-app npm run register"
```

### Rollback en cas de problème

```bash
# Option 1 : Redémarrer avec la version actuelle
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose restart"

# Option 2 : Revenir à un commit précédent (local)
git log --oneline  # Voir l'historique
git checkout <commit-hash>  # Revenir au commit désiré
.\deploy.ps1 -Destination "macoupas@192.168.1.60:/volume1/docker/teemate-discord-app"
```

### Workflow de développement recommandé

1. **Développer et tester localement** : `npm start`
2. **Committer** : `git add . && git commit -m "Description"`
3. **Déployer** : `.\deploy.ps1 -Destination "..."`
4. **Vérifier** : Logs et tests sur Discord
5. **Monitorer** : Surveiller les logs quelques minutes

---

## 🔧 Commandes utiles

### Gestion des conteneurs

```bash
# Redémarrer le bot uniquement
/usr/local/bin/docker-compose restart discord-app

# Redémarrer tout
/usr/local/bin/docker-compose restart

# Arrêter tout
/usr/local/bin/docker-compose down

# Reconstruire et redémarrer
/usr/local/bin/docker-compose up -d --build

# Voir l'utilisation des ressources
docker stats --no-stream

# Accéder au shell du conteneur
/usr/local/bin/docker-compose exec discord-app sh
```

### Logs et monitoring

```bash
# Logs en direct (tous les services)
/usr/local/bin/docker-compose logs -f

# Logs d'un service spécifique
/usr/local/bin/docker-compose logs -f discord-app
/usr/local/bin/docker-compose logs -f cloudflared

# Dernières 50 lignes
/usr/local/bin/docker-compose logs --tail=50

# Logs avec timestamps
/usr/local/bin/docker-compose logs -f -t
```

### Maintenance

```bash
# Nettoyer les anciennes images Docker
docker system prune -f

# Voir l'utilisation disque
docker system df

# Mettre à jour l'image cloudflared
/usr/local/bin/docker-compose pull cloudflared
/usr/local/bin/docker-compose up -d cloudflared
```

---

## 🐛 Dépannage

### Le bot ne démarre pas

**Symptômes** : Container `discord-app` en état "Restarting" ou "Exited"

**Solutions** :
```bash
# Voir les erreurs
/usr/local/bin/docker-compose logs discord-app

# Vérifier la configuration
cat .env  # Vérifiez que toutes les variables sont remplies

# Vérifier le fichier package.json
cat package.json  # Assurez-vous qu'il n'est pas corrompu

# Reconstruire complètement
/usr/local/bin/docker-compose down
/usr/local/bin/docker-compose up -d --build --force-recreate
```

**Causes fréquentes** :
- Variables d'environnement manquantes ou incorrectes dans `.env`
- Token Discord invalide ou expiré
- Erreur de syntaxe dans le code JavaScript
- Port 3000 déjà utilisé

### Cloudflare Tunnel ne se connecte pas

**Symptômes** : Logs cloudflared montrent "connection failed" ou pas de connexions enregistrées

**Solutions** :
```bash
# Voir les logs détaillés
/usr/local/bin/docker-compose logs cloudflared

# Vérifier que le token est correct
docker-compose exec cloudflared env | grep TUNNEL_TOKEN

# Régénérer le token (sur votre machine locale)
cloudflared tunnel token teemate-discord
# Copier le nouveau token dans .env
# Puis redémarrer
/usr/local/bin/docker-compose restart cloudflared
```

**Causes fréquentes** :
- `TUNNEL_TOKEN` incorrect ou mal copié dans `.env`
- Token expiré ou tunnel supprimé dans Cloudflare
- Problème de connectivité réseau sur le NAS

### Discord dit "Invalid Interactions Endpoint URL"

**Symptômes** : Erreur lors de la sauvegarde de l'URL dans Discord Developer Portal

**Solutions** :
1. **Vérifier que le bot tourne** :
   ```bash
   /usr/local/bin/docker-compose ps
   # discord-app doit être "Up" et "healthy"
   ```

2. **Vérifier cloudflared** :
   ```bash
   /usr/local/bin/docker-compose logs cloudflared | grep "Registered tunnel connection"
   # Doit montrer 4 connexions enregistrées
   ```

3. **Tester l'URL manuellement** :
   ```bash
   curl -I https://discord.votredomaine.com/interactions
   # Devrait retourner HTTP 404 avec header "x-powered-by: Express"
   ```

4. **Vérifier PUBLIC_KEY** :
   ```bash
   cat .env | grep PUBLIC_KEY
   # Comparer avec la valeur dans Discord Developer Portal
   ```

5. **Vérifier la configuration ingress dans Cloudflare** :
   - Zero Trust → Tunnels → votre tunnel → Published application routes
   - Vérifier que `discord.votredomaine.com` pointe vers `discord-app:3000`

**Causes fréquentes** :
- `PUBLIC_KEY` incorrect dans `.env`
- Cloudflare tunnel non configuré ou déconnecté
- URL incorrecte (doit finir par `/interactions`)
- Bot non démarré ou en erreur

### Erreur "bind mount failed: logs does not exist"

**Symptômes** : Container ne démarre pas avec erreur sur le volume `logs`

**Solution** :
```bash
cd /volume1/docker/teemate-discord-app
mkdir -p logs
/usr/local/bin/docker-compose up -d
```

### Erreur "subsystem request failed" (SCP/SFTP)

**Symptômes** : Erreur lors du transfert avec `scp` ou `sftp`

**Solution** : Utiliser la méthode de transfert par streaming SSH (déjà implémentée dans les scripts deploy) :
```bash
tar -czf - . | ssh macoupas@nas-ip "cat > /path/deploy.tar.gz"
```

### Les commandes Discord n'apparaissent pas

**Solutions** :
```bash
# Réenregistrer les commandes
/usr/local/bin/docker-compose exec -T discord-app npm run register

# Attendre quelques minutes (propagation Discord)
# Puis taper "/" dans Discord pour rafraîchir
```

### Container en "Unhealthy"

**Symptômes** : `docker-compose ps` montre le statut "unhealthy"

**Solutions** :
```bash
# Tester le healthcheck manuellement
/usr/local/bin/docker-compose exec discord-app wget -O- http://localhost:3000/health

# Si erreur, vérifier que le port est correct
/usr/local/bin/docker-compose exec discord-app netstat -tlnp | grep 3000

# Vérifier les logs d'erreur
/usr/local/bin/docker-compose logs discord-app
```

---

## 🛡️ Sécurité

### Architecture sécurisée

Avec Cloudflare Tunnel, votre réseau local est protégé par une architecture zero-trust :

```
Discord API
    ↓
Cloudflare (protection DDoS, CDN)
    ↓
Tunnel TLS chiffré (connexion SORTANTE du NAS vers Cloudflare)
    ↓
Container cloudflared (sur votre NAS)
    ↓
Container discord-app (réseau Docker isolé)
```

### Ce qui est protégé

✅ **Votre NAS n'est pas exposé directement sur Internet**
- Aucun port ouvert sur votre routeur
- Pas de port forwarding nécessaire
- Votre IP publique n'est jamais révélée à Discord ou aux attaquants

✅ **Connexion sortante uniquement**
- Le container `cloudflared` **initie** la connexion vers Cloudflare (port 443/80 sortant)
- Aucune connexion entrante depuis Internet vers votre NAS
- Impossible d'attaquer directement votre réseau

✅ **Tunnel chiffré de bout en bout**
- Le tunnel Cloudflare utilise TLS pour chiffrer tout le trafic
- Même votre FAI ne peut pas voir le contenu des communications
- Protection contre l'écoute et l'interception

✅ **Isolation Docker**
- Le bot tourne dans un container isolé
- Ne peut pas accéder directement aux autres machines de votre réseau local
- Limite les dégâts en cas de compromission du bot

✅ **Protection DDoS de Cloudflare**
- Cloudflare absorbe et filtre les attaques DDoS avant qu'elles n'atteignent votre réseau
- Rate limiting disponible
- Web Application Firewall (WAF) optionnel

✅ **Pas de configuration complexe du routeur**
- Pas de port forwarding
- NAT traversal géré automatiquement
- Fonctionne derrière n'importe quel type de réseau (NAT, CGNAT, etc.)

### Vérification de sécurité

#### Vérifier que le port 3000 n'est PAS accessible depuis Internet

Le port 3000 écoute sur votre NAS (visible avec `netstat`), mais il **ne doit PAS** être accessible depuis Internet.

**IMPORTANT** : Vérifiez votre routeur/box Internet :
- ✅ **Aucun port forwarding** configuré pour le port 3000
- ✅ **Aucune règle NAT** vers votre NAS sur ce port

Si vous avez un ancien port forwarding pour un serveur web/bot :
```
⚠️ SUPPRIMEZ-LE - Il n'est plus nécessaire et crée une faille de sécurité
```

#### Test de pénétration externe (optionnel)

Pour vérifier que votre port n'est pas accessible depuis Internet :

```bash
# Depuis un autre réseau (4G, VPN, chez un ami)
# Remplacez VOTRE_IP_PUBLIQUE par votre vraie IP publique
curl -I http://VOTRE_IP_PUBLIQUE:3000 --max-time 5

# Résultats attendus (= bien protégé) :
# - "Connection timed out" ✓
# - "Connection refused" ✓
# - "No route to host" ✓

# Résultat NON désiré (= problème de sécurité) :
# - "HTTP/1.1 200 OK" ❌
# → Si vous obtenez une réponse, votre port est ouvert !
```

#### Tableau de bord de sécurité

| Protection | État | Comment vérifier |
|-----------|------|------------------|
| Port forwarding désactivé | ✅ | Interface de votre box/routeur |
| Tunnel chiffré actif | ✅ | `docker-compose logs cloudflared` → "Registered tunnel connection" |
| IP publique cachée | ✅ | Discord ne voit que Cloudflare (pas votre IP) |
| Isolation Docker | ✅ | `docker network ls` → réseau bridge isolé |
| DDoS Protection | ✅ | Activé automatiquement par Cloudflare |
| 2FA activé | ⚠️ | Cloudflare Dashboard → Paramètres du compte |

### Vecteurs d'attaque restants

Même avec cette architecture sécurisée, restez vigilant :

#### 1. Vulnérabilités dans le code du bot
**Risque** : Si le bot a des bugs de sécurité (injection, RCE, etc.)

**Mitigation** :
- Le bot est isolé dans un container Docker (limite les dégâts)
- Mettez à jour régulièrement les dépendances : `npm audit`
- Revoyez le code avant de déployer des changements

#### 2. Credentials compromis
**Risque** : Si `DISCORD_TOKEN` ou `TUNNEL_TOKEN` sont volés

**Mitigation** :
- Ne commitez JAMAIS le fichier `.env` dans git
- Activez 2FA sur Cloudflare et Discord
- Régénérez les tokens périodiquement
- Limitez les permissions du bot Discord au strict nécessaire

#### 3. Attaque de la chaîne d'approvisionnement
**Risque** : Dépendances npm malveillantes

**Mitigation** :
- Auditez les dépendances : `npm audit`
- Vérifiez les changements dans `package-lock.json`
- Utilisez des images Docker officielles (node:20-alpine)

#### 4. Accès physique au NAS
**Risque** : Quelqu'un accède physiquement à votre NAS

**Mitigation** :
- Chiffrez les disques du NAS si possible
- Protégez l'accès physique au NAS
- Activez les logs d'accès SSH

### Bonnes pratiques

🔒 **Ne commitez JAMAIS le fichier `.env` dans git**
```bash
# Déjà dans .gitignore, mais vérifiez :
cat .gitignore | grep .env
```

🔒 **Gardez vos tokens secrets**
- `TUNNEL_TOKEN` : Ne le partagez jamais
- `DISCORD_TOKEN` : Régénérez-le si compromis
- `PUBLIC_KEY` : Peut être public mais mieux de garder privé

🔒 **Activez l'authentification 2FA**
- Sur votre compte Cloudflare
- Sur votre compte Discord

🔒 **Surveillez les logs régulièrement**
```bash
# Surveiller les erreurs suspectes
/usr/local/bin/docker-compose logs -f | grep -i error
```

🔒 **Mettez à jour régulièrement**
```bash
# Mettre à jour l'image cloudflared
/usr/local/bin/docker-compose pull cloudflared
/usr/local/bin/docker-compose up -d cloudflared

# Mettre à jour Node.js (dans Dockerfile)
# Modifier : FROM node:20-alpine
# En : FROM node:22-alpine (quand disponible)
```

🔒 **Limitez les accès SSH**
- Utilisez des clés SSH au lieu de mots de passe
- Limitez les IP autorisées si possible

---

## 📚 Ressources complémentaires

### Documentation du projet

- **UPDATE.md** - Référence rapide pour les commandes de mise à jour
- **README.md** - Documentation générale du projet
- **CLAUDE.md** - Instructions pour Claude Code (développement assisté)

### Documentation externe

- **Discord API** : https://discord.com/developers/docs
- **Cloudflare Tunnel** : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- **Docker Compose** : https://docs.docker.com/compose/
- **Discord Developers Community** : https://discord.gg/discord-developers

### Support

Pour des questions ou problèmes :
1. Vérifiez la section [Dépannage](#-dépannage)
2. Consultez les logs : `docker-compose logs -f`
3. Recherchez dans les issues GitHub du projet
4. Rejoignez le serveur Discord Developers pour l'aide communautaire

---

**🎉 Vous êtes prêt !** Votre bot Discord est maintenant déployé de manière sécurisée sur votre NAS avec Cloudflare Tunnel.
