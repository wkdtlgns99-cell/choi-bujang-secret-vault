import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
const a='11111111-1111-4111-8111-111111111111';
const b='22222222-2222-4222-8222-222222222222';
mock.module('../src/verify-login.mjs', { namedExports: { createLoginVerifier: () => async header => header === 'Bearer test-a' ? {userId:a} : header === 'Bearer test-b' ? {userId:b} : null } });
const { default: handler } = await import('../api/notes.js');
const invoke=async (method,url,body,authorization) => {
 const res={headers:{}, setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(v){this.body=v;return this;},end(){return this;}};
 await handler({method,url,body,headers:{authorization}},res);return res;
};
test('CRUD contract, verified owner, own CRUD and cross-owner denial',async()=>{
 const previous=globalThis.fetch;
 const oldUrl=process.env.SUPABASE_URL,oldKey=process.env.SUPABASE_SECRET_KEY;
 process.env.SUPABASE_URL='https://yptfuysalmiaimmlvfrk.supabase.co';process.env.SUPABASE_SECRET_KEY='test-only-not-a-real-key';
 const rows=new Map();let reads=0;
 globalThis.fetch=async(input,init)=>{
   reads++;const url=new URL(input);const method=init.method || 'GET';
   const id=url.searchParams.get('id')?.replace('eq.','');
   const owner=url.searchParams.get('owner_id')?.replace('eq.','');
   const ownedRow=rows.get(id);
   const selected=ownedRow && (!owner || ownedRow.owner_id===owner) ? ownedRow : null;
   let data;
   if(method==='POST'){
     const row=JSON.parse(init.body);if(rows.has(row.id))return new Response(JSON.stringify({code:'23505'}),{status:409,headers:{'content-type':'application/json'}});
     rows.set(row.id,row);return new Response(null,{status:201});
   }
   if(method==='PATCH'){const row=selected;if(row)Object.assign(row,JSON.parse(init.body));data=row?{id:row.id,title:row.title,body:row.body}:null;}
   else if(method==='DELETE'){data=selected?{id}:null;if(selected)rows.delete(id);}
   else {const owner=url.searchParams.get('owner_id')?.replace('eq.','');data=[...rows.values()].filter(r=>(!id||r.id===id)&&(!owner||r.owner_id===owner)).map(({id,title,body})=>({id,title,body}));}
   return new Response(JSON.stringify(data),{headers:{'content-type':'application/json'}});
 };
 try {
   for(const [method,url] of [['GET','/api/notes'],['POST','/api/notes'],['GET','/api/notes/'+a],['PUT','/api/notes/'+a],['DELETE','/api/notes/'+a]]){
      const r=await invoke(method,url,{title:'sample',body:'fictional'});assert.equal(r.code,401);assert.ok(!('notes' in r.body));
   }
   assert.equal(reads,0);
   const created=await invoke('POST','/api/notes',{title:'sample',body:'fictional',owner_id:b,userId:b,role:'admin'},'Bearer test-a');
   assert.equal(created.code,201);assert.match(created.body.id,/^[0-9a-f-]{36}$/);assert.equal(rows.get(created.body.id).owner_id,a);
   const path='/api/notes/'+created.body.id;
   const one=await invoke('GET',path,undefined,'Bearer test-a');assert.deepEqual(one.body,{id:created.body.id,title:'sample',body:'fictional'});
   assert.equal((await invoke('GET','/api/notes',undefined,'Bearer test-a')).body.length,1);
   assert.deepEqual((await invoke('GET','/api/notes',undefined,'Bearer test-b')).body,[]);
   assert.equal((await invoke('GET',path+'?owner_id='+a,undefined,'Bearer test-b')).code,404);
   assert.equal((await invoke('PUT',path,{title:'changed',body:'fictional changed'},'Bearer test-b')).code,404);
   assert.equal((await invoke('DELETE',path,undefined,'Bearer test-b')).code,404);
   assert.equal(rows.get(created.body.id).title,'sample');
   assert.equal((await invoke('PUT',path,{title:'changed',body:'fictional changed',owner_id:b},'Bearer test-a')).code,400);
   assert.equal(rows.get(created.body.id).owner_id,a);
   const modified=await invoke('PUT',path,{title:'changed',body:'fictional changed'},'Bearer test-a');assert.equal(modified.code,200);
   assert.deepEqual(Object.keys(modified.body).sort(),['body','id','title']);
   assert.equal((await invoke('GET',path,undefined,'Bearer test-a')).body.title,'changed');
   const bCreated=await invoke('POST','/api/notes',{title:'B sample',body:'fictional'},'Bearer test-b');
   const bPath='/api/notes/'+bCreated.body.id;
   assert.equal(rows.get(bCreated.body.id).owner_id,b);
   assert.equal((await invoke('GET',bPath,undefined,'Bearer test-b')).code,200);
   assert.equal((await invoke('GET',bPath,undefined,'Bearer test-a')).code,404);
   assert.equal((await invoke('PUT',bPath,{title:'changed',body:'fictional'},'Bearer test-b')).code,200);
   assert.equal((await invoke('PUT',bPath,{title:'changed',body:'fictional'},'Bearer test-a')).code,404);
   assert.equal((await invoke('DELETE',bPath,undefined,'Bearer test-a')).code,404);
   assert.equal((await invoke('DELETE',bPath,undefined,'Bearer test-b')).code,204);
   assert.equal((await invoke('GET',bPath,undefined,'Bearer test-b')).code,404);
   assert.equal((await invoke('DELETE',path,undefined,'Bearer test-a')).code,204);
   assert.equal((await invoke('GET',path,undefined,'Bearer test-a')).code,404);
   assert.equal((await invoke('POST','/api/notes',{id:a,title:'sample',body:'fictional'},'Bearer test-a')).code,201);
   assert.equal((await invoke('POST','/api/notes',{id:a,title:'sample',body:'fictional'},'Bearer test-a')).code,409);
   assert.equal((await invoke('POST','/api/notes',{id:'wrong',title:'sample',body:'fictional'},'Bearer test-a')).code,400);
 } finally {
   globalThis.fetch=previous;
   for(const [key,value] of [['SUPABASE_URL',oldUrl],['SUPABASE_SECRET_KEY',oldKey]]){if(value===undefined)delete process.env[key];else process.env[key]=value;}
 }
});
