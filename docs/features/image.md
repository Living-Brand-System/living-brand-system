# Image

## 1. 목적

프롬프트를 받아 이미지 후보를 여러 장 생성합니다. 브랜드 규정 부합 여부 판단(검수)은 하지 않습니다. 브랜드 표현은 Payload에서 관리하는 **이미지 프로파일**과 **여러 후보 중 택1하는 UX**로 유도합니다.

Create가 산출물에 이미지가 필요할 때 이 기능을 호출하는 것이 대표 사용처입니다.

## 2. 핵심 계약

표면과 무관한 재사용 단위입니다. 코어 로직은 `src/features/image-generation/`이 소유하고, 표면은 이를 호출만 합니다.

- 입력: 프롬프트 텍스트(저장된 참조 이미지가 있으면 생략 가능), published 이미지 프로파일(`profileId`), 후보 장수(현재 1~6), 선택적 참조 이미지(내 생성 결과 중 하나이거나, 프로파일이 `참조 이미지 첨부`를 열었을 때 사용자가 첨부한 이미지). Admin 저장 전 테스트만 프로파일 대신 모델·비율·크기를 직접 지정합니다.
- 출력: 프로파일 기반 생성은 `generated-images` 문서 참조와 저장 URL 목록을 반환합니다. 저장 전 Admin 테스트만 data URI를 반환합니다.
- 이미지 검증: 생성 결과 저장과 참조 이미지에 사용하는 공통 raster 검증은 최대 18,000,000픽셀을 허용합니다. 현재 지원하는 Nano Banana 2의 4K 비율 전체(최대 17,203,200픽셀)를 수용하며, 파일 크기·실제 형식·MIME 검증도 유지합니다.
- 실행 시간: 일반 이미지 생성과 Admin 생성 테스트 REST API는 고해상도 모델 응답을 기다릴 수 있도록 최대 120초 동안 실행합니다.
- 처리 한도: Studio·Admin·Agent·MCP의 이미지 모델 호출은 공통으로 프로세스당 동시 2건·사용자당 분당 6건으로 제한합니다(REST는 429 + `Retry-After`). 모델 호출 전에 거부된 요청은 한도를 소모하지 않습니다. 다중 서버 배포 시 이 process-local 제한은 공유 edge/Redis limiter로 교체해야 합니다.
- 영속성: 이미지 생성 결과는 `generated-images`에 파일·프로파일·원본/최종 프롬프트·모델·출력 조건·생성 사용자·참조 원본(`sourceImage`, 참조 없이 생성했거나 첨부로 생성했으면 비어 있음)을 저장합니다. 🔴 **사용자가 첨부한 참조 이미지는 저장하지 않습니다** — 그 요청 안에서만 시드로 쓰고 버리므로 첨부 원본은 어디에도 남지 않고 `sourceImage`도 기록되지 않습니다. `AssetGenerationSession`은 향후 제작 사용량 추적이 필요할 때만 도입합니다.
- 검수 미포함: 생성 결과를 그대로 돌려주며 규정 판정을 하지 않습니다.

### 프롬프트 합성

브랜드 프롬프트의 유일한 런타임 원천은 Payload의 published 이미지 프로파일입니다. 소스 코드에는 브랜드 base나 씬 목록을 두지 않습니다.

- **프로파일 생성**: `profileId`가 있으면 published 프로파일의 시스템 프롬프트와 선택적 유저 프롬프트 후보를 읽습니다. 후보가 있으면 Haiku가 각 주제에서 하나를 선택하고 유저 인풋 원문은 최종 프롬프트에서 제외합니다. 후보가 없으면 AI 정규화를 생략하고 원문을 `subject`로 보존합니다.
- **프로파일 상태**: 일반 생성은 published 프로파일만 사용합니다. Admin의 생성 테스트만 저장하지 않은 현재 폼 값을 직접 사용합니다.

### 이미지 프로파일 Admin

Manager는 Payload Admin의 `이미지 프로파일` 컬렉션에서 이미지 유형별 설정을 편집하고 테스트합니다.

