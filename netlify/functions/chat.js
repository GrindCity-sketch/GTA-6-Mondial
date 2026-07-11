const { json, options } = require('./_store');
const { adminClient, getPlayerFromToken, checkRateLimit, looksLikeSpam } = require('./_supabase');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();

  let supabase;
  try {
    supabase = adminClient();
  } catch (e) {
    return json(500, { error: 'Supabase non configuré côté serveur.' });
  }

  if (event.httpMethod === 'GET') {
    const room = (event.queryStringParameters && event.queryStringParameters.room) || 'global';
    const { data, error } = await supabase
      .from('chat_messages')
      .select('id, room, username, country, content, created_at')
      .eq('room', room)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) return json(500, { error: 'Erreur de lecture du chat' });
    return json(200, { messages: (data || []).slice().reverse() });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Corps de requête invalide' });
    }

    const player = await getPlayerFromToken(supabase, body.token);
    if (!player) return json(401, { error: 'Non authentifié' });

    const room = String(body.room || 'global').slice(0, 40);
    const content = String(body.text || '').trim();
    if (!content) return json(400, { error: 'Message vide' });
    if (content.length > 500) return json(400, { error: 'Message trop long (500 caractères max)' });
    if (looksLikeSpam(content)) return json(400, { error: 'Message bloqué (détecté comme spam)' });

    const allowed = await checkRateLimit(supabase, `chat:${player.id}`, 6, 10);
    if (!allowed) return json(429, { error: 'Trop de messages, ralentis un peu.' });

    const { error: insertErr } = await supabase.from('chat_messages').insert({
      room,
      username: player.username,
      country: player.region || '??',
      content,
      player_id: player.id
    });
    if (insertErr) return json(500, { error: "Erreur d'envoi du message" });

    return json(200, { ok: true });
  }

  return json(405, { error: 'Method not allowed' });
};
