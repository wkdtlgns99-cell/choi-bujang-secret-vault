const form = document.querySelector('#login-form');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const status = document.querySelector('#auth-status');
const message = document.querySelector('#auth-message');
const passwordInput = document.querySelector('#login-password');
let busy = false;
let signedIn = false;
const list = document.querySelector('#notes');
let lastToken;
let notesRequest;
let notesVersion = 0;
function showNoteMessage(text) {
  const item = document.createElement('li');
  item.textContent = text;
  list.replaceChildren(item);
}
async function refreshNotes(session) {
  const token = session?.access_token;
  if (token === lastToken && token) return;
  lastToken = token;
  const version = ++notesVersion;
  notesRequest?.abort();
  if (!token) { showNoteMessage('로그인하면 자료를 볼 수 있습니다.'); return; }
  notesRequest = new AbortController();
  showNoteMessage('자료를 불러오는 중입니다.');
  try {
    const response = await fetch('/api/notes', {
      cache: 'no-store', headers: { Authorization: 'Bearer ' + token }, signal: notesRequest.signal,
    });
    if (version !== notesVersion) return;
    if (response.status === 401) throw new Error('로그인 인증이 만료되었거나 유효하지 않습니다. 다시 로그인해 주세요.');
    if (!response.ok) throw new Error('자료를 읽을 수 없습니다. 잠시 후 다시 시도해 주세요.');
    const data = await response.json();
    if (version !== notesVersion) return;
    if (!Array.isArray(data.notes)) throw new Error('자료 형식이 맞지 않습니다.');
    list.replaceChildren(...data.notes.map(note => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const content = document.createElement('span');
      title.textContent = note.title; content.textContent = note.content;
      item.append(title, content); return item;
    }));
  } catch (error) {
    if (version !== notesVersion || error.name === 'AbortError') return;
    lastToken = undefined;
    showNoteMessage(error.message);
  }
}
function render(session) {
  signedIn = Boolean(session?.user);
  form.hidden = signedIn;
  logoutButton.hidden = !signedIn;
  status.textContent = signedIn ? '로그인됨: ' + (session.user.email || '사용자') : '로그아웃 상태입니다.';
  loginButton.disabled = busy;
  logoutButton.disabled = busy;
  void refreshNotes(session);
}
function showFailure(error) {
  const reasons = {
    invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
    email_not_confirmed: '이메일 인증을 완료한 뒤 로그인해 주세요.',
    user_banned: '로그인이 제한된 계정입니다.',
    over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  };
  message.textContent = reasons[error?.code] || error?.message || '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.';
}
try {
  if (!window.supabase?.createClient) throw new Error('로그인 도구를 불러오지 못했습니다. 새로고침해 주세요.');
  const client = window.supabase.createClient(
    'https://yptfuysalmiaimmlvfrk.supabase.co',
    'sb_publishable_lktCZ9Bi1uh8jGnpYQ5qdA_FC8wBG-t',
    { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false } },
  );
  client.auth.onAuthStateChange((_event, session) => {
    render(session);
    passwordInput.value = '';
    message.textContent = '';
  });
  const { data, error } = await client.auth.getSession();
  if (error) throw error;
  render(data.session);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (busy) return;
    busy = true; loginButton.disabled = true; message.textContent = '';
    const password = passwordInput.value;
    passwordInput.value = '';
    try {
      const { data, error } = await client.auth.signInWithPassword({
        email: document.querySelector('#login-email').value.trim(), password,
      });
      if (error) showFailure(error); else render(data.session);
    } catch (error) { showFailure(error); }
    finally { busy = false; loginButton.disabled = false; logoutButton.disabled = false; }
  });
  logoutButton.addEventListener('click', async () => {
    if (busy) return;
    busy = true; logoutButton.disabled = true; message.textContent = '';
    try {
      const { error } = await client.auth.signOut({ scope: 'local' });
      if (error) showFailure(error); else render(null);
    } catch (error) { showFailure(error); }
    finally { busy = false; loginButton.disabled = false; logoutButton.disabled = false; }
  });
} catch (error) {
  status.textContent = '로그인을 사용할 수 없습니다.';
  showFailure(error);
  loginButton.disabled = true;
}
