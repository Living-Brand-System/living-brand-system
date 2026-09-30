import { describe, expect, it } from 'vitest'
import {
	CLEAR_SPACE_MODES,
	type ClearSpaceMode,
	type Column,
	clearSpaceFor,
	columnArea,
	deriveLockups,
	diagramSpec,
	fontSizeFor,
	type Lockup,
	lockupHeight,
	OVERSEAS_BRANCHES,
	partialColumnArea,
	STAGE_HEIGHT,
	SUBSIDIARIES,
	splitScripts,
	TIERS,
	tierFor,
	trimFor,
} from './rules'

// 락업 비율은 눈대중으로 못 고치게 막아 둔 값이라, 틀어졌을 때 알려 줄 것이 필요하다.
// 화면으로는 1px 차이를 못 잡는다 — 스펙이 따로 적어 둔 영역 높이가 유일한 검산식이다.

/** 모든 단계 × 모든 자회사 × 모든 지부. 검산은 열거가 아니라 파생 결과 전체에 걸어야 의미가 있다. */
const ALL: Lockup[] = TIERS.flatMap((tier) =>
	SUBSIDIARIES.flatMap((subsidiary) =>
		OVERSEAS_BRANCHES.flatMap((branch) => deriveLockups({ tier, subsidiary, branch })),
	),
)

/**
 * 검산 대상 열. 두 가지를 뺀다:
 * - **구분바 열** — 행이 없다.
 * - **하단정렬 열** — 2행 그리드에 1행만 놓은 것이라 행 합이 영역보다 작은 게 맞다
 *   (해외지사 지역명이 1개일 때). 영역은 그 열이 차지하는 자리이고 행 배치는 별개다.
 */
const checkedColumns = (lockup: Lockup): Column[] =>
	lockup.columns.filter((c) => c.bar === undefined && c.align !== 'bottom')

