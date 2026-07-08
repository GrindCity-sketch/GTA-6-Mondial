const { store, json, options } = require('./_store');

const MAX_MESSAGES = 200;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  const chatStore = store('chat');

  if (event.httpMethod === 'GET') {
    const room = (event.queryStringParameters && event.queryStringParameters.room) || 'global';
    const messages = (await chatStore.get(room, { type: 'json' })) || [];
    return json(200, { messages });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Corps de requête invalide' });
    }
    const { pseudo, token, text, room } = body;
    if (!pseudo || !token || !text || !text.trim()) return json(400, { error: 'Paramètres manquants' });
    if (text.length > 500) return json(400, { error: 'Message trop long (500 caractères max)' });

    const users = store('users');
    const user = await users.get(pseudo.toLowerCase(), { type: 'json' });
    if (!user || user.token !== token) return json(401, { error: 'Non autorisé' });

    const roomKey = room || 'global';
    const messages = (await chatStore.get(roomKey, { type: 'json' })) || [];
    messages.push({
      pseudo,
      text: text.trim().slice(0, 500),
      country: user.country || '??',
      ts: Date.now()
    });
    const trimmed = messages.slice(-MAX_MESSAGES);
    await chatStore.set(roomKey, JSON.stringify(trimmed));
    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
