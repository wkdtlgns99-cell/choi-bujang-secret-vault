import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from '../src/verify-login.mjs';
import config from '../aleph.config.json' with { type: 'json' };

let verifier;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'GET 요청만 지원합니다.' });
  }
  const reject = () => {
    res.setHeader('WWW-Authenticate', 'Bearer');
    return res.status(401).json({ error: '유효한 로그인 인증이 필요합니다.' });
  };
  const authorization = req.headers?.authorization;
  if (typeof authorization !== 'string' || !authorization) return reject();
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key || url !== new URL(config.identityProvider.issuer).origin) {
    return res.status(503).json({ error: '자료 서버 설정을 확인해 주세요.' });
  }
  let identity;
  try {
    verifier ??= createLoginVerifier({ config, supabaseSecretKey: key });
    identity = await verifier(authorization);
  } catch {
    return res.status(503).json({ error: '로그인 확인 서버에 연결할 수 없습니다.' });
  }
  if (!identity) return reject();
  // Only the existing verifier supplies identity. Request userId/role are ignored.
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
