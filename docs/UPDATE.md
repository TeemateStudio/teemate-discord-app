# Guide de mise à jour rapide

Ce guide vous aide à déployer rapidement des mises à jour du bot Discord.

## 🚀 Déploiement rapide

### Windows (PowerShell)

```powershell
.\deploy.ps1 -Destination "macoupas@192.168.1.60:/volume1/docker/teemate-discord-app"
```

## 📝 Workflow recommandé

1. **Modifier le code** en local
2. **Tester en local** : `npm start`
3. **Commit** : `git add . && git commit -m "Description des changements"`
4. **Déployer** : `.\deploy.ps1 -Destination "..."`
5. **Vérifier** : Voir les logs et tester sur Discord

---

## 🔍 Commandes utiles après déploiement

### Voir les logs en direct

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs -f"
```

### Voir seulement les logs du bot Discord

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs -f discord-app"
```

### Vérifier le statut des conteneurs

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose ps"
```

### Redémarrer uniquement le bot (sans reconstruire)

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose restart discord-app"
```

### Redémarrer avec reconstruction complète

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose down && /usr/local/bin/docker-compose up -d --build"
```

---

## 🎮 Mise à jour des commandes Discord

Si vous avez modifié les commandes dans `commands.js` :

```bash
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose exec -T discord-app npm run register"
```

---

## 🐛 Dépannage

### Le bot ne démarre pas

```bash
# Voir les erreurs
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs discord-app"

# Vérifier la configuration
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && cat .env"
```

### Cloudflare Tunnel ne fonctionne pas

```bash
# Voir les logs cloudflared
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose logs cloudflared"

# Redémarrer cloudflared
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose restart cloudflared"
```

### Revenir à la version précédente (rollback)

```bash
# Dans votre dépôt local
git log --oneline  # Voir l'historique
git checkout <commit-hash>  # Revenir à un commit précédent

# Redéployer
.\deploy.ps1 -Destination "macoupas@192.168.1.60:/volume1/docker/teemate-discord-app"
```

---

## 📊 Monitoring

### Voir l'utilisation des ressources

```bash
ssh macoupas@192.168.1.60 "docker stats --no-stream"
```

### Voir l'espace disque utilisé par Docker

```bash
ssh macoupas@192.168.1.60 "docker system df"
```

### Nettoyer les anciennes images (récupérer de l'espace)

```bash
ssh macoupas@192.168.1.60 "docker system prune -f"
```

---

## ⚡ Mises à jour mineures (sans reconstruction)

Pour des changements mineurs de code qui ne nécessitent pas de reconstruction de l'image Docker :

```bash
# Transférer uniquement les fichiers modifiés
scp app.js commands.js game.js macoupas@192.168.1.60:/volume1/docker/teemate-discord-app/

# Redémarrer le bot
ssh macoupas@192.168.1.60 "cd /volume1/docker/teemate-discord-app && /usr/local/bin/docker-compose restart discord-app"
```

**⚠️ Attention :** Cette méthode ne fonctionne que si vous n'avez pas modifié :
- `package.json` (dépendances)
- `Dockerfile`
- `docker-compose.yml`

Pour ces fichiers, utilisez toujours le script de déploiement complet.

---

## 📚 Documentation complète

Pour plus de détails, consultez :
- [DEPLOYMENT.md](./DEPLOYMENT.md) - Guide de déploiement complet avec Quick Start intégré
- [README.md](../README.md) - Documentation générale du projet
