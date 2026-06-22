// ==========================================
// IMPORTS DES MODULES
// ==========================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require('dotenv').config(); 
const { Coinbase } = require('@coinbase/coinbase-sdk'); // Utilisation de la classe parente unique

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// CONFIGURATION DE L'API COINBASE CDP
// ==========================================
// On instancie et configure proprement le client de manière explicite
const coinbaseClient = Coinbase.configure({
    apiKeyName: process.env.COINBASE_API_KEY_NAME, 
    privateKey: process.env.COINBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
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
        // 🌟 SYNTAXE SYNCHRONE VALIDE : Appel de createOnrampSession directement sur la classe Coinbase
        const onrampSession = await Coinbase.createOnrampSession({
            appId: "5eae5cc1-0d44-47a7-8618-e221191c852a", 
            destinationWallets: [
                {
                    address: walletAddress,
                    blockchains: ["base"]
                }
            ],
            assets: ["USDC"]
        });

        // Récupération sécurisée du lien généré
        res.json({ url: onrampSession.getUrl() });
        
    } catch (error) {
        console.error("Erreur d'initialisation Coinbase Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat sécurisée." });
    }
});

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
