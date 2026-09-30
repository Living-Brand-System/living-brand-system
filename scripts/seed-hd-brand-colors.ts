import config from '@payload-config'
import { getPayload } from 'payload'

/**
 * brand-colors + brand-color-groups에 HD현대 브랜드 컬러 정본을 시드한다.
 *
 * 색을 추가·수정할 때는 아래 GROUPS만 고치고 다시 실행한다.
 * - 재실행 안전: 이름으로 찾아 없으면 생성, 있으면 목표 상태로 수렴시킨다(건너뛰기가 아니라 update).
 *   값이 나중에 바뀌므로 "존재하면 skip"이면 틀린 값을 영영 못 고친다.
 * - 🔴 update에 _status를 명시한다. drafts가 켜진 컬렉션이라 생략하면 게시분이 초안으로 내려간다.
 *
 * 실행: pnpm payload run scripts/seed-hd-brand-colors.ts
 * 대상 DB는 DATABASE_URL이 정한다. 공유 DB에 넣으려면 그 URL을 명시적으로 앞에 붙일 것.
 */

type HdColor = {
	name: string
	/** 대문자 hex. SVG 아트워크에서 직접 뽑은 값이다. */
	hex: string
	/** 이 배경 위에 CI 기본형(Full Color)을 올릴 수 있는가. */
	full?: boolean
	/** 이 배경 위에 CI WHITE 워드마크를 올릴 수 있는가. */
	white?: boolean
	/** 이 배경 위 CI 단색분리형의 색. 단색형은 모든 배경에서 쓸 수 있고 색만 갈린다. */
	mono: 'black' | 'white'
	/** 정본 표의 인쇄 CMYK 표기. 인쇄 PDF가 이 값을 잉크로 읽는다(`parseCmykNotation`). */
	cmyk?: string
	/** 정본 표의 PMS 표기. */
	pantone?: string
}

// 로고 사용 규칙을 짧게 쓰기 위한 헬퍼. `full`·`white`는 생략하면 false다.
const light = (name: string, hex: string): HdColor => ({ name, hex, full: true, mono: 'black' })
const dark = (name: string, hex: string): HdColor => ({ name, hex, white: true, mono: 'white' })
/** 기본형도 WHITE 워드마크도 못 올리는 배경(Primary 4색). 단색형만 가능하다. */
const logoless = (name: string, hex: string, mono: 'black' | 'white'): HdColor => ({
	name,
	hex,
	mono,
})
/**
 * 정본 표(B.5 COLOR)의 CMYK·PMS 표기를 붙인다.
 * 🔴 표에 값이 없는 색은 부르지 않는다 — 없는 것을 계산으로 메우지 않는다.
 */
const ink = (color: HdColor, cmyk: string, pantone?: string): HdColor => ({
	...color,
	cmyk,
	...(pantone ? { pantone } : {}),
})

