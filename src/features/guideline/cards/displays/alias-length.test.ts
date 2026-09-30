import type { Field } from 'payload'
import { describe, expect, it } from 'vitest'
import { displayBlocks } from './registry'

// Postgres 식별자 한계. 넘으면 에러가 아니라 **조용히 잘린다** — 그래서 서로 다른 별칭이 같아진다.
const PG_IDENTIFIER_MAX = 63

// Payload가 조회 SQL에서 만드는 별칭은 dbName이 아니라 **slug**로 짜인다:
//   guideline_docs__blocks_<slug>[_<배열필드>][__locales]
// 버전 조회 접두사가 더 기니 그쪽으로 잰다.
const PREFIX = '_guideline_docs_v__blocks_'
const LOCALES = '__locales'

/** row·collapsible·tabs는 자기 레벨에 펴지고, array만 새 레벨을 만든다. */
type Level = { segment: string; hasLocales: boolean }

function levels(fields: Field[], segment = ''): Level[] {
	let hasLocales = false
	const nested: Level[] = []

	for (const field of fields) {
		if ('localized' in field && field.localized) hasLocales = true
		if (!('fields' in field) || !Array.isArray(field.fields)) continue

		if (field.type === 'array' && 'name' in field) {
			nested.push(...levels(field.fields, `${segment}_${field.name}`))
		} else {
			// row/collapsible/tabs — 같은 레벨로 편다.
			const flattened = levels(field.fields, segment)
			const own = flattened.find((l) => l.segment === segment)
			if (own?.hasLocales) hasLocales = true
			nested.push(...flattened.filter((l) => l.segment !== segment))
		}
	}

	return [{ segment, hasLocales }, ...nested]
}

describe('디스플레이(위젯)의 SQL 별칭 길이', () => {
	it.each(displayBlocks.map((w) => [w.slug, w] as const))('%s', (slug, widget) => {
		for (const level of levels(widget.fields)) {
			// locales 테이블은 그 레벨에 localized 필드가 있을 때만 생긴다.
			const aliases = [
				`${PREFIX}${slug}${level.segment}`,
				...(level.hasLocales ? [`${PREFIX}${slug}${level.segment}${LOCALES}`] : []),
			]
			for (const alias of aliases) {
				expect(
					alias.length,
					`별칭 ${alias.length}자 > ${PG_IDENTIFIER_MAX}: ${alias}\n` +
						`→ slug나 배열 필드 이름을 줄여라. 잘리면 별칭이 겹쳐 조인이 엉뚱한 테이블을 물고 ` +
						`"operator does not exist: character varying = integer"로 죽는다(2026-08-06 실제 사고).`,
				).toBeLessThanOrEqual(PG_IDENTIFIER_MAX)
			}
		}
	})
})
