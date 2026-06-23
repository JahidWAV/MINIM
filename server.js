require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApiKeyStamper } = require("@turnkey/api-key-stamper");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
});

const parentOrgId = process.env.TURNKEY_ORGANIZATION_ID || "100f356f-3e59-40a5-8446-d4731485a68e";

app.get('/', (req, res) => {
    res.status(200).send('NoPay Backend Operational with Dedicated Turnkey Endpoints.');
});

// 🌟 ROUTE A : ENVOYER LE CODE OTP (ENDPOINT DÉDIÉ REST VIA API BRUTE)
app.post('/api/otp-send', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email parameter is required" });

        console.log(`[Turnkey OTP] Requesting magic code for: ${email}`);
        
        // L'URL exacte pour l'initialisation OTP dans l'API REST de Turnkey
        const url = "https://api.turnkey.com/public/v1/query/init_user_email_auth";
        const bodyPayload = JSON.stringify({
            organizationId: parentOrgId,
            email: email,
            targetType: "TARGET_TYPE_SUB_ORGANIZATION"
        });

        const signature = await stamper.stamp({
            method: "POST",
            url: url,
            body: bodyPayload
        });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XKey": signature.publicKey,
                "X-Signature": signature.signature
            },
            body: bodyPayload
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Turnkey API error: ${errorText}`);
        }

        return res.status(200).json({ success: true, message: "Magic code dispatched." });
    } catch (error) {
        console.error("Turnkey OTP dispatch failure:", error);
        return res.status(500).json({ error: "Failed to dispatch magic code." });
    }
});

// 🌟 ROUTE B : VÉRIFIER LE CODE ET CRÉER LE WALLET BASE DEFINITIF
app.post('/api/otp-verify', async (req, res) => {
    try {
        const { email, otpCode } = req.body;
        if (!email || !otpCode) return res.status(400).json({ error: "Email and code are required." });

        console.log(`[Turnkey OTP] Verifying code for ${email}...`);

        const url = "https://api.turnkey.com/public/v1/submit/create_sub_organization";
        const bodyPayload = JSON.stringify({
            organizationId: parentOrgId,
            parameters: {
                subOrganizationName: `NoPay-${email}`,
                rootUsers: [{
                    userName: email,
                    userEmail: email,
                    apiKeys: [],
                    authenticators: []
                }],
                wallet: {
                    walletName: "Default NoPay Wallet",
                    accounts: [{
                        curve: "CURVE_SECP256K1",
                        pathFormat: "PATH_FORMAT_BIP44",
                        path: "m/44'/60'/0'/0/0" 
                    }]
                }
            },
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION"
        });

        const signature = await stamper.stamp({
            method: "POST",
            url: url,
            body: bodyPayload
        });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XKey": signature.publicKey,
                "X-Signature": signature.signature
            },
            body: bodyPayload
        });

        const responseData = await response.json();

        if (!response.ok) {
            throw new Error(`Turnkey verification failure: ${JSON.stringify(responseData)}`);
        }

        const walletAddress = responseData.activity.result.createSubOrganizationResult.walletAddresses[0];
        console.log(`[Turnkey OTP] Verified! Created wallet: ${walletAddress}`);

        return res.status(200).json({ walletAddress: walletAddress });
    } catch (error) {
        console.error("Turnkey verification or creation failed:", error);
        return res.status(500).json({ error: "Invalid code or setup synchronization error." });
    }
});

// ROUTE TRANSAK URL GENERATOR
app.post('/api/transak-session', async (req, res) => {
    try {
        const { walletAddress, userEmail, fiatCurrency } = req.body;
        if (!walletAddress) return res.status(400).json({ error: "A valid wallet address is required." });

        const isProduction = process.env.NODE_ENV === 'production';
        const transakBaseUrl = isProduction ? 'https://global.transak.com' : 'https://staging.global.transak.com';
        const defaultCrypto = (fiatCurrency === 'EUR') ? 'EURC' : 'USDC';

        const params = new URLSearchParams({
            apiKey: process.env.TRANSAK_API_KEY || '',
            walletAddress: walletAddress,
            email: userEmail || '',
            network: 'base',
            cryptoCurrencyCode: defaultCrypto,
            fiatCurrency: fiatCurrency || 'USD',
            themeColor: '000000',
            productsAvailed: 'buy'
        });

        return res.status(200).json({ url: `${transakBaseUrl}/?${params.toString()}` });
    } catch (error) {
        return res.status(500).json({ error: "Internal transak generator error." });
    }
});

app.listen(PORT, () => console.log(`[NoPay Server] Turnkey Endpoint Live on port ${PORT}`));
