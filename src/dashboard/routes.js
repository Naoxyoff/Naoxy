const express = require('express');
const router = express.Router();

module.exports = (client, app) => {
  app.get("/login", (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Orbis Dashboard - Connexion</title>
    <style>
        body { margin: 0 !important; background-color: #050505 !important; color: #f4f4f5 !important; display: flex !important; justify-content: center !important; align-items: center !important; height: 100vh !important; }
        .login-container { background-color: #0f0f11 !important; border: 1px solid #1f1f23 !important; padding: 2.5rem !important; border-radius: 12px !important; text-align: center !important; }
        .btn-discord { display: inline-block !important; padding: 0.8rem 2rem !important; background-color: #5865F2 !important; color: #fff !important; text-decoration: none !important; border-radius: 6px !important; }
    </style>
</head>
<body>
    <div class="login-container">
        <h1>Orbis Dashboard</h1>
        <a href="/auth/discord" class="btn-discord">Se connecter avec Discord</a>
    </div>
</body>
</html>
    `);
  });
  return router;
};
