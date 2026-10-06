# BYTE BACK · 3단계 저장점

Supabase 공식 SDK로 이메일·비밀번호 로그인과 현재 세션 로그아웃을 붙였습니다. 서버는 기존 src/verify-login.mjs의 createLoginVerifier로 토큰을 검사하며 이 도우미는 수정하지 않았습니다. 토큰이 없거나 검증에 실패하면 자료 없이 HTTP 401 JSON 오류를 반환합니다. 요청의 userId·role·owner_id는 신원 근거로 사용하지 않습니다.

## 메모 API와 화면

- GET /api/notes: 서버가 확인한 사용자 소유 메모의 배열.
- POST /api/notes: {id?,title,body} → HTTP 201 {id}. ID 생략 시 서버가 UUID를 생성하며 owner_id는 검증된 사용자 ID로 저장합니다.
- GET /api/notes/:id: {id,title,body}, 없는 메모는 404.
- PUT /api/notes/:id: {title,body}로 수정하고 {id,title,body} 반환.
- DELETE /api/notes/:id: HTTP 204. 삭제 후 GET은 404.

로그인 시 메모 편집 폼, 목록의 수정·삭제 버튼이 표시됩니다. 로그아웃 시 화면 메모를 비우고 진행 중인 조회를 취소합니다. SDK가 세션 저장·갱신을 관리하며 비밀번호나 JWT를 직접 생성하지 않습니다. 브라우저에는 Project URL과 publishable key만 사용하고 서버 키는 Vercel Secret 환경변수에서 읽습니다.

## 설정과 기존 자료

aleph.config.json의 step은 3이며 실제 GitHub 원격과 배포 주소, identityProvider의 Supabase 발급자·authenticated audience·공개 JWKS 주소, 실제 메서드별 allowedRoutes를 구현과 대조했습니다. judgeIssuer는 변경하지 않았습니다. 판정기의 starter.deny는 기존 구현을 보존합니다. originalApiUrl은 5단계 전이므로 null입니다.

학습 DB 마이그레이션 local-only/03-notes-crud.sql 실행 완료: id UUID와 body 칸, owner_id uuid, RLS와 공개 역할 권한 제한을 유지하며 서버 역할에 CRUD 권한을 적용했습니다. 기존 가상 메모 4건은 삭제하지 않았고 owner_id null 상태로 보관됩니다. 사용자별 목록에는 새로 만든 메모부터 보입니다. SQL과 메모 본문은 Git·제출 묶음에서 제외합니다.

## 검증과 다시 실행

로컬 빌드: npm run build -- --local.
테스트: node --test test/r5.test.mjs test/stage2.test.mjs 및 node --experimental-test-module-mocks --test test/stage3-crud.test.mjs.

기존 검사 5개와 모의 DB CRUD 검사 1개가 통과했습니다. UUID 생성, 검증된 owner_id 저장, 사용자별 목록, 수정·삭제, 삭제 후 404, 무로그인 거부를 모의 검증했습니다. 모의 인증·DB 검증은 실제 A 계정 시험이나 심판 판정이 아닙니다.

실제 배포에서 토큰 없는 목록·추가·한 건 조회·수정·삭제는 401 JSON 오류·자료 없음, 잘못된 토큰도 401로 확인했습니다. 로그인하지 않은 일반 브라우저 화면은 메모 대신 로그인 안내를 표시합니다. 시크릿 창을 직접 열어 확인한 시험과 실제 A 계정 로그인 후 CRUD·로그아웃 시험은 아직 미실행입니다. A 계정 비밀번호를 직접 입력한 뒤 추가 → 수정 → 삭제 → 삭제 ID 조회 404를 확인해야 합니다.

배포의 /data.json은 메모 0건입니다. npm run build가 /aleph.json을 생성하며 이를 삭제하지 않습니다. 첫 화면 응답에는 X-Content-Type-Options: nosniff 헤더가 있습니다. 최신 정적 파일과 코드에서 원문 및 실제 서버 비밀키 형태를 검색하며, 각 저장점 배포의 커밋 일치는 npm run bundle 결과로 확인합니다.

## 남은 한계와 제출

한 건 GET·PUT·DELETE는 소유자 조건 없이 ID만 검사하므로 B가 A의 ID를 알면 타인 메모를 읽고 수정·삭제할 수 있습니다. 이 허점은 4단계에서 기록하고 차단합니다. 실제 B 계정 교차 접근 시험은 미실행입니다. 이전 공개 커밋과 이전 배포는 삭제하지 않았으므로 과거 노출이 해소됐다고 주장하지 않습니다.

npm run bundle은 실제 비로그인 요청 결과만 수집하는 학생 자기 점검입니다. 제출 JSON은 artifacts/submission.json에 생성하며 bundle-notes.json과 함께 커밋하지 않습니다. 비밀번호·토큰·서버 키·메모 본문을 제출하지 않습니다.

저장소: https://github.com/wkdtlgns99-cell/choi-bujang-secret-vault
배포 주소: https://choi-bujang-secret-vault-woad.vercel.app
