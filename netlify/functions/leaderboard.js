cconst { store, json, options } = require('./_store');

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return options();
    const users = store('users');

    if (event.httpMethod === 'GET') {
          const { blobs } = await users.list();
          const all = await Promise.all(
                  blobs.map(async (b) => {
                            const u = await users.get(b.key, { type: 'json' });
                            if (!u) return null;
                            return { pseudo: u.pseudo, score: u.score || 0, country: u.country || '??', quizzesTaken: u.quizzesTaken || 0, bestTime: u.bestTime || null };
                  })
                );
          const ranked = all.filter(Boolean).sort((a, b) => b.score - a.score).slice(0, 100);
          return json(200, { leaderboard: ranked });
    }

    if (event.httpMethod === 'POST') {
          let body;
          try {
                  body = JSON.parse(event.body || '{}');
          } catch {
                  return json(400, { error: 'Corps de requête invalide' });
          }
          const { pseudo, token, points, time } = body;
          if (!pseudo || !token || typeof points !== 'number') return json(400, { error: 'Paramètres manquants' });

      const key = pseudo.toLowerCase();
          const user = await users.get(key, { type: 'json' });
          if (!user || user.token !== token) return json(401, { error: 'Non autorisé' });

      user.score = (user.score || 0) + Math.max(0, Math.min(points, 1000));
          user.quizzesTaken = (user.quizzesTaken || 0) + 1;
          if (typeof time === 'number' && time > 0) {
                  user.bestTime = user.bestTime ? Math.min(user.bestTime, time) : time;
          }
          await users.set(key, JSON.stringify(user));
          return json(200, { score: user.score, bestTime: user.bestTime || null });
    }

    return json(405, { error: 'Méthode non autorisée' });
};
