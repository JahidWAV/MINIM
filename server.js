require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

// MARK: - MIDDLEWARES SÉCURITÉ & ANALYSE
app.use(cors());
app.use(express.json());

// Petite route de check pour s'assurer sur Render que le conteneur est bien réveillé
app.get('/', (req, res) => {
    res.status(200).send('NoPay Backend System Operational.');
});

// MARK: - ROUTE TRANSAK ONRAMP (NATIVE BASE NETWORK INTEGRATION)
app.post('/api/transak-session', async (req, res) => {
    try {
        const { walletAddress, userEmail, fiatCurrency } = req.body;

        if (!walletAddress) {
            return res.status(400).json({ error: "Missing walletAddress parameter" });
        }

        // Détection de l'environnement pour basculer sur l'URL Transak adéquate
        const isProduction = process.env.NODE_ENV === 'production';
        const transakBaseUrl = isProduction 
            ? 'https://global.transak.com' 
            : 'https://staging.global.transak.com';

        const apiKey = process.env.TRANSAK_API_KEY;
        if (!apiKey) {
            console.error("Warning: TRANSAK_API_KEY environment variable is missing.");
        }

        // Stratégie NoPay : si le client a mis son app en EUR, on lui propose d'acheter de l'EURC. 
        // S'il est en USD, on le pousse sur de l'USDC. Le tout sur le réseau Base.
        const defaultCryptoCurrency = (fiatCurrency === 'EUR') ? 'EURC' : 'USDC';

        // Paramétrage complet de l'URL d'achat
        const params = new URLSearchParams({
            apiKey: apiKey || '',
            walletAddress: walletAddress,
            email: userEmail || '',
            network: 'base',                           // Fixé sur Base pour des frais minimes
            cryptoCurrencyCode: defaultCryptoCurrency, // Forcé sur le stablecoin adapté
            fiatCurrency: fiatCurrency || 'USD',       // USD ou EUR selon les préférences de l'utilisateur
            themeColor: '000000',                      // Intégration esthétique : fond noir pour l'ADN NoPay
            productsAvailed: 'buy'                      // Épure l'interface en masquant le module de vente
        });

        const finalUrl = `${transakBaseUrl}/?${params.toString()}`;

        // Renvoi de la session à l'application iOS NoPay
        return res.status(200).json({ url: finalUrl });

    } catch (error) {
        console.error("Transak session generation failed:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// MARK: - MISE EN ROUTE DU SERVEUR
app.listen(PORT, () => {
    console.log(`[NoPay Server] Active and listening on port ${PORT}`);
});
