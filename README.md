# Shapecraft UsePools - Multi-Wallet Connection

Une application Next.js moderne pour la connexion de multiples wallets avec une interface utilisateur élégante.

## 🚀 Fonctionnalités

- **Support multi-wallets** : MetaMask, WalletConnect, Coinbase Wallet, et plus
- **Multi-chaînes** : Ethereum, Polygon, Optimism, Arbitrum, Base, Sepolia
- **Interface moderne** avec design gradient et animations
- **Affichage du solde** en temps réel
- **Responsive design** optimisé pour tous les appareils
- **Next.js 14** avec App Router
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le styling

## 🛠️ Technologies

- **Next.js 14** - Framework React
- **TypeScript** - Typage statique
- **Tailwind CSS** - Framework CSS utilitaire
- **Wagmi** - Hooks React pour Ethereum
- **Viem** - Librairie Ethereum TypeScript
- **React Query** - Gestion d'état et cache

## 📦 Installation

1. Clone le repository :

```bash
git clone <repository-url>
cd shapecraft_usepools
```

2. Installe les dépendances :

```bash
npm install
```

3. **Installe les dépendances wallet** (voir INSTALLATION.md) :

```bash
npm install wagmi viem @tanstack/react-query
```

4. Lance le serveur de développement :

```bash
npm run dev
```

5. Ouvre [http://localhost:3000](http://localhost:3000) dans ton navigateur

## 🎨 Interface

L'application présente une interface de connexion wallet avancée avec :

- **Sélection de wallet** avec icônes et couleurs distinctes
- **Affichage du solde** en temps réel
- **Formatage des adresses** pour une meilleure lisibilité
- **Animations de chargement** pendant la connexion
- **États visuels** pour wallet connecté/déconnecté
- **Responsive** pour mobile et desktop

## 🔧 Structure du projet

```
shapecraft_usepools/
├── src/
│   ├── app/
│   │   ├── layout.tsx      # Layout principal avec WagmiProvider
│   │   ├── page.tsx        # Page de connexion wallet
│   │   └── globals.css     # Styles globaux
│   ├── components/
│   │   ├── WagmiProvider.tsx  # Provider pour wagmi
│   │   └── WalletConnect.tsx  # Composant de connexion wallet
│   └── lib/
│       └── wagmi.ts        # Configuration wagmi
├── public/                 # Assets statiques
├── next.config.js         # Configuration Next.js
├── INSTALLATION.md        # Instructions d'installation
└── package.json
```

## 🚀 Déploiement

L'application peut être déployée sur Vercel, Netlify ou tout autre plateforme supportant Next.js.

## 📝 Notes

- L'application utilise wagmi pour une intégration wallet robuste
- WalletConnect nécessite un Project ID (voir INSTALLATION.md)
- Console Ninja n'est pas encore compatible avec Next.js 14.2.32

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésite pas à ouvrir une issue ou une pull request.
