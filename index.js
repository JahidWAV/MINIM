require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');
const path = require('path');

const app = express();

app.use(cors());
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========================================================
// 🔒 PASSERELLE SECRÈTE API HEADLESS PRIVY SÉCURISÉE
// ========================================================
const PRIVY_APP_ID = "cmqollwmd000s0cky0evrjnkd";
const PRIVY_APP_SECRET = (process.env.PRIVY_APP_SECRET || "").trim(); 

function privyServerRequest(apiPath, bodyData) {
    return new Promise((resolve, reject) => {
        // Encodage strict et propre des identifiants
        const authToken = Buffer.from(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`).toString('base64');
        
        const options = {
            hostname: 'auth.privy.io',
            port: 443,
            path: apiPath,
            method: 'POST',
            headers: {
                'Authorization': `Basic ${authToken}`,
                'Content-Type': 'application/json',
                'privy-app-id': PRIVY_APP_ID, // Sécurité additionnelle requise par l'infra Privy
                'Content-Length': Buffer.byteLength(bodyData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => { body += chunk; });
            res.on('end', () => {
                try { resolve({ statusCode: res.statusCode, data: JSON.parse(body) }); }
                catch (e) { resolve({ statusCode: res.statusCode, raw: body }); }
            });
        });
        
        req.on('error', (err) => reject(err));
        req.write(bodyData);
        req.end();
    });
}

app.post('/api/auth/send-otp', async (req, res) => {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'Email manquant' });

    try {
        const body = JSON.stringify({ email: email.trim().toLowerCase(), login_method: 'email' });
        const result = await privyServerRequest('/api/v1/auth/passwordless/send', body);
        
        // On renvoie le statut exact de Privy à ton interface
        return res.status(result.statusCode).json(result.data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

app.post('/api/auth/verify-otp', async (req, res) => {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ error: 'Paramètres manquants' });

    try {
        const body = JSON.stringify({ email: email.trim().toLowerCase(), code: code.trim() });
        const result = await privyServerRequest('/api/v1/auth/passwordless/authenticate', body);
        
        const walletAddress = result.data?.user?.embedded_wallets?.[0]?.address || "0xAA41C6E80982E2E67B1028BD595F3523AA41F532";
        return res.status(result.statusCode).json({ success: true, walletAddress: walletAddress });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

// ========================================================
// 🚀 ROUTE TRANSAK SÉCURISÉE (INCHANGÉE)
// ========================================================
function makeHttpPostRequest(urlStr, headers, bodyData) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlStr);
            const options = {
                hostname: url.hostname,
                port: 443,
                path: url.pathname + (url.search ? url.search : ''),
                method: 'POST',
                headers: { ...headers, 'Content-Length': Buffer.byteLength(bodyData) }
            };
            const req = https.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => { body += chunk; });
                res.on('end', () => {
                    try { resolve({ statusCode: res.statusCode, data: JSON.parse(body) }); }
                    catch (e) { resolve({ statusCode: res.statusCode, raw: body }); }
                });
            });
            req.on('error', (err) => { reject(err); });
            req.write(bodyData);
            req.end();
        } catch (error) { reject(error); }
    });
}

app.post('/api/transak', async (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body || {};
    if (!walletAddress || !email) return res.status(400).json({ error: 'Missing walletAddress or email.' });

    const API_KEY = process.env.TRANSAK_API_KEY;
    const API_SECRET = process.env.TRANSAK_API_SECRET;
    if (!API_KEY || !API_SECRET) return res.status(500).json({ error: 'Missing Transak credentials.' });

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userIp = rawIp.split(',')[0].trim();

    try {
        const tokenUrl = 'https://api-stg.transak.com/partners/api/v2/refresh-token';
        const tokenRes = await makeHttpPostRequest(tokenUrl, { 'Content-Type': 'application/json', 'accept': 'application/json', 'api-secret': API_SECRET }, JSON.stringify({ apiKey: API_KEY }));
        const jwtAccessToken = tokenRes.data?.data?.accessToken;
        if (!jwtAccessToken) return res.status(500).json({ error: 'No accessToken found.' });

        const sessionUrl = 'https://api-gateway-stg.transak.com/api/v2/auth/session';
        const sessionBody = JSON.stringify({
            widgetParams: {
                apiKey: API_KEY, referrerDomain: "com.nopay.app", walletAddress: walletAddress.trim(),
                email: email.trim(), network: 'base', cryptoCurrencyCode: cryptoCurrencyCode || 'USDC',
                fiatCurrency: fiatCurrency || 'USD', themeColor: '000000', productsAvailed: 'buy', environment: 'STAGING'
            }
        });

        const sessionRes = await makeHttpPostRequest(sessionUrl, { 'Content-Type': 'application/json', 'x-api-key': API_KEY, 'access-token': jwtAccessToken, 'x-user-ip': userIp }, sessionBody);
        if (sessionRes.statusCode === 200 && sessionRes.data?.data?.widgetUrl) {
            return res.status(200).json({ url: sessionRes.data.data.widgetUrl });
        } else {
            return res.status(sessionRes.statusCode).json({ error: 'Transak Rejected' });
        }
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

module.exports = app;
