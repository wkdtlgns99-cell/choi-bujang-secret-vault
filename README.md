# BYTE BACK · 3단계 제작 2

현재 자료 API는 src/verify-login.mjs의 createLoginVerifier를 사용합니다. 이 도우미 파일은 수정하지 않았습니다. 토큰 없음·검증 실패는 HTTP 401이며 메모가 없는 오류 응답을 반환합니다. 요청의 userId·role은 신원 근거로 사용하지 않습니다. Supabase 공식 SDK로 얻은 access token을 Authorization 헤더로 보내며 로그아웃하면 화면 자료도 즉시 비웁니다.

identityProvider는 해당 Supabase 프로젝트의 issuer, authenticated audience, 공개 JWKS URL입니다. 심판 judgeIssuer와 기존 검증 경로를 보존했습니다. 로그인은 신원 확인이며 계정별 접근 제한은 아직 적용하지 않았습니다. 메모 추가·수정·삭제는 다음 제작 요청에서 구현합니다.

확인: npm run build -- --local. 새 시크릿 창에서 /api/notes를 열면 HTTP 401·자료 없음, 첫 화면은 로그인 안내여야 합니다. A 계정으로 직접 로그인하면 네 카드가 표시되고 로그아웃하면 사라져야 합니다. 실제 A 계정 로그인 검증은 비밀번호를 직접 입력한 후 확인해야 합니다.

아래는 이전 단계의 완료 기록입니다. 2단계의 공개 API 설명은 당시 상태이며 현재 상태가 아닙니다.

# BYTE BACK · 2단계 저장점

1단계 배포 저장점(010eb54)에서 자료를 서버 DB로 옮기는 코드를 구현했습니다. 실제 Vercel 배포는 확인했습니다. 학습 DB와 서버 환경변수 설정 후 실제 화면의 카드 네 건을 확인했습니다.

## 현재 기능과 실행

화면은 GET /api/notes에서 가상 메모 네 건을 읽습니다. 루트 및 public/data.json은 메모 0건입니다. 서버는 learning_notes에서 title·content만 반환하며 owner_id나 키를 반환하지 않습니다. 로그인은 아직 없고 자료 API는 공개 주소입니다. 3단계 전까지 가상 자료만 사용하세요.

1. 로컬 전용 local-only/02-learning-notes.sql을 Supabase SQL Editor에 붙여 Run을 누릅니다. 실제 원본은 세 건이 아니라 네 건이므로 네 건을 보존했습니다. SQL은 Git 및 제출 묶음에서 제외됩니다. 새 학습 테이블용이며 기존 테이블이 있으면 실행을 중단하므로 다른 데이터를 덮어쓰지 않습니다.
2. 마지막 확인 쿼리에서 owner_id가 uuid, relrowsecurity가 true인지 확인합니다. owner_id에는 auth.users 외래키가 없습니다. anon·authenticated·PUBLIC 권한을 회수하고 service_role에 SELECT만 부여합니다. 공개 역할 SELECT는 권한 오류로 거부되어야 합니다.
3. Vercel 프로젝트 Settings → Environment Variables에서 SUPABASE_URL과 SUPABASE_SECRET_KEY를 서버 환경변수로 직접 설정합니다. 키는 채팅, Git, 브라우저 파일에 넣지 않습니다. 설정 후 Redeploy를 누릅니다.
4. 로컬 정적 빌드 명령: npm run build -- --local. 배포 빌드 npm run build는 Vercel Git 메타데이터로 public/aleph.json을 자동 생성합니다. 이 파일을 지우지 않습니다.
5. 실제 배포의 Visit 주소를 aleph.config.json의 publicAppUrl에 기록한 뒤 저장점 커밋 및 npm run bundle을 실행합니다. judgeIssuer는 변경하지 않았습니다. identityProvider는 3단계 전이므로 null이며 허용 경로는 /api/notes입니다. 판정기는 기존 starter.deny 상태를 보존합니다.

## 확인 절차와 결과 기록

