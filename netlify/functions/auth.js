const crypto = require('crypto');
const { store, json, options } = require('./_store');

function hash(pin) {
  return crypto.createHash('sha256').update(String(pin)).digest('hex');
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Corps de requête invalide' });
  }

  const { action, pseudo, pin, country } = body;
  if (!pseudo || !/^[a-zA-Z0-9_\-]{3,18}$/.test(pseudo)) {
    return json(400, { error: 'Pseudo invalide (3-18 caractères, lettres/chiffres/_/-)' });
  }
  if (!pin || !/^\d{4,6}$/.test(String(pin))) {
    return json(400, { error: 'Code PIN invalide (4 à 6 chiffres)' });
  }

  const users = store('users');
  const key = pseudo.toLowerCase();
  const existing = await users.get(key, { type: 'json' });

  if (action === 'register') {
    if (existing) return json(409, { error: 'Ce pseudo est déjà pris' });
    const token = crypto.randomBytes(24).toString('hex');
    const user = {
      pseudo,
      pinHash: hash(pin),
      country: country || '??',
      score: 0,
      quizzesTaken: 0,
      createdAt: Date.now(),
      token
    };
    await users.set(key, JSON.stringify(user));
    const { pinHash, ...pub } = user;
    return json(200, { user: pub });
  }

  if (action === 'login') {
    if (!existing) return json(404, { error: "Ce compte n'existe pas" });
    if (existing.pinHash !== hash(pin)) return json(401, { error: 'Code PIN incorrect' });
    const token = crypto.randomBytes(24).toString('hex');
    existing.token = token;
    await users.set(key, JSON.stringify(existing));
    const { pinHash, ...pub } = existing;
    return json(200, { user: pub });
  }

  if (action === 'session') {
    if (!existing || existing.token !== body.token) return json(401, { error: 'Session invalide' });
    const { pinHash, ...pub } = existing;
    return json(200, { user: pub });
  }

  return json(400, { error: 'Action inconnue' });
};
