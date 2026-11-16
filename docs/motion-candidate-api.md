# 인식 개선 후보 API 연동 (S15P31A206-139)

팀원 PR #22의 메뉴와 `/dev-dashboard?tab=motion-candidates` 화면을 유지하고 실제 백엔드 계약에 연결한다. 이전 `feature/S15P31A206-288-web-motion-improve`의 별도 화면을 추가로 병합할 필요는 없다.

서버 계약: S15P31A206 `docs/development/motion-improve-api.md`, `docs/api/openapi.yaml`.
백엔드 브랜치: `feature/S15P31A206-288-be-motion-candidate-contract`.

- GET `/api/v1/web/developer/motion-improve/candidates?page=0&status=pending`: `items,total,page,limit`.
- POST `/api/v1/web/developer/motion-improve/candidates/{UUID}/decision`: `{decision:"approve",expectedRevision}` 또는 `{decision:"reject",expectedRevision,reason}`.
- 기존 웹 쿠키·Origin·`X-CSRF-Token` 사용. PC 토큰은 브라우저에 넣지 않는다.
- 서버 `review`의 제목·수치·5개 규칙·실패 요청을 화면에 표시한다. 비교표 원문과 단위를 보존하고, 미수집 규칙은 통과로 표시하지 않는다.
- 소문자 상태 5종과 `mr_pending`을 처리한다. 409이면 최신 목록을 불러와 다시 검토하게 하며 자동 재승인하지 않는다.
- 페이지 이동·상태 필터를 지원한다. 로그인 후 후보 탭 복귀, 검토자·시각·거절 사유·MR 링크를 표시한다.

## 로컬 확인

API는 별도 테스트 DB와 함께 먼저 실행한다. 이 웹 저장소에서 `npm ci`, `npm run dev -- --host 127.0.0.1 --port 5189 --strictPort`를 실행한다.
웹 프로세스의 `API_PROXY_TARGET=http://127.0.0.1:18089`, API의 `WEB_ORIGIN=http://localhost:5189`, `WEB_SECURE_COOKIE=false`를 맞춘다. 이 설정은 로컬 HTTP 검증 전용이다.
사용자 PC에 준비한 실행 스크립트와 계정 파일 위치는 백엔드 `docs/development/motion-candidate-contract-verification.md`에 기록한다. 검증 계정·비밀번호는 Git에 저장하지 않는다.

검증: `npm run build`, `npm run lint`, `node --test tests/motion-candidate-contract.test.mjs`.
`tests/fixtures/motion-candidate-web-page.json`은 백엔드의 같은 이름 계약 샘플과 동일해야 한다. 실제 서버 응답에서도 목록과 결정 결과를 대조한다.

## 통합 순서

팀원 PR #22의 커밋이 이 브랜치에 포함돼 있다. PR #22를 먼저 병합해도 Git이 공통 커밋을 인식한다. 이 브랜치가 먼저 병합되면 PR #22 내용을 중복 적용하지 않는다. 어느 PR도 자동 승인·병합하지 않는다.
백엔드 계약 브랜치의 V28→V29/API를 먼저 반영하고 이 웹을 반영한다. 원격 웹 배포는 이번 로컬 검증에 포함하지 않는다.
