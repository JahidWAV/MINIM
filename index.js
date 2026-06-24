require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

app.use(cors());
app.use(express.json());

// Route de test
app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy & Transak Server Operational.');
});

// Fonction utilitaire pour exécuter des requêtes HTTPS POST de manière propre
function makeHttpPostRequest(urlStr, headers, bodyData) {
    return new Promise((resolve, reject) => {
        const url = new URL(urlStr);
        const options = {
            hostname: url.hostname,
            port: 443,
            path: url.pathname,
            method: 'POST',
            headers: {
                ...headers,
                'Content-Length': Buffer.byteLength(bodyData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ statusCode: res.statusCode, data: parsed });
                } catch (e) {
                    resolve({ statusCode: res.statusCode, raw: body });
                }
            });
        });

        req.on('error', (err) => { reject(err); });
        req.write(bodyData);
        req.end();
    });
}

// ==========================================
// 🚀 ROUTE SECURE POUR TRANSAK PRODUCTION
// ==========================================
app.post('/api/transak', async (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body || {};

    if (!walletAddress || !email) {
        return res.status(400).json({ error: 'Missing walletAddress or email.' });
    }

    const API_KEY = "03459354-6dae-4d11-85e6-ae886b3111b9";
    const API_SECRET = "TMt0B7owznqPTBU6vXcx9Q==";

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userIp = rawIp.split(',')[0].trim();

    try {
        // 🌟 ETAPE 1 : Appeler l'API de rafraîchissement pour obtenir le Partner Access Token (JWT)
        // Note: D'après ta doc, l'API utilise l'URL de l'environnement correspondant
        const tokenUrl = 'https://api.transak.com/partners/api/v2/refresh-token';
        const tokenHeaders = {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'api-secret': API_SECRET
        };
        const tokenBody = JSON.stringify({ apiKey: API_KEY });

        console.log("[Transak Backend] Requesting short-lived JWT accessToken...");
        const tokenRes = await makeHttpPostRequest(tokenUrl, tokenHeaders, tokenBody);

        if (tokenRes.statusCode !== 200 || !tokenRes.data?.data?.accessToken) {
            console.error("[Transak Backend] Failed to get Access Token:", tokenRes.data);
            return res.status(401).json({ error: 'Failed to authenticate with Transak partner gateway.', details: tokenRes.data });
        }

        const jwtAccessToken = tokenRes.data.data.accessToken;
        console.log("[Transak Backend] JWT accessToken obtained successfully!");

        // 🌟 ETAPE 2 : Générer l'URL sécurisée du widget avec le jeton fraîchement obtenu
        const sessionUrl = 'https://api-gateway.transak.com/api/v2/auth/session';
        const sessionHeaders = {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'access-token': jwtAccessToken, // 🔑 Notre jeton JWT tout neuf passé ici !
            'x-user-ip': userIp
        };
        const sessionBody = JSON.stringify({
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

        console.log("[Transak Backend] Requesting secure single-use widget session...");
        const sessionRes = await makeHttpPostRequest(sessionUrl, sessionHeaders, sessionBody);

        if (sessionRes.statusCode === 200 && sessionRes.data?.data?.widgetUrl) {
            console.log("[Transak Backend] Secure Widget URL created!");
            return res.status(200).json({ url: sessionRes.data.data.widgetUrl });
        } else {
            console.error("[Transak Backend] Session creation rejected:", sessionRes.data);
            return res.status(500).json({ error: 'Transak rejected session generation.', details: sessionRes.data });
        }

    } catch (error) {
        console.error('[Transak Backend Error]:', error);
        return res.status(500).json({ error: 'Internal server communication failure.', message: error.message });
    }
});

module.exports = app;
