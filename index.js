require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrivyClient } = require("@privy-io/server-auth");

const app = express();

app.use(cors());
app.use(express.json());

// Initialisation officielle et simple de Privy
const privy = new PrivyClient(
    process.env.PRIVY_APP_ID, 
    process.env.PRIVY_APP_SECRET
);

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Secure Privy Hub Online.');
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

// ROUTE : CRÉATION DU WALLET EMBARQUÉ VIA PRIVY 🚀
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        console.log(`[Vercel] Privy - Importing or creating user for: ${email}`);

        // 1. On crée ou récupère l'utilisateur Privy lié à cet email
        const user = await privy.importUser({
            linkedAccounts: [
                {
                    type: "email",
                    address: email.toLowerCase()
                }
            ]
        });

        console.log(`[Vercel] Privy User initialized: ${user.id}. Generating Embedded Wallet...`);

        // 2. On lui crée son wallet EVM embarqué en une seule ligne de code !
        const wallet = await privy.createWallet({
            userId: user.id,
            chainType: "ethereum" // Crée un wallet EVM (Ethereum, Base, Arbitrum, etc.)
        });

        console.log(`[Vercel] Privy Wallet successfully generated: ${wallet.address}`);
        
        return res.status(200).json({ 
            success: true,
            privyUserId: user.id,
            walletAddress: wallet.address 
        });

    } catch (error) {
        console.error("[Vercel] Privy Global Error:", error);
        return res.status(500).json({ 
            error: "Privy execution failed.", 
            message: error.message || "Unknown error"
        });
    }
});

module.exports = app;
