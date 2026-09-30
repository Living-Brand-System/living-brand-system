/**
 * 생성 요청 상한의 단일 소유 — 라우트 검증·카메라 조정 스키마·스튜디오 편집 계약이 모두 여기서 읽는다.
 * 값의 최종 강제는 서버(zod)가 하고, 계약은 이 목록을 화면에 노출할 선택지로만 옮긴다.
 */

export const IMAGE_PROMPT_MAX_LENGTH = 500

export const IMAGE_BATCH_SIZES = [1, 2, 3, 4] as const

export const IMAGE_BATCH_MAX = IMAGE_BATCH_SIZES[IMAGE_BATCH_SIZES.length - 1]

export const IMAGE_BATCH_DEFAULT = 4
