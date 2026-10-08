import { readdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, test } from 'vitest'

/**
 * 경계 규칙 검사 — docs/06 §2 「경계 규칙」R1·R2·R3을 소스 전체에 대조한다.
 *
 * 🔑 **허용목록은 래칫이다.** 지금 있는 위반을 전부 적어 두고 시작한다. 새 위반은 여기서 막히고,
 *    위반을 고치면 목록에서 지워야 통과한다(지우지 않으면 「낡은 항목」으로 실패). 목록이 비는 날이 끝이다.
 * 🔴 규칙을 바꾸려면 docs/06을 먼저 고친다 — 이 파일은 문서의 집행이지 정본이 아니다.
 *
 * 위반을 전부 보려면: `ARCH_PRINT=1 pnpm exec vitest run src/architecture.test.ts`
 */

const SRC = path.join(process.cwd(), 'src')

/** 경계 밖에서 import해도 되는 하위 폴더. 경계 루트에 바로 있는 파일도 공개 계약이다. */
const PUBLIC_FOLDERS = new Set(['services', 'domain'])

/** 브라우저에서만 도는 코드가 사는 폴더 — 여기서 `.client`를 import하는 것은 역방향이 아니다. */
const CLIENT_FOLDERS = new Set([
	'hooks',
	'providers',
	'contexts',
	'runtime',
	'adapters',
	'graphic-runtimes',
	'graph-runtimes',
])

/** R3 — 소유자가 둘 이상이던 컬렉션의 확정 소유자(2026-10-08). 그 밖의 컬렉션은 저장소가 한 경계에만 있으면 된다. */
const COLLECTION_OWNERS: Record<string, string> = {
	'agent-skills': 'modules/agents',
	'brand-colors': 'features/guideline',
	'guideline-documents': 'features/guideline',
	rules: 'features/quality-rule',
	templates: 'features/template-core',
	// 계정 문서. 기능별 설정 필드(tokenLimits·figmaToken)를 각 기능 저장소가 직접 읽던 것을 auth가 소유한다.
	users: 'features/auth',
}

/** R2 예외 — 인증 operation(`payload.auth`·`payload.login`)은 저장소가 아니라 인증 경계가 직접 부른다. */
const PAYLOAD_RUNTIME_EXCEPTIONS = new Set([
	'lib/request-auth.ts',
	'app/api/auth/login/route.ts',
	'proxy.ts',
])

