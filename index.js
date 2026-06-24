require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrivyClient } = require("@privy-io/server-auth");

const app = express();

app.use(cors());
app.use(express.json());

const privy = new PrivyClient(
    process.env.PRIVY_APP_ID, 
    process.env.PRIVY_APP_SECRET
);

app.get('/api', (req, res) => {
    res.status(200).send('NoPay Privy Server Operational.');
});

// ROUTE DE SECOURS (Si jamais ton app a besoin de forcer la création d'un wallet côté serveur)
app.post('/api/create-wallet', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: "Email is required." });

        const user = await privy.importUser({
            linkedAccounts: [{ type: "email", address: email.toLowerCase().trim() }]
        });

        const wallet = await privy.createWallet({
            userId: user.id,
            chainType: "ethereum"
        });
        
        return res.status(200).json({ 
            success: true,
            privyUserId: user.id,
            walletAddress: wallet.address 
        });

    } catch (error) {
        console.error("[Vercel] Privy Error:", error);
        return res.status(500).json({ error: "Privy failed.", message: error.message });
    }
});

module.exports = app;
