# 1.1.0 배포 인계

- 관리 Story: [S15P31A206-253](https://ssafy.atlassian.net/browse/S15P31A206-253).
- 포함: Story 249(대시보드/CSV), 252(개발자 메뉴/권한 관리).
- `release-1.1.0 → master`, 태그 `v1.1.0`으로 식별한다. 이 소스 반영은 EC2 웹 배포 완료를 뜻하지 않는다.
- **API v1.1.0 / Flyway V25·V26 적용 및 최초 관리자 등록 후 웹을 배포한다.**
- 전체 명령·주의사항: [API 저장소의 1.1.0 운영 배포 인계](https://lab.ssafy.com/s15-final/S15P31A206/-/blob/v1.1.0/docs/releases/1.1.0-handoff.md).

EC2 담당자가 GitHub `origin/master`와 `v1.1.0`의 커밋이 같은지 확인한 뒤 기존 `~/deploy-web.sh`를 실행한다. 빌드 결과는 `/var/www/web`, 직전 파일은 `/var/www/web.prev`다. 현재 방식은 파일 순차 교체이므로 짧은 로딩 실패 가능성이 있다.

릴리즈 소스에서 `npm ci`, `npm run lint`, `npm run build`를 통과했다. 운영 배포 검증은 아직 수행하지 않았다.

배포 후 기존 계정으로 로그인해 `/dev-dashboard`, `/developer-access`, 일반 계정 접근 거절, 개발자 부여·회수, 변경 이력과 CSV를 확인한다. 새 Unity 실행 파일 배포와 실제 공용 서버 플레이 대조는 별도 후속 작업이다.

이번 요청에서는 EC2 배포·관리자 등록·Windows ZIP 교체를 수행하지 않는다. 운영 검증 후 `release-1.1.0 → develop` PR로 버전과 문서를 역반영하고, 그때까지 release 브랜치를 유지한다.
