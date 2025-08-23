# Installation des dépendances Wallet

## 1. Installer les dépendances

Exécute cette commande pour installer wagmi, RainbowKit et les dépendances nécessaires :

```bash
npm install wagmi viem @tanstack/react-query @rainbow-me/rainbowkit pino-pretty
```

## 2. Configuration WalletConnect

Le projet utilise déjà un Project ID configuré. Si tu veux utiliser ton propre Project ID :

1. Va sur https://cloud.walletconnect.com/
2. Crée un compte et un nouveau projet
3. Copie ton Project ID
4. Modifie le fichier `src/lib/wagmi.ts` et remplace le projectId

## 3. Fonctionnalités incluses

✅ **Wallets supportés :**

- MetaMask
- WalletConnect (avec QR code)
- Coinbase Wallet
- Rainbow Wallet
- Trust Wallet
- Et plus de 50 autres wallets

✅ **Chaînes supportées :**

- Ethereum Mainnet
- Polygon
- Optimism
- Arbitrum
- Base
- Sepolia (testnet)

✅ **Fonctionnalités :**

- Connexion/déconnexion
- Changement de réseau
- Affichage du solde
- Interface personnalisée
- Support multi-wallets
- Animations fluides

## 4. Utilisation

Une fois les dépendances installées, l'application sera prête à utiliser. Tu pourras :

1. Cliquer sur "Connect Wallet"
2. Choisir ton wallet préféré
3. Voir ton adresse et réseau
4. Changer de réseau si nécessaire
5. Te déconnecter facilement

## 5. Développement

Pour ajouter de nouvelles chaînes, modifie le fichier `src/lib/wagmi.ts`.

Pour personnaliser l'interface, modifie `src/components/CustomConnectButton.tsx`.

## 6. Dépannage

Si tu rencontres des erreurs :

1. Vérifie que toutes les dépendances sont installées
2. Redémarre le serveur de développement
3. Vérifie que le Project ID WalletConnect est valide
