# Living Brand System (LBS)

![image](public/images/main.png)

LBS는 브랜드 가이드라인을 지속 가능한 운영 체계로 바꾸고, 제작 과정에서 탐색·활용·검수할 수 있게 만드는 디지털 브랜드 운영 시스템입니다.


## Features

### Explore Guidelines

발행된 브랜드 가이드라인을 대화형 화면에서 탐색하고 필요한 기준을 검색합니다.

<!-- Screenshot: docs/assets/features/explore-guidelines.webp -->

### Download Resources

발행된 로고, 이미지, 아이콘, 서체 등 공식 브랜드 리소스를 찾아 다운로드합니다.

<!-- Screenshot: docs/assets/features/download-resources.webp -->

### Check Quality

이미지를 업로드해 브랜드 기준 충족 여부를 항목별로 확인하고 수정 권장사항을 받습니다.

<!-- Screenshot: docs/assets/features/check-quality.webp -->

### Create from Templates

발행된 템플릿의 편집 가능 영역을 채워 브랜드 산출물을 만들고 PNG로 다운로드합니다.

<!-- Screenshot: docs/assets/features/create-from-templates.webp -->

### Work with AI

AI Chat에서 질문, 템플릿 탐색, 이미지 생성, 품질 검수를 사용합니다. MCP 호환 AI 도구에서는 발행된 가이드라인과 검수 기준을 조회할 수 있습니다.

<!-- Screenshot: docs/assets/features/work-with-ai.webp -->

## Documentation

| Topic | Description |
| --- | --- |
| [Product Overview](docs/01-product.md) | 제품이 해결하는 문제와 제공 가치 |
| [Use Cases](docs/02-usecases.md) | 사용자와 시스템의 주요 작업 흐름 |
| [Data Lifecycle](docs/03-data-lifecycle.md) | 데이터 상태, 전이, 보존과 삭제 기준 |
| [Domain Model](docs/04-domain-model.md) | 핵심 개념, 경계, 소유권 |
| [Feature Specifications](docs/features/README.md) | 기능별 입력, 출력, 지원 Surface |
| [Development Guide](docs/06-project-structure.md) | 프로젝트 구조와 개발 규칙 |
| [All Documentation](docs/README.md) | 전체 문서 목록 |

## Architecture

LBS는 Next.js와 Payload CMS를 하나의 애플리케이션으로 배포하는 모듈러 모놀리스입니다. Page, AI Chat, MCP는 같은 Feature Service를 호출하고, Payload CMS는 별도 서비스가 아닌 애플리케이션 내부 실행 계층으로 동작합니다.

```mermaid
flowchart LR
  Page["Page"] --> App["Next.js + Payload"]
  Chat["AI Chat"] --> App
  MCP["MCP"] --> App
  App --> Features["Guideline · Resource · Create · Review"]
  Features --> DB["PostgreSQL"]
  Features --> Storage["Amazon S3"]
  Features --> AI["Anthropic · OpenAI"]
```

계층별 책임과 데이터 흐름은 [System Architecture](docs/05-system-architecture.md)에서 확인할 수 있습니다.

## Tech Stack

| Area | Technology |
| --- | --- |
| Application | Next.js 16, React 19, TypeScript |
| CMS | Payload CMS 3, Lexical |
| Database | PostgreSQL 17 |
| Storage | Amazon S3 |
| AI | Vercel AI SDK, Anthropic, OpenAI |
| UI | Tailwind CSS 4, shadcn/ui, Radix UI |
| Testing | Vitest, Playwright |
| Code Quality | Biome |
| Package Manager | pnpm 10 |

## Development Setup

### Prerequisites

- Node.js 22
- pnpm 10 via Corepack
- Docker

### 1. 환경 변수 설정

프로젝트 루트에 `.env.local`을 만들고 필수 변수를 설정합니다.

```dotenv
DATABASE_URL=postgresql://payload:payload@localhost:5432/hd_cms_prototype
PAYLOAD_SECRET=replace-with-a-random-secret
PAYLOAD_DB_PUSH=false
```

