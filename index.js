require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const { PrivyClient } = require("@privy-io/server-auth");

const app = express();

app.use(cors());
app.use(express.json());

// 🛡️ INITIALISATION SÉCURISÉE
let privy = null;
if (process.env.PRIVY_APP_ID && process.env.PRIVY_APP_SECRET) {
    privy = new PrivyClient(
        process.env.PRIVY_APP_ID, 
        process.env.PRIVY_APP_SECRET
    );
} else {
    console.warn("[Warning] Privy environment variables are missing.");
}

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy & Transak Server Operational.');
});

// ==========================================
// 🚀 ROUTE SECURE POUR TRANSAK PRODUCTION
// ==========================================
app.post('/api/transak', async (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body;

    if (!walletAddress || !email) {
        return res.status(400).json({ error: 'Missing walletAddress or email.' });
    }

    const API_KEY = "03459354-6dae-4d11-85e6-ae886b3111b9";
    const ACCESS_TOKEN = "TMt0B7owznqPTBU6vXcx9Q==";

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userIp = rawIp.split(',')[0].trim();

    const postData = JSON.stringify({
        widgetParams: {
            apiKey: API_KEY,
            referrerDomain: "com.nopay.app",
            walletAddress: walletAddress.trim(),
            email: email.trim(),
            network: 'base',
            cryptoCurrencyCode: cryptoCurrencyCode || 'USDC',
            fiatCurrency: fiatCurrency || 'USD',
            themeColor: '000000',
            productsAvailed: 'buy'
        }
    });

    const options = {
        hostname: 'api-gateway.transak.com',
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

    const transakReq = https.request(options, (transakRes) => {
        let responseBody = '';
        transakRes.on('data', (chunk) => { responseBody += chunk; });
        transakRes.on('end', () => {
            try {
                const result = JSON.parse(responseBody);
                if (transakRes.statusCode === 200 && result.data && result.data.widgetUrl) {
                    return res.status(200).json({ url: result.data.widgetUrl });
                } else {
                    return res.status(500).json({ error: 'Transak rejected session generation.', details: result });
                }
            } catch (e) {
                return res.status(500).json({ error: 'Failed to parse Transak response.' });
            }
        });
    });

    transakReq.on('error', (error) => {
        return res.status(500).json({ error: 'Internal server communication failure.' });
    });

    transakReq.write(postData);
    transakReq.end();
});

// ROUTE DE SECOURS PRIVY
app.post('/api/create-wallet', async (req, res) => {
    try {
        if (!privy) {
            return res.status(503).json({ error: "Privy service unconfigured on this backend instance." });
        }
        
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
