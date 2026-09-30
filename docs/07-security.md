# 07. 보안

## 1. 점검 항목

| 순번 | 점검 항목 | 참고사항 | 관련 예시 |
| --- | --- | --- | --- |
| 1 | 정보 누출 | 에러 메시지는 사용자에게 일반화된 메시지만 제공하고, 상세한 오류 정보는 서버 로그로만 기록합니다. | 1 |
| 2 | 불충분한 인가 | 클라이언트 단 검증에 의존하지 않고, 서버 측에서 역할 기반 접근 제어를 사용합니다. | 2, 3 |
| 3 | 크로스사이트 스크립팅 | 사용자 입력 데이터는 React 렌더링 기본 escaping을 우선 사용하고, HTML 삽입이 필요한 경우 sanitize를 거칩니다. | 4 |
| 4 | 불충분한 세션 만료 | 관리자 페이지 세션은 30분 제한을 적용합니다. |  |
| 5 | 데이터 평문 전송 | 모든 통신 구간에 HTTPS를 강제 적용하고, HTTP 요청은 HTTPS로 리디렉션합니다. | 5 |
| 6 | 자동화 공격 | 관리자 페이지 로그인 횟수를 5회로 제한합니다. |  |
| 7 | 파일 업로드 | 업로드 시 허용 확장자를 제한하고, 실행 권한을 제거합니다. | 6 |
| 8 | 파일 다운로드 | 다운로드 대상 파일과 접근 권한을 서버에서 검증합니다. | 6 |
| 9 | SQL 인젝션 | 쿼리 작성 시 Payload query, ORM, parameterized query를 사용하여 외부 입력이 쿼리 구조에 영향을 주지 않도록 설정합니다. | 7 |
| 10 | 불충분한 인증 | 관리자 페이지에는 강한 비밀번호 정책과 필요 시 2차 인증을 적용합니다. |  |
| 11 | 크로스사이트 리퀘스트 변조 (CSRF) | 상태 변경 요청은 서버에서 인증 상태, origin, CSRF 보호 조건을 확인합니다. |  |
| 12 | 프로세스 검증 누락 | UI에서 통과한 검증을 신뢰하지 않고 Route Handler, Server Action, Payload hook에서 다시 검증합니다. |  |
| 13 | 약한 문자열 강도 | 비밀번호, token, secret은 충분한 길이와 난수성을 요구하고 기본값을 운영에 사용하지 않습니다. |  |
| 14 | 관리자 페이지 노출 | Payload Admin은 내부 사용자에게만 노출하고, 운영 환경에서 접근 제어와 rate limit을 적용합니다. |  |
| 15 | 위치 공개 | 에러, 로그, 응답, 다운로드 URL에 내부 경로와 object storage key를 노출하지 않습니다. |  |
| 16 | 세션 고정 | 로그인 후 세션을 재발급하고, 쿠키에는 `httpOnly`, `secure`, `sameSite` 속성을 적용합니다. |  |
| 17 | 버퍼 오버플로우 | Node.js 레벨에서는 파일 크기, 요청 body 크기, 이미지 처리 크기를 제한해 메모리 고갈을 방지합니다. |  |
| 18 | 운영체제 명령 실행 | 사용자 입력을 shell command에 전달하지 않고, 필요한 작업은 안전한 라이브러리 API로 처리합니다. |  |
| 19 | 디렉터리 인덱싱 | 정적 파일과 업로드 저장소는 디렉터리 목록을 노출하지 않습니다. |  |
| 20 | 취약한 패스워드 복구 | 비밀번호 재설정 token은 1회성, 짧은 만료 시간, 서버 저장 검증을 적용합니다. |  |
| 21 | 쿠키 변조 | 권한 판단에 클라이언트 쿠키 값을 직접 사용하지 않고 서버 세션과 Payload user를 기준으로 판단합니다. |  |
| 22 | 환경 변수 및 Secret 관리 | `PAYLOAD_SECRET`, DB URL, API key가 코드, 로그, 클라이언트 번들에 노출되지 않도록 관리합니다. |  |
| 23 | 관리자 권한 분리 | admin·manager·worker 역할별 권한을 분리하고, 관리자 기능 접근을 최소 권한으로 제한합니다. Payload Admin 진입은 manager 이상입니다. |  |
| 24 | API 접근 제어 | Payload REST, GraphQL, Local API에서 collection별 access control 누락이 없는지 확인합니다. Local API는 기본적으로 `user`와 `overrideAccess: false`를 사용합니다. |  |
| 25 | GraphQL 노출 관리 | 운영 환경에서 GraphQL Playground, introspection, 과도한 query depth 노출을 제한합니다. |  |
| 26 | 파일 MIME 검증 | 업로드 파일은 확장자뿐 아니라 MIME type과 실제 파일 내용을 함께 검증합니다. |  |
| 27 | 업로드 파일 크기 제한 | 파일 크기, 개수, 총 업로드 용량을 제한하여 장애와 비용 증가를 방지합니다. |  |
| 28 | Rate limit | 로그인, API, 검색, Agent 질의에 요청 횟수 제한을 적용합니다. |  |
| 29 | 감사 로그 | 관리자 작업, 권한 변경, 발행, 반려, 예외 처리를 추적 가능하게 기록합니다. |  |
| 30 | 의존성 취약점 | npm package와 lockfile의 취약점을 정기적으로 점검하고 업데이트합니다. |  |
| 31 | 보안 헤더 | CSP, HSTS, X-Frame-Options, Referrer-Policy 같은 보안 헤더를 적용합니다. |  |
| 32 | Agent 컨텍스트 제한 | Agent는 live 상태의 Official Version과 허용된 제작 맥락만 조회하고, draft/private 기준을 답변 근거로 사용하지 않습니다. |  |
| 33 | Agent 응답 검증 | Agent 응답은 최종 정책 결정으로 사용하지 않고, 근거 기준과 신뢰도, 사람 검토 필요 여부를 함께 기록합니다. |  |
| 34 | Server Action 보호 | Server Action은 클라이언트에서 호출되더라도 서버에서 인증, 권한, 입력 스키마를 다시 검증합니다. |  |
| 35 | 업로드 저장소 격리 | 업로드 파일은 실행 가능한 public path에 직접 저장하지 않고, object storage 또는 Payload upload collection의 권한 검사를 거쳐 제공합니다. |  |
| 36 | 회원가입과 사용자 생성 | 공개 회원가입은 열지 않고, 사용자 생성·초대·가입 완료 과정에는 인증 정보 보호, 역할 고정, 시도 제한, 감사 로그를 적용합니다. |  |

