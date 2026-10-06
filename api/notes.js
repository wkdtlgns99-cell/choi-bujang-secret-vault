import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) return res.status(503).json({ error: '자료 서버 설정을 확인해 주세요.' });
  try {
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(8000) }) },
    });
    const { data, error } = await client.from('learning_notes')
      .select('id,title,content').order('id').limit(4);
    if (error || !Array.isArray(data)) throw new Error('read_failed');
    return res.status(200).json({ notes: data.map(({ title, content }) => ({ title, content })) });
  } catch {
    return res.status(503).json({ error: '자료를 불러올 수 없습니다.' });
  }
}
