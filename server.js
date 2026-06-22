const express = require('express');
const { Coinbase } = require('@coinbase/coinbase-sdk');
const app = express();

app.use(express.json()); // Indispensable pour lire l'adresse envoyée par l'iPhone

// Initialisation sécurisée du SDK Coinbase via Render
Coinbase.configure({
    apiKeyName: process.env.COINBASE_API_KEY_NAME, 
    privateKey: process.env.COINBASE_PRIVATE_KEY?.replace(/\\n/g, '\n') // Sécurité pour les sauts de ligne
});

// Ta route Onramp pour l'application NoPay
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;
    if (!walletAddress) return res.status(400).json({ error: "Adresse requise" });

    try {
        const onrampSession = await Coinbase.createOnrampSession({
            appId: "5eae5cc1-0d44-47a7-8618-e221191c852a", // Ton Project ID Coinbase Onramp
            destinationWallets: [{ address: walletAddress, blockchains: ["base"] }],
            assets: ["USDC"]
        });
        res.json({ url: onrampSession.getUrl() });
    } catch (error) {
        console.error("Erreur Onramp:", error);
        res.status(500).json({ error: "Erreur serveur Coinbase" });
    }
});
