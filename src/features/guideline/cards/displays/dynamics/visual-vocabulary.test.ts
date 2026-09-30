import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 가이드라인 표면(블록·카드·컴포넌트·위젯)이 색을 **공유 어휘로만** 말하는지 지킨다(계약은 `docs/11` §8, 토큰 규칙은 `docs/09` §4).
// 등록형 렌더와 일반 화면을 함께 검사한다 — 폴더 이동으로 검사 범위가 줄어들면 안 된다.
//
// 🔴 왜 필요한가: 위젯 19개가 반복되는 시각 요소를 각자 만들어, 한 페이지 안에서 같은 것이 다르게
//    표기됐다. 그걸 정리한 뒤에도 새 위젯이 같은 길로 다시 갈 수 있고, 생 팔레트는 리뷰에서
//    "그냥 회색"처럼 보여 지적되지 않는다. 잘못된 색은 다크 모드나 색을 주입한 블록 면에서만
//    드러나므로 화면을 눌러 보지 않으면 아무도 못 본다.
//
// 예외는 `surface.ts` 하나다. 표본이 얹히는 브랜드 면은 흰 판/검은 판 자체가 규정의 일부라
// 테마를 따르면 안 되고, 그 예외를 한 파일에 모아 두는 것이 이 규칙의 설계다.

const GUIDELINE = path.join(process.cwd(), 'src/features/guideline')
const COMPONENTS = path.join(process.cwd(), 'src/components/guideline')
const WIDGETS = path.join(GUIDELINE, 'cards/displays/dynamics')

/** 브랜드 면의 고정 팔레트를 갖는 유일한 자리. */
const DECLARED_EXCEPTION = 'surface.ts'

const PALETTE = [
	'slate',
	'gray',
	'zinc',
	'neutral',
	'stone',
	'red',
	'orange',
	'amber',
	'yellow',
	'lime',
	'green',
	'emerald',
	'teal',
	'cyan',
	'sky',
	'blue',
	'indigo',
	'violet',
	'purple',
	'fuchsia',
	'pink',
	'rose',
].join('|')

const PROPERTY =
	'bg|text|border|fill|stroke|ring|outline|accent|caret|decoration|divide|shadow|from|via|to'

/**
 * 생 팔레트 유틸리티.
 *
 * 🔴 `white`·`black`이 반드시 들어가야 한다. 앞선 탐지 grep은 `-[0-9]`만 봤고, 숫자가 없는
 *    `bg-white`는 그 구멍으로 실제로 통과했다. 색 단계가 없는 이름이 가장 잘 숨는다.
 */
const RAW_COLOR = new RegExp(
	`\\b(?:${PROPERTY})-(?:white|black|(?:${PALETTE})-\\d{2,3})(?:\\/\\d{1,3})?\\b`,
)

/**
 * `dark:` 변형.
 *
 * 🔴 위젯은 다크 모드를 스스로 분기하지 않는다. 색을 주입한 블록 면은 그 면에서 토큰 스코프를
 *    `light`/`dark`로 다시 선언하는데(`pages/guideline-topic.tsx`의 히어로), Tailwind의 `dark:`는
 *    `.dark *` 후손 선택자라 **다크 페이지 안의 밝은 섬에서도 여전히 걸린다.** 토큰만 쓰면
 *    스코프가 알아서 따라오므로 분기가 필요하지 않다.
 */
const DARK_VARIANT = /\bdark:/

/**
 * 판 밖 캡션.
 *
 * 🔴 위젯이 그리는 것은 판(canvas) 하나뿐이다(`docs/11` §8 「위젯은 판만 그립니다」). 사용법 안내·
 *    이름·규격 나열·경고를 위젯이 판 밖에 붙이지 않는다 — 사용자 지정 2026-08-20: 「위젯은 이미지와
 *    같아서 해당 판 = canvas만 보이면 끝이야.」 설명이 필요하면 블록 콘텐츠가 쓰고, 조작을 글로
 *    설명해야 이해되는 위젯이면 고칠 것은 캡션이 아니라 어포던스다.
 * 🔴 판 **안**의 글자는 이 규칙이 아니다(표본 셀 머리글·도판 치수 라벨은 그림의 일부다). 그래서
 *    `SPEC_READOUT`이 아니라 캡션 어휘만 본다.
 */