## 2. 관련 예시

### 문제 1

#### 문제 설명

#### 문제 코드

#### 해결 방안

## 3. Next.js와 Payload 적용 기준

### 인증과 인가

- 모든 관리자와 내부 사용자는 Payload `users` collection을 통해 인증합니다.
- Collection별 `access` 함수를 기본 보안 경계로 사용합니다.
- Route Handler와 Server Action은 요청마다 현재 사용자를 확인합니다.
- Payload Local API를 사용할 때는 가능한 `user`와 `overrideAccess: false`를 전달합니다.
- `overrideAccess: true`는 migration, seed, 관리성 batch처럼 명확한 예외에서만 사용합니다.
- 외부 서비스 개인 자격증명(Figma API 토큰)은 사용자별로 `PAYLOAD_SECRET`에서 파생한 키로 암호화해 저장하고, 필드 access로 API·Admin 노출을 전부 닫습니다. 그 필드는 전용 repository만 요청자 본인 id로 `overrideAccess: true` 접근합니다. 서버 공용 토큰으로 대신하지 않습니다.

### 회원가입과 사용자 생성

- 공개 회원가입은 기본 정책으로 열지 않습니다. 사용자 계정은 manager 이상이 Payload Admin에서 직접 만듭니다. 초대 흐름은 두지 않고, 계정을 만든 사람이 임시 비밀번호를 전달하면 받은 사람이 `/account`에서 바꿉니다.
- 사용자 생성 endpoint를 추가할 때도 `users` collection의 `create` access를 우회하지 않습니다. Local API를 쓰는 경우 `overrideAccess: false`를 기본값으로 사용합니다.
- 클라이언트 요청이 `role`, `_verified`, 권한 필드, 세션 필드를 직접 지정할 수 없게 합니다. 최초 역할의 기본값은 `worker`이고, `role`을 쓰려면 manager 이상이어야 합니다. `admin`은 manager가 지정할 수 없습니다.
- 비밀번호는 Payload auth collection이 관리하게 하고, 앱 코드에서 비밀번호 원문을 저장하거나 로그에 남기지 않습니다.
- 로그인과 가입 완료는 HTTPS 전송을 전제로 합니다. 이 흐름은 종단간 암호화가 아니라 TLS 전송 암호화, 서버 측 비밀번호 해시, JWT 서명, 보안 쿠키 조합으로 보호합니다.
- Payload auth token은 `PAYLOAD_SECRET`으로 서명합니다. 운영 `PAYLOAD_SECRET`은 긴 난수로 관리하고, 코드·로그·클라이언트 번들에 노출하지 않습니다.
- Auth cookie는 `httpOnly`, `secure`, `sameSite`, 만료 시간을 적용합니다. 운영 환경에서는 HTTPS에서만 cookie가 전송되도록 `secure` 설정을 확인합니다.
- 사용자 인증 collection에는 `tokenExpiration`, `maxLoginAttempts`, `lockTime`을 설정합니다. 내부 사용자 세션은 짧은 만료 시간을 유지하고, 로그인 실패가 반복되면 계정을 일정 시간 잠급니다.
- 가입 완료나 이메일 변경처럼 계정 소유권을 확인해야 하는 흐름에는 `verify: true` 또는 별도 일회성 초대 token을 사용합니다. token은 짧은 만료 시간과 1회 사용 조건을 가져야 합니다.
- 가입, 로그인, 비밀번호 재설정, 초대 수락 endpoint에는 rate limit을 적용합니다.
- 계정 생성, 초대 발송, 역할 변경, 비밀번호 재설정, 로그인 잠금 해제는 감사 로그에 남깁니다. 로그에는 비밀번호, JWT, reset token, 초대 token을 남기지 않습니다.

