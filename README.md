# 노디세이 웹사이트

노디세이(NODDSAY) 소개·회원가입·로그인 웹사이트입니다. Vite + React + TypeScript + Tailwind CSS.

운영에서는 웹과 API를 같은 주소(`https://k15a206.p.ssafy.io`)에서 서비스합니다. 웹 로그인 API(`/api/v1/web/auth`)는 운영 서버를 최신 develop으로 올린 뒤부터 동작합니다. 로그인은 HttpOnly 쿠키 + CSRF 방식이며, 계약은 백엔드 저장소의 `docs/development/web-auth-guide.md`를 따릅니다.

웹사이트는 로그인 없이 볼 수 있습니다. 회원가입·로그인은 웹사이트에서만 하고, 게임은 웹에 로그인한 뒤 **게임 시작**으로 엽니다. 설치된 앱이 열려 실행 요청에 연결되면 웹이 자동으로 승인하고, 앱이 같은 계정으로 로그인합니다(백엔드 `docs/development/web-unity-handoff.md`). 이 문서의 "웹·앱 확인 코드 비교 후 사용자 승인" 단계는 팀 결정(2026-11-04)으로 생략했습니다. 그 단계는 다른 프로그램이 `noddsay://` 실행 요청을 먼저 가로채 연결하는 경우를 막는 장치라서, 생략하면 그 보호가 없어집니다. 로그인하지 않았으면 로그인 화면으로, 앱이 응답하지 않으면 다운로드 안내로 이어집니다.

회원가입은 이메일 인증을 마쳐야 하고, 비밀번호 찾기도 이메일 인증 후 새 비밀번호를 정합니다. 이 인증 API는 아직 백엔드에 없어서 화면만 있습니다(`src/api/emailVerification.ts`의 경로·필드·오류 코드는 백엔드와 맞출 자리표시자). `npm run dev`에서는 가짜 응답으로 끝까지 시험할 수 있고(인증번호 `000000`), 배포용 빌드에서는 "이메일 인증은 아직 준비 중이에요"가 떠서 **이메일 회원가입이 막힙니다.** API가 생기면 그 파일의 `API_READY`를 `true`로 바꾸고, 가입 요청에 인증 토큰을 함께 보냅니다.

## 로컬 실행

1. 백엔드를 로컬에서 띄웁니다. 게임 저장소(최신 develop)의 `Backend/`에서 웹 주소와 쿠키 설정을 로컬용으로 바꿔 실행합니다. `Backend/.env`에 `DB_PASSWORD`가 있어야 합니다.

   PowerShell:

   ```powershell
   $env:WEB_ORIGIN='http://localhost:5173'; $env:WEB_SECURE_COOKIE='false'; docker compose up --build -d
   ```

   Git Bash:

   ```bash
   WEB_ORIGIN=http://localhost:5173 WEB_SECURE_COOKIE=false docker compose up --build -d
   ```

   두 값 없이 다시 올리면 운영 설정으로 돌아가 가입·로그인이 403으로 실패합니다.

2. 웹을 실행합니다.

   ```bash
   npm install
   npm run dev
   ```

3. 브라우저에서 **http://localhost:5173** 을 엽니다. `127.0.0.1:5173`으로 열면 백엔드가 요청 출처를 거부합니다. `/api` 요청은 개발 서버가 `127.0.0.1:8080`으로 넘깁니다.

   8080 포트를 다른 프로그램이 쓰고 있으면 백엔드를 `API_PORT=8081`(필요하면 `DB_PORT=5433`도)로 띄우고, 웹은 `API_PROXY_TARGET=http://127.0.0.1:8081`을 주고 실행합니다.

## 검사와 빌드

```bash
npm run lint
npm run build
```

빌드 결과는 `dist/`에 생깁니다. 운영 서버에서는 `dist/`를 `/var/www/web`에 두고, Nginx에서 `try_files $uri $uri/ /index.html;`로 새로고침해도 페이지가 열리게 합니다.

다운로드 버튼은 `/download/noddsay-win64.zip`을 가리킵니다. 설치 파일은 서버의 `/download/` 경로에 그 이름으로 올립니다. 파일이 없으면 버튼 자리에 "출시 준비 중"이 나오고, 파일을 올리면 웹을 다시 배포하지 않아도 버튼이 켜집니다. 올리는 동안 잘린 파일이 받아지지 않게 임시 이름으로 올린 뒤 이름을 바꿉니다(예: `noddsay-win64.zip.part`로 올리고 서버에서 `mv`). `client-releases`에 릴리스를 등록하면 버튼 아래에 버전과 용량이 나오고, 등록한 `downloadUrl`이 있으면 그 주소를 씁니다.

## 글꼴

한글은 [Pretendard](https://github.com/orioncactus/pretendard)(© 2021 Kil Hyung-jin, SIL Open Font License 1.1)를 npm 패키지로 받아 사이트에 함께 배포합니다.
