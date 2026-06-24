require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https'); // 🚀 Utilisé pour appeler Transak sans dépendance externe
const { PrivyClient } = require("@privy-io/server-auth");

const app = express();

app.use(cors());
app.use(express.json());

const privy = new PrivyClient(
    process.env.PRIVY_APP_ID, 
    process.env.PRIVY_APP_SECRET
);

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy Server Operational.');
});

// ==========================================
// 🚀 NOUVELLE ROUTE SECURE POUR TRANSAK PRODUCTION
// ==========================================
app.post('/api/transak', async (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body;

    if (!walletAddress || !email) {
        return res.status(400).json({ error: 'Missing walletAddress or email.' });
    }

    // 🔑 Tes identifiants de production Transak
    const API_KEY = "03459354-6dae-4d11-85e6-ae886b3111b9";
    const ACCESS_TOKEN = "TMt0B7owznqPTBU6vXcx9Q==";

    // Extraction propre de l'adresse IP de l'iPhone depuis l'en-tête Vercel
    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userIp = rawIp.split(',')[0].trim();

    // Préparation du corps de la requête pour Transak
    const postData = JSON.stringify({
        widgetParams: {
            apiKey: API_KEY,
            referrerDomain: "com.nopay.app", // Bundle ID de ton app iOS
            walletAddress: walletAddress.trim(),
            email: email.trim(),
            network: 'base',
            cryptoCurrencyCode: cryptoCurrencyCode || 'USDC',
            fiatCurrency: fiatCurrency || 'USD',
            themeColor: '000000',
            productsAvailed: 'buy'
        }
    });

    // Configuration de la requête HTTPS sortante vers Transak
    const options = {
        hostname: 'api-gateway.transak.com', // URL officielle de Production
        port: 443,
        path: '/api/v2/auth/session',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'access-token': ACCESS_TOKEN,
            'x-user-ip': userIp,
            'Content-Length': Buffer.byteLength(postData)
        }
    };

    // Exécution de l'appel API
    const transakReq = https.request(options, (transakRes) => {
        let responseBody = '';

        transakRes.on('data', (chunk) => { responseBody += chunk; });

        transakRes.on('end', () => {
            try {
                const result = JSON.parse(responseBody);
                
                if (transakRes.statusCode === 200 && result.data && result.data.widgetUrl) {
                    // On renvoie avec succès l'URL signée à l'iPhone !
                    return res.status(200).json({ url: result.data.widgetUrl });
                } else {
                    console.error('[Transak API Reject] Code:', transakRes.statusCode, result);
                    return res.status(500).json({ error: 'Transak rejected session generation.', details: result });
                }
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse Transak response.' });
            }
        });
    });

    transakReq.on('error', (error) => {
        console.error('[Transak Network Error]:', error);
        return res.status(500).json({ error: 'Internal server communication failure.' });
    });

    // Envoi des données et fermeture de la connexion
    transakReq.write(postData);
    transakReq.end();
});

// ROUTE DE SECOURS (Si jamais ton app a besoin de forcer la création d'un wallet côté serveur)
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        const user = await privy.importUser({
            linkedAccounts: [{ type: "email", address: email.toLowerCase().trim() }]
        });

        const wallet = await privy.createWallet({
            userId: user.id,
            chainType: "ethereum"
        });
        
        return res.status(200).json({ 
            success: true,
            privyUserId: user.id,
            walletAddress: wallet.address 
        });

    } catch (error) {
        console.error("[Vercel] Privy Error:", error);
        return res.status(500).json({ error: "Privy failed.", message: error.message });
    }
});

module.exports = app;
