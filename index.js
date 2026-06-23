require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { TurnkeyClient } = require("@turnkey/http");
const { ApiKeyStamper } = require("@turnkey/api-key-stamper");

const app = express();

app.use(cors());
app.use(express.json());

// Initialisation Turnkey avec les variables d'environnement
const stamper = new ApiKeyStamper({
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
});

const client = new TurnkeyClient(
    { baseUrl: "https://api.turnkey.com" },
    stamper
);

const parentOrgId = process.env.TURNKEY_ORGANIZATION_ID || "100f356f-3e59-40a5-8446-d4731485a68e";

// Route de test pour s'assurer que le serveur répond
app.get('/api', (req, res) => {
    res.status(200).send('NoPay Secure Serverless Hub Online.');
});

// ROUTE : ENVOI DE L'OTP VIA VERCEL + RESEND
app.post('/api/send-otp', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ error: "Email and code are required." });

        console.log(`[Vercel] Sending OTP to ${email}`);

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
        console.error("[Vercel] Resend Error:", error.message);
        return res.status(500).json({ error: "Failed to send email via Resend.", details: error.message });
    }
});

// 🌟 ROUTE CORRIGÉE : RECOURS À CLIENT.REQUEST()
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        console.log(`[Vercel] Requesting wallet via native request layer for: ${email}`);

        // 🌟 Remplacement par .request() qui est la vraie méthode native du SDK
        const response = await client.request({
            uri: "/public/v1/submit/create_sub_organization",
            payload: {
                organizationId: parentOrgId,
                type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION",
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
            }
        });

        // Lecture du résultat de la réponse brute décodée par le SDK
        const walletAddress = response.activity.result.createSubOrganizationResult.walletAddresses[0];
        console.log(`[Vercel] Successfully generated: ${walletAddress}`);
        return res.status(200).json({ walletAddress: walletAddress });

    } catch (error) {
        console.error("[Vercel] Turnkey Request Core Error Details:", error);
        return res.status(500).json({ 
            error: "Turnkey SDK execution failed.", 
            message: error.message || "Unknown Turnkey error",
            details: error
        });
    }
});

module.exports = app;
