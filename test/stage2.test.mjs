import assert from 'node:assert/strict';
import { test } from 'node:test';
import handler from '../api/notes.js';
import { deploymentIdentity } from '../scripts/deployment-identity.mjs';
const response = () => ({ headers: {}, setHeader(k,v) { this.headers[k]=v; }, status(s) { this.code=s; return this; }, json(body) { this.body=body; return this; } });
test('server rejects methods and hides configuration failures', async () => {
  const res=response(); await handler({method:'POST'},res); assert.equal(res.code,405);
  const old=process.env.SUPABASE_SECRET_KEY;
  delete process.env.SUPABASE_SECRET_KEY;
  try { const missing=response(); await handler({method:'GET'},missing); assert.equal(missing.code,503); assert.deepEqual(Object.keys(missing.body),['error']); }
  finally { if(old !== undefined) process.env.SUPABASE_SECRET_KEY=old; }
});
test('server projects safe fields and suppresses upstream secret errors', async () => {
  const oldFetch=globalThis.fetch;
  const oldUrl=process.env.SUPABASE_URL, oldKey=process.env.SUPABASE_SECRET_KEY;
  process.env.SUPABASE_URL='https://example.supabase.co'; process.env.SUPABASE_SECRET_KEY='test-only-not-a-real-key';
  try {
    globalThis.fetch=async () => new Response(JSON.stringify([{id:1,title:'sample',content:'fictional',owner_id:'hidden'}]), {headers:{'content-type':'application/json'}});
    const res=response(); await handler({method:'GET'},res);
    assert.equal(res.code,200); assert.deepEqual(res.body,{notes:[{title:'sample',content:'fictional'}]}); assert.equal(res.headers['Cache-Control'],'no-store');
    globalThis.fetch=async () => new Response(JSON.stringify({message:process.env.SUPABASE_SECRET_KEY}),{status:403,headers:{'content-type':'application/json'}});
    const error=response(); await handler({method:'GET'},error); assert.equal(error.code,503); assert.ok(!JSON.stringify(error.body).includes(process.env.SUPABASE_SECRET_KEY));
  } finally { globalThis.fetch=oldFetch; for(const [key,value] of [['SUPABASE_URL',oldUrl],['SUPABASE_SECRET_KEY',oldKey]]) { if(value === undefined) delete process.env[key]; else process.env[key]=value; } }
});
test('stage two retains deployment identity generation', () => {
  const result=deploymentIdentity({VERCEL_GIT_PROVIDER:'github',VERCEL_GIT_REPO_OWNER:'Student',VERCEL_GIT_REPO_SLUG:'vault',VERCEL_GIT_COMMIT_SHA:'a'.repeat(40),VERCEL_URL:'vault.vercel.app'}, {step:2,judgeIssuer:'https://aleph-judge-production.up.railway.app/defense/judge',sampleMarker:'SAMPLE_NOTE_1'});
  assert.equal(result.step,2); assert.equal(result.commit,'a'.repeat(40));
});