describe('CI 락업 조립 규칙', () => {
	it('영역 높이가 명시된 락업은 모든 열이 그 높이로 닫힌다', () => {
		const checked = ALL.filter((lockup) => lockup.area !== undefined)
		// 검산할 대상이 하나도 없으면 이 테스트는 아무것도 지키지 않는다.
		expect(checked.length).toBeGreaterThan(0)

		for (const lockup of checked) {
			for (const column of checkedColumns(lockup)) {
				expect(
					columnArea(lockup, column),
					`${lockup.label} — 열(${column.rows.map((r) => r.text).join('/')})이 스펙 영역과 다르다`,
				).toBeCloseTo(lockup.area as number, 10)
			}
		}
	})

	// 🔴 해외지사 가로형B는 0.9H가 총합이 아니라 앞 3행이다. 총합에 걸면 1.12H로 어긋난다.
	it('부분 영역이 명시된 락업은 앞 몇 행까지가 그 높이로 닫힌다', () => {
		const checked = ALL.filter((lockup) => lockup.partialArea !== undefined)
		expect(checked.length).toBeGreaterThan(0)

		for (const lockup of checked) {
			const { rows, value } = lockup.partialArea as { rows: number; value: number }
			for (const column of checkedColumns(lockup)) {
				expect(
					partialColumnArea(lockup, column, rows),
					`${lockup.label} — 앞 ${rows}행 합이 부분 영역과 다르다`,
				).toBeCloseTo(value, 10)
			}
		}
	})

	// 🔴 이 위젯이 성립하는 조건 — 정본은 라틴 대문자와 한글의 위아래 끝이 같은데(0.65H로 실측)
	//    배포 폰트는 한글을 24% 크게 그린다. 스크립트별 크기·트림이 그 차이를 흡수해야 한다.
	// ⚠️ 지키는 것은 **역산식**이지 실측값이 아니다. `FONT[script].ink` 숫자가 틀려도 이 테스트는 통과한다
	//    (양쪽이 같은 값을 쓰므로). 숫자의 근거는 `scripts/measure-cap-vs-hangul.py`뿐이다.
	it('스크립트가 달라도 그려지는 잉크 높이가 같다', () => {
		const cap = 0.65
		const h = 100
		for (const script of ['latin', 'hangul'] as const) {
			const trim = trimFor(script)
			// 줄상자(1em)에서 위아래 트림을 걷어낸 나머지가 눈에 보이는 높이다.
			expect(
				fontSizeFor(cap, h, script) * (1 + trim.top + trim.bottom),
				`${script} — 트림 후 남는 높이가 cap × H와 다르다`,
			).toBeCloseTo(cap * h, 10)
		}
	})

	it('한 줄을 스크립트가 바뀌는 자리에서 끊는다', () => {
		expect(splitScripts('HD현대')).toEqual([
			{ script: 'latin', text: 'HD' },
			{ script: 'hangul', text: '현대' },
		])
		expect(splitScripts('HD HYUNDAI')).toEqual([{ script: 'latin', text: 'HD HYUNDAI' }])
	})

	// 🔴 B.3 도판 9개가 전부 영문이다. 국문 해외지사 락업은 존재하지 않는다.
	it('해외지사에는 국문 락업이 없다', () => {
		const overseas = ALL.filter((lockup) => lockup.tier === 'overseas')
		expect(overseas.length).toBeGreaterThan(0)
		for (const lockup of overseas) {
			expect(lockup.label, `${lockup.key} — 해외지사에 국문 락업이 생겼다`).not.toContain(
				'국문',
			)
		}
	})

	// 🔴 자리표시 계열사는 이름이 실존과 구별되지 않는다(무난한 업종어를 쓰기로 했다). 그래서
	//    「실존만 도는 목록」을 만드는 유일한 근거가 이 플래그다 — 히어로가 이것으로 회전을 좁힌다.
	it('자리표시 계열사는 플래그로만 구별되고 정확히 하나다', () => {
		const placeholders = SUBSIDIARIES.filter((sub) => sub.placeholder)
		expect(placeholders).toHaveLength(1)
		// 목록 맨 끝이어야 한다 — 앞에 끼면 매니페스트 기본값(첫 항목)이 자리표시로 바뀐다.
		expect(SUBSIDIARIES.at(-1)?.placeholder).toBe(true)
		expect(SUBSIDIARIES[0].placeholder).toBeUndefined()
	})

	// 🔴 판 높이는 고정이라(선택마다 튀지 않게) 가장 높은 락업이 그 안에 들어가야 한다.
	//    스펙 값이 바뀌어 넘치면 화면에서 잘리는데, 잘린 로고는 가이드라인으로 성립하지 않는다.
	it('모든 락업이 클리어스페이스를 켠 채로도 고정 판 높이 안에 들어간다', () => {
		expect(ALL.length).toBeGreaterThan(0)
		let worst = { height: 0, label: '', mode: '' as ClearSpaceMode }
		for (const lockup of ALL) {
			for (const mode of CLEAR_SPACE_MODES) {
				const height = lockupHeight(lockup, clearSpaceFor(lockup.orientation, mode))
				if (height > worst.height) worst = { height, label: lockup.label, mode }
			}
		}
		expect(
			worst.height,
			`${worst.label}(여백 ${worst.mode})이 판 높이 ${STAGE_HEIGHT}H를 넘는다`,
		).toBeLessThanOrEqual(STAGE_HEIGHT)
	})

	// 🔴 정본 실측값이다(`clearSpaceFor` 주석). 눈대중으로 고치면 규정 여백이 틀어진다.
	it('여백 비율이 정본 실측값과 같다', () => {
		expect(clearSpaceFor('horizontal', 'normal')).toBe(0.5)
		expect(clearSpaceFor('vertical', 'normal')).toBe(0.4)
		expect(clearSpaceFor('horizontal', 'exception')).toBe(0.25)
		expect(clearSpaceFor('vertical', 'exception')).toBe(0.2)
		expect(clearSpaceFor('horizontal', 'off')).toBe(0)
	})

	it('락업 key가 겹치지 않는다', () => {
		for (const tier of TIERS) {
			const keys = deriveLockups({
				tier,
				subsidiary: SUBSIDIARIES[0],
				branch: OVERSEAS_BRANCHES[0],
			}).map((lockup) => lockup.key)
			expect(new Set(keys).size, `${tier} — key 중복`).toBe(keys.length)
		}
	})

	// 🔑 계층은 고르는 축이 아니라 켜기 두 개의 파생값이다. 「본사」 = 아무것도 켜지 않은 상태.
	it('켜기 조합이 계층으로 파생된다', () => {
		expect(tierFor(false, false)).toBe('ci')
		expect(tierFor(true, false)).toBe('subsidiary')
		expect(tierFor(true, true)).toBe('overseas')
	})

	// 🔴 지사명은 자회사명 위에 붙으므로 자회사가 꺼지면 성립하지 않는다. 지사 켜짐이 보관돼
	//    있어도 계층은 본사로 떨어져야 한다 — 이게 깨지면 자회사 없는 해외지사 락업을 그리게 된다.
	it('자회사가 꺼지면 지사 켜짐이 보관돼 있어도 본사다', () => {
		expect(tierFor(false, true)).toBe('ci')
	})

	/* ── 치수 도판 파생 ────────────────────────────────────────────────
	 * 🔑 도판은 손으로 적은 데이터가 아니라 Lockup에서 파생된다. 그래서 이 검산이 곧
	 *    "본사·자회사·해외지사 전부의 도판이 맞나"를 본다. 기대값은 정본 도판 실측치다
	 *    (정본 도판 3장 실측 — `docs/12-ci-lockup-canon.md`). */
	const overseas = (form: string) => {
		const lockup = deriveLockups({
			tier: 'overseas',
			subsidiary: SUBSIDIARIES[0],
			branch: OVERSEAS_BRANCHES[0],
		}).find((l) => l.form === form)
		if (!lockup) throw new Error(`락업 없음: ${form}`)
		return diagramSpec(lockup)
	}
	const sizeOf = (spec: ReturnType<typeof diagramSpec>, id: string) =>
		[...spec.cols, ...spec.rows].find((t) => t.id === id)?.v
	const labelOf = (spec: ReturnType<typeof diagramSpec>, id: string) =>
		spec.spans.find((s) => s.id === id)?.label
	const glyphOf = (spec: ReturnType<typeof diagramSpec>, id: string) =>
		spec.glyphs.find((glyph) => glyph.id === id)
	const envSum = (spec: ReturnType<typeof diagramSpec>) => {
		const [a, b] = spec.envRows
		return spec.rows.slice(a, b + 1).reduce((sum, t) => sum + (t.v ?? 0), 0)
	}

	it('가로형A — 열 간격과 행이 정본 값이다', () => {
		const d = overseas('horizontalA')
		expect(sizeOf(d, 'gapX:hd:0')).toBe(0.25)
		expect(sizeOf(d, 'gapX:name:0')).toBe(0.2)
		expect(sizeOf(d, 'gapX:bar')).toBe(0.2)
		expect(sizeOf(d, 'bar')).toBe(0.04)
		expect(sizeOf(d, 'gapX:branch:0')).toBe(0.2)
		expect(sizeOf(d, 'el:name:0')).toBe(0.28)
		expect(sizeOf(d, 'el:name:1')).toBe(0.28)
		expect(sizeOf(d, 'gapY:name:1')).toBe(0.09)
		expect(labelOf(d, 'span:area')).toBe('0.65H')
		// 🔴 HD가 행이 아니라 열이므로 묶음 게이지가 없어야 한다 — 파생이 꼴을 알아서 맞추는 증거
		expect(d.spans.some((s) => s.id.startsWith('span:group:'))).toBe(false)
		// 🔑 구분바 라벨만 아래로 내려간다(0.04H < 0.1H)
		expect(d.labelBelow).toEqual(['bar'])
	})

	/* 🔴 이 단정이 없어서 결함이 승인됐다 — 가로형A의 지역명 열은 행이 둘인데 렌더가 첫 행만
	      읽어 `R&D CENTER`가 통째로 사라져 있었다. */
	it('가로형A — 행을 갖지 않는 열의 글자가 모두 나온다', () => {
		const d = overseas('horizontalA')
		const texts = d.glyphs.map((glyph) => glyph.text)
		expect(texts).toContain('HD')
		expect(texts).toContain('EUROPE')
		expect(texts).toContain('R&D CENTER')
		// 🔑 지역명 2행은 계열사명 행 트랙에 k→k로 앉는다 — 리듬이 같아야 도판이 성립한다
		expect(glyphOf(d, 'el:branch:0')?.row).toBe('el:name:0')
		expect(glyphOf(d, 'el:branch:1')?.row).toBe('el:name:1')
		// HD는 행을 갖지 않고 영역 전체에 걸친다
		expect(glyphOf(d, 'el:hd:0')?.row).toBeUndefined()
	})

	it('가로형B — 영역 0.9H와 매달린 지역명 총 1.12H', () => {
		const d = overseas('horizontalB')
		expect(labelOf(d, 'span:area')).toBe('0.9H')
		expect(labelOf(d, 'span:group:hd')).toBe('0.4H')
		expect(labelOf(d, 'span:group:name')).toBe('0.4H')
		expect(labelOf(d, 'span:el:branch:0')).toBe('0.12H')
		expect(sizeOf(d, 'gapY:name:0')).toBe(0.1)
		expect(sizeOf(d, 'gapY:name:1')).toBe(0.06)
		// 🔴 매달린 간격은 영역 하단 기준이라 봉투 패딩 0.05H를 뺀 0.05H가 트랙이 된다.
		//    라벨은 규정값 0.1H를 그대로 적는다. 이게 깨지면 총높이가 1.17H가 된다.
		const hanging = d.rows.find((t) => t.id === 'gapY:branch:0')
		expect(hanging?.v).toBeCloseTo(0.05, 6)
		expect(hanging?.labelValue).toBe(0.1)
		const [, areaEnd] = d.areaRows
		expect(d.rows[areaEnd]?.id).toBe('el:name:1')
		expect(d.rows.length).toBeGreaterThan(areaEnd + 1)
	})

	it('세로형 — 심볼이 행이 되고 영역이 0.9H다', () => {
		const d = overseas('vertical')
		expect(d.rows[0]?.kind).toBe('sym')
		expect(sizeOf(d, 'gapY:hd:0')).toBe(0.2)
		// 🔑 세로형만 행 간격에 치수가 붙는다 — 정본 도판이 좌측에 0.2H를 적는다
		expect(labelOf(d, 'span:gapY:hd:0')).toBe('0.2H')
		expect(labelOf(d, 'span:area')).toBe('0.9H')
		expect(labelOf(d, 'span:group:hd')).toBe('0.3H')
		expect(labelOf(d, 'span:group:name')).toBe('0.3H')
		expect(sizeOf(d, 'gapY:name:1')).toBe(0.05)
		expect(d.rows.some((t) => t.kind === 'pad')).toBe(false)
	})

	/* 🔴 봉투는 **심볼**의 위·아래다. 세로형에서 텍스트 블록을 감싸면 `span:H`가 H라고 적힌 채
	      0.9H를 재게 된다 — 실제로 그랬다. */
	it('봉투는 세 꼴 모두 심볼 높이 1H다', () => {
		for (const form of ['horizontalA', 'horizontalB', 'vertical']) {
			expect(envSum(overseas(form)), `${form} — 봉투 합`).toBeCloseTo(1, 6)
		}
	})

	/* 🔑 「꼴을 바꿔도 새로 생기지 않고 이동한다」의 불변식. 축을 담지 않는 정체만 대상이다. */
	it('글자와 심볼은 세 꼴에서 같은 정체다', () => {
		const specs = {
			horizontalA: overseas('horizontalA'),
			horizontalB: overseas('horizontalB'),
			vertical: overseas('vertical'),
		}
		const shared = ['sym', 'el:hd:0', 'el:name:0', 'el:name:1', 'el:branch:0']
		for (const [form, d] of Object.entries(specs)) {
			const ids = [...d.cols, ...d.rows].map((t) => t.id).filter(Boolean)
			const glyphIds = d.glyphs.map((glyph) => glyph.id)
			for (const id of shared) {
				expect([...ids, ...glyphIds], `${form} — ${id}`).toContain(id)
			}
			expect(new Set(ids).size, `${form} — 트랙 id 중복`).toBe(ids.length)
			expect(new Set(glyphIds).size, `${form} — 글자 id 중복`).toBe(glyphIds.length)
		}
		/* 🔴 존재만이 아니라 **같은 것을 가리키는지**를 본다 — 이 단정이 없어서 HD가 꼴마다 다른
		      노드였던 것이 통과했다. */
		for (const id of ['el:hd:0', 'el:name:0', 'el:name:1']) {
			const a = glyphOf(specs.horizontalA, id)?.text
			expect(glyphOf(specs.horizontalB, id)?.text, `${id} — A vs B`).toBe(a)
			expect(glyphOf(specs.vertical, id)?.text, `${id} — A vs 세로형`).toBe(a)
		}
	})

	/* 🔴 간격은 **방향이 곧 성격**이라 축이 다르면 다른 정체여야 한다(사용자 지정 2026-08-19).
	      한 정체로 묶으면 꼴 전환에서 그 요소가 축을 가로질러 날아가 정신없어진다. */
	it('축이 다른 간격은 다른 정체다', () => {
		const a = overseas('horizontalA')
		const b = overseas('horizontalB')
		const v = overseas('vertical')
		const idsOf = (d: ReturnType<typeof diagramSpec>) =>
			[...d.cols, ...d.rows].map((t) => t.id).filter(Boolean)

		// HD↔회사명 간격: 가로형A는 **열**(0.2H), 가로형B·세로형은 **행**(0.1H)
		expect(a.cols.some((t) => t.id === 'gapX:name:0')).toBe(true)
		expect(idsOf(a)).not.toContain('gapY:name:0')
		expect(b.rows.some((t) => t.id === 'gapY:name:0')).toBe(true)
		expect(idsOf(b)).not.toContain('gapX:name:0')
		expect(v.rows.some((t) => t.id === 'gapY:name:0')).toBe(true)

		// 심볼↔워드마크 간격: 가로형은 열, 세로형은 행
		expect(a.cols.some((t) => t.id === 'gapX:hd:0')).toBe(true)
		expect(v.rows.some((t) => t.id === 'gapY:hd:0')).toBe(true)
		expect(idsOf(v)).not.toContain('gapX:hd:0')

		// 모든 간격 id가 축 접두어를 갖는다
		for (const [form, d] of Object.entries({ a, b, v })) {
			for (const track of [...d.cols, ...d.rows]) {
				if (track.kind !== 'gap') continue
				expect(track.id, `${form} — ${track.id}`).toMatch(/^gap[XY]:/)
			}
		}
	})

	/* 🔴 파생이 낼 수 있는 **모든** 수치를 적으면 도판이 아니라 계측기가 된다. 정본 도판이 적은 것과
	      개수가 같아야 한다(사용자 지정 2026-08-19: 「이미지에 적힌 것만」). 기대값은 도판 3장 실측. */
	it('치수는 정본 도판이 적은 것과 개수가 같다', () => {
		const expected = {
			horizontalA: { ticks: 5, spans: 4 },
			horizontalB: { ticks: 1, spans: 7 },
			vertical: { ticks: 0, spans: 8 },
		}
		for (const [form, want] of Object.entries(expected)) {
			const d = overseas(form)
			const ticks = d.cols.filter((t) => t.kind === 'gap' || t.kind === 'bar')
			expect(ticks.length, `${form} — 치수선`).toBe(want.ticks)
			expect(d.spans.length, `${form} — 게이지`).toBe(want.spans)
			// 🔑 행 간격에는 치수가 없다 — 세로형의 심볼 간격만 좌측 게이지로 예외
			const rowGaps = d.rows.filter((t) => t.kind === 'gap')
			const labelled = rowGaps.filter((t) => d.spans.some((sp) => sp.id === `span:${t.id}`))
			expect(labelled.length, `${form} — 라벨 붙은 행 간격`).toBe(form === 'vertical' ? 1 : 0)
		}
	})

	/* 🔴 게이지 열 수가 꼴마다 변하면 도판 폭이 변해 판 가운데 정렬 때문에 락업이 옆으로 튄다. */
	it('게이지 열 수는 꼴·계층과 무관하다', () => {
		for (const tier of TIERS) {
			for (const lockup of deriveLockups({
				tier,
				subsidiary: SUBSIDIARIES[0],
				branch: OVERSEAS_BRANCHES[0],
			})) {
				const d = diagramSpec(lockup)
				expect(d.gaugeLeft, `${lockup.label} — 좌`).toBe(2)
				expect(d.gaugeRight, `${lockup.label} — 우`).toBe(2)
			}
		}
	})

	it('모든 계층·꼴·언어에서 도판이 파생된다', () => {
		for (const tier of TIERS) {
			for (const lockup of deriveLockups({
				tier,
				subsidiary: SUBSIDIARIES[0],
				branch: OVERSEAS_BRANCHES[0],
			})) {
				const d = diagramSpec(lockup)
				expect(d.rows.length, `${lockup.label} — 행 트랙`).toBeGreaterThan(0)
				expect(
					d.spans.some((s) => s.id === 'span:H'),
					`${lockup.label} — H 게이지`,
				).toBe(true)
				const [start, end] = d.areaRows
				expect(end, `${lockup.label} — 영역 범위`).toBeGreaterThanOrEqual(start)
			}
		}
	})
})
