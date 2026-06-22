// 🛠️ SÉCURITÉ ANTI-CACHE RENDER : Force l'installation si le module est introuvable
try {
    require.resolve('@coinbase/coinbase-sdk');
} catch (e) {
    console.log("⚠️ Module @coinbase/coinbase-sdk introuvable. Installation forcée...");
    const execSync = require('child_process').execSync;
    execSync('npm install @coinbase/coinbase-sdk', { stdio: 'inherit' });
    console.log("✅ Module @coinbase/coinbase-sdk installé avec succès !");
}

// ==========================================
// IMPORTS DES MODULES
// ==========================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); // Charge les variables du fichier .env en local
const { Coinbase } = require('@coinbase/coinbase-sdk');

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json()); // Indispensable pour lire le JSON (comme l'adresse wallet de l'iPhone)

// ==========================================
// CONFIGURATION DE L'API COINBASE CDP
// ==========================================
Coinbase.configure({
    apiKeyName: process.env.COINBASE_API_KEY_NAME, 
    privateKey: process.env.COINBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') // Nettoie les sauts de ligne de Render
});

// ==========================================
// ROUTE : GENERATION DE LA SESSION ONRAMP
// ==========================================
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille est requise." });
    }

    try {
        // Demande de création d'une session Onramp sécurisée à l'API Coinbase Cloud
        const onrampSession = await Coinbase.createOnrampSession({
            appId: "5eae5cc1-0d44-47a7-8618-e221191c852a", // Ton Project ID Coinbase Onramp
            destinationWallets: [
                {
                    address: walletAddress,
                    blockchains: ["base"] // Réseau Base
                }
            ],
            assets: ["USDC"] // Devise d'achat forcée
        });

        // Renvoie l'URL unique signée par Coinbase à ton application iOS NoPay
        res.json({ url: onrampSession.getUrl() });
        
    } catch (error) {
        console.error("Erreur d'initialisation Coinbase Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat sécurisée." });
    }
});

// ==========================================
// LOGIQUE COMPLEMENTAIRE (Exemple d'accueil)
// ==========================================
app.get('/', (req, res) => {
    res.send("🚀 Serveur NorPay actif et opérationnel.");
});

// ==========================================
// DEMARRAGE DU SERVEUR
// ==========================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
    console.log(`🚀 Serveur NorPay initialisé et prêt.`);
    console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`);
});
