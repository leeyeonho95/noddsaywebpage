# 노디세이 웹사이트

노디세이(NODDSAY) 소개·회원가입·로그인 웹사이트입니다. Vite + React + TypeScript + Tailwind CSS.

운영에서는 웹과 API를 같은 주소(`https://k15a206.p.ssafy.io`)에서 서비스합니다. 웹 로그인 API(`/api/v1/web/auth`)는 운영 서버를 최신 develop으로 올린 뒤부터 동작합니다. 로그인은 HttpOnly 쿠키 + CSRF 방식이며, 계약은 백엔드 저장소의 `docs/development/web-auth-guide.md`를 따릅니다.

웹사이트는 로그인 없이 볼 수 있습니다. 계정은 게임 앱과 같은 계정이라, 웹에서 가입한 이메일로 게임에도 로그인합니다.

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

## 글꼴

한글은 [Pretendard](https://github.com/orioncactus/pretendard)(© 2021 Kil Hyung-jin, SIL Open Font License 1.1)를 npm 패키지로 받아 사이트에 함께 배포합니다.
