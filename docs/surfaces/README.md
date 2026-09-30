# Surfaces

이 디렉터리는 **Surface(전달 채널)** 명세를 모읍니다. Surface는 [Feature](../features/README.md)를 사용자에게 노출하는 얇은 어댑터이며, 핵심 로직을 갖지 않고 Feature의 코어를 호출만 합니다.

## 1. Feature와의 관계

Feature는 "무엇을"(역량), Surface는 "어떻게 노출"(채널)입니다. 하나의 Feature가 여러 Surface로 노출되고, 하나의 Surface가 여러 Feature를 실을 수 있습니다.

| Feature \ Surface | Page | AI Chat | Slack | REST |
| --- | --- | --- | --- | --- |
| Studio | 구현 | 없음 | — | 구현 |
| Image | 구현 | 구현 | 계획 | 구현 |
| Review | 구현 | 구현 | 계획 | 구현 |
| Create | 구현(POC) | 구현 | 계획 | 부분 |

REST 칸은 "기능을 HTTP로 서빙하는 route handler가 있는가" 기준입니다. 현재 앱 BFF `/api/*` 라우트는 same-origin 게이트가 걸려 앱 자체 백엔드로 동작하며, 외부/프로그램 호출용 공개 API는 아닙니다.

교차점(예: "Image를 Slack에서")의 세부는 해당 Feature 명세의 `표면` 섹션에 한 줄로 두고, 무거워질 때만 분리합니다.

## 2. 문서 목록

| Surface | 상태 | 명세 |
| --- | --- | --- |
| Page | 구현 | [page.md](page.md) |
| AI Chat | 구현 | [ai-chat.md](ai-chat.md) |
| Slack | 계획 | — |
| REST | 구현(내부) | [rest.md](rest.md) |

Surface 명세는 그 채널을 실제로 만들 때, 채널 공통 규칙(인증·포맷·제한)이 실재할 때만 씁니다. 상상으로 미리 쓰지 않습니다.

## 3. 작성 규칙

- H1은 `Surface 이름`으로 씁니다.
- H2는 `번호. 한국어 섹션명`으로 씁니다.
- 아래 섹션 순서를 고정합니다: `1. 목적`, `2. 어댑터 계약`, `3. 공통 규칙`, `4. 크로스커팅`.
- 특정 Feature 얘기가 아니라, 이 채널에 **아무 Feature나 꽂는 방법**을 씁니다.
