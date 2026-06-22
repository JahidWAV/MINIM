const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// 🌟 ROUTE STRIPE ONRAMP CLEAN
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille est requise." });
    }

    try {
        const stripeSecretKey = process.env.STRIPE_SECRET_KEY; // Ta clé sk_test_... ou sk_live_...

        if (!stripeSecretKey) {
            console.error("Variable STRIPE_SECRET_KEY manquante sur Render !");
            return res.status(500).json({ error: "Configuration Stripe manquante." });
        }

        // Appel direct à l'API Stripe Onramp en encodage URL standard (x-www-form-urlencoded)
        const params = new URLSearchParams();
        params.append('destination_currency', 'usdc');
        params.append('destination_network', 'base'); // On force le réseau Base
        params.append(`wallet_addresses[base]`, walletAddress);

        const response = await fetch('https://api.stripe.com/v1/crypto/onramp_sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: params.toString()
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Erreur renvoyée par Stripe:", data);
            return res.status(response.status).json({ error: "Erreur lors de la création de la session Stripe." });
        }

        // Stripe renvoie un objet contenant soit une 'redirect_url' (si configuré en hébergé) soit un token. 
        // Si redirect_url est absent, l'URL standard Stripe-Hosted se déduit via leur portail ou l'objet renvoyé.
        const checkoutUrl = data.redirect_url || `https://crypto.link.com/onramp/start?session_id=${data.id}`;
        
        res.json({ url: checkoutUrl });

    } catch (error) {
        console.error("Erreur d'initialisation Stripe Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat." });
    }
});

app.get('/', (req, res) => {
    res.send("🚀 Serveur NorPay actif et opérationnel avec Stripe.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`));
