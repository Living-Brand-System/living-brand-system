import type { ControllerValues } from '@/modules/studio-controller/controller-definition'

/**
 * 매니페스트의 기본값을 타입 좁히기와 함께 읽는다 — 스코프 밖이거나 admin이 컨트롤을 지웠을 때
 * 위젯이 `undefined`로 그려지지 않게 한다.
 *
 * ponytail: 위젯이 controlId 문자열로 값을 집는다. 매니페스트와 위젯이 id로 묶이는 것이 지금의
 * 천장이고, 올릴 길은 매니페스트가 위젯이 읽을 타입까지 함께 발행하는 것이다(2026-08-18 보류).
 */
export function controllerNumber(values: ControllerValues, id: string, fallback: number): number {
	const value = values[id]
	return typeof value === 'number' ? value : fallback
}

/** 🔑 `select` 값을 읽는다. 허용 목록을 함께 받아, admin이 선택지를 좁혔거나 스코프 밖일 때
 *  위젯이 알 수 없는 문자열로 그려지지 않게 한다. */
export function controllerString<T extends string>(
	values: ControllerValues,
	id: string,
	allowed: readonly T[],
	fallback: T,
): T {
	const value = values[id]
	return typeof value === 'string' && (allowed as readonly string[]).includes(value)
		? (value as T)
		: fallback
}

export function controllerBoolean(
	values: ControllerValues,
	id: string,
	fallback: boolean,
): boolean {
	const value = values[id]
	return typeof value === 'boolean' ? value : fallback
}
