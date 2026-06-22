const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json()); // Permet de lire le JSON envoyé par l'iPhone

// ========================================================
// ROUTE D'ACHAT MOONPAY FLUIDE ET IMMERSIVE (STYLE NOPAY)
// ========================================================
app.post('/api/onramp-session', async (req, res) => {
    const { walletAddress } = req.body;

    // Validation de sécurité de base
    if (!walletAddress) {
        return res.status(400).json({ error: "L'adresse du portefeuille de réception est requise." });
    }

    try {
        // 🎨 PARAMÈTRES DE PERSONNALISATION VISUELLE MOONPAY :
        // - currencyCode=usdc_base : Cible directement l'USDC sur le réseau Base.
        // - lockCurrencyCode=true : Masque le sélecteur de crypto (évite que le client s'éparpille).
        // - theme=dark : Aligne l'interface sur le style Sombre et épuré de ton app NoPay.
        // - colorCode=%23FFFFFF : Force la couleur des boutons principaux en blanc (code hex #FFFFFF).
        const moonPayUrl = `https://buy.moonpay.com/?currencyCode=usdc_base&walletAddress=${walletAddress}&lockCurrencyCode=true&theme=dark&colorCode=%23FFFFFF`;
        
        // On renvoie l'URL optimisée à l'application iOS
        res.json({ url: moonPayUrl });

    } catch (error) {
        console.error("Erreur lors de la génération du lien MoonPay:", error);
        res.status(500).json({ error: "Impossible de générer l'interface d'achat." });
    }
});

// Route de diagnostic rapide pour vérifier la santé du serveur
app.get('/', (req, res) => {
    res.send("🚀 Serveur NorPay actif et opérationnel. Module d'achat MoonPay configuré.");
});

// ========================================================
// DÉMARRAGE DU SERVEUR
// ========================================================
const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`));
