const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTE MOONPAY VIA PRIVY (NETTOYÉE ET STABLE)
// ==========================================
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille est requise." });
    }

    try {
        // ID de ton application Privy
        const privyAppId = "cmqollwmd000s0cky0evrjnkd";

        // Lien officiel que Privy utilise pour charger le widget MoonPay configuré sur ton compte
        const checkoutUrl = `https://onramp.privy.io/?appId=${privyAppId}&address=${walletAddress}&network=base&asset=usdc`;
        
        // On renvoie l'URL propre à l'application iOS
        res.json({ url: checkoutUrl });

    } catch (error) {
        console.error("Erreur Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat." });
    }
});

app.get('/', (req, res) => {
    res.send("🚀 Serveur NorPay actif et opérationnel pour MoonPay.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`));
