/**
 * 주소·키로 쓰는 slug 규칙 — 템플릿·가이드라인 slug, 검수 규칙 key, 시나리오 key가 같은 규칙을 쓴다.
 * 서버 검증(컬렉션 필드)과 클라이언트 사전 검사(Manager mode 폼)가 이 한 곳을 읽는다.
 */
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** 영문 소문자·숫자만 남기고 나머지 연속 구간은 하이픈 하나로 — 한글만 있으면 빈 값이다. */
export const toSlug = (value: unknown): string =>
	typeof value === 'string'
		? value
				.trim()
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, '-')
				.replace(/^-+|-+$/g, '')
		: ''
