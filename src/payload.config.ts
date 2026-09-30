import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { postgresAdapter } from '@payloadcms/db-postgres'
import { resendAdapter } from '@payloadcms/email-resend'
import { type MCPAccessSettings, mcpPlugin } from '@payloadcms/plugin-mcp'
import { searchPlugin } from '@payloadcms/plugin-search'
import { EXPERIMENTAL_TableFeature, lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import { ko } from '@payloadcms/translations/languages/ko'
import { attachDatabasePool } from '@vercel/functions'
import {
	type Access,
	buildConfig,
	type CollectionConfig,
	type GlobalConfig,
	type PayloadRequest,
} from 'payload'
import { betterEditorSettingsGlobal } from 'payload-better-editor'
import sharp from 'sharp'
import { migrations } from '../migrations'
import { AgentChatSessions } from './collections/AgentChatSessions'
import { AgentSkills } from './collections/AgentSkills'
import { AiUsageEvents } from './collections/AiUsageEvents'
import { ApplicationImages } from './collections/ApplicationImages'
import { BrandColorGroups } from './collections/BrandColorGroups'
import { BrandColors } from './collections/BrandColors'
import { BrandIcons } from './collections/BrandIcons'
import { BrandLogos } from './collections/BrandLogos'
import { BrandTypefaces } from './collections/BrandTypefaces'
import { CheckScenarios } from './collections/CheckScenarios'
import { CheckSessions } from './collections/CheckSessions'
import { GeneratedImages } from './collections/GeneratedImages'
import { GraphicProfiles } from './collections/GraphicProfiles'
import { GraphProfiles } from './collections/GraphProfiles'
import { GuidelineChapters } from './collections/GuidelineChapters'
import { GuidelineDocuments } from './collections/GuidelineDocuments'
import { ImageProfiles } from './collections/ImageProfiles'
import { RuleCheckers } from './collections/RuleCheckers'
import { Rules } from './collections/Rules'
import { withFrontendRevalidation } from './collections/revalidate'
import { SampleImages } from './collections/SampleImages'
import { TemplateAssets } from './collections/TemplateAssets'
import { TemplateCategories } from './collections/TemplateCategories'
import { Templates } from './collections/Templates'
import { Users } from './collections/Users'
import { env } from './env'
import { listGuidelineSearchRules } from './features/guideline/repositories/guideline-search-rules.payload.repository'
import { buildGuidelineSearchText } from './features/guideline/utils/guideline-search-text'
import { customMcpTools } from './features/mcp-access/mcp-tools'
import { AgentSettings } from './globals/AgentSettings'
import { Guideline } from './globals/Guideline'
import { adminOnly, authenticated, isAdmin, managerOrAdmin } from './lib/auth'
import type { GuidelineDocument } from './payload-types'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const shouldRunProdMigrations =
	env.PAYLOAD_RUN_MIGRATIONS_ON_STARTUP === 'true' &&
	env.NODE_ENV === 'production' &&
	env.NEXT_PHASE !== 'phase-production-build'
type GetDefaultMcpAccessSettings = (overrideApiKey?: null | string) => Promise<MCPAccessSettings>
const createOwnMcpApiKey: Access = ({ data, req }) =>
	isAdmin(req.user) ||
	Boolean(req.user?.id != null && data?.user != null && String(req.user.id) === String(data.user))

const BetterEditorSettings: GlobalConfig = {
	...betterEditorSettingsGlobal,
	label: '편집기',
	admin: {
		...betterEditorSettingsGlobal.admin,
		group: '시스템 관리',
	},
	access: { read: authenticated, update: managerOrAdmin },
}

/**
 * Payload에 등록하는 컬렉션 전부. 업로드 저장 대상을 여기서 파생하므로 순서가 곧 등록 순서다.
 */
const collections = [
	GuidelineChapters,
	GuidelineDocuments,
	BrandLogos,
	BrandColors,
	BrandColorGroups,
	BrandTypefaces,
	BrandIcons,
	ApplicationImages,
	SampleImages,
	ImageProfiles,
	GraphicProfiles,
	GraphProfiles,
	GeneratedImages,
	Templates,
	TemplateCategories,
	TemplateAssets,
	CheckScenarios,
	Rules,
	RuleCheckers,
	CheckSessions,
	AgentChatSessions,
	AiUsageEvents,
	AgentSkills,
	Users,
]

/**
 * upload를 갖는 컬렉션은 전부 S3에 저장한다.
 *
 * 🔴 손으로 나열하지 않는다. 등록에서 빠진 업로드 컬렉션은 Payload 기본 동작인 로컬 디스크 쓰기로
 * 떨어진다. 로컬 개발에서는 조용히 성공하고, 읽기 전용 파일시스템인 Vercel에서만 500이 난다
 * (sample-images가 실제로 그렇게 새어 나갔다). 파생으로 두면 그 어긋남이 생길 수 없다.
 */
const s3UploadCollections = Object.fromEntries(
	collections.flatMap((collection) => (collection.upload ? [[collection.slug, true]] : [])),
)

export default buildConfig({
	admin: {
		user: Users.slug,
		meta: {
			icons: { icon: '/favicons/favicon.png' },
			title: 'Living Brand System',
			titleSuffix: '- Living Brand System',
		},
		importMap: {
			baseDir: path.resolve(dirname),
		},
		components: {
			graphics: {
				Icon: '/components/admin/shell/admin-icon#AdminIcon',
				Logo: '/components/admin/shell/admin-logo#AdminLogo',
			},
			providers: ['/components/admin/shell/admin-dialkit-provider#AdminDialKitProvider'],
			views: {
				dashboard: { Component: '/components/admin/shell/admin-dashboard#AdminDashboard' },
			},
		},
	},
	// 프리렌더된 화면의 껍데기를 콘텐츠 변경 시 버리게 한다. 컬렉션마다 손으로 달지 않고
	// 배열째 감싸므로 새 컬렉션이 자동으로 덮인다(`collections/revalidate.ts`).
	collections: withFrontendRevalidation(collections),
	editor: lexicalEditor({
		// 가이드라인 수치 규정 표(최소 사이즈, 자간 등) 입력용. EXPERIMENTAL: 업그레이드 시 변경 가능성 있음.
		features: ({ defaultFeatures }) => [...defaultFeatures, EXPERIMENTAL_TableFeature()],
	}),
	email: env.RESEND_API_KEY
		? resendAdapter({
				apiKey: env.RESEND_API_KEY,
				defaultFromAddress: env.EMAIL_FROM_ADDRESS || 'noreply@plus-ex.com',
				defaultFromName: env.EMAIL_FROM_NAME || 'PROTO',
			})
		: undefined,
	secret: env.PAYLOAD_SECRET,
	upload: {
		limits: {
			fileSize: 20_000_000, // 20MB — 고해상 브랜드 에셋 여유 상한, 무제한 업로드 방지 (docs/07 #27)
		},
	},
	typescript: {
		outputFile: path.resolve(dirname, 'payload-types.ts'),
	},
	db: postgresAdapter({
		migrationDir: './migrations',
		pool: {
			connectionString: env.DATABASE_URL,
			// 🔴 이 풀은 **함수 인스턴스 하나**의 것이다. stage는 Vercel 서버리스라 배포 직후 인스턴스가 여럿 뜨고,
			//    인스턴스마다 max개씩 붙잡으면 Supavisor 클라이언트 한도(Nano 200)를 넘어 Payload 초기화에서
			//    `EMAXCONN max client connections reached`로 페이지가 죽었다(2026-09-08 실측). 그래서 max와
			//    유휴 시간을 서버리스 기준으로 잡고, 접속은 6543 트랜잭션 풀러로 간다(Supabase 문서의 서버리스 권고).
			// max가 너무 작으면 트랜잭션 안에서 추가 커넥션을 얻지 못해 자기를 기다리는 데드락이 난다.
			// admin의 2초 autosave(guidelineDraftVersions)로 저장이 겹치면 max:2에선 풀이 즉시 고갈돼
			// 무한로딩 + 앱 전체 라우트 정지로 번졌다. 5는 그 아래로 내리지 않는 선이다.
			max: 5,
			// 데드락 대신 빠르게 실패시켜 커넥션을 반납한다(무한 대기 방지).
			connectionTimeoutMillis: 10_000,
			// 요청이 끝난 인스턴스가 연결을 오래 쥐고 있으면 인스턴스 수만큼 유휴 연결이 한도를 먹는다.
			idleTimeoutMillis: 5_000,
		},
		prodMigrations: shouldRunProdMigrations ? migrations : undefined,
		push: env.PAYLOAD_DB_PUSH === 'true',
	}),
	// Vercel Fluid Compute는 요청이 끝나면 인스턴스를 재웠다가 되살린다. 그 사이 유휴 연결이 정리될 때까지
	// 인스턴스를 살려 두는 것이 이 호출이다(@vercel/functions 문서). VERCEL_URL·VERCEL_REGION이 없는
	// 로컬·CI에서는 안에서 no-op이라 분기가 필요 없다.
	onInit: async (payload) => {
		attachDatabasePool(payload.db.pool)
	},
	sharp,
	plugins: [
		mcpPlugin({
			overrideAuth: async (
				req: PayloadRequest,
				getDefaultMcpAccessSettings: GetDefaultMcpAccessSettings,
			) => {
				const accessSettings = await getDefaultMcpAccessSettings()
				req.user = accessSettings.user
				return accessSettings
			},
			overrideApiKeyCollection: (collection: CollectionConfig) => ({
				...collection,
				labels: { singular: 'MCP', plural: 'MCP' },
				admin: { ...collection.admin, group: '시스템 관리' },
				fields: [
					...(collection.fields ?? []),
					{
						name: 'apiKey',
						type: 'text',
						access: { read: () => false },
					},
				],
				access: {
					create: createOwnMcpApiKey,
					delete: adminOnly,
					read: adminOnly,
					update: adminOnly,
				},
			}),
			mcp: {
				tools: customMcpTools,
			},
		} as never),
		searchPlugin({
			collections: ['guideline-documents'],
			// beforeSync는 문서 저장 트랜잭션 안에서 돈다 — req를 넘겨 같은 트랜잭션으로 조회해야 한다.
			// 넘기지 않으면 풀에서 커넥션을 하나 더 요구해 저장이 자기를 기다리는 교착이 생긴다.
			beforeSync: async ({ originalDoc, payload, req, searchDoc }) => {
				const document = originalDoc as GuidelineDocument
				return {
					...searchDoc,
					searchText: buildGuidelineSearchText(
						document,
						await listGuidelineSearchRules(payload, document, req),
					),
				}
			},
			defaultPriorities: {
				'guideline-documents': 20,
			},
			searchOverrides: {
				admin: { hidden: true },
				access: {
					read: ({ req }) => Boolean(req.user),
				},
				fields: ({ defaultFields }) => [
					...defaultFields,
					{
						name: 'searchText',
						type: 'textarea',
						localized: true,
						admin: { hidden: true },
					},
				],
			},
		}),
		s3Storage({
			collections: s3UploadCollections,
			bucket: env.S3_BUCKET || '',
			config: {
				region: env.S3_REGION || '',
				endpoint: env.S3_ENDPOINT,
				forcePathStyle: Boolean(env.S3_ENDPOINT),
				credentials: {
					accessKeyId: env.S3_ACCESS_KEY_ID || '',
					secretAccessKey: env.S3_SECRET_ACCESS_KEY || '',
				},
			},
		}),
	],
	i18n: {
		// 관리자 UI 언어는 언어 쿠키, 브라우저 언어, fallbackLanguage 순서로 결정된다.
		supportedLanguages: { ko }, // { ko, en }
		// 지원되는 쿠키나 브라우저 언어가 없을 때만 사용된다.
		fallbackLanguage: 'ko',
	},
	localization: {
		locales: ['ko', 'en'],
		defaultLocale: 'ko',
		// 기존 en revision은 보존하되 Admin 편집은 초기 릴리스 언어인 ko로 고정한다.
		filterAvailableLocales: ({ locales }) => locales.filter((locale) => locale.code === 'ko'),
	},
	globals: [Guideline, AgentSettings, BetterEditorSettings],
})
