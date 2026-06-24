const https = require('https');

module.exports = async (req, res) => {
    // Gestion des en-têtes CORS pour autoriser ton application iPhone
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    // Réponse rapide pour les requêtes de vérification OPTIONS (CORS)
    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // ROUTE DE VÉRIFICATION : GET /api
    if (req.method === 'GET') {
        return res.status(200).send('NoPay Transak Server Operational on Vercel.');
    }

    // ROUTE PRINCIPALE : POST /api/transak
    if (req.method === 'POST') {
        const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body || {};

        if (!walletAddress || !email) {
            return res.status(400).json({ error: 'Missing walletAddress or email.' });
        }

        // 🔑 Tes identifiants de production Transak
        const API_KEY = "03459354-6dae-4d11-85e6-ae886b3111b9";
        const ACCESS_TOKEN = "TMt0B7owznqPTBU6vXcx9Q==";

        // Extraction de l'adresse IP
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

        // Configuration de la requête vers Transak
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

        return new Promise((resolve) => {
            const transakReq = https.request(options, (transakRes) => {
                let responseBody = '';
                transakRes.on('data', (chunk) => { responseBody += chunk; });
                transakRes.on('end', () => {
                    try {
                        const result = JSON.parse(responseBody);
                        if (transakRes.statusCode === 200 && result.data && result.data.widgetUrl) {
                            res.status(200).json({ url: result.data.widgetUrl });
                        } else {
                            res.status(500).json({ error: 'Transak rejected session generation.', details: result });
                        }
                    } catch (e) {
                        res.status(500).json({ error: 'Failed to parse Transak response.' });
                    }
                    resolve();
                });
            });

            transakReq.on('error', (error) => {
                res.status(500).json({ error: 'Internal server communication failure.' });
                resolve();
            });

            transakReq.write(postData);
            transakReq.end();
        });
    }

    // Si une autre méthode ou route est appelée
    return res.status(404).json({ error: 'Not found' });
};