const WIDGET_CAPTION_USE = /\bWIDGET_CAPTION\b/

/**
 * 아직 걷어내지 못한 캡션. **둘 다 값 결정이 남아 있어서**지 규칙의 예외라서가 아니다.
 * 🔴 이 목록은 늘리지 않는다 — 새 위젯이 여기 들어오려 하면 캡션을 지우는 것이 답이다.
 */
const CAPTION_DEBT = ['layout-grid/component.tsx', 'stem-clear-space/view.tsx'].map((f) =>
	path.join(GUIDELINE, 'cards/deprecated/displays/dynamics', f),
)

/** 어휘를 **정의**하는 자리. 검사 대상이 아니다(`surface.ts`가 팔레트에 대해 그런 것과 같다). */
const CAPTION_VOCAB_HOME = path.join(WIDGETS, 'readout.ts')

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry)
		if (statSync(full).isDirectory()) return sourceFiles(full)
		return /\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') ? [full] : []
	})
}

function offendingLines(file: string, pattern: RegExp): string[] {
	return readFileSync(file, 'utf8')
		.split('\n')
		.map((line, index) => [index + 1, line] as const)
		.filter(([, line]) => pattern.test(line))
		.map(([number, line]) => `${number}: ${line.trim()}`)
}

describe('가이드라인 시각 어휘', () => {
	const files = [...sourceFiles(GUIDELINE), ...sourceFiles(COMPONENTS)].filter(
		(file) => file !== path.join(WIDGETS, DECLARED_EXCEPTION),
	)

	// 🔴 탐지가 조용히 0건이 되면 이 테스트 전체가 "문제 없음"을 승인하는 도장으로 바뀐다.
	//    보지 않는 것은 통과시키는 것과 구별되지 않으므로, 무엇을 봤는지를 먼저 확인한다.
	it('가이드라인 소스를 실제로 훑는다', () => {
		expect(files.length).toBeGreaterThan(60)
	})

	it('생 팔레트 패턴이 실제 위반을 잡는다', () => {
		// 전부 리포에서 실제로 걷어낸 문자열이다.
		for (const sample of [
			'bg-white',
			'bg-black',
			'text-white/70',
			'bg-neutral-900 text-white',
			'text-neutral-600',
			'bg-neutral-50 dark:bg-neutral-950',
		]) {
			expect(RAW_COLOR.test(sample), sample).toBe(true)
		}
	})

	it('생 팔레트 패턴이 시맨틱 토큰을 잡지 않는다', () => {
		for (const sample of [
			'bg-background text-foreground',
			'bg-muted text-muted-foreground',
			'bg-primary text-primary-foreground',
			'border-border bg-card',
			'text-destructive',
			'ring-ring/30 outline-none',
			'font-mono text-xs tabular-nums',
			'border-b-2 stroke-2',
		]) {
			expect(RAW_COLOR.test(sample), sample).toBe(false)
		}
	})

	it.each(
		files.map((file) => [path.relative(GUIDELINE, file), file]),
	)('%s 가 생 팔레트를 쓰지 않는다', (_label, file) => {
		expect(offendingLines(file, RAW_COLOR)).toEqual([])
	})

	it.each(
		files.map((file) => [path.relative(GUIDELINE, file), file]),
	)('%s 가 dark: 변형으로 분기하지 않는다', (_label, file) => {
		expect(offendingLines(file, DARK_VARIANT)).toEqual([])
	})

	// 🔴 빚 목록이 낡으면(해당 위젯의 캡션을 지웠는데 이름이 남으면) 그 자리가 조용히 열린다.
	it('캡션 빚 목록에 실제로 캡션이 남아 있다', () => {
		for (const debt of CAPTION_DEBT) {
			expect(
				offendingLines(debt, WIDGET_CAPTION_USE).length,
				`${debt} 의 캡션이 사라졌다 — CAPTION_DEBT에서 지울 것`,
			).toBeGreaterThan(0)
		}
	})

	it.each(
		files
			.filter((file) => file !== CAPTION_VOCAB_HOME && !CAPTION_DEBT.includes(file))
			.map((file) => [path.relative(GUIDELINE, file), file]),
	)('%s 가 판 밖 캡션을 그리지 않는다', (_label, file) => {
		expect(offendingLines(file, WIDGET_CAPTION_USE)).toEqual([])
	})
})
