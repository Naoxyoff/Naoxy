const express = require('express');
const router = express.Router();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'https://naoxy.onrender.com/auth/discord/callback';

router.get('/auth/discord', (req, res) => {
    if (!CLIENT_ID) {
        return res.status(500).send("Erreur : DISCORD_CLIENT_ID manquant.");
    }
    const discordLoginUrl = `https://discord.com/api/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&response_type=code&scope=identify%20guilds`;
    res.redirect(discordLoginUrl);
});

router.get('/auth/discord/callback', async (req, res) => {
    const code = req.query.code;
    if (!code) return res.redirect('/');

    try {
        const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            body: new URLSearchParams({
                client_id: CLIENT_ID,
                client_secret: CLIENT_SECRET,
                grant_type: 'authorization_code',
                code: code,
                redirect_uri: REDIRECT_URI,
            }),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });

        const tokenData = await tokenResponse.json();
        if (!tokenData.access_token) return res.redirect('/?error=invalid_token');

        // Récupérer profil utilisateur
        const userResponse = await fetch('https://discord.com/api/users/@me', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });
        const userData = await userResponse.json();

        // Récupérer les serveurs de l'utilisateur
        const guildsResponse = await fetch('https://discord.com/api/users/@me/guilds', {
            headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` },
        });
        const guildsData = await guildsResponse.json();

        req.session.user = {
            id: userData.id,
            username: userData.username,
            avatar: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : 'https://cdn.discordapp.com/embed/avatars/0.png'
        };
        
        // On stocke les serveurs bruts dans la session pour le dashboard
        req.session.guilds = guildsData;

        res.redirect('/dashboard');
    } catch (err) {
        console.error("Erreur OAuth2 Discord:", err);
        res.redirect('/?error=server_error');
    }
});

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});

module.exports = router;
