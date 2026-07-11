const crypto = require('crypto');
const { store, json, options } = require('./_store');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  const gallery = store('gallery');

  if (event.httpMethod === 'GET') {
    const { blobs } = await gallery.list();
    const items = await Promise.all(blobs.map((b) => gallery.get(b.key, { type: 'json' })));
    const sorted = items.filter(Boolean).filter((it) => (it.reports || 0) < 3).sort((a, b) => b.ts - a.ts).slice(0, 150);
    return json(200, { items: sorted });
  }

  if (event.httpMethod === 'POST') {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return json(400, { error: 'Corps de requête invalide' });
    }
    const { action, pseudo, token, imageUrl, category, caption, id } = body;

    const users = store('users');
    const user = await users.get((pseudo || '').toLowerCase(), { type: 'json' });
    if (!user || user.token !== token) return json(401, { error: 'Non autorisé' });

    if (action === 'like') {
      const item = await gallery.get(id, { type: 'json' });
      if (!item) return json(404, { error: 'Introuvable' });
      item.likes = item.likes || [];
      const already = item.likes.includes(pseudo);
      item.likes = already ? item.likes.filter((p) => p !== pseudo) : [...item.likes, pseudo];
      await gallery.set(id, JSON.stringify(item));
      return json(200, { likes: item.likes.length, liked: !already });
    }

    if (action === 'report') {
      const item = await gallery.get(id, { type: 'json' });
      if (!item) return json(404, { error: 'Introuvable' });
      item.reportedBy = item.reportedBy || [];
      if (!item.reportedBy.includes(pseudo)) {
        item.reportedBy.push(pseudo);
        item.reports = item.reportedBy.length;
        await gallery.set(id, JSON.stringify(item));
      }
      return json(200, { reports: item.reports || 0 });
    }

    let validImage = false;
    try {
      const u = new URL(imageUrl);
      validImage = u.protocol === 'https:' && /\.(jpe?g|png|gif|webp|avif)$/i.test(u.pathname);
    } catch {}
    if (!validImage) return json(400, { error: "L'URL doit être une image en https (jpg, png, gif, webp, avif)" });
    if (!['tenue', 'vehicule'].includes(category)) return json(400, { error: 'Catégorie invalide' });

    const itemId = crypto.randomBytes(8).toString('hex');
    const item = {
      id: itemId,
      pseudo,
      imageUrl,
      category,
      caption: (caption || '').slice(0, 200),
      likes: [],
      ts: Date.now()
    };
    await gallery.set(itemId, JSON.stringify(item));
    return json(200, { item });
  }

  return json(405, { error: 'Method not allowed' });
};
