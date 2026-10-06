import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { createLoginVerifier } from '../src/verify-login.mjs';
import config from '../aleph.config.json' with { type: 'json' };

let verifier;
export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  const pathname = new URL(req.url || '/api/notes', 'https://local.invalid').pathname;
  const match = /^\/api\/notes\/([^/]+)\/?$/.exec(pathname);
  const id = match?.[1];
  const allowed = id ? ['GET', 'PUT', 'DELETE'] : ['GET', 'POST'];
  if (!allowed.includes(req.method)) {
    res.setHeader('Allow', allowed.join(', '));
    return res.status(405).json({ error: '지원하지 않는 요청 방식입니다.' });
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
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (id && !uuid.test(id)) return res.status(400).json({ error: '메모 ID는 UUID여야 합니다.' });
    if (req.method === 'POST' || req.method === 'PUT') {
      const input = req.body;
      if (!input || typeof input !== 'object' || Array.isArray(input)
          || typeof input.title !== 'string' || !input.title.trim() || input.title.length > 200
          || typeof input.body !== 'string' || !input.body.trim() || input.body.length > 10000
          || (req.method === 'POST' && input.id !== undefined && (typeof input.id !== 'string' || !uuid.test(input.id)))) {
        return res.status(400).json({ error: '제목(1~200자), 본문(1~10000자), UUID를 확인해 주세요.' });
      }
      if (req.method === 'POST') {
        const noteId = input.id ?? randomUUID();
        const { error } = await client.from('learning_notes').insert({
          id: noteId, title: input.title.trim(), body: input.body, owner_id: identity.userId,
        });
        if (error?.code === '23505') return res.status(409).json({ error: '이미 사용 중인 메모 ID입니다.' });
        if (error) throw new Error('write_failed');
        return res.status(201).json({ id: noteId });
      }
      // Ownership enforcement is intentionally deferred to stage 4.
      const { data, error } = await client.from('learning_notes').update({ title: input.title.trim(), body: input.body })
        .eq('id', id).select('id,title,body').maybeSingle();
      if (error) throw new Error('write_failed');
      if (!data) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { data, error } = await client.from('learning_notes').delete().eq('id', id).select('id').maybeSingle();
      if (error) throw new Error('delete_failed');
      if (!data) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      return res.status(204).end();
    }
    if (id) {
      const { data, error } = await client.from('learning_notes').select('id,title,body').eq('id', id).maybeSingle();
      if (error) throw new Error('read_failed');
      if (!data) return res.status(404).json({ error: '메모를 찾을 수 없습니다.' });
      return res.status(200).json(data);
    }
    const { data, error } = await client.from('learning_notes').select('id,title,body')
      .eq('owner_id', identity.userId).order('id');
    if (error || !Array.isArray(data)) throw new Error('read_failed');
    return res.status(200).json(data);
  } catch {
    return res.status(503).json({ error: '자료를 처리할 수 없습니다.' });
  }
}
