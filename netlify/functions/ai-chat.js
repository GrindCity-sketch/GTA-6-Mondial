const { json, options } = require('./_store');
const { adminClient, checkRateLimit } = require('./_supabase');

const SYSTEM_PROMPT = `Tu es "Ray", l'assistant IA officieux de GTA6 Hub, une application communautaire de fans dédiée à GTA 6.
Règles :
- Réponds dans la langue du message de l'utilisateur (français ou anglais).
- Tu aides sur : infos publiques connues sur GTA 6 (annonces officielles, trailers Rockstar), conseils de gameplay généraux transférables depuis GTA V/Online, création de personnage, discussion sur les véhicules et tenues, aide à comprendre les mécaniques de jeux Rockstar.
- Distingue toujours clairement une information officielle confirmée par Rockstar d'une rumeur ou spéculation communautaire ("non confirmé par Rockstar", "rumeur circulant sur la communauté").
- N'invente jamais de détails précis (dates, prix, contenu) présentés comme officiels si tu n'es pas sûr : dis que ce n'est pas encore confirmé.
- Reste concis, chaleureux, et parle comme un passionné de la communauté, pas comme un robot corporate.
- Tu n'es pas affilié à Rockstar Games ni Take-Two Interactive.`;

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(500, { error: "Clé API non configurée côté serveur. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Netlify." });
  }

  const ip = (event.headers['x-nf-client-connection-ip'] || event.headers['client-ip'] || 'unknown');
  try {
    const supabase = adminClient();
    const allowed = await checkRateLimit(supabase, `aichat:${ip}`, 15, 60);
    if (!allowed) return json(429, { error: 'Trop de requêtes, réessaie dans une minute.' });
  } catch (e) { /* if Supabase isn't configured yet, fail open so the assistant still works */ }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { error: 'Corps de requête invalide' });
  }

  const { messages } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json(400, { error: 'Aucun message fourni' });
  }

  const trimmed = messages.slice(-16).map((m) => ({
    role: m.role === 'assistant' ? 'assistant' : 'user',
    content: String(m.content || '').slice(0, 4000)
  }));

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || 'claude-sonnet-4-5-20250929',
        max_tokens: 700,
        system: SYSTEM_PROMPT,
        messages: trimmed
      })
    });

    const data = await resp.json();
    if (!resp.ok) {
      return json(resp.status, { error: data?.error?.message || 'Erreur API IA' });
    }
    const text = (data.content || []).map((b) => b.text || '').join('\n').trim();
    return json(200, { reply: text || "Je n'ai pas pu générer de réponse, réessaie." });
  } catch (err) {
    return json(500, { error: 'Erreur serveur IA: ' + err.message });
  }
};
