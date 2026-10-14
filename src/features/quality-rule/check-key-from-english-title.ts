import { toSlug } from '@/lib/slug'

/** 영문 Rule 제목을 저장 가능한 안정 key로 바꾼다. Payload field config와 외부 I/O에 의존하지 않는다. */
export function checkKeyFromEnglishTitle(value: unknown): string {
	return toSlug(value)
}
