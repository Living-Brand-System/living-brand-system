import { globSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// import '...' / import { A } from '...' / import type { A } from '...' / import * as ns from '...'
const IMPORT_FROM =
	/^\s*import\s+(?:type\s+)?(?:\*\s+as\s+\w+|\w+(?:\s*,\s*\{[^}]*\})?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm
// export { A } from '...' / export * from '...' / export type { A } from '...'
const EXPORT_FROM =
	/^\s*export\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm

function isSourceFile(file: string): boolean {
	return !/\.(test|spec)\./.test(file) && !file.includes('__snapshots__')
}

function violations(files: string[], isForbidden: (specifier: string) => boolean): string[] {
	const found: string[] = []
	for (const file of files.filter(isSourceFile)) {
		const content = readFileSync(file, 'utf8')
		for (const re of [IMPORT_FROM, EXPORT_FROM]) {
			for (const match of content.matchAll(re)) {
				const specifier = match[1]
				if (!specifier || !isForbidden(specifier)) continue
				const line = content.slice(0, match.index).split('\n').length
				found.push(`${file}:${line} -> ${specifier}`)
			}
		}
	}
	return found
}

describe('layer boundaries', () => {
	// docs/06-project-structure.md §1: Presentation -> Service -> Repository.
	// Route/component 코드는 Payload/ORM 구현을 감춘 repository를 직접 몰라야 한다.
	it('app과 components는 repository를 직접 import하지 않는다', () => {
		const files = globSync(['src/app/**/*.ts*', 'src/components/**/*.ts*'])
		const found = violations(files, (specifier) => specifier.includes('/repositories/'))

		expect(found).toEqual([])
	})

	// docs/06-project-structure.md §2: 의존 방향은 app -> components -> features이며
	// features는 components를 import하지 않는다. src/features/guideline/**는 Guideline
	// 분류를 별도로 정리하기 전까지의 한시적 예외로 문서에 명시되어 있다.
	it('features는 components를 import하지 않는다 (guideline 한시적 예외 제외)', () => {
		const files = globSync('src/features/**/*.ts*').filter(
			(file) => !file.startsWith('src/features/guideline/'),
		)
		const found = violations(files, (specifier) => specifier.startsWith('@/components'))

		expect(found).toEqual([])
	})
})

// import · export 문 하나 — 타입 전용인지(`import type` / `export type`)를 함께 본다.
const MODULE_REFERENCE =
	/^\s*(import|export)\s+(type\s+)?(?:\*(?:\s+as\s+\w+)?|\w+(?:\s*,\s*\{[^}]*\})?|\{[^}]*\})\s+from\s*['"]([^'"]+)['"]/gm

function references(file: string) {
	const content = readFileSync(file, 'utf8')
	return [...content.matchAll(MODULE_REFERENCE)].map((match) => ({
		at: `${file}:${content.slice(0, match.index).split('\n').length}`,
		typeOnly: Boolean(match[2]),
		specifier: match[3] ?? '',
	}))
}

const KIT = 'src/components/shared/controller/'
/** 킷 안을 경로로 집어도 되는 유일한 곳 — 3D 모듈이라 `dynamic()`으로 따로 불러야 index에 섞이지 않는다. */
const KIT_LAZY_ENTRY = '@/components/shared/controller/controls/camera-orbit-control'

/** 특정 스튜디오 폴더(`studio/<이름>/`) — `shared`·`panel`은 여러 스튜디오가 함께 쓰는 층이다. */
function studioOf(path: string): string | null {
	const name = /(?:^src\/|^@\/)components\/studio\/([^/]+)\//.exec(path)?.[1]
	return name && name !== 'shared' && name !== 'panel' ? name : null
}

/**
 * 스튜디오 간 허용 방향 — 템플릿은 이미지·그래픽 Config를 참조해 합성한다(docs/10 §3.6 「Template은 Image·Graphic
 * Config를 참조합니다」). 반대 방향과 나머지 조합은 공용 층(`studio/shared`·`studio/panel`)을 거친다.
 */
const STUDIO_DEPENDS_ON: Readonly<Record<string, readonly string[]>> = {
	template: ['graphic', 'image'],
}

describe('controller kit and studio boundaries (docs/10 §3.6·§3.7)', () => {
	const sources = globSync(['src/**/*.ts', 'src/**/*.tsx']).filter(isSourceFile)

	it('킷 밖은 컨트롤러 킷을 index로만 import한다', () => {
		const found = sources
			.filter((file) => !file.startsWith(KIT))
			.flatMap(references)
			.filter(
				({ specifier }) =>
					specifier.startsWith('@/components/shared/controller/') &&
					specifier !== KIT_LAZY_ENTRY,
			)
			.map(({ at, specifier }) => `${at} -> ${specifier}`)

		expect(found).toEqual([])
	})

	// 킷은 표현만 소유한다 — 값 모양은 계약과 타입으로 공유하되, 계약의 판정·도메인·화면은 모른다.
	it('킷은 계약을 타입으로만 참조하고 기능·화면·렌더러를 import하지 않는다', () => {
		const found = sources
			.filter((file) => file.startsWith(KIT))
			.flatMap(references)
			.filter(
				({ specifier, typeOnly }) =>
					specifier.startsWith('@/features') ||
					specifier.startsWith('@/components/studio') ||
					specifier.startsWith('@/components/shared/controller-renderer') ||
					(specifier.startsWith('@/modules') && !typeOnly),
			)
			.map(({ at, specifier }) => `${at} -> ${specifier}`)

		expect(found).toEqual([])
	})

	it('스튜디오끼리는 허용한 방향으로만 import하고, 공용 층은 특정 스튜디오를 모른다', () => {
		const found = sources
			.filter((file) => file.startsWith('src/components/studio/'))
			.flatMap((file) =>
				references(file).flatMap(({ at, specifier }) => {
					const target = studioOf(specifier)
					const from = studioOf(file)
					if (!target || target === from) return []
					if (from && STUDIO_DEPENDS_ON[from]?.includes(target)) return []
					return [`${at} -> ${specifier}`]
				}),
			)

		expect(found).toEqual([])
	})

	it('묶음 위젯 레지스트리는 widgets/registry에만 선언한다', () => {
		const found = sources
			.filter((file) => /:\s*ControllerWidgetRegistry\s*=/.test(readFileSync(file, 'utf8')))
			.filter((file) => !/\/widgets\/registry\.tsx?$/.test(file))

		expect(found).toEqual([])
	})
})
