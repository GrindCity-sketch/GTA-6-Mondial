const { json, options } = require('./_store');
const { adminClient, getPlayerFromToken, checkRateLimit } = require('./_supabase');

const LANG_NAMES = {
  fr: 'français', en: 'English', es: 'español', pt: 'português', de: 'Deutsch',
  it: 'italiano', ru: 'русский', ar: 'العربية', zh: '中文简体', ja: '日本語', ko: '한국어', hi: 'हिन्दी'
};

function buildSystemPrompt(langName) {
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

async function generateQuestions(lang) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("Clé API IA non configurée côté serveur.");
  const langName = LANG_NAMES[lang] || LANG_NAMES.fr;
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
  if (!resp.ok) throw new Error((data && data.error && data.error.message) || 'Erreur API IA');
  const text = (data.content || []).map((b) => b.text || '').join('\n').trim();
  const match = text.match(/\{[\s\S]*\}/);
  const parsed = JSON.parse(match ? match[0] : text);
  if (!parsed.questions || !Array.isArray(parsed.questions) || parsed.questions.length === 0) {
    throw new Error('Quiz vide généré, réessaye.');
  }
  return parsed.questions.slice(0, 5).map((q) => ({
    question: String(q.question || '').slice(0, 300),
    choices: Array.isArray(q.choices) ? q.choices.slice(0, 4).map((c) => String(c).slice(0, 150)) : [],
    answerIndex: Number.isInteger(q.answerIndex) ? q.answerIndex : 0,
    note: String(q.note || 'culture générale').slice(0, 40)
  }));
}

function publicQuestions(questions) {
  return questions.map(({ question, choices, note }) => ({ question, choices, note }));
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return options();
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  let supabase;
  try {
    supabase = adminClient();
  } catch (e) {
    return json(500, { error: 'Supabase non configuré côté serveur.' });
  }

  let body = {};
  try { body = JSON.parse(event.body || '{}'); } catch {}
  const action = body.action || 'start';
  const player = await getPlayerFromToken(supabase, body.token);

  if (action === 'start') {
    const lang = typeof body.lang === 'string' ? body.lang : 'fr';

    if (player) {
      const allowed = await checkRateLimit(supabase, `quizstart:${player.id}`, 10, 60);
      if (!allowed) return json(429, { error: 'Trop de quiz lancés, réessaie dans un instant.' });
    }

    let questions;
    try {
      questions = await generateQuestions(lang);
    } catch (e) {
      return json(500, { error: e.message || 'Erreur de génération du quiz' });
    }

    const { data: session, error: insertErr } = await supabase
      .from('quiz_sessions')
      .insert({ lang, questions, player_id: player ? player.id : null, submitted: false })
      .select('id')
      .single();
    if (insertErr || !session) return json(500, { error: 'Erreur de création de la session de quiz' });

    return json(200, { sessionId: session.id, questions: publicQuestions(questions) });
  }

  if (action === 'check') {
    const { sessionId, index, choice } = body;
    if (!sessionId || !Number.isInteger(index) || !Number.isInteger(choice)) {
      return json(400, { error: 'Paramètres invalides' });
    }
    const { data: session } = await supabase.from('quiz_sessions').select('questions').eq('id', sessionId).maybeSingle();
    if (!session || !session.questions || !session.questions[index]) return json(404, { error: 'Session introuvable' });
    const q = session.questions[index];
    return json(200, { correct: choice === q.answerIndex, correctIndex: q.answerIndex });
  }

  if (action === 'submit') {
    const { sessionId, answers, time } = body;
    if (!sessionId || !Array.isArray(answers)) return json(400, { error: 'Paramètres invalides' });

    const { data: session } = await supabase.from('quiz_sessions').select('*').eq('id', sessionId).maybeSingle();
    if (!session) return json(404, { error: 'Session introuvable' });
    if (session.submitted) return json(409, { error: 'Ce quiz a déjà été soumis.' });

    const questions = session.questions || [];
    let correctCount = 0;
    questions.forEach((q, i) => { if (answers[i] === q.answerIndex) correctCount++; });
    const points = correctCount * 15;
    const elapsed = Number.isFinite(Number(time)) ? Math.max(0, Math.min(3600, Number(time))) : null;
    const minPlausible = questions.length * 1.5;
    const validTime = elapsed !== null && elapsed >= minPlausible ? elapsed : null;

    await supabase.from('quiz_sessions').update({ submitted: true }).eq('id', sessionId);

    let updatedPlayer = null;
    if (session.player_id) {
      const allowed = await checkRateLimit(supabase, `quizsubmit:${session.player_id}`, 20, 60);
      if (!allowed) return json(429, { error: 'Trop de soumissions, réessaie dans un instant.' });

      const { data: p } = await supabase.from('players').select('hustle_score, quizzes_taken, best_quiz_time').eq('id', session.player_id).maybeSingle();
      if (p) {
        const newScore = (p.hustle_score || 0) + points;
        const newBest = validTime !== null && correctCount === questions.length
          ? (p.best_quiz_time ? Math.min(p.best_quiz_time, validTime) : validTime)
          : p.best_quiz_time;
        const { data: updated } = await supabase
          .from('players')
          .update({ hustle_score: newScore, quizzes_taken: (p.quizzes_taken || 0) + 1, best_quiz_time: newBest })
          .eq('id', session.player_id)
          .select('hustle_score, quizzes_taken, best_quiz_time')
          .single();
        updatedPlayer = updated;
      }
    }

    return json(200, { correctCount, total: questions.length, points, player: updatedPlayer });
  }

  return json(400, { error: 'Action inconnue' });
};