- **시스템 프롬프트**: `주제(key)`, `프롬프트(value)` 행을 최종 프롬프트의 기본값으로 사용합니다.
- **유저 프롬프트**: 선택적으로 `주제(key)`, `프롬프트 후보[]`를 정의합니다. 행이 있으면 AI 구조화 출력은 각 주제마다 후보 중 하나만 선택하고, 비어 있으면 AI 정규화를 호출하지 않습니다.
- **이미지 모델**: 프로파일은 허용된 모델 프리셋을 선택합니다. 현재 계약은 `openai-gpt-image-2`, `google-nano-banana-2-lite`, `google-nano-banana-2`입니다.
- **프로파일 기능**: `색 조정`, `카메라 조정`, `참조 이미지 첨부`를 프로파일마다 켜고 끕니다. `참조 이미지 첨부`는 저장하지 않는 1회용 첨부라 세부 설정이 없고 켜고 끄는 것이 전부입니다.
- **Runtime Manifest**: 선택한 모델의 비율·해상도·프롬프트 상한·지원 feature·출력 형식은 코드의 Runtime Manifest가 정의합니다. 프로파일은 `features`, `controllerRestrictions`, `output`으로 이 범위를 좁힙니다. 그룹의 접힘 가능 여부와 최초 열림값은 Runtime이 아니라 Admin의 `controllerPresentation`이 소유합니다.
- **출력 조건**: 공급자와 무관한 비율과 해상도는 Effective Controller의 `ratio`·`resolution` control에서 읽습니다. 비율은 `1:1`, `2:3`, `3:2`, `3:4`, `4:3`, `4:5`, `5:4`, `9:16`, `16:9`, `21:9`, 해상도는 `1K`, `2K`, `4K`입니다.
- **공급자 변환**: Google에는 `imageConfig.aspectRatio`와 `imageConfig.imageSize`를 그대로 전달합니다. OpenAI `gpt-image-2`에는 같은 계약을 16px 배수, 최대 3840px, 3:1 이하, 655,360~8,294,400 픽셀 범위의 실제 `size`로 변환합니다.
- **모델 제약**: Nano Banana 2 일반형(`gemini-3.1-flash-image`)은 `1K`(기본값), `2K`, `4K`를 지원합니다. Nano Banana 2 Lite는 위 비율 10종과 `1K`만 지원하므로 `2K`, `4K` 프로파일 저장과 관리자 생성 테스트를 거부합니다.
- **최종 프롬프트 JSON**: 시스템 프롬프트와 정규화 결과를 flat JSON으로 합칩니다. 정규화 후보가 없을 때만 유저 인풋 원문을 `subject`로 보존합니다. textarea 줄바꿈은 `, `로 정규화하며, 같은 주제는 정규화 결과가 우선합니다.
- **런타임 사용**: `profileId`가 지정되면 사용자에게 공개된 published 프로파일의 모델·feature·Controller 제한·출력 정책으로 Effective Config를 파생하고, 그 Controller가 허용한 값만 이미지 생성기로 전달합니다. Admin의 draft는 생성 테스트에서만 사용합니다.
- **생성 테스트**: 현재 Admin 폼의 모델·feature·Controller 제한으로 같은 Effective Controller를 파생해 정규화와 이미지 생성을 실행합니다. 테스트 화면에서 유저 프롬프트 후보 정규화를 끄면 유저 인풋 원문을 `subject`로 합성합니다. 미저장 값도 테스트할 수 있고 결과는 저장하지 않습니다.
- **Admin 생성 API**: 프로파일 생성 테스트는 모델과 출력 계약을 모두 명시하고, 템플릿의 AI 배경 생성은 서버 기본 계약을 사용합니다. 두 요청 모두 Manager 전용 `POST /api/admin/generate-image`를 사용합니다.

프로파일 기반 응답의 `images`는 저장 URL이며 `generatedImages`에는 각 문서의 `id`, `url`, `createdAt`이 포함됩니다. 저장된 생성 결과를 참조하는 요청은 원본 data URI와 최종 프롬프트를 재전송하지 않고 `reference: { generatedImageId }`를 전달합니다. 프롬프트를 비워 보내면 참조의 저장된 `effectivePrompt`를 물려받습니다. 서버는 같은 사용자·published 프로파일에 귀속된 `generated-images` 원본과 저장된 `effectivePrompt`를 조회·검증해 사용합니다.

