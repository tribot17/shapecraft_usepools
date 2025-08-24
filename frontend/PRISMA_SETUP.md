# Configuration Prisma - Shapecraft Frontend

## 🚀 Installation et Configuration

Prisma a été configuré pour gérer la base de données PostgreSQL du projet Shapecraft.

### Modèles de données

Le schéma inclut les modèles suivants :

- **User** : Utilisateurs avec wallet address et privyUserId
- **ManagedWallet** : Wallets gérés avec clés privées chiffrées
- **WalletBalance** : Soldes des wallets par chaîne
- **Pool** : Pools de trading NFT
- **PoolParticipant** : Participants aux pools
- **Transaction** : Historique des transactions
- **AutoInvestmentRule** : Règles d'investissement automatique
- **AutoInvestment** : Investissements automatiques exécutés

### Variables d'environnement

Créez un fichier `.env` avec :

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/shapecraft_scooby"

# Wallet encryption (utilisé pour chiffrer les clés privées)
WALLET_ENCRYPTION_KEY="your-secret-key-32-characters-long!"
```

## 📋 Scripts disponibles

```bash
# Générer le client Prisma
npm run db:generate

# Appliquer les migrations
npm run db:migrate

# Push du schéma (dev)
npm run db:push

# Interface Prisma Studio
npm run db:studio

# Reset de la base
npm run db:reset

# Seeding des données de test
npm run db:seed
```

## 🔧 API Routes

### Wallets

- `GET /api/wallets?userId=xxx` - Récupérer les wallets d'un utilisateur
- `POST /api/wallets` - Créer un nouveau wallet
- `GET /api/wallets/[walletId]/balance` - Récupérer le solde d'un wallet
- `POST /api/wallets/[walletId]/balance` - Rafraîchir le solde

### Utilisateurs

- `GET /api/users?address=xxx` - Récupérer un utilisateur par adresse wallet

## 🎨 Page Wallet

La page `/wallet` permet de :

- ✅ Voir tous ses wallets
- ✅ Créer de nouveaux wallets
- ✅ Consulter les soldes
- ✅ Rafraîchir les balances
- ✅ Copier les adresses
- 🔄 Envoyer/recevoir (à implémenter)
- 🔄 Historique des transactions (à implémenter)

## 🔐 Sécurité

- Les clés privées sont chiffrées avec AES-256-CBC
- Les clés ne sont jamais exposées dans les réponses API
- Validation des paramètres d'entrée

## 🌐 Intégration Web3

Le projet utilise :

- **ethers.js** pour les interactions blockchain
- **Prisma** pour la persistance des données
- **Shape Network** (chainId: 360) comme chaîne principale

## 📖 Exemples d'utilisation

### Créer un wallet

```typescript
const response = await fetch("/api/wallets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    userId: "user123",
    name: "Mon Wallet Trading",
  }),
});
```

### Récupérer les wallets

```typescript
const response = await fetch("/api/wallets?userId=user123");
const wallets = await response.json();
```

## 🚧 Todo

- [ ] Intégration complète avec l'authentification Privy
- [ ] Fonctionnalités d'envoi/réception
- [ ] Historique détaillé des transactions
- [ ] Support multi-chaînes
- [ ] Gestion des tokens ERC-20
- [ ] Tests unitaires et d'intégration
