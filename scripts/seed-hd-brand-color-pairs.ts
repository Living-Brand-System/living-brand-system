import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * brand-color-pairs에 HD현대 듀오 컬러 정본을 시드한다. 색 자체는 brand-colors가 소유하므로
 * 먼저 `seed-hd-brand-colors.ts`가 돌아 있어야 하고, 여기서는 hex로 그 문서를 찾아 참조만 건다.
 *
 * - 재실행 안전: (바탕, 위 색) 짝으로 찾아 있으면 이름·게시 상태를 목표로 수렴, 없으면 생성한다.
 * - 🔴 update에 _status를 명시한다. drafts가 켜진 컬렉션이라 생략하면 게시분이 초안으로 내려간다.
 * - 🔴 대상 DB에 `add_brand_color_pairs` 마이그레이션이 먼저 적용돼 있어야 한다.
 *
 * 실행: pnpm payload run scripts/seed-hd-brand-color-pairs.ts
 * 대상 DB는 DATABASE_URL이 정한다. 공유 DB에 넣으려면 그 URL을 명시적으로 앞에 붙일 것.
 */

// 출처: Figma 328:6058 스튜디오 색 조합(스튜디오 공용 스와치였던 14쌍). [위 색, 바탕] 순서다.
// 🔴 Figma의 #DFE4F4는 배경 예시 페이지 값이라 정본(오버뷰) HD LIGHT BLUE #DCF0F5로 옮겼다
//    (`seed-hd-brand-colors.ts`의 오버뷰 채택 규칙과 같다).
// ponytail: 배열 순서가 곧 스와치 순서다 — 컬렉션이 생성 순서로 정렬한다.
const PAIRS: readonly (readonly [foreground: string, background: string])[] = [
	['#73D75A', '#DCF5D2'],
	['#73D75A', '#00AF41'],
	['#73D75A', '#007332'],
	['#73D75A', '#00280A'],
	['#DCF5D2', '#00280A'],
	['#DCF5D2', '#73D75A'],
	['#DCF5D2', '#00AF41'],
	['#DCF5D2', '#007332'],
	['#007332', '#00280A'],
	['#007332', '#73D75A'],
	['#007332', '#00AF41'],
	['#003087', '#DCF0F5'],
	['#DCF0F5', '#003087'],
	['#003087', '#000A32'],
]

const payload = await getPayload({ config })

const colors = await payload.find({
	collection: 'brand-colors',
	where: { _status: { equals: 'published' } },
	limit: 500,
	depth: 0,
	overrideAccess: true,
})
const byHex = new Map(colors.docs.map((doc) => [doc.hex.toUpperCase(), doc]))

let created = 0
let updated = 0
const missing: string[] = []

for (const [foregroundHex, backgroundHex] of PAIRS) {
	const foreground = byHex.get(foregroundHex)
	const background = byHex.get(backgroundHex)
	if (!foreground || !background) {
		// 🔴 없는 색을 만들지 않는다 — 색 정본은 brand-colors 시드가 소유한다.
		missing.push(`${foregroundHex} on ${backgroundHex}`)
		continue
	}
	const data = {
		name: `${foreground.name} on ${background.name}`,
		background: background.id,
		foreground: foreground.id,
		_status: 'published' as const,
	}
	const found = await payload.find({
		collection: 'brand-color-pairs',
		where: {
			and: [
				{ background: { equals: background.id } },
				{ foreground: { equals: foreground.id } },
			],
		},
		depth: 0,
		limit: 1,
		overrideAccess: true,
	})
	const existing = found.docs[0]
	if (existing) {
		await payload.update({
			collection: 'brand-color-pairs',
			id: existing.id,
			data,
			overrideAccess: true,
		})
		updated++
		console.log(`updated  ${data.name}`)
	} else {
		await payload.create({ collection: 'brand-color-pairs', data, overrideAccess: true })
		created++
		console.log(`created  ${data.name}`)
	}
}

if (missing.length > 0) console.log(`⚠️ 브랜드 색이 없어 건너뜀: ${missing.join(', ')}`)
console.log(`생성 ${created} · 갱신 ${updated} (총 ${PAIRS.length})`)
process.exit(missing.length > 0 ? 1 : 0)
