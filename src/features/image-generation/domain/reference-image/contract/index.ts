/** 브라우저에서 선택할 원본 첨부의 상한. 변환 후 전송 상한은 별도로 적용한다. */
export const IMAGE_REFERENCE_UPLOAD_MAX_BYTES = 10_000_000

/** 브라우저 변환 후 API로 보내는 첨부 상한. 원본 선택 상한과 구분한다. */
export const IMAGE_REFERENCE_MAX_BYTES = 1_000_000
export const IMAGE_REFERENCE_MAX_EDGE = 1024

/** decodeImageDataUri가 실제로 통과시키는 형식과 같아야 한다 — 다르면 화면이 통과시킨 파일을 서버가 거절한다. */
export const IMAGE_REFERENCE_UPLOAD_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

/** Worker가 반환하는 변환 이미지 또는 사용자에게 안내할 실패 사유. */
export type ReferenceImageResult = Blob | { error: string }
