# REST

## 1. 목적

REST Surface는 Page와 Payload Admin이 Feature의 Use Case를 호출하는 내부 BFF입니다.
현재 앱과 같은 origin에서만 사용하며 외부 클라이언트용 공개 API나 버전 계약은 제공하지 않습니다.

Payload collection REST, GraphQL, 인증 endpoint는 Payload가 소유하므로 이 문서의 BFF 계약에 포함하지 않습니다.

## 2. 어댑터 계약

| Feature | Method | Path | 접근 |
| --- | --- | --- | --- |
| Image | `GET` | `/api/studio/image` | 로그인 사용자 |
| Image | `POST` | `/api/generate-image` | 로그인 사용자 |
| Graphic | `GET` | `/api/studio/graphic` | 로그인 사용자 |
| Create | `GET` | `/api/studio/template` | same-origin |
| Image | `POST` | `/api/admin/generate-image` | Manager/Admin |
| AI Chat | `POST` | `/api/agent-chat` | 로그인 사용자 |
| AI Chat | `POST` | `/api/agent-chat/reaction` | 로그인 사용자 |
| Review | `POST` | `/api/check` | 로그인 사용자 |
| Review | `POST` | `/api/check/{checkSessionId}/ai` | 로그인 사용자 |
| Guideline | `GET` | `/api/guideline-documents/{documentId}/preview` | Manager/Admin |
| Studio | `POST` | `/api/studio-exports/print/{format}` | 로그인 사용자, 요청 횟수 제한 |
| Studio | `POST` | `/api/studio-exports/vector-print` | 로그인 사용자 |
| Studio | `POST` | `/api/studio-exports/outline` | 로그인 사용자 |
| Create | `POST` | `/api/templates/import-figma-html` | Manager/Admin |
| Studio | `POST` | `/api/studio/preview` | Manager/Admin |
| Guideline | `POST` | `/api/ci-outline` | same-origin |
| MCP | `POST` | `/api/mcp-key` | 로그인 사용자 |
| Auth | `POST` | `/api/auth/login` | 비로그인 허용(same-origin). 실패 이유를 가르지 않는다 |
| Auth | `POST` | `/api/auth/password` | 본인. 현재 비밀번호 확인 필수 |

독립 생성 명령은 `/api/generate-*`를 사용합니다.
저장된 리소스의 후속 동작은 리소스 식별자를 URL path로 전달합니다.

스튜디오의 교체 후보 목록(`GET`)은 페이지가 아니라 자산 브라우저가 열릴 때 가져옵니다.
페이지는 시작 계약 하나만 싣고, 목록 전체를 SSR 페이로드에 싣지 않습니다.
주소는 화면과 같은 모양(`/api/studio/<kind>` ↔ `/studio/<kind>`)을 씁니다.

🔴 **BFF 경로에 Payload 컬렉션 slug를 쓰지 않습니다.** Payload는 컬렉션마다 `/api/<slug>`에
REST를 열고, 같은 자리에 만든 Route Handler가 정적 세그먼트라 그것을 조용히 가립니다
(2026-08-14에 `/api/templates`·`/api/image-profiles`·`/api/graphic-profiles`에서 실제로 발생).
BFF는 `/api/studio/*`처럼 컬렉션 이름이 아닌 네임스페이스 아래에 둡니다.

## 3. 공통 규칙

- Route Handler는 origin, 인증·인가, 입력을 검증한 뒤 Feature Service를 호출합니다.
- JSON 요청은 구조와 값 범위를 검증하고, 파일 요청은 크기와 실제 형식을 서버에서 확인합니다.
- 오류 응답은 안전한 `message`만 노출하고 상세 오류는 서버 로그에 기록합니다.
- 같은 Use Case의 후속 단계는 첫 응답의 식별자를 URL path로 전달합니다.
- 브라우저 client service가 요청·응답 계약을 소유하며 화면은 HTTP 세부사항을 직접 다루지 않습니다.

## 4. 크로스커팅

- Route Handler 위치와 BFF 문서화: [06. 프로젝트 구조와 개발 규칙](../06-project-structure.md)
- 인증·인가·입력 검증: [07. 보안](../07-security.md)
- Feature별 입력·출력: [Features](../features/README.md)
