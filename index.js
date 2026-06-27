require('dotenv').config();
const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy & Transak Server Operational (Staging).');
});

function makeHttpPostRequest(urlStr, headers, bodyData) {
    return new Promise((resolve, reject) => {
        try {
            const url = new URL(urlStr);
            const targetPath = url.pathname + (url.search ? url.search : '');
            
            const options = {
                hostname: url.hostname,
                port: 443,
                path: targetPath,
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
        } catch (error) {
            reject(error);
        }
    });
}

// ==========================================
// 🚀 ROUTE SECURE POUR TRANSAK STAGING
// ==========================================
app.post('/api/transak', async (req, res) => {
    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body || {};

    if (!walletAddress || !email) {
        return res.status(400).json({ error: 'Missing walletAddress or email.' });
    }

    // 🛡️ Récupération sécurisée depuis Vercel
    const API_KEY = process.env.TRANSAK_API_KEY;
    const API_SECRET = process.env.TRANSAK_API_SECRET;

    if (!API_KEY || !API_SECRET) {
        return res.status(500).json({ error: 'Missing Transak API credentials in Vercel settings.' });
    }

    const rawIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userIp = rawIp.split(',')[0].trim();

    try {
        // 🛠️ Passage sur l'URL de STAGING pour le Refresh Token
        const tokenUrl = 'https://api-stg.transak.com/partners/api/v2/refresh-token';
        const tokenHeaders = {
            'Content-Type': 'application/json',
            'accept': 'application/json',
            'api-secret': API_SECRET
        };
        const tokenBody = JSON.stringify({ apiKey: API_KEY });

        const tokenRes = await makeHttpPostRequest(tokenUrl, tokenHeaders, tokenBody);

        if (tokenRes.statusCode !== 200) {
            return res.status(tokenRes.statusCode).json({
                error: 'Transak STG Refresh Token API rejected.',
                statusCode: tokenRes.statusCode,
                transakResponse: tokenRes.data || tokenRes.raw
            });
        }

        const jwtAccessToken = tokenRes.data?.data?.accessToken;
        if (!jwtAccessToken) {
            return res.status(500).json({ error: 'No accessToken found in Transak STG response.' });
        }

        // 🛠️ Passage sur l'URL de STAGING pour la Session de Widget
        const sessionUrl = 'https://api-gateway-stg.transak.com/api/v2/auth/session';
        const sessionHeaders = {
            'Content-Type': 'application/json',
            'x-api-key': API_KEY,
            'access-token': jwtAccessToken,
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
                productsAvailed: 'buy',
                environment: 'STAGING' // Sécurité supplémentaire parfois exigée
            }
        });

        const sessionRes = await makeHttpPostRequest(sessionUrl, sessionHeaders, sessionBody);

        if (sessionRes.statusCode === 200 && sessionRes.data?.data?.widgetUrl) {
            return res.status(200).json({ url: sessionRes.data.data.widgetUrl });
        } else {
            return res.status(sessionRes.statusCode).json({ error: 'Transak STG Session Rejected', transakResponse: sessionRes.data || sessionRes.raw });
        }

    } catch (error) {
        return res.status(500).json({ error: 'Catch internal server failure.', message: error.message });
    }
});

module.exports = app;
