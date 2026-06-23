require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApiKeyStamper } = require("@turnkey/api-key-stamper");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// Initialisation du tampon de signature parent Turnkey
const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
});

const parentOrgId = process.env.TURNKEY_ORGANIZATION_ID || "100f356f-3e59-40a5-8446-d4731485a68e";

app.get('/', (req, res) => {
    res.status(200).send('NoPay Secure Wallet Factory Online.');
});

// 🌟 LA ROUTE CORRIGÉE : REÇOIT L'EMAIL ET INJECTE TOUS LES HEADERS REQUIS PAR TURNKEY
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        console.log(`[NoPay Factory] Requesting real wallet infrastructure for: ${email}`);

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
                        path: "m/44'/60'/0'/0/0" // Réseau Base / EVM standard
                    }]
                }
            },
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION"
        });

        // Génération de la signature et des en-têtes (incluant l'activity timestamp !)
        const signature = await stamper.stamp({ method: "POST", url, body: bodyPayload });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XKey": signature.publicKey,
                "X-Signature": signature.signature,
                ...signature.headers // 🌟 Injecte automatiquement les en-têtes temporels manquants
            },
            body: bodyPayload
        });

        const responseData = await response.json();
        if (!response.ok) {
            console.error("[NoPay Factory] Turnkey API Error Details:", responseData);
            throw new Error(JSON.stringify(responseData));
        }

        const walletAddress = responseData.activity.result.createSubOrganizationResult.walletAddresses[0];
        console.log(`[NoPay Factory] Success! Wallet deployed on Base: ${walletAddress}`);

        return res.status(200).json({ walletAddress: walletAddress });
    } catch (error) {
        console.error("[NoPay Factory] Turnkey communication failed:", error.message);
        return res.status(500).json({ error: "Turnkey wallet allocation failed." });
    }
});

app.listen(PORT, () => console.log(`[NoPay Server] Running on port ${PORT}`));