const PAYLOAD_RUNTIME =
	/\bgetPayload\s*\(|\bpayload\.(?:find|findByID|findGlobal|findVersions|findGlobalVersions|create|update|updateGlobal|delete|count|duplicate|restoreVersion|db|auth|login|logout|forgotPassword|resetPassword|verifyEmail|unlock|sendEmail)\b/

// 🔴 고친 항목은 지운다. 새 항목은 추가하지 않는다 — 추가해야 한다면 그 변경이 경계를 어기는 것이다.
const ALLOWLIST: readonly string[] = [
	'R1 collections/Rules.ts -> features/quality-rule/repositories/rule-checker.payload.repository',
	'R1 features/agent-chat/repositories/agent-guideline-context.payload.repository.ts -> features/guideline/repositories/palette.payload.repository',
	'R1 features/agent-chat/repositories/agent-guideline-context.payload.repository.ts -> features/guideline/sections/model',
	'R1 features/asset-check/repositories/check-ruleset.payload.repository.ts -> features/guideline/checks/collect-guideline-check-sources',
	'R1 features/asset-check/repositories/check-ruleset.payload.repository.ts -> features/guideline/repositories/published-guideline-checks.payload.repository',
	'R1 features/graph-generation/graph-runtimes/infographic/definition.ts -> features/graphic-generation/graphic-runtimes/define-graphic-runtime',
	'R1 features/graph-generation/graph-runtimes/infographic/runtime.client.ts -> features/graphic-generation/runtime/client/graphic-runtime.client',
	'R1 features/graph-generation/repositories/graph-profile.payload.repository.ts -> features/graphic-generation/repositories/canvas-profile.payload.repository',
	'R1 features/graphic-generation/runtime/client/graphic-runtime.client.ts -> features/graph-generation/graph-runtimes/catalog/runtime.generated.client',
	'R1 features/graphic-generation/runtime/graphic-studio-runtime.ts -> features/graph-generation/graph-runtimes/catalog/model.generated',
	'R1 features/guideline/services/download-section-assets.client.ts -> features/studio-export/adapters/export-results-to-zip.client',
	'R1 features/mcp-access/mcp-tools.ts -> features/asset-check/repositories/ai-check.ai.repository',
	'R1 features/mcp-access/mcp-tools.ts -> features/asset-check/repositories/image-decoder.sharp.repository',
	'R1 features/mcp-access/mcp-tools.ts -> features/image-generation/repositories/generated-image.payload.repository',
	'R1 features/studio-export/hooks/use-graphic-export.ts -> features/graphic-generation/runtime/graphic-studio-runtime',
	'R1 features/template-customization/providers/template-studio-provider.tsx -> features/graphic-generation/runtime/graphic-studio-runtime',
	'R1 features/template-customization/providers/template-studio-provider.tsx -> features/template-core/runtime/compose-template-html.client',
	'R1 features/template-customization/runtime/template-runtime.client.ts -> features/studio-export/adapters/outline-vector-scene.client',
	'R1 features/template-customization/runtime/template-runtime.client.ts -> features/template-core/runtime/compose-template-html.client',
	'R1 features/template-import/services/import-figma-html.service.ts -> features/application-image/repositories/imported-application-image.payload.repository',
	'R1 features/template-import/services/prepare-template-save.service.ts -> features/application-image/repositories/imported-application-image.payload.repository',
	'R1 modules/agents/agent-chat-tools.agent.ts -> features/agent-chat/repositories/agent-skill.payload.repository',
	'R1 modules/agents/agent-chat-tools.agent.ts -> features/asset-check/utils/check-display-status',
	'R1 modules/agents/agent-chat-tools.agent.ts -> features/asset-check/utils/format-check-detail',
	'R1 modules/agents/agent-chat.agent.ts -> features/agent-chat/repositories/agent-skill.payload.repository',
	'R2 app/(frontend)/account/token-limits/page.tsx',
	'R2 app/api/auth/password/route.ts',
	'R2 collections/Users.ts',
	'R2 collections/revalidate.ts',
	'R3 agent-skills <- features/agent-chat',
	'R3 guideline-documents <- features/agent-chat',
	'R3 guideline-documents <- features/quality-rule',
	'R3 rules <- features/guideline',
	'R3 templates <- features/agent-chat',
	'R3 users <- features/template-import',
	'R3 users <- modules/ai-usage',
]

type SourceFile = { rel: string; text: string }

function listSourceFiles(dir: string): string[] {
	return readdirSync(dir, { recursive: true, withFileTypes: true })
		.filter((entry) => entry.isFile() && /\.(ts|tsx)$/.test(entry.name))
		.map((entry) => path.relative(SRC, path.join(entry.parentPath, entry.name)))
		.filter(
			(rel) =>
				!/\.(test|spec)\.tsx?$/.test(rel) &&
				!rel.endsWith('.d.ts') &&
				rel !== 'payload-types.ts' &&
				!rel.startsWith('app/(payload)/'),
		)
}

/** `features/<x>`·`modules/<x>`는 경계, 그 밖은 최상위 폴더 이름(`app`·`components`·`collections`…). */
function ownerOf(rel: string): string {
	const [head, second] = rel.split('/')
	return head === 'features' || head === 'modules' ? `${head}/${second}` : head
}

/** 경계 안 상대 경로 — `features/x/services/a.ts` → `services/a.ts`. */
function innerOf(rel: string): string {
	return rel
		.split('/')
		.slice(ownerOf(rel).includes('/') ? 2 : 1)
		.join('/')
}

type Import = { target: string; typeOnly: boolean }

/** `@/`·상대 import를 `src` 기준 경로로 푼다. 외부 패키지는 버린다. 확장자는 안 붙인다 — 접두 비교면 충분하다. */
function importsOf(file: SourceFile): Import[] {
	const out: Import[] = []
	const resolve = (spec: string): string | null => {
		if (spec.startsWith('@/')) return spec.slice(2)
		if (spec.startsWith('.')) {
			return path.relative(SRC, path.resolve(SRC, path.dirname(file.rel), spec))
		}
		return null
	}
	for (const m of file.text.matchAll(
		/\b(?:import|export)\s+(type\s+)?[\w*{}\s,$]+?\s+from\s+['"]([^'"]+)['"]/g,
	)) {
		const target = resolve(m[2])
		if (target) out.push({ target, typeOnly: Boolean(m[1]) })
	}
	for (const m of file.text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g)) {
		const target = resolve(m[1])
		if (target) out.push({ target, typeOnly: false })
	}
	return out
}

const isBoundary = (owner: string) => owner.includes('/')