회원가입 또는 초대 기반 사용자 생성 기능은 아래 기준을 모두 만족해야 배포할 수 있습니다.

| 영역 | 보안 기준 | 확인 방법 |
| --- | --- | --- |
| 공개 범위 | 공개 회원가입 endpoint를 만들지 않습니다. 계정은 manager 이상만 만들 수 있습니다. | 비로그인 사용자가 `/api/users`와 가입 관련 route로 임의 계정을 만들 수 없는지 확인합니다. |
| 접근 제어 | `users` collection의 `create` access는 manager 이상만 통과합니다. 조회·수정·삭제에서 manager에게 `admin` 역할 행은 보이지 않고, manager는 자기 계정을 삭제할 수 없습니다. | Local API 호출에 `overrideAccess: false`가 있는지 확인하고, access 우회 테스트를 추가합니다. |
| 역할 부여 | 최초 역할은 서버가 최소 권한(`worker`)으로 지정합니다. manager가 바꿀 수 있는 값은 `worker`와 `manager` 둘뿐입니다. | 가입 요청 body에 `role: "admin"`을 넣어도 admin 계정이 만들어지지 않는지 확인합니다. |
| 비밀번호 | 비밀번호 원문은 저장·응답·로그에 남기지 않습니다. Payload auth collection의 해시 저장과 검증 흐름만 사용합니다. | DB와 로그에서 비밀번호 원문이 남지 않는지 확인합니다. |
| 비밀번호 정책 | 내부 사용자 비밀번호는 최소 12자 이상이어야 하고, 흔한 약한 비밀번호는 거부합니다. | 서버 검증에서 짧거나 단순한 비밀번호가 실패하는지 확인합니다. |
| 전송 보안 | 로그인, 가입 완료, 초대 수락, 비밀번호 재설정은 HTTPS에서만 처리합니다. | 운영 환경에서 HTTP 요청이 HTTPS로 리디렉션되거나 거부되는지 확인합니다. |
| JWT | JWT는 `PAYLOAD_SECRET`으로 서명하고 짧은 만료 시간을 가집니다. 운영 secret은 긴 난수이며 저장소에 커밋하지 않습니다. | `PAYLOAD_SECRET` 강도와 Git 추적 여부를 확인하고, 만료 시간이 설정되어 있는지 확인합니다. |
| 쿠키 | Auth cookie는 `httpOnly`, `secure`, `sameSite`, 만료 시간을 적용합니다. | 운영 응답의 `Set-Cookie` 속성을 확인합니다. |
| 이메일·초대 검증 | 이메일 소유권 또는 초대 소유권을 확인합니다. 초대 token은 1회성이고 짧은 만료 시간을 가집니다. | 만료·재사용·다른 이메일 사용 시 초대 수락이 실패하는지 확인합니다. |
| 자동화 공격 방지 | 로그인 실패 제한, 가입/초대/재설정 endpoint rate limit, 계정 잠금 시간을 적용합니다. | 반복 요청 테스트에서 제한 응답이나 잠금 상태가 발생하는지 확인합니다. |
| 사용자 열거 방지 | 로그인, 가입, 재설정 오류 메시지는 계정 존재 여부를 드러내지 않습니다. | 존재하지 않는 이메일과 존재하는 이메일의 사용자 노출 메시지가 같은지 확인합니다. |
| 감사 로그 | 계정 생성, 초대 발송·수락, 역할 변경, 비밀번호 재설정, 계정 잠금 해제를 기록합니다. | 감사 로그에 행위자, 대상 사용자, 시간, 결과가 남는지 확인합니다. |
| 민감정보 로그 제외 | 비밀번호, JWT, reset token, 초대 token, API key는 로그에 남기지 않습니다. | 서버 로그와 에러 리포트 샘플을 확인합니다. |

