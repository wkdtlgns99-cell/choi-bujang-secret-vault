export async function runAttackChecks(config) {
  if (config.step === 1) {
    const response = await fetch(new URL('/data.json', config.publicAppUrl), { redirect: 'error', signal: AbortSignal.timeout(10000) });
    let visible = false;
    try { const data = await response.json(); visible = data.sampleMarker === config.sampleMarker && data.notes?.length > 0; } catch {}
    return [{ attackId: 'anonymous_note_read', expected: '비로그인 화면에서 가상 메모를 확인', observed: visible ? '비로그인 요청에서 공개 가상 메모 확인 표시가 보임' : '비로그인 요청에서 확인 표시가 보이지 않음' }];
  }
  const checks = [
    ['static_notes', '/data.json', '404 또는 메모 0건'],
    ['public_api', '/api/notes', '인증 없이 가상 메모 네 건: 2단계의 남은 약점'],
    ['deployment_identity', '/aleph.json', '현재 저장점의 배포 식별 파일'],
    ['security_header', '/', 'X-Content-Type-Options: nosniff'],
  ];
  let app;
  try { app = new URL(config.publicAppUrl); if (app.protocol !== 'https:' || app.hostname.endsWith('.example')) app = null; } catch {}
  const results = [];
  for (const [attackId, path, expected] of checks) {
    let observed = '미실행: 실제 배포 주소가 확인되지 않음';
    if (app) {
      try {
        const response = await fetch(new URL(path, app), { redirect: 'error', signal: AbortSignal.timeout(10000) });
        if (attackId === 'security_header') observed = 'HTTP ' + response.status + '; nosniff=' + (response.headers.get('x-content-type-options') === 'nosniff');
        else if (attackId === 'deployment_identity') {
          const data = await response.json(); observed = 'HTTP ' + response.status + '; 단계=' + data.step + '; 저장점 일치=' + (data.commit === config.checkCommit);
        } else {
          let data; try { data = await response.json(); } catch {}
          observed = 'HTTP ' + response.status + '; 메모 수=' + (Array.isArray(data?.notes) ? data.notes.length : '확인 불가');
        }
      } catch { observed = '요청 시도 실패: 배포 결과 확인 불가'; }
    }
    results.push({ attackId, expected, observed });
  }
  return results;
}