첨부 참조는 `reference: { upload }`에 data URI로 실어 보냅니다. 저장하지 않으므로 서버가 되찾을 원본이 없고, 그래서 매 요청 본문에 다시 실립니다. `domain/reference-image/contract/`가 원본·전송 제한과 Worker 응답 계약을 소유하고, `runtime/reference-image/`가 브라우저 변환을 실행합니다. 원본 선택 상한은 10MB(`IMAGE_REFERENCE_UPLOAD_MAX_BYTES`)이며 JPEG·PNG·WebP를 받습니다. 브라우저 Worker에서 긴 변 최대 1024px(작은 이미지는 확대하지 않음), 비율·회전·투명도를 유지한 WebP로 변환합니다. 품질 85→75→65→55 순서로 시도하고, 1MB를 넘으면 긴 변 896→768px로 축소해 재시도합니다. WASM 인코더는 첨부할 때만 로드합니다. 변환 결과가 1MB(`IMAGE_REFERENCE_MAX_BYTES`)를 넘거나 변환에 실패하면 원본을 대신 보내지 않고 안내합니다. 미리보기와 전송은 같은 변환 결과를 사용하며, 변환 중 생성은 차단하고 재선택·삭제·프로파일 전환 시 이전 작업을 취소합니다. 서버는 첨부 바이트 상한과 실제 이미지 형식을 다시 검증합니다. 저장된 생성 결과를 ID로 참조하는 경로와 생성 출력 해상도는 이 변환의 대상이 아닙니다. **첨부는 프롬프트를 물려주지 않으므로 프롬프트가 필수입니다.** 프로파일이 `참조 이미지 첨부` feature를 열지 않았으면 화면이 무엇을 보내든 서비스가 컨트롤러 입력 오류로 거부합니다.

Creator는 published 프로파일을 선택해 생성하고, AI Chat은 `listImageProfiles`로 사용 가능한 프로파일을 확인한 뒤 `generateImage`에 `profileId`를 전달합니다.

## 3. 표면

| Surface | 상태 | 진입점 |
| --- | --- | --- |
| [Page](../surfaces/page.md) | 구현 | `/studio/image` 또는 `/studio/image/:profileSlug` — 프롬프트 입력 → 후보 그리드 → 택1 |
| [AI Chat](../surfaces/ai-chat.md) | 구현 | agent tool `generateImage`로 대화 중 생성, 후보를 챗에 렌더 |
| MCP | 구현 | `generateBrandImage`가 published 프로파일로 원본을 저장하고 MCP 이미지 미리보기와 원본 URL을 반환 |
| [REST](../surfaces/rest.md) | 구현 | `POST /api/generate-image`(same-origin, 인증 필수), `POST /api/admin/generate-image`(Manager 전용) |
| Slack | 계획 | — |

## 4. 의존

- 이미지 프로바이더: 기존 프로파일은 OpenAI `gpt-image-2`, Technical Illustration은 Google `gemini-3.1-flash-lite-image`를 사용합니다. 일반형 `gemini-3.1-flash-image`도 프로파일에서 선택할 수 있습니다. 프로파일이 모델 프리셋을 선택하고 Runtime Manifest가 capability를 발행하며 코어 생성 서비스가 공급자를 결정합니다.
- Vercel AI SDK `generateImage`. Google은 provider options의 `imageConfig`, OpenAI는 Images API의 `size`를 사용합니다.
- Google 직접 호출은 `@ai-sdk/google`과 서버의 `GEMINI_API_KEY`를 사용하며 AI Gateway를 거치지 않습니다.
- 프로파일 저장소: Payload CMS의 published `image-profiles` 컬렉션. `slug`가 있는 프로파일은 `displayOrder` 순서로 Studio 내비게이션과 `/studio/image/:profileSlug` 경로에 노출됩니다.
- 프로파일 정규화: 유저 프롬프트 후보가 있는 프로파일만 Anthropic Haiku 구조화 출력을 사용합니다. 후보가 없는 정적 프로파일은 정규화 모델을 호출하지 않습니다.
- Review 미사용(의도적) — 이미지 검수 성능이 아직 일부 항목에 한정되어 있어 생성 품질을 검수에 묶지 않습니다.
- 키가 없으면 불가: 프리셋이 요구하는 키(`OPENAI_API_KEY` 또는 `GEMINI_API_KEY`)가 없으면 다른 모델로 대체하지 않고 실패합니다. dev 폴백은 없습니다.

## 5. 크로스커팅

- 유료 호출 인증·게이트: [07. 보안](../07-security.md)
- 사용자 노출 문구·접근성: [08. 접근성과 다국어](../08-accessibility-i18n.md)
- 도메인 위치(제작 관리 / AssetGeneration): [04. 도메인 모델](../04-domain-model.md) — 현재는 요청 범위 생성이고, `AssetGenerationSession`은 사용량 추적용 계획 모델입니다.
