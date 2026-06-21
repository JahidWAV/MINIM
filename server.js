require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use(cors());

// Simulation d'une base de données (À remplacer par MongoDB/PostgreSQL plus tard)
const USERS_DB = [];

// Clé secrète pour sécuriser les sessions NorPay
const JWT_SECRET = process.env.JWT_SECRET || 'norpay_secret_ultra_secure_2026';

console.log("🚀 Serveur NorPay initialisé et prêt.");

// --- ROUTES D'AUTHENTIFICATION DE BASE ---

// 1. Inscription (Création du profil NorPay)
app.post('/register', async (req, res) => {
    try {
        const { email, password, name } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: "Email et mot de passe requis." });
        }

        const userExists = USERS_DB.find(user => user.email === email);
        if (userExists) {
            return res.status(400).json({ error: "Cet email est déjà utilisé." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const newUser = {
            id: Date.now().toString(),
            email,
            password: hashedPassword,
            name: name || 'Utilisateur NorPay',
            cryptoWalletAddress: null, // Sera rempli par Privy plus tard !
            createdAt: new Date()
        };

        USERS_DB.push(newUser);
        console.log(`👤 Nouvel utilisateur inscrit sur NorPay : ${email}`);

        // Génération du token de session
        const token = jwt.sign({ userId: newUser.id, email: newUser.email }, JWT_SECRET, { expiresIn: '24h' });
        
        res.status(201).json({ 
            message: "Utilisateur créé avec succès !",
            token,
            user: { id: newUser.id, email: newUser.email, name: newUser.name }
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur lors de l'inscription." });
    }
});

// 2. Connexion
app.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = USERS_DB.find(u => u.email === email);

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Identifiants incorrects." });
        }

        const token = jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });
        
        console.log(`🔓 Connexion réussie pour : ${email}`);
        res.json({ 
            token, 
            user: { id: user.id, email: user.email, name: user.name, wallet: user.cryptoWalletAddress } 
        });

    } catch (error) {
        res.status(500).json({ error: "Erreur lors de la connexion." });
    }
});

// --- MIDDLEWARE DE SÉCURITÉ ---
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Accès refusé. Token manquant." });

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: "Token invalide ou expiré." });
        req.user = user;
        next();
    });
}

// --- ROUTE DASHBOARD CRYPTO (SIMULÉE POUR FLUTTER) ---
app.get('/dashboard', authenticateToken, (req, res) => {
    const user = USERS_DB.find(u => u.id === req.user.userId);
    
    // Pour l'instant, on simule des données de wallet stylées pour ton app Flutter
    res.json({
        appName: "NorPay",
        userName: user ? user.name : "Client",
        // Si Privy n'a pas encore généré de wallet, on montre une adresse stylée pour le design
        walletAddress: user?.cryptoWalletAddress || "0x71C...3a92", 
        balances: {
            usdc: 1250.50,  // Stablecoin adossé au dollar
            eurc: 850.00,   // Stablecoin adossé à l'euro
            eth: 0.42       // Ethereum
        },
        transactions: [
            { id: "1", type: "Received", amount: "+250 USDC", date: "Aujourd'hui", from: "0xAb58...ef45" },
            { id: "2", type: "Sent", amount: "-15 EURC", date: "Hier", to: "Starbucks Web3" }
        ]
    });
});

// Lancement du serveur
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`⚡ Serveur NorPay en ligne sur le port ${PORT}`);
});
