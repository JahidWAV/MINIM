require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Turnkey } = require("@turnkey/sdk-server");

const app = express();

app.use(cors());
app.use(express.json());

// 🌟 Initialisation de la nouvelle librairie (fini l'ancien TurnkeyClient et le stamper manuel)
const turnkey = new Turnkey({
    apiBaseUrl: "https://api.turnkey.com",
    apiPublicKey: process.env.TURNKEY_API_PUBLIC_KEY,
    apiPrivateKey: process.env.TURNKEY_API_PRIVATE_KEY,
    defaultOrganizationId: process.env.TURNKEY_ORGANIZATION_ID,
});

const apiClient = turnkey.apiClient();

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

// ROUTE : CRÉATION DU WALLET AVEC LE NOUVEAU SDK
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        console.log(`[Vercel] Requesting sub-organization creation via SDK Server for: ${email}`);

        // La nouvelle méthode officielle du SDK Server
        const response = await apiClient.createSubOrganization({
            subOrganizationName: `NoPay-${email}`,
            rootUsers: [{
                userName: email,
                userEmail: email,
                apiKeys: [],
                authenticators: []
            }],
            rootQuorumThreshold: 1,
            wallet: {
                walletName: "Default NoPay Wallet",
                accounts: [{
                    curve: "CURVE_SECP256K1",
                    pathFormat: "PATH_FORMAT_BIP44",
                    path: "m/44'/60'/0'/0/0"
                }]
            }
        });

        // La nouvelle librairie renvoie directement l'ID
        const walletAddress = response.subOrganizationId;
        console.log(`[Vercel] Successfully generated subOrg: ${walletAddress}`);
        
        return res.status(200).json({ walletAddress: walletAddress });

    } catch (error) {
        console.error("[Vercel] Turnkey SDK Server Error:", error);
        return res.status(500).json({ 
            error: "Turnkey SDK execution failed.", 
            message: error.message || "Unknown error",
            details: error
        });
    }
});

module.exports = app;
