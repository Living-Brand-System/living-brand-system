import { createPublishedApplicationImage } from '../repositories/application-image.payload.repository'

/**
 * 다른 경계(스튜디오 미리보기 등)가 Application Image를 만드는 유일한 입구(경계 규칙 R1).
 * 권한은 Payload access가 요청자 기준으로 집행한다 — 여기서 다시 묻지 않는다.
 */
export const storePublishedApplicationImage = createPublishedApplicationImage