- SQL Editor에서 본문 문장을 검색어로 따로 복사해 보관합니다. 검색어 자체를 README·Git·제출 묶음에 기록하지 않습니다.
- 로컬 public 전체와 git grep HEAD에서 각 문장을 검색합니다. 매치가 0건이어야 합니다. GitHub Code에서 최신 커밋의 각 파일을 검색하고 Raw 파일도 확인합니다. SQL 로컬 파일 및 과거 커밋은 최신 공개 코드 검사에 포함하지 않습니다.
- 실제 배포의 첫 화면, 내려받은 JS·JSON 파일에서도 같은 문장을 검색합니다. API 응답으로 받은 메모와 정적 파일을 구분합니다. /data.json은 404 또는 notes 0건, /aleph.json은 200이고 현재 커밋·단계와 일치해야 합니다.
- 첫 화면 응답 헤더에 X-Content-Type-Options: nosniff가 있는지 브라우저 개발자 도구 Network에서 확인합니다.
- 정상 결과: SQL 및 서버 환경변수 설정 후 화면 카드 네 건. 거부 결과: 공개 Supabase 역할의 직접 자료 SELECT, 서버 API의 GET 이외 메서드(405). 환경변수 누락이나 DB 오류는 상세 오류·키 없이 503입니다.
- 로컬 최신 파일 문장 검색: 매치 0건 확인. 공개 data.json: notes 0건. GitHub 최신 파일에서 원문 0건. 실제 배포 /data.json HTTP 200·메모 0건, /aleph.json HTTP 200·2단계·배포 커밋 일치, 첫 화면 HTTP 200·nosniff 헤더 확인. DB SQL 실행 완료: 메모 4건, owner_id uuid, RLS true, anon/authenticated SELECT false, 외래키 0건. 서버 환경변수 설정·재배포 완료. 실제 화면 카드 4건 및 /api/notes HTTP 200·메모 4건 확인. GET 이외 API 요청은 405로 거부됩니다.
- 남은 약점: /api/notes는 인증 없이 호출할 수 있으므로 메모를 읽을 수 있습니다. DB RLS만으로 공개 서버 API의 접근 통제가 해결되지 않습니다.
- 이전 공개 커밋과 이전 배포는 삭제하지 않았습니다. 과거 노출이 해소됐다고 주장하지 않습니다. 이번 저장점이 배포되기 전에는 현재 공개 서비스도 바뀌지 않습니다.

## 제출

npm run bundle은 학생의 자기 점검이며 심판 판정이 아닙니다. 실제 배포 주소가 없으면 미실행으로 기록합니다. 제출 묶음은 artifacts/submission.json에 생성하며 본문·키·SQL은 포함하지 않습니다. 로컬 커밋은 GitHub 최신 파일 갱신이나 Vercel 배포 완료를 뜻하지 않습니다.
`node --test test/r5.test.mjs test/stage2.test.mjs` 5개 통과: 서버의 메서드 제한, 설정 실패, 응답 필드 제한, 오류의 키 비노출, 2단계 배포 식별 생성 확인. 실제 Supabase·Vercel 연결 시험은 아닙니다.

실제 연결 저장소: https://github.com/wkdtlgns99-cell/choi-bujang-secret-vault
실제 배포 주소: https://choi-bujang-secret-vault-woad.vercel.app

## 3단계 제작 1 · 로그인 화면

Supabase 공식 SDK의 signInWithPassword, onAuthStateChange, getSession, signOut으로 이메일·비밀번호 로그인과 현재 세션 로그아웃을 추가했습니다. 로그인하면 계정 상태와 로그아웃 버튼, 로그아웃하면 로그인 폼이 표시됩니다. 실패 이유는 화면에 표시합니다. 비밀번호를 별도로 저장하거나 JWT를 직접 만들지 않습니다. 세션 저장과 갱신은 SDK가 관리합니다. 브라우저에는 공개 Project URL 및 publishable key만 사용합니다.

실행: npm run build -- --local. 배포 화면에서 A 계정 이메일·비밀번호를 직접 입력해 로그인 → 로그인됨 표시 확인 → 로그아웃 → 로그인 폼 표시 확인. 잘못된 비밀번호는 실패 이유가 표시되어야 합니다. A 계정 실제 로그인·로그아웃 검증은 사용자가 직접 입력한 뒤 확인합니다.

이번 제작은 화면만 추가했습니다. 서버 인증 토큰 검증과 메모 추가·수정·삭제는 아직 구현하지 않았습니다. 기존 /api/notes는 계속 공개이며 설정 단계 값은 2단계 완료 상태를 유지합니다.
