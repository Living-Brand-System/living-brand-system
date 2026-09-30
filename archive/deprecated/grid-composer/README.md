# GridComposer POC (Deprecated)

`GridComposer`는 grid 메타데이터를 편집 가능한 셀 모델로 역변환하던 초기 저작 POC입니다.
현재 Create 실행 경로는 저장된 요소 좌표를 `projectTemplateRenderModel`(`src/features/template-core/domain`)로 직접 렌더 모델화하므로 이 POC를 호출하지 않습니다.

- 상태: Deprecated / 런타임에서 격리
- 격리일: 2026-07-17
- 원본: `grid-composer.tsx.txt`
- 의존성: `react-moveable` (현재 애플리케이션 의존성에서는 제거됨)
- 제한: 빌드, 타입 검사, import map, 제품 라우트에서 참조하지 않음

다시 사용하려면 먼저 현재 Template 계약과 편집 결과 저장 방식의 제품 요구사항을 확정하고,
별도 기능 브랜치에서 테스트와 필요한 의존성을 함께 복원해야 합니다. 보관 파일을 그대로 `src`로
되돌리는 것은 지원되는 복구 절차가 아닙니다.