### 입력 검증

- UI validation은 사용자 편의를 위한 1차 검증입니다.
- 서버에서는 Zod 같은 schema validator나 Payload field validation으로 다시 검증합니다.
- Payload hook은 상태 전이, 필수 관계, 발행 조건을 다시 확인합니다.
- Agent 질문, 검색어, 업로드 metadata도 일반 입력값과 동일하게 검증합니다.

### 출력과 에러

- 사용자에게는 일반화된 오류 메시지를 보여줍니다.
- stack trace, 내부 경로, collection query, object storage key는 응답에 포함하지 않습니다.
- 상세 오류는 서버 로그에만 남깁니다.
- 로그에는 secret, token, password, 개인정보, 원본 파일 경로를 남기지 않습니다.

### 파일 업로드와 다운로드

- 업로드는 확장자, MIME type, 파일 크기, 파일 개수를 모두 검증합니다.
- 원본 파일명은 표시용 metadata로만 사용하고 저장 key는 예측 불가능하게 만듭니다.
- 업로드 파일은 실행 권한이 없는 저장소에 둡니다.
- 다운로드는 파일 ID와 사용자 권한을 서버에서 확인한 뒤 제공합니다.

### Agent 보안

- Agent 검색은 live 상태의 Official Version만 대상으로 합니다.
- Agent는 draft, archived, private 기준을 답변 근거로 사용하지 않습니다.
- Agent 답변에는 근거 기준, VersionRef, 신뢰도, 사람 검토 필요 여부를 함께 남깁니다.
- Agent 실패는 사용자 작업 실패나 정책 변경 실패와 분리해서 처리합니다.
- Agent 질의에는 rate limit을 적용합니다.
- Agent 질의 Route Handler는 인증된 내부 사용자만 허용하고, 요청 본문은 서버에서 schema로 다시 검증합니다.
- Agent guideline 검색은 Payload access control을 우회하지 않도록 `user`와 `overrideAccess: false`를 함께 사용합니다.
- MCP 외부 AI 검수는 인증된 사용자의 요청에만 검사 이미지, 구조화 Evidence, HeuristicPrompt, RuleChecker 프롬프트와 레퍼런스 이미지를 반환합니다. 기대값·연산자, 인증 정보와 내부 URL은 반환하지 않으며, 연결된 MCP 클라이언트와 AI 제공자가 해당 내용을 열람할 수 있음을 사용자에게 안내합니다.

### 운영 보안

- 운영 환경에서는 GraphQL Playground, introspection, 과도한 query depth를 제한합니다.
- CSP, HSTS, X-Frame-Options, Referrer-Policy 같은 보안 헤더를 적용합니다.
- 관리자 페이지는 내부 사용자에게만 노출하고 rate limit을 적용합니다.
- 의존성 취약점은 lockfile 기준으로 정기 점검합니다.
