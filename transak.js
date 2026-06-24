import fetch from 'node-fetch';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { email, walletAddress, fiatCurrency, cryptoCurrencyCode } = req.body;

    if (!walletAddress || !email) {
        return res.status(400).json({ error: 'Missing walletAddress or email' });
    }

    // 🌟 Tes véritables clés de Production visibles sur ton Dashboard
    const API_KEY = "03459354-6dae-4d11-85e6-ae886b3111b9";
    const ACCESS_TOKEN = "TMt0B7owznqPTBU6vXcx9Q=="; // C'est ton API Secret / Access Token

    // Récupération de l'IP de l'utilisateur final connecté depuis l'iPhone
    const userIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';

    try {
        // En Production, l'URL de l'API Gateway est : https://api-gateway.transak.com
        const response = await fetch('https://api-gateway.transak.com/api/v2/auth/session', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': API_KEY,
                'access-token': ACCESS_TOKEN,
                'x-user-ip': userIp.split(',')[0].trim() // Sécurise le format de l'IP
            },
            body: JSON.stringify({
                widgetParams: {
                    apiKey: API_KEY,
                    referrerDomain: "com.nopay.app", // Package name de ton app iOS
                    walletAddress: walletAddress.trim(),
                    email: email.trim(),
                    network: 'base',
                    cryptoCurrencyCode: cryptoCurrencyCode || 'USDC',
                    fiatCurrency: fiatCurrency || 'USD',
                    themeColor: '000000',
                    productsAvailed: 'buy'
                }
            })
        });

        const result = await response.json();

        // D'après la spec de retour Transak : { "data": { "widgetUrl": "..." } }
        if (response.ok && result.data && result.data.widgetUrl) {
            return res.status(200).json({ url: result.data.widgetUrl });
        } else {
            console.error('Transak Server Error Payload:', result);
            return res.status(500).json({ error: 'Transak rejected session creation', details: result });
        }

    } catch (error) {
        console.error('Server Communication Error:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}
