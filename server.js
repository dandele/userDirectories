require('dotenv').config();

const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const axios = require('axios');
const { Client } = require('@notionhq/client');
const path = require('path');

const app = express();

// Configurazione della sessione
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

// Funzione per generare il code verifier
function generateCodeVerifier() {
  return crypto.randomBytes(64).toString('hex');
}

// Funzione per generare il code challenge
function generateCodeChallenge(codeVerifier) {
  const hash = crypto.createHash('sha256').update(codeVerifier).digest();
  return hash.toString('base64url');
}

// Rotta per avviare il flusso OAuth
app.get('/auth/notion', (req, res) => {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);

  // Salva il codeVerifier nella sessione
  req.session.codeVerifier = codeVerifier;

  const params = new URLSearchParams({
    client_id: process.env.NOTION_CLIENT_ID,
    response_type: 'code',
    redirect_uri: 'http://localhost:3000/auth/notion/callback',
    scope: 'email',
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state: crypto.randomBytes(16).toString('hex'), // Opzionale, per sicurezza
  });

  res.redirect(`https://api.notion.com/v1/oauth/authorize?${params.toString()}`);
});

// Rotta per gestire il callback OAuth
app.get('/auth/notion/callback', async (req, res) => {
  const { code } = req.query;
  const codeVerifier = req.session.codeVerifier;

  if (!code || !codeVerifier) {
    return res.status(400).send('Codice o code verifier mancante.');
  }

  try {
    const tokenResponse = await axios.post('https://api.notion.com/v1/oauth/token', {
      grant_type: 'authorization_code',
      code: code,
      redirect_uri: 'http://localhost:3000/auth/notion/callback',
      code_verifier: codeVerifier,
    }, {
      auth: {
        username: process.env.NOTION_CLIENT_ID,
        password: process.env.NOTION_CLIENT_SECRET,
      },
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const tokenData = tokenResponse.data;

    // Salva il token nella sessione
    req.session.accessToken = tokenData.access_token;
    req.session.notionWorkspaceId = tokenData.workspace_id;
    req.session.notionWorkspaceName = tokenData.workspace_name;

    res.redirect('/');
  } catch (error) {
    console.error('Errore durante lo scambio del token:', error.response?.data || error.message);
    res.status(500).send('Errore durante l\'autenticazione.');
  }
});

// Rotta per il logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Middleware per verificare l'autenticazione
function ensureAuthenticated(req, res, next) {
  if (req.session.accessToken) {
    return next();
  }
  res.status(401).json({ error: 'Non autenticato' });
}

// Rotta per ottenere i database
app.get('/api/databases', ensureAuthenticated, async (req, res) => {
  const notion = new Client({ auth: req.session.accessToken });

  try {
    const databases = await notion.search({
      filter: { property: 'object', value: 'database' },
    });
    res.json(databases.results);
  } catch (error) {
    console.error('Errore durante il recupero dei database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Rotta per ottenere i dati di un database specifico
app.get('/api/databases/:id', ensureAuthenticated, async (req, res) => {
  const notion = new Client({ auth: req.session.accessToken });
  const databaseId = req.params.id;

  try {
    const response = await notion.databases.query({ database_id: databaseId });
    res.json(response.results);
  } catch (error) {
    console.error('Errore durante il recupero dei dati del database:', error);
    res.status(500).json({ error: error.message });
  }
});

// Servire i file statici
app.use(express.static(path.join(__dirname, 'public')));

// Avvio del server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato su http://localhost:${PORT}`);
});
