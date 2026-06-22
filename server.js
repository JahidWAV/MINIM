// ==========================================
// IMPORTS DES MODULES
// ==========================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto'); // Natif dans Node.js pour signer la requête
require('dotenv').config(); 

const app = express();

// ==========================================
// MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTE : GENERATION DE LA SESSION ONRAMP
// ==========================================
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille est requise." });
    }

    try {
        const apiKeyName = process.env.COINBASE_API_KEY_NAME;
        const privateKey = process.env.COINBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

        if (!apiKeyName || !privateKey) {
            console.error("Variables d'environnement Coinbase manquantes sur Render !");
            return res.status(500).json({ error: "Configuration API incomplète." });
        }

        // Préparation du payload requis par l'API Coinbase
        const url = 'https://api.developer.coinbase.com/onramp/v1/sessions';
        const method = 'POST';
        const bodyData = JSON.stringify({
            app_id: "5eae5cc1-0d44-47a7-8618-e221191c852a", // ID Onramp standard
            destination_wallets: [
                {
                    address: walletAddress,
                    blockchains: ["base"]
                }
            ],
            assets: ["USDC"]
        });

        // 🌟 SIGNATURE MANUELLE SANS LE SDK COINBASE (Standard JWT pour Coinbase CDP)
        const timestamp = Math.floor(Date.now() / 1000);
        const header = { alg: 'ES256', kid: apiKeyName, typ: 'JWT' };
        const payload = {
            iss: 'cdp',
            nbf: timestamp - 10,
            exp: timestamp + 60,
            sub: apiKeyName
        };

        const base64UrlEncode = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
        const tokenComponents = [base64UrlEncode(header), base64UrlEncode(payload)].join('.');
        
        const signer = crypto.createSign('SHA256');
        signer.update(tokenComponents);
        const signature = signer.sign(privateKey, 'base64url');
        const jwtToken = [tokenComponents, signature].join('.');

        // Appel direct à l'API Coinbase Onramp via un fetch standard
        const response = await fetch(url, {
            method: method,
            headers: {
                'Authorization': `Bearer ${jwtToken}`,
                'Content-Type': 'application/json'
            },
            body: bodyData
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Retour d'erreur API Coinbase:", data);
            return res.status(response.status).json({ error: "Erreur lors de la création de la session chez Coinbase." });
        }

        // Tout est parfait, on récupère l'URL d'achat signée !
        res.json({ url: data.onramp_url || data.url });
        
    } catch (error) {
        console.error("Erreur d'initialisation Coinbase Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat." });
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
