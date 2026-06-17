const express = require('express');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(express.json());
app.use(cors());

// Sert le site vitrine (dossier public) pour la validation Stripe
app.use(express.static(path.join(__dirname, 'public')));

// Extraction des variables d'environnement de Render
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
const JWT_SECRET = process.env.JWT_SECRET || 'minim_default_secret_key_2026';

const USERS_DB = [];

// Affiche la page d'accueil (Site vitrine)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── API : REGISTER & STRIPE GENERATION
app.post('/api/auth/register', async (req, res) => {
    try {
        const { email, password, companyName } = req.body;
        if (!email || !password || !companyName) {
            return res.status(400).json({ error: 'Champs manquants' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);

        const stripeAccount = await stripe.accounts.create({
            type: 'custom',
            country: 'FR',
            email: email,
            capabilities: {
                treasury: { requested: true },
                card_issuing: { requested: true }
            },
            business_profile: { name: companyName }
        });

        const financialAccount = await stripe.treasury.financialAccounts.create({
            supported_currencies: ['eur'],
            features: {
                inbound_transfers: { ach: true },
                outbound_transfers: { ach: true }
            }
        }, { stripeAccount: stripeAccount.id });

        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            companyName,
            stripeAccountId: stripeAccount.id,
            financialAccountId: financialAccount.id
        };
        USERS_DB.push(newUser);

        const token = jwt.sign({ userId: newUser.id }, JWT_SECRET, { expiresIn: '30d' });

        res.status(201).json({
            token,
            companyName: newUser.companyName,
            stripeAccountId: newUser.stripeAccountId,
            financialAccountId: financialAccount.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── API : LOGIN
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user = USERS_DB.find(u => u.email === email);
    if (!user) return res.status(404).json({ error: 'Utilisateur non trouvé' });

    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) return res.status(401).json({ error: 'Mot de passe incorrect' });

    const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, companyName: user.companyName });
});

// MIDDLEWARE JWT SÉCURITÉ
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) return res.sendStatus(403);
        req.user = USERS_DB.find(u => u.id === decoded.userId);
        if (!req.user) return res.sendStatus(404);
        next();
    });
};

// ─── API : GET BALANCE & IBAN
app.get('/api/treasury/dashboard', authenticateToken, async (req, res) => {
    try {
        const financialAccount = await stripe.treasury.financialAccounts.retrieve(
            req.user.financialAccountId,
            { stripeAccount: req.user.stripeAccountId }
        );

        const addresses = financialAccount.financial_addresses || [];
        const ibanDetails = addresses.find(addr => addr.type === 'iban') || {};

        res.json({
            balance: financialAccount.balance.cash.eur / 100,
            iban: ibanDetails.iban || "FR76300610000000000000TEST",
            bic: ibanDetails.bic || "STRIPEF2XXX"
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ─── API : ISSUE CARD
app.post('/api/issuing/cards', authenticateToken, async (req, res) => {
    try {
        const { cardholderName } = req.body;

        const cardholder = await stripe.issuing.cardholders.create({
            name: cardholderName || req.user.companyName,
            email: req.user.email,
            status: 'active',
            type: 'individual',
        }, { stripeAccount: req.user.stripeAccountId });

        const card = await stripe.issuing.cards.create({
            cardholder: cardholder.id,
            currency: 'eur',
            type: 'virtual',
            status: 'active',
        }, { stripeAccount: req.user.stripeAccountId });

        res.json({
            name: cardholderName || req.user.companyName,
            number: card.last4,
            exp: `${card.exp_month}/${card.exp_year}`
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Port dynamique Render
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server on port ${PORT}`));
