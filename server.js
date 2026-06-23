require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TurnkeyClient } = require("@turnkey/http");
const { ApiKeyStamper } = require("@turnkey/api-key-stamper");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
});

const turnkeyClient = new TurnkeyClient(
    { baseUrl: "https://api.turnkey.com" },
    stamper
);

const parentOrgId = process.env.TURNKEY_ORGANIZATION_ID || "100f356f-3e59-40a5-8446-d4731485a68e";

app.get('/', (req, res) => {
    res.status(200).send('NoPay Backend Operational with Turnkey Email OTP Infrastructure.');
});

// 🌟 ROUTE A : ENVOYER LE CODE OTP PAR EMAIL VIA TURNKEY
app.post('/api/otp-send', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email parameter is required" });

        console.log(`[Turnkey OTP] Requesting magic code for: ${email}`);
        
        // Commande native Turnkey pour envoyer un code de vérification par e-mail
        await turnkeyClient.initUserEmailAuth({
            organizationId: parentOrgId,
            email: email,
            targetTargetType: "TARGET_TYPE_SUB_ORGANIZATION"
        });

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

        // 1. Validation du code et création de la sous-organisation utilisateur avec portefeuille crypto natif Base
        const activityResponse = await turnkeyClient.createSubOrganization({
            organizationId: parentOrgId,
            subOrganizationName: `NoPay-${email}`,
            rootUsers: [{
                userName: email,
                userEmail: email,
                apiKeys: [],
                authenticators: []
            }],
            // Demande d'un portefeuille standard (EOA) dérivé sur le réseau Base
            wallet: {
                walletName: "Default NoPay Wallet",
                accounts: [{
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP44",
                    path: "m/44'/60'/0'/0/0" 
                }]
            }
        });

        // 2. Extraction instantanée de l'adresse de production
        const walletAddress = activityResponse.activity.result.createSubOrganizationResult.walletAddresses[0];
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
            apiKey: process.env.TRANSAK_API_KEY || 'METS_TA_CLE_TRANSAK_ICI',
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

app.listen(PORT, () => console.log(`[NoPay Server] Turnkey Engine listening on port ${PORT}`));
