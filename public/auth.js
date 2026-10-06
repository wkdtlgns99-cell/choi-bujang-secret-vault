const form = document.querySelector('#login-form');
const loginButton = document.querySelector('#login-button');
const logoutButton = document.querySelector('#logout-button');
const status = document.querySelector('#auth-status');
const message = document.querySelector('#auth-message');
const passwordInput = document.querySelector('#login-password');
let busy = false;
let signedIn = false;
let activeSession;
let editingId = null;
let saving = false;
const editor = document.querySelector('#note-editor');
const noteForm = document.querySelector('#note-form');
const noteTitle = document.querySelector('#note-title');
const noteBody = document.querySelector('#note-body');
const noteMessage = document.querySelector('#note-message');
const saveButton = document.querySelector('#note-save');
const cancelButton = document.querySelector('#note-cancel');
function resetEditor() {
  editingId = null; noteForm.reset(); cancelButton.hidden = true;
  saveButton.textContent = '추가'; document.querySelector('#note-editor-heading').textContent = '가상 메모 추가';
}
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
    if (!Array.isArray(data)) throw new Error('자료 형식이 맞지 않습니다.');
    if (data.length === 0) { showNoteMessage('내 메모가 없습니다. 가상 메모를 추가해 보세요.'); return; }
    list.replaceChildren(...data.map(note => {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      const content = document.createElement('span');
      title.textContent = note.title; content.textContent = note.body;
      const editButton = document.createElement('button'); editButton.textContent = '수정'; editButton.type = 'button';
      editButton.addEventListener('click', () => { if (saving) return; editingId = note.id; noteTitle.value = note.title; noteBody.value = note.body; cancelButton.hidden = false; saveButton.textContent = '수정 저장'; document.querySelector('#note-editor-heading').textContent = '가상 메모 수정'; noteTitle.focus(); });
      const deleteButton = document.createElement('button'); deleteButton.textContent = '삭제'; deleteButton.type = 'button';
      deleteButton.addEventListener('click', async () => {
        if (saving || !confirm('이 가상 메모를 삭제할까요?')) return;
        await mutateNote('/api/notes/' + encodeURIComponent(note.id), 'DELETE');
      });
      item.append(title, content, editButton, deleteButton); return item;
    }));
  } catch (error) {
    if (version !== notesVersion || error.name === 'AbortError') return;
    lastToken = undefined;
    showNoteMessage(error.message);
  }
}
async function mutateNote(path, method, payload) {
  if (saving || !activeSession?.access_token) return;
  const session = activeSession;
  saving = true; saveButton.disabled = true; cancelButton.disabled = true; noteMessage.textContent = '';
  try {
    const response = await fetch(path, { method, cache: 'no-store',
      headers: { Authorization: 'Bearer ' + session.access_token, ...(payload ? { 'Content-Type': 'application/json' } : {}) },
      ...(payload ? { body: JSON.stringify(payload) } : {}),
    });
    if (activeSession?.user?.id !== session.user.id) return;
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || '메모를 처리할 수 없습니다.'); }
    resetEditor(); noteMessage.textContent = method === 'DELETE' ? '삭제했습니다.' : '저장했습니다.';
    lastToken = undefined; await refreshNotes(activeSession);
  } catch (error) { if (activeSession?.user?.id === session.user.id) noteMessage.textContent = error.message; }
  finally { saving = false; saveButton.disabled = false; cancelButton.disabled = false; }
}
noteForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await mutateNote(editingId ? '/api/notes/' + encodeURIComponent(editingId) : '/api/notes', editingId ? 'PUT' : 'POST', { title: noteTitle.value, body: noteBody.value });
});
cancelButton.addEventListener('click', () => { resetEditor(); noteMessage.textContent = ''; });

function render(session) {
  activeSession = session;
  signedIn = Boolean(session?.user);
  editor.hidden = !signedIn;
  if (!signedIn) { resetEditor(); noteMessage.textContent = ''; }
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
