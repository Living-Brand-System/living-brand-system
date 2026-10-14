/**
 * 생성 요청 상한의 단일 소유 — 라우트 검증·카메라 조정 스키마·스튜디오 편집 계약이 모두 여기서 읽는다.
 * 값의 최종 강제는 서버(zod)가 하고, 계약은 이 목록을 화면에 노출할 선택지로만 옮긴다.
 */

export const IMAGE_PROMPT_MAX_LENGTH = 500

export const IMAGE_BATCH_SIZES = [1, 2, 3, 4] as const

export const IMAGE_BATCH_MAX = IMAGE_BATCH_SIZES[IMAGE_BATCH_SIZES.length - 1]

export const IMAGE_BATCH_DEFAULT = 4

/**
 * 어드민 생성(`/api/admin/generate-image`)의 상한 — 프로파일을 저장 전에 시험하는 자리라 일부러 넓다
 * (2026-08-03 「이미지 생성 프롬프트 제한 확장」). 스튜디오·에이전트·MCP는 위의 상한을 쓴다.
 */
export const ADMIN_IMAGE_PROMPT_MAX_LENGTH = 2_500
export const ADMIN_IMAGE_BATCH_MAX = 6
