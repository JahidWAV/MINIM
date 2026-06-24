require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

app.use(cors());
app.use(express.json());

// Route de test (accessible via https://minim-lake.vercel.app/api)
app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy & Transak Server Operational.');
});

// ==========================================
// 🚀 ROUTE SECURE POUR TRANSAK PRODUCTION
// ==========================================
app.post('/api/transak', (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body || {};

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
            'api-secret': ACCESS_TOKEN,   // 🛡️ En-tête officiel exigé par l'API
            'access-token': ACCESS_TOKEN, // 🛡️ Doublon de sécurité exigé par le validateur gateway
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

// 🌟 TRÈS IMPORTANT POUR VERCEL + EXPRESS : On exporte juste l'application sans app.listen !
module.exports = app;