`PAYLOAD_SECRET`에는 `openssl rand -hex 32`처럼 안전한 난수 생성기로 만든 값을 사용하세요. `.env.local`은 Git에 커밋하지 않습니다.

선택 기능을 사용할 때만 관련 변수를 추가합니다.

| Feature | Environment variables |
| --- | --- |
| AI Chat | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL`, `CHAT_MODEL`, `AGENT_CHAT_TRIAGE_ENABLED` |
| Image Generation | `OPENAI_API_KEY`, `GEMINI_API_KEY` |
| Figma Import | `FIGMA_API_TOKEN` |
| Object Storage | `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, 선택 `S3_ENDPOINT`(S3 호환 저장소) |
| Email | `RESEND_API_KEY`, `EMAIL_FROM_ADDRESS`, `EMAIL_FROM_NAME` |

### 2. PostgreSQL 실행

```sh
docker compose up -d postgres
```

### 3. 의존성과 스키마 준비

```sh
nvm use
corepack enable
pnpm install
pnpm migrate
```

### 4. 개발 서버 실행

```sh
pnpm dev
```

`http://localhost:3000`에 접속해 첫 관리자 계정을 만듭니다. 관리자 화면은 `http://localhost:3000/admin`에서 열립니다.

Payload collection, field, index, relationship을 변경할 때는 격리된 로컬 데이터베이스에서만 `PAYLOAD_DB_PUSH=true`를 사용하세요. 작업을 마치면 최종 마이그레이션을 생성하고 새로운 `PAYLOAD_DB_PUSH=false` 데이터베이스에서 검증합니다. 자세한 절차는 [스키마 변경과 마이그레이션 워크플로](docs/06-project-structure.md#16-스키마-변경과-마이그레이션-워크플로)를 따릅니다.

### 격리된 Docker CMS 미리보기

```sh
printf 'PAYLOAD_SECRET=%s\n' "$(openssl rand -hex 32)" > .env.docker.local
docker compose -f compose.preview.yml up -d
```

`http://localhost:3102/admin`에서 확인합니다. `.env.docker.local`은 처음 한 번만 만들고 보관합니다. Node 22·PostgreSQL·MinIO를 사용하며 기존 `.env`와 `.env.local`은 컨테이너에 노출하지 않습니다. 시작할 때 커밋된 마이그레이션을 적용하며 자동 스키마 push는 끕니다. DB와 업로드 파일은 `lbs-cms-preview`의 전용 볼륨에만 저장됩니다. 외부 DB·S3·이메일·AI 서비스는 연결하지 않습니다.

`docker compose -f compose.preview.yml down`으로 중지합니다. 데이터는 남습니다. `down -v`는 작성한 DB와 업로드까지 삭제하므로 초기화할 때만 사용합니다. 콘텐츠는 Admin에서 직접 작성합니다.

### Development Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | 개발 서버 실행 |
| `pnpm doctor` | 블록 카탈로그와 타입 생성, 자동 수정, 정적·타입 검사 |
| `pnpm test:int` | 통합 테스트 실행 |
| `pnpm test:e2e` | E2E 테스트 실행 |
| `pnpm build` | 프로덕션 빌드 생성 |
| `pnpm migrate:status` | 데이터베이스 마이그레이션 상태 확인 |
| `pnpm ci` | 정적 검사, 타입 검사, 통합 테스트, 빌드 실행 |

## Production Deployment

LBS 애플리케이션은 하나의 Node.js 배포 단위로 운영하며 PostgreSQL 인스턴스에 연결합니다. 업로드 파일을 사용하는 환경에서는 Amazon S3도 준비합니다.
커밋된 마이그레이션을 적용한 뒤 애플리케이션을 빌드하고 실행합니다.

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm migrate
pnpm build
pnpm start
```

배포 후 다음 항목을 확인합니다.

- `/`에서 사용자 화면이 열립니다.
- `/admin`에서 인증된 사용자만 관리자 화면에 접근할 수 있습니다.
- `pnpm migrate:status`에 적용되지 않은 마이그레이션이 없습니다.
