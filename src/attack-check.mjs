export async function runAttackChecks(config) {
  if (config.step === 1) {
    const response = await fetch(new URL('/data.json', config.publicAppUrl), { redirect: 'error', signal: AbortSignal.timeout(10000) });
    let visible = false;
    try { const data = await response.json(); visible = data.sampleMarker === config.sampleMarker && data.notes?.length > 0; } catch {}
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인', observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : '비로그인 요청에서 확인 표시가 보이지 않음' }];
  }
  const checks = [
    ['static_notes', '/data.json', '404 또는 메모 0건'],
    ['public_api', '/api/notes', config.step >= 3 ? '토큰 없는 요청 HTTP 401·자료 없음' : '인증 없이 가상 메모 네 건: 2단계의 남은 약점'],
    ...(config.step >= 3 ? [
      ['anonymous_create', '/api/notes', '무로그인 추가 HTTP 401·JSON 오류·자료 없음', 'POST'],
      ['anonymous_get_one', '/api/notes/11111111-1111-4111-8111-111111111111', '무로그인 한 건 조회 HTTP 401·JSON 오류·자료 없음'],
      ['anonymous_update', '/api/notes/11111111-1111-4111-8111-111111111111', '무로그인 수정 HTTP 401·JSON 오류·자료 없음', 'PUT'],
      ['anonymous_delete', '/api/notes/11111111-1111-4111-8111-111111111111', '무로그인 삭제 HTTP 401·JSON 오류·자료 없음', 'DELETE'],
      ['invalid_token', '/api/notes', '잘못된 토큰 HTTP 401·JSON 오류·자료 없음', 'GET', true],
    ] : []),
    ...(config.step >= 4 ? [['anon_data_api', (config.originalApiUrl || 'https://yptfuysalmiaimmlvfrk.supabase.co/rest/v1/learning_notes') + '?select=id&limit=1', '공개 키만 사용한 직접 Data API 읽기 거부·자료 없음']] : []),
    ['deployment_identity', '/aleph.json', '현재 저장점의 배포 식별 파일'],
    ['security_header', '/', 'X-Content-Type-Options: nosniff'],
  ];
  let app;
  try { app = new URL(config.publicAppUrl); if (app.protocol !== 'https:' || app.hostname.endsWith('.example')) app = null; } catch {}
  const results = [];
  for (const [attackId, path, expected, method = 'GET', invalidToken = false] of checks) {
    let observed = '미실행: 실제 배포 주소가 확인되지 않음';
    if (app) {
      try {
        const response = await fetch(new URL(path, app), { redirect: 'error', signal: AbortSignal.timeout(10000), method,
          headers: { ...(attackId === 'anon_data_api' ? { apikey: 'sb_publishable_lktCZ9Bi1uh8jGnpYQ5qdA_FC8wBG-t' } : {}), ...(invalidToken ? { Authorization: 'Bearer invalid' } : {}), ...(['POST', 'PUT'].includes(method) ? { 'Content-Type': 'application/json' } : {}) },
          ...(['POST', 'PUT'].includes(method) ? { body: JSON.stringify({ title: 'sample', body: 'fictional' }) } : {}),
        });
        if (attackId === 'security_header') observed = 'HTTP ' + response.status + '; nosniff=' + (response.headers.get('x-content-type-options') === 'nosniff');
        else if (attackId === 'deployment_identity') {
          const data = await response.json(); observed = 'HTTP ' + response.status + '; 단계=' + data.step + '; 저장점 일치=' + (data.commit === config.checkCommit) + '; 허용 경로 수=' + (Array.isArray(data.allowedRoutes) ? data.allowedRoutes.length : 0);
        } else {
          let data; try { data = await response.json(); } catch {}
          if (attackId === 'anon_data_api') observed = 'HTTP ' + response.status + '; JSON 오류=' + (typeof data?.message === 'string' || typeof data?.error === 'string') + '; 행 배열 없음=' + (data != null && !Array.isArray(data));
          else if (attackId === 'static_notes') observed = 'HTTP ' + response.status + '; 메모 수=' + (Array.isArray(data?.notes) ? data.notes.length : '확인 불가');
          else if (config.step >= 3) observed = 'HTTP ' + response.status + '; JSON 오류=' + (typeof data?.error === 'string') + '; 자료 없음=' + (data != null && !Array.isArray(data) && !('notes' in data) && !('body' in data));
          else observed = 'HTTP ' + response.status + '; 메모 수=' + (Array.isArray(data?.notes) ? data.notes.length : '확인 불가');
        }
      } catch { observed = '요청 시도 실패: 배포 결과 확인 불가'; }
    }
    results.push({ attackId, expected, observed });
  }
  return results;
}
