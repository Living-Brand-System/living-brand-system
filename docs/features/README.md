# Features

이 디렉터리는 **Feature(기능 역량)** 명세를 모읍니다. Feature는 하나의 재사용 가능한 역량이며, 여러 [Surface](../surfaces/README.md)(Page, AI Chat, Slack, REST)로 노출됩니다.

## 1. 개념 문서와의 차이

`docs/01~08`은 여러 기능에 공통인 **관심사(concern)별 개념 문서**라 구현 세부(API 시그니처 등)를 넣지 않습니다. Feature 명세는 그 반대로 **한 기능의 코어 계약(입력·출력)**을 담는 세로축 문서입니다. 따라서 이 그룹은 개념 문서보다 구현에 더 가깝습니다.

도메인 규칙 자체는 여기서 다시 쓰지 않고 개념 문서를 링크만 합니다.

## 2. 문서 목록

| Feature | 상태 | 명세 |
| --- | --- | --- |
| Guideline | 구현·위계 조사 | [guideline.md](guideline.md) |
| Studio | 구현 | [studio.md](studio.md) |
| Image | 구현 | [image.md](image.md) |
| Review | 구현 | [review.md](review.md) |
| Create | 구현(일부 로드맵) | [create.md](create.md) |

## 3. 작성 규칙

- H1은 `Feature 이름`으로 씁니다.
- H2는 `번호. 한국어 섹션명`으로 씁니다.
- 아래 섹션 순서를 고정합니다: `1. 목적`, `2. 핵심 계약`, `3. 표면`, `4. 의존`, `5. 크로스커팅`.
- 크로스커팅(인증·접근성·도메인 등)은 개념 문서를 링크만 하고 내용을 복제하지 않습니다.
