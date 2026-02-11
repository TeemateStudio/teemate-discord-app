# Analyse de sécurité

Ce document explique comment Cloudflare Tunnel protège votre réseau local.

## 🛡️ Votre réseau est-il protégé ?

**Oui !** Tant que vous n'avez pas configuré de port forwarding sur votre routeur.

## Architecture sécurisée

```
Discord API
    ↓
Cloudflare (protection DDoS, CDN)
    ↓
Tunnel TLS chiffré (connexion SORTANTE uniquement)
    ↓
Container cloudflared (sur votre NAS)
    ↓
Container discord-app (réseau Docker isolé)
```

## ✅ Ce qui vous protège

### 1. Pas d'exposition Internet
- ❌ Aucun port ouvert sur votre routeur
- ❌ Aucun port forwarding configuré
- ❌ Votre IP publique n'est jamais révélée

### 2. Connexion sortante uniquement
Le container `cloudflared` **initie** la connexion vers Cloudflare. Il n'y a **jamais** de connexion entrante depuis Internet vers votre NAS.

```
Votre NAS → (sortant port 443) → Cloudflare ✓
Internet → (entrant) → Votre NAS ✗ BLOQUÉ
```

### 3. Tunnel chiffré
- Chiffrement TLS de bout en bout
- Même votre FAI ne voit pas le contenu
- Protection contre l'interception

### 4. Isolation Docker
- Le bot tourne dans un container isolé
- Ne peut pas accéder aux autres machines de votre réseau local
- Limite les dégâts en cas de compromission

### 5. Protection Cloudflare
- Filtrage DDoS automatique
- Rate limiting disponible
- Web Application Firewall (WAF) optionnel

## 🔍 Vérifications de sécurité

### ✅ Vérification 1 : Pas de port forwarding

**Sur votre routeur/box Internet :**
1. Connectez-vous à l'interface admin (généralement http://192.168.1.1)
2. Cherchez "Port Forwarding", "NAT", ou "Redirection de ports"
3. **Vérifiez qu'AUCUNE règle** ne pointe vers le port 3000 de votre NAS

❌ **Si vous voyez une règle** : SUPPRIMEZ-LA immédiatement !

### ✅ Vérification 2 : Test externe

Depuis un autre réseau (4G, VPN, chez un ami) :

```bash
# Remplacez VOTRE_IP_PUBLIQUE par votre vraie IP
curl -I http://VOTRE_IP_PUBLIQUE:3000 --max-time 5

# ✅ Résultats corrects (bien protégé) :
# - "Connection timed out"
# - "Connection refused"
# - "No route to host"

# ❌ PROBLÈME DE SÉCURITÉ :
# - Si vous obtenez "HTTP/1.1 200 OK" → Port ouvert !
```

### ✅ Vérification 3 : Tunnel actif

```bash
# Vérifier que cloudflared est connecté
ssh user@nas-ip "docker-compose logs cloudflared | grep 'Registered tunnel connection'"

# Doit montrer 4 connexions enregistrées :
# Registered tunnel connection connIndex=0
# Registered tunnel connection connIndex=1
# Registered tunnel connection connIndex=2
# Registered tunnel connection connIndex=3
```

## 📊 Tableau de bord de sécurité

| Protection | État | Vérification |
|-----------|------|--------------|
| Port forwarding | ✅ Désactivé | Interface routeur |
| Connexion sortante | ✅ Oui | Architecture Cloudflare Tunnel |
| Tunnel chiffré | ✅ Actif | Logs cloudflared |
| IP cachée | ✅ Oui | Discord ne voit que Cloudflare |
| Isolation Docker | ✅ Oui | Réseau bridge isolé |
| Protection DDoS | ✅ Oui | Automatique via Cloudflare |
| 2FA Cloudflare | ⚠️ À configurer | Dashboard Cloudflare |
| 2FA Discord | ⚠️ À configurer | Paramètres Discord |

## ⚠️ Vecteurs d'attaque restants

Même avec cette architecture sécurisée, soyez vigilant :

### 1. Vulnérabilité dans le code du bot
**Que faire :**
- Auditez les dépendances : `npm audit`
- Mettez à jour régulièrement
- Revoyez le code avant déploiement

### 2. Credentials compromis
**Que faire :**
- Ne commitez JAMAIS `.env` dans git
- Activez 2FA sur Cloudflare et Discord
- Régénérez les tokens régulièrement
- Limitez les permissions du bot

### 3. Accès physique au NAS
**Que faire :**
- Protégez l'accès physique au NAS
- Utilisez des mots de passe forts
- Activez les logs SSH

## 🚨 Que faire si vous découvrez une faille ?

1. **Immédiat** : Arrêtez le bot : `docker-compose down`
2. Régénérez tous les tokens (Discord, Cloudflare)
3. Vérifiez les logs : `docker-compose logs`
4. Patchez la vulnérabilité
5. Redéployez : `.\deploy.ps1 -Destination "..."`

## 📚 Ressources

- Guide complet : [DEPLOYMENT.md](./docs/DEPLOYMENT.md#%EF%B8%8F-sécurité)
- Cloudflare Tunnel Docs : https://developers.cloudflare.com/cloudflare-one/connections/connect-apps
- Discord Security Best Practices : https://discord.com/developers/docs/topics/gateway#security

---

**En résumé** : Votre réseau local est bien protégé tant que vous n'avez pas de port forwarding configuré. Cloudflare Tunnel utilise des connexions sortantes uniquement, ce qui rend votre NAS invisible depuis Internet. 🛡️