const isClientFile = (file: SourceFile) =>
	/\.client\.tsx?$|\.tsx$/.test(file.rel) ||
	CLIENT_FOLDERS.has(innerOf(file.rel).split('/')[0]) ||
	/^['"]use client['"]/.test(file.text)

function collectViolations(files: SourceFile[]): string[] {
	const violations: string[] = []

	for (const file of files) {
		const owner = ownerOf(file.rel)
		const imports = importsOf(file)

		for (const { target, typeOnly } of imports) {
			if (typeOnly) continue
			const targetOwner = ownerOf(target)
			const inner = innerOf(target)
			const folder = inner.split('/')[0]
			const isTopLevel = !inner.includes('/')

			// R1 — 경계 간: 다른 경계의 services/·domain/·루트 파일만 import한다.
			if (
				isBoundary(owner) &&
				isBoundary(targetOwner) &&
				owner !== targetOwner &&
				!isTopLevel &&
				!PUBLIC_FOLDERS.has(folder)
			) {
				violations.push(`R1 ${file.rel} -> ${target}`)
			}
			// R1 — 서버 코드는 `.client`를 import하지 않는다(공유할 타입·순수 함수는 domain/으로).
			//      components/는 표현 계층이라 .ts 헬퍼도 브라우저 코드다 — 검사 대상이 아니다.
			if (owner !== 'components' && !isClientFile(file) && /\.client$/.test(target)) {
				violations.push(`R1 ${file.rel} -> ${target}`)
			}
			// R1 — 화면·라우트·컬렉션은 저장소를 모른다(경계 안의 것도, src/repositories의 것도). lib는 경계를 모른다.
			if (
				['app', 'components', 'collections'].includes(owner) &&
				((isBoundary(targetOwner) && folder === 'repositories') ||
					targetOwner === 'repositories')
			) {
				violations.push(`R1 ${file.rel} -> ${target}`)
			}
			if (owner === 'components' && /\.service$/.test(target)) {
				violations.push(`R1 ${file.rel} -> ${target}`)
			}
			if (owner === 'lib' && isBoundary(targetOwner)) {
				violations.push(`R1 ${file.rel} -> ${target}`)
			}
		}

		// R2 — Payload 런타임은 *.repository.ts에서만.
		if (
			!/\.repository\.ts$/.test(file.rel) &&
			file.rel !== 'payload.config.ts' &&
			!PAYLOAD_RUNTIME_EXCEPTIONS.has(file.rel) &&
			PAYLOAD_RUNTIME.test(file.text)
		) {
			violations.push(`R2 ${file.rel}`)
		}
	}

	// R3 — 컬렉션 하나는 경계 하나가 소유한다. `src/repositories`는 경계가 아니라 cross-domain 저장소
	//      (여러 컬렉션에 같은 동작)의 자리이므로 소유자로 세지 않는다 — 도메인 조회를 거기 두면 안 된다.
	const ownersBySlug = new Map<string, Set<string>>()
	for (const file of files) {
		if (!/\.repository\.ts$/.test(file.rel) || !isBoundary(ownerOf(file.rel))) continue
		for (const m of file.text.matchAll(/\bcollection:\s*'([a-z-]+)'/g)) {
			const owners = ownersBySlug.get(m[1]) ?? new Set<string>()
			owners.add(ownerOf(file.rel))
			ownersBySlug.set(m[1], owners)
		}
	}
	for (const [slug, owners] of ownersBySlug) {
		const designated = COLLECTION_OWNERS[slug]
		for (const owner of owners) {
			if (designated ? owner !== designated : owners.size > 1) {
				violations.push(`R3 ${slug} <- ${owner}`)
			}
		}
	}

	return [...new Set(violations)].sort()
}

describe('경계 규칙 (docs/06 §2)', () => {
	const files: SourceFile[] = listSourceFiles(SRC).map((rel) => ({
		rel,
		text: readFileSync(path.join(SRC, rel), 'utf8'),
	}))
	const violations = collectViolations(files)
	if (process.env.ARCH_PRINT) console.log(violations.join('\n'))

	test('새 위반이 없다', () => {
		const allowed = new Set(ALLOWLIST)
		expect(violations.filter((v) => !allowed.has(v))).toEqual([])
	})

	test('허용목록에 낡은 항목이 없다 — 고쳤으면 목록에서 지운다', () => {
		const current = new Set(violations)
		expect(ALLOWLIST.filter((v) => !current.has(v))).toEqual([])
	})
})
