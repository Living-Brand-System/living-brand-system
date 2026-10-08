/**
 * 계정 설정의 공개 입구 — 다른 경계가 `users`의 기능별 필드를 읽고 쓰는 유일한 길(경계 규칙 R1·R3).
 * ai-usage는 한도 설정을, template-import는 Figma 토큰을 여기로 읽는다. 권한 판정은 호출부가
 * 요청자 본인 id만 넘기는 것으로 끝난다 — 필드 자체는 본인에게도 숨겨져 있다.
 */
export {
	deleteFigmaToken,
	findFigmaToken,
	findUserTokenLimits,
	saveFigmaToken,
} from '../repositories/user-settings.payload.repository'
