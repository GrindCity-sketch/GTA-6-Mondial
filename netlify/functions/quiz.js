const { json, options } = require('./_store');

const LANG_NAMES = {
    fr: 'français', en: 'English', es: 'español', pt: 'português', de: 'Deutsch',
    it: 'italiano', ru: 'русский', ar: 'العربية', zh: '中文简体', ja: '日本語', ko: '한국어', hi: 'हिन्दी'
};

function buildSystemPrompt(langName){
    return `Tu generes des quiz pour GTA6 Hub, une application communautaire de fans dediee a GTA 6.
    Regles strictes :
    - Genere exactement 5 questions de quiz variees sur GTA 6 (annonces officielles connues, trailers Rockstar, lore de Vice City, mecaniques de jeu Rockstar en general) ou sur la culture GTA au sens large.
    - Ecris TOUTES les questions, choix et notes en ${langName}, uniquement dans cette langue.
    - Ne presente jamais une rumeur ou une speculation comme un fait confirme. Si une question porte sur un sujet non confirme officiellement, formule-la comme une rumeur de communaute et indique-le dans le champ note.
    - Chaque question a exactement 4 choix, un seul etant correct.
    - Varie les questions et leur ordre a chaque generation, ne repete jamais le meme quiz.
    - Reponds UNIQUEMENT avec un JSON valide, sans texte autour, au format exact :
    {"questions":[{"question":"...","choices":["...","...","...","..."],"answerIndex":0,"note":"officiel ou rumeur ou culture generale"}]}`;
}

exports.handler = async (event) => {
    if (event.httpMethod === 'OPTIONS') return options();
    if (event.httpMethod !== 'GET' && event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
          return json(500, { error: "Cle API non configuree cote serveur. Ajoute ANTHROPIC_API_KEY dans les variables d'environnement Netlify." });
    }

    let body = {};
    try { body = JSON.parse(event.body || '{}'); } catch {}
    const lang = typeof body.lang === 'string' ? body.lang : 'fr';
    const langName = LANG_NAMES[lang] || LANG_NAMES.fr;

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
                            max_tokens: 1200,
                            system: buildSystemPrompt(langName),
                            messages: [{ role: 'user', content: `Genere un nouveau quiz de 5 questions, aleatoire et different de tous les quiz precedents, entierement en ${langName}.` }]
                  })
          });

      const data = await resp.json();
          if (!resp.ok) {
                  return json(resp.status, { error: (data && data.error && data.error.message) || 'Erreur API IA' });
          }

      const text = (data.content || []).map((b) => b.text || '').join('\n').trim();

      let parsed;
          try {
                  const match = text.match(/\{[\s\S]*\}/);
                  parsed = JSON.parse(match ? match[0] : text);
          } catch (e) {
                  return json(500, { error: 'Reponse IA invalide, reessaye.' });
          }

      if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
              return json(500, { error: 'Quiz vide genere, reessaye.' });
      }

      const safe = parsed.questions.slice(0, 5).map((q) => ({
              question: String(q.question || '').slice(0, 300),
              choices: Array.isArray(q.choices) ? q.choices.slice(0, 4).map((c) => String(c).slice(0, 150)) : [],
              answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0,
              note: String(q.note || 'culture generale').slice(0, 40)
      }));

      return json(200, { questions: safe });
    } catch (err) {
          return json(500, { error: 'Erreur serveur quiz : ' + err.message });
    }
};
