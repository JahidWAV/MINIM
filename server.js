// 🌟 LA ROUTE CORRIGÉE : INJECTE PARFAITEMENT LE TIMESTAMP DE TURNKEY
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
                        path: "m/44'/60'/0'/0/0" // Réseau Base
                    }]
                }
            },
            type: "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION"
        });

        // 🌟 L'élément clé : On récupère la signature complète
        const signature = await stamper.stamp({ method: "POST", url, body: bodyPayload });

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-XKey": signature.publicKey,
                "X-Signature": signature.signature,
                // 🌟 ICI : On transmet les headers additionnels (dont l'activity timestamp !) générés par le stamper
                ...signature.headers 
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