// 출처: 0730_HD_Guidlines_All-51.svg (COLOR OVERVIEW 페이지) 아트워크에서 직접 추출, 2026-08-06.
// 🔴 CMYK·PMS는 가이드라인 표기를 그대로 옮긴다(사용자 지시, 2026-08-06). 2026-09-09에 실값이 도착해
//    색별로 갈랐다 — 전부 같았던 옛 플레이스홀더(`C 0 M 100 Y 90 K 0`·`485 C`)는 지웠다.
//    🔴 값의 정본은 브랜드 가이드라인이고 우리는 옮기기만 한다. 인쇄 사고가 나면 가이드라인을 고친다
//       (사용자 지시, 2026-09-09) — 총 잉크량·순수 검정 같은 판단으로 여기 값을 손대지 않는다.
//    🔴 Mono Color 8단은 아직 옮기지 않았다. 정본 표(#FAFAFA·#E1E1E1·#C8C8C8·#969696·#646464·
//       #3C3C3C·#1E1E1E·#000000)와 아래 Brightness Variation 11단이 hex도 이름도 다른 별개 체계라,
//       어느 쪽이 색 문서가 되는지 정해지기 전에 값을 심으면 두 번 심게 된다. BLACK만 hex가 같아 넣었다.
//    표에 함께 적힌 RGB·HEX는 옮기지 않는다. 확정된 hex와 어긋나기 때문이다
//    (표의 HEX는 14칸 모두 #F00F0F, DISCOVERY BLUE·grey 4종은 RGB도 같은 플레이스홀더다).
//    화면의 RGB는 저장값이 아니라 hex에서 파생한다.
// 🔴 오버뷰 페이지와 배경 예시 페이지의 값이 어긋나는 색이 둘 있다. 오버뷰를 정본으로 채택했다.
//    HD DISCOVERY BLUE #003087(오버뷰) vs #002F87(배경 예시)
//    HD LIGHT BLUE     #DCF0F5(오버뷰) vs #DFE4F4(배경 예시)
// 🔴 MIDDLE GREY가 두 개다. 정본이 그렇게 부른다 — 임의로 구분자를 붙이지 않는다.
//
// 색과 그룹은 별개다. 같은 색이 여러 그룹에 속할 수 있고 팔레트 순서는 그룹이 소유하므로,
// 색 문서에는 그룹 이름을 쓰지 않고 그룹이 색을 순서 있는 관계로 참조한다.
// ponytail: 그래서 여기 배열 순서가 곧 팔레트 순서다. 별도 정렬 필드를 두지 않는다.
// 색은 여기 한 번만 정의하고 그룹은 참조만 한다. 같은 색이 여러 그룹에 들어가는데
// 로고 사용 규칙은 배경색에 딸린 것이라, 그룹마다 다시 적으면 값이 갈릴 수 있다.
//
// 🔴 Brightness Variation 11단 중 5단(10/30/50/70/90%)은 브랜드팀 팔레트 표에 없다.
//    SVG-53 아트워크가 `#FFFFFF → #393636` 선형 블렌드로 그려낸 값이라 이름도 퍼센트뿐이다.
//    나머지 6단은 Mono Color와 같은 색이라 문서를 공유한다(20%=LIGHT GREY, 40%·60%=MIDDLE GREY, 80%=DARK GREY).
const COLORS = {
	ecoGreen: ink(logoless('HD ECO GREEN', '#73D75A', 'black'), 'C 55 M 0 Y 90 K 0', '7488 C'),
	heritageGreen: ink(
		logoless('HD HERITAGE GREEN', '#00AF41', 'black'),
		'C 80 M 0 Y 100 K 0',
		'354 C',
	),
	prosperityGreen: ink(
		logoless('HD PROSPERITY GREEN', '#007332', 'white'),
		'C 100 M 30 Y 100 K 25',
		'356 C',
	),
	discoveryBlue: ink(
		logoless('HD DISCOVERY BLUE', '#003087', 'white'),
		'C 100 M 80 Y 0 K 25',
		'287 C',
	),
	lightGreen: ink(light('HD LIGHT GREEN', '#DCF5D2'), 'C 15 M 0 Y 20 K 0', '2254 C'),
	// 🔴 정본 표는 이 칸의 이름을 「HD LIGHT GREEN」으로 적었지만 hex가 파란색이고 PMS 290 C도
	//    파랑이다. 표의 오기로 보고 리포의 이름을 유지한다.
	lightBlue: ink(light('HD LIGHT BLUE', '#DCF0F5'), 'C 10 M 0 Y 0 K 0', '290 C'),
	deepGreen: ink(dark('HD DEEP GREEN', '#00280A'), 'C 80 M 55 Y 80 K 75', '3537 C'),
	deepBlue: ink(dark('HD DEEP BLUE', '#000A32'), 'C 100 M 70 Y 0 K 80', '2758 C'),
	white: light('WHITE', '#FFFFFF'),
	grey10: light('GREY 10%', '#E9E9E9'),
	lightGrey: light('LIGHT GREY', '#D3D2D2'),
	grey30: light('GREY 30%', '#BDBCBC'),
	middleGreyLight: light('MIDDLE GREY', '#A7A6A6'),
	grey50: light('GREY 50%', '#918F90'),
	middleGreyDark: dark('MIDDLE GREY', '#7B7979'),
	grey70: dark('GREY 70%', '#656263'),
	darkGrey: dark('DARK GREY', '#4F4C4D'),
	grey90: dark('GREY 90%', '#393636'),
	// 🔴 총 잉크량 318%로 CRPC6 상한(300%)을 넘는다. 정본이 그렇게 적혀 있어 그대로 옮긴다 —
	//    인쇄소가 반려하면 고칠 곳은 이 파일이 아니라 가이드라인이다.
	black: ink(dark('BLACK', '#000000'), 'C 94 M 77 Y 53 K 94'),
} satisfies Record<string, HdColor>

