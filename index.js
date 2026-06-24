require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { ApiKeyStamper } = require("@turnkey/api-key-stamper");

const app = express();

app.use(cors());
app.use(express.json());

const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
});

const parentOrgId = process.env.TURNKEY_ORGANIZATION_ID || "100f356f-3e59-40a5-8446-d4731485a68e";

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Secure Serverless Hub Online.');
});

// ROUTE : ENVOI DE L'OTP VIA RESEND
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: "Email and code are required." });

        const response = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${process.env.RESEND_API_KEY}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                from: "NoPay App <onboarding@resend.dev>",
                to: [email.toLowerCase()],
                subject: "Your NoPay Verification Code",
                html: `<div style='font-family:sans-serif;padding:20px;'><h3>Your access code: <strong>${code}</strong></h3></div>`
            })
        });

        if (!response.ok) {
            const errData = await response.json();
            throw new Error(JSON.stringify(errData));
        }

        return res.status(200).json({ success: true });
    } catch (error) {
        return res.status(500).json({ error: "Failed to send email via Resend.", details: error.message });
    }
});

// ROUTE : CRÉATION DU WALLET CORRIGÉE (PUBLIC KEY EXTRAITE DE L'INSTANCE)
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        console.log(`[Vercel] Executing documented stamp protocol for: ${email}`);

        const activityPayload = {
            organizationId: parentOrgId,
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION",
            timestampMs: Date.now().toString(),
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
            }
        };

        const stringifiedPayload = JSON.stringify(activityPayload);
        
        // La signature brute générée par le package
        const signatureString = await stamper.stamp(stringifiedPayload);

        // 🌟 CORRECTION : On va chercher la clé publique directement sur l'instance du stamper (stamper.apiPublicKey)
        const stampObj = {
            publicKey: stamper.apiPublicKey, 
            signature: signatureString,
            scheme: "SIGNATURE_SCHEME_TK_API_P256"
        };

        // Encodage Base64URL strict
        const base64UrlStamp = Buffer.from(JSON.stringify(stampObj))
            .toString("base64")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");

        const response = await fetch("https://api.turnkey.com/public/v1/submit/create_sub_organization", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-Stamp": base64UrlStamp
            },
            body: stringifiedPayload
        });

        const resData = await response.json();

        if (!response.ok) {
            throw new Error(JSON.stringify(resData));
        }

        const walletAddress = resData.activity.result.createSubOrganizationResult.walletAddresses[0];
        console.log(`[Vercel] Wallet successfully forced: ${walletAddress}`);
        
        return res.status(200).json({ walletAddress: walletAddress });

    } catch (error) {
        console.error("[Vercel] Turnkey Doc Compliance Error:", error.message);
        return res.status(500).json({ 
            error: "Turnkey Direct execution failed.", 
            message: error.message
        });
    }
});

module.exports = app;
