import { readdirSync, readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

// 위젯이 부르는 서체 이름이 `theme.css`의 @font-face 별칭과 같은지 지킨다.
//
// 🔴 왜 필요한가: @font-face의 family는 **임의 별칭**이라 원본 폰트 파일의 내부 이름과 무관하다.
//    별칭과 호출 이름이 어긋나면 오류 없이 조용히 **로컬 설치 폰트**로 떨어진다 — HD체를 설치한
//    디자이너 기기에서는 그대로 보이고, 설치 안 된 기기·CI·내보낸 PNG에서만 기본 폰트로 나온다.
//    2026-08-20에 템플릿이 `HD OTF`(Figma 정본 이름)를 부르는데 별칭이 `HD`여서 실제로 그랬다.

const WIDGETS = path.join(process.cwd(), 'src/features/guideline/cards/displays/dynamics')
const THEME_CSS = path.join(process.cwd(), 'src/app/(frontend)/theme.css')

/** 서체 위반 표본은 일부러 브랜드 밖 서체를 쓴다 — 이 규칙의 유일한 예외다. */
const DECLARED_EXCEPTION = path.join('preset-panel', 'presets.ts')

/** 폰트 지시어 바로 뒤의 따옴표 이름. `ctx.font`의 `700 1000px` 같은 앞머리는 건너뛴다. */
const CALL =
	/(?:fontFamily|font-family|family|FONT_STACK|ctx\.font)\s*[:=]\s*[`'"{]+\s*(?:[\w.]+\s+)*?"([^"]+)"/g

function declaredFamilies(): Set<string> {
	const css = readFileSync(THEME_CSS, 'utf8')
	return new Set(
		[...css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*"([^"]+)"/g)].map((m) => m[1]),
	)
}

function sourceFiles(dir: string): string[] {
	return readdirSync(dir).flatMap((entry) => {
		const full = path.join(dir, entry)
		if (statSync(full).isDirectory()) return sourceFiles(full)
		return /\.tsx?$/.test(entry) && !entry.endsWith('.test.ts') ? [full] : []
	})
}

describe('브랜드 서체 이름', () => {
	it('위젯이 부르는 서체가 theme.css의 @font-face 별칭에 다 있다', () => {
		const declared = declaredFamilies()
		const missing: string[] = []

		for (const file of sourceFiles(WIDGETS)) {
			if (file.endsWith(DECLARED_EXCEPTION)) continue
			const called = [...readFileSync(file, 'utf8').matchAll(CALL)].map((m) => m[1])
			for (const family of called) {
				// 런타임 보간(`${FONT_FAMILY}`)은 정적으로 확인할 수 없어 건너뛴다.
				if (family.includes('${') || declared.has(family)) continue
				missing.push(`${path.relative(WIDGETS, file)}: "${family}"`)
			}
		}

		expect(missing).toEqual([])
	})
})