const GROUPS: { name: string; colors: HdColor[] }[] = [
	{
		name: 'Primary Color',
		colors: [
			COLORS.ecoGreen,
			COLORS.heritageGreen,
			COLORS.prosperityGreen,
			COLORS.discoveryBlue,
		],
	},
	{
		name: 'Secondary Color',
		colors: [COLORS.lightGreen, COLORS.deepGreen, COLORS.lightBlue, COLORS.deepBlue],
	},
	{
		name: 'Mono Color',
		colors: [
			COLORS.white,
			COLORS.lightGrey,
			COLORS.middleGreyLight,
			COLORS.middleGreyDark,
			COLORS.darkGrey,
			COLORS.black,
		],
	},
	// 같은 색을 계열로 다시 묶은 것. 용도별(Primary/Secondary/Mono) 묶음과 공존한다 —
	// 색과 그룹이 별개라 한 색이 두 묶음에 동시에 들어갈 수 있고, 색 문서는 하나뿐이다.
	// 행 안의 순서는 밝은 색 → 어두운 색. Mono가 원래 그 순서라 나머지도 맞췄다.
	{
		name: '초록 계열',
		colors: [
			COLORS.lightGreen,
			COLORS.ecoGreen,
			COLORS.heritageGreen,
			COLORS.prosperityGreen,
			COLORS.deepGreen,
		],
	},
	{
		name: '파랑 계열',
		colors: [COLORS.lightBlue, COLORS.discoveryBlue, COLORS.deepBlue],
	},
	{
		name: '검정 계열',
		colors: [
			COLORS.white,
			COLORS.lightGrey,
			COLORS.middleGreyLight,
			COLORS.middleGreyDark,
			COLORS.darkGrey,
			COLORS.black,
		],
	},
	// SVG-52의 배경 예시 10색. 로고를 얹어 보이는 순서가 그대로 정본이라 계열 묶음과 순서가 다르다
	// (밝기순이 아니라 Primary → Secondary → 무채색). 그래서 별도 그룹으로 둔다.
	{
		name: 'Background Color',
		colors: [
			COLORS.ecoGreen,
			COLORS.heritageGreen,
			COLORS.prosperityGreen,
			COLORS.discoveryBlue,
			COLORS.lightGreen,
			COLORS.lightBlue,
			COLORS.white,
			COLORS.deepGreen,
			COLORS.deepBlue,
			COLORS.black,
		],
	},
	// SVG-53의 흰색→검정 11단. 가이드라인 본문이 이걸 "Brightness Variation"이라고 부른다
	// (사용 금지 규정 6번: "Brightness Variation중 명도 대비가 낮은 배색을 사용할 수 없습니다").
	// 로고 전환 경계는 50%/60% — 여기까지가 기본형·검정 단색형, 여기부터가 WHITE 워드마크·흰 단색형이다.
	{
		name: 'Brightness Variation',
		colors: [
			COLORS.white,
			COLORS.grey10,
			COLORS.lightGrey,
			COLORS.grey30,
			COLORS.middleGreyLight,
			COLORS.grey50,
			COLORS.middleGreyDark,
			COLORS.grey70,
			COLORS.darkGrey,
			COLORS.grey90,
			COLORS.black,
		],
	},
]

const payload = await getPayload({ config })

// 이름 비교는 대소문자를 무시한다. 앞선 실행이 `HD prosperity GREEN`처럼 다른 표기로 넣어둬서,
// 대소문자를 따지면 같은 색을 고치는 대신 새로 만들고 틀린 값이 그대로 남는다.
// hex는 키에 넣지 않는다 — 틀린 hex를 고치는 게 이 스크립트의 일인데 키에 넣으면 못 고친다.
const existing = await payload.find({
	collection: 'brand-colors',
	limit: 500,
	depth: 0,
	sort: 'createdAt',
	overrideAccess: true,
})

