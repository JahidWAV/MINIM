const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// ROUTE D'ACHAT DIRECT MOONPAY (FIABLE & PRO)
// ==========================================
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille est requise." });
    }

    try {
        // Lien officiel MoonPay pré-configuré pour l'USDC sur le réseau Base
        // L'adresse de l'utilisateur est injectée dynamiquement
        const moonPayUrl = `https://buy.moonpay.com/?currencyCode=usdc_base&walletAddress=${walletAddress}`;
        
        res.json({ url: moonPayUrl });

    } catch (error) {
        console.error("Erreur Onramp:", error);
        res.status(500).json({ error: "Impossible de générer la session d'achat." });
    }
});

app.get('/', (req, res) => {
    res.send("🚀 Serveur NorPay actif et opérationnel pour MoonPay direct.");
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`));
