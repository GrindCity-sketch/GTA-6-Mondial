const { createClient } = require('@supabase/supabase-js');

function adminClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('Supabase server credentials missing (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)');
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

async function getPlayerFromToken(supabase, token) {
  if (!token || typeof token !== 'string') return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data || !data.user) return null;
  const { data: player, error: pErr } = await supabase
    .from('players')
    .select('id, username, region, hustle_score, quizzes_taken, best_quiz_time, is_banned')
    .eq('auth_user_id', data.user.id)
    .maybeSingle();
  if (pErr || !player || player.is_banned) return null;
  return player;
}

async function checkRateLimit(supabase, key, maxCount, windowSeconds) {
  const now = new Date();
  const { data: row } = await supabase.from('rate_limits').select('*').eq('key', key).maybeSingle();
  if (!row) {
    await supabase.from('rate_limits').insert({ key, window_start: now.toISOString(), count: 1 });
    return true;
  }
  const elapsedMs = now.getTime() - new Date(row.window_start).getTime();
  if (elapsedMs > windowSeconds * 1000) {
    await supabase.from('rate_limits').update({ window_start: now.toISOString(), count: 1 }).eq('key', key);
    return true;
  }
  if (row.count >= maxCount) return false;
  await supabase.from('rate_limits').update({ count: row.count + 1 }).eq('key', key);
  return true;
}

function looksLikeSpam(text) {
  const t = String(text || '').trim();
  if (!t) return true;
  if (t.length > 500) return true;
  const urlMatches = t.match(/https?:\/\//gi) || [];
  if (urlMatches.length > 2) return true;
  if (/(.)\1{9,}/.test(t)) return true;
  const letters = t.replace(/[^a-zA-Z]/g, '');
  if (letters.length > 12) {
    const upper = letters.replace(/[^A-Z]/g, '');
    if (upper.length / letters.length > 0.85) return true;
  }
  return false;
}

module.exports = { adminClient, getPlayerFromToken, checkRateLimit, looksLikeSpam };