// 이름당 id 큐. MIDDLE GREY처럼 이름이 겹치는 색은 앞에서부터 하나씩 집어가 서로 다른 문서에 붙는다.
const unclaimed = new Map<string, number[]>()
for (const doc of existing.docs) {
	const key = doc.name.toUpperCase()
	const queue = unclaimed.get(key)
	if (queue) queue.push(doc.id)
	else unclaimed.set(key, [doc.id])
}

let created = 0
let updated = 0

// 🔴 색은 그룹마다가 아니라 딱 한 번만 만든다. 같은 색이 여러 그룹에 들어가므로(용도별·계열별)
//    그룹 루프 안에서 upsert하면 같은 색 문서가 묶음 수만큼 복제된다.
//    키는 이름+hex다 — MIDDLE GREY가 hex만 다른 두 건이라 이름만으로는 못 가른다.
const colorKey = (c: HdColor) => `${c.name.toUpperCase()}|${c.hex.toUpperCase()}`
const uniqueColors = new Map<string, HdColor>()
for (const group of GROUPS) {
	for (const color of group.colors) uniqueColors.set(colorKey(color), color)
}

const idByColor = new Map<string, number>()
for (const [key, color] of uniqueColors) {
	const data = {
		name: color.name,
		hex: color.hex,
		// 그룹은 이제 brand-color-groups가 소유한다. 색에 남아 있던 옛 그룹 문자열을 지운다.
		colorGroup: null,
		// 🔴 정본에 값이 없는 색은 비운다. 옛 플레이스홀더가 남아 있으면 인쇄가 틀린 잉크로 나간다.
		cmyk: color.cmyk ?? null,
		pantone: color.pantone ?? null,
		// 배경으로 썼을 때의 로고 사용 규칙. 규정이라 계산하지 않고 정본을 그대로 담는다.
		allowsFullColorLogo: color.full ?? false,
		allowsWhiteWordmark: color.white ?? false,
		monoLogoFill: color.mono,
		// 🔴 명시하지 않으면 최신 초안 버전을 따라가 게시분이 초안으로 내려간다.
		_status: 'published' as const,
	}

	const id = unclaimed.get(color.name.toUpperCase())?.shift()
	if (id) {
		await payload.update({ collection: 'brand-colors', id, data, overrideAccess: true })
		idByColor.set(key, id)
		updated++
		console.log(`updated  ${color.name.padEnd(22)} ${color.hex}`)
	} else {
		const doc = await payload.create({ collection: 'brand-colors', data, overrideAccess: true })
		idByColor.set(key, doc.id)
		created++
		console.log(`created  ${color.name.padEnd(22)} ${color.hex}`)
	}
}

for (const group of GROUPS) {
	const colorIds = group.colors
		.map((c) => idByColor.get(colorKey(c)))
		.filter((id): id is number => id != null)

	const groupData = { name: group.name, colors: colorIds, _status: 'published' as const }
	const found = await payload.find({
		collection: 'brand-color-groups',
		where: { name: { equals: group.name } },
		depth: 0,
		limit: 1,
		overrideAccess: true,
	})

	const existingGroup = found.docs[0]
	if (existingGroup) {
		await payload.update({
			collection: 'brand-color-groups',
			id: existingGroup.id,
			data: groupData,
			overrideAccess: true,
		})
		console.log(`group    ${group.name.padEnd(22)} ${colorIds.length}색 갱신\n`)
	} else {
		await payload.create({
			collection: 'brand-color-groups',
			data: groupData,
			overrideAccess: true,
		})
		console.log(`group    ${group.name.padEnd(22)} ${colorIds.length}색 생성\n`)
	}
}

// 정본에 없는데 남아 있는 색은 알리기만 한다. 다른 문서가 참조 중일 수 있어 지우지 않는다.
const leftover = [...unclaimed.values()].flat()
if (leftover.length > 0)
	console.log(`⚠️ 정본 밖 색 ${leftover.length}건 남음 (id: ${leftover.join(', ')})`)

const total = GROUPS.reduce((n, g) => n + g.colors.length, 0)
console.log(`생성 ${created} · 갱신 ${updated} (총 ${total})`)
process.exit(0)
