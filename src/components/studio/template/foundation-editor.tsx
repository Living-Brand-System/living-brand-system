'use client'

import { type ReactNode, useEffect, useId, useState } from 'react'
import { ControllerSwatch } from '@/components/shared/controller'
import { ARTBOARD_PRESETS } from '@/components/studio/graphic/output/output-presets'
import { DataEditor } from '@/components/studio/shared/data-editor'
import { Typography } from '@/components/ui/typography'
import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
import {
	type FoundationColor,
	type FoundationLogo,
	listFoundationCategories,
	listFoundationColorGroups,
	listFoundationColors,
	listFoundationLogos,
	listLatestTemplatesByCategory,
} from '@/features/template-customization/services/foundation-records.client'
import { cn } from '@/lib/utils'

/** 파운데이션 모달의 탭 — 주소(`?edit=<탭>`)로 어디서든 그 탭을 바로 연다(여러 경로에서 여는 공용 페이지). */
export const FOUNDATION_TABS = {
	color: 'foundation-color',
	logo: 'foundation-logo',
	category: 'foundation-category',
	artboard: 'foundation-artboard',
} as const

/**
 * 파운데이션 관리 모달(사용자 2026-10-14·15) — 여러 템플릿이 같이 쓰는 브랜드 데이터를 한 곳에서 본다.
 * 「Manager mode (CMS Style)」 템플릿 모달과 별개의 모달이고, 껍데기(`DataEditor`)만 같이 쓴다.
 * 모든 탭이 3열 격자다(사용자 2026-10-15).
 * ponytail: 지금은 보기만 — 고치는 폼은 칸마다 정해지면 붙인다.
 */
export function FoundationEditor({ trigger }: { trigger?: (open: () => void) => ReactNode }) {
	return (
		<DataEditor
			subject="파운데이션"
			trigger={trigger}
			tabs={[
				{ id: FOUNDATION_TABS.color, label: '컬러', render: () => <ColorTab /> },
				{ id: FOUNDATION_TABS.logo, label: '로고', render: () => <LogoTab /> },
				{
					id: FOUNDATION_TABS.category,
					label: '템플릿 분류',
					render: () => <CategoryTab />,
				},
				{ id: FOUNDATION_TABS.artboard, label: '판형 종류', render: () => <ArtboardTab /> },
			]}
		/>
	)
}

/** 한 번 읽는다 — 실패하면 빈 화면 대신 그 사실을 보인다. `load`는 모듈 수준 함수여야 한다(바뀌면 다시 읽는다). */
function useLoad<T>(load: () => Promise<T>) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	useEffect(() => {
		load()
			.then(setData)
			.catch((cause: unknown) =>
				setError(cause instanceof Error ? cause.message : '불러오지 못했어요.'),
			)
	}, [load])
	return { data, error }
}

function Section({
	title,
	error,
	loading,
	children,
}: {
	title: string
	error?: string | null
	loading?: boolean
	children: ReactNode
}) {
	return (
		<section className="flex flex-col gap-2">
			<Typography as="h3" size="sm" weight="semibold">
				{title}
			</Typography>
			{error ? (
				<Typography size="xs" tone="destructive" role="alert">
					{error}
				</Typography>
			) : loading ? (
				<Typography size="xs" tone="muted">
					불러오는 중…
				</Typography>
			) : (
				children
			)}
		</section>
	)
}

/** 모든 탭이 쓰는 3열 격자. */
function Grid({ children }: { children: ReactNode }) {
	return <ul className="grid grid-cols-3 gap-3">{children}</ul>
}

function Card({ children, className }: { children: ReactNode; className?: string }) {
	return (
		<li
			className={cn(
				'flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3',
				className,
			)}
		>
			{children}
		</li>
	)
}

function Meta({ children }: { children: ReactNode }) {
	return (
		<Typography size="xs" tone="muted" className="truncate">
			{children}
		</Typography>
	)
}

// ── 컬러 ────────────────────────────────────────────────────────────────

/**
 * 컬러 — 컬러 패널과 같은 둥근 스와치(`ControllerSwatch`)로 보인다(사용자 2026-10-15). 그룹마다 묶는다.
 * 컬러의 그룹 칸(`colorGroup`)이 비면 「그룹 없음」에 모인다.
 */
function ColorTab() {
	const colors = useLoad(listFoundationColors)
	const groups = useLoad(listFoundationColorGroups)
	const byGroup = new Map<string, FoundationColor[]>()
	for (const color of colors.data ?? []) {
		const key = color.colorGroup ?? '그룹 없음'
		byGroup.set(key, [...(byGroup.get(key) ?? []), color])
	}
	return (
		<div className="flex flex-col gap-6">
			<Section title="컬러" error={colors.error} loading={!colors.data}>
				<div className="flex flex-col gap-4">
					{[...byGroup].map(([group, members]) => (
						<ColorGroup key={group} title={group} colors={members} />
					))}
				</div>
			</Section>
			<Section title="컬러 그룹" error={groups.error} loading={!groups.data}>
				<Grid>
					{(groups.data ?? []).map((group) => (
						<Card key={group.id}>
							<Typography size="sm" weight="medium" className="truncate">
								{group.name}
							</Typography>
							<span className="flex flex-wrap gap-1.5">
								{group.colors.map((color) => (
									<Swatch key={color.id} hex={color.hex} label={color.hex} />
								))}
							</span>
							<Meta>{group.family ?? '—'}</Meta>
						</Card>
					))}
				</Grid>
			</Section>
		</div>
	)
}

function ColorGroup({ title, colors }: { title: string; colors: FoundationColor[] }) {
	return (
		<div className="flex flex-col gap-2">
			<Typography size="xs" tone="muted">
				{title}
			</Typography>
			<Grid>
				{colors.map((color) => (
					<Card key={color.id} className="flex-row items-center gap-3">
						<Swatch hex={color.hex} label={color.name} large />
						<span className="flex min-w-0 flex-col">
							<Typography size="sm" weight="medium" className="truncate">
								{color.name}
								{color.isMain ? ' · 대표' : ''}
							</Typography>
							<Meta>{color.hex}</Meta>
							<Meta>{color.cmyk ?? 'CMYK —'}</Meta>
							<Meta>{color.pantone ?? 'Pantone —'}</Meta>
						</span>
					</Card>
				))}
			</Grid>
		</div>
	)
}

/** 컬러 패널과 같은 둥근 스와치 — 여기서는 보기만 한다. */
function Swatch({ hex, label, large }: { hex: string; label: string; large?: boolean }) {
	const name = useId()
	return (
		<ControllerSwatch
			shape="round"
			name={name}
			// 보기만 — 늘 고르지 않은 채로 둔다(바뀌어도 받지 않는다).
			checked={false}
			onChange={() => {}}
			aria-label={label}
			style={{ backgroundColor: hex }}
			className={cn('shrink-0', large ? 'size-10' : 'size-5')}
		/>
	)
}

// ── 로고 ────────────────────────────────────────────────────────────────

/** 기본 묶음의 열 — 한 줄이 언어형(CI 모양) 하나, 열이 색 버전이다. 같은 색은 세로로, 같은 언어형은 가로로 선다. */
const LOGO_COLUMNS = ['default', 'wordmark', 'mono-black'] as const
/** 흰 로고 — 어두운 바탕에 깐다. */
const WHITE_VARIANTS = new Set(['wordmark', 'mono-white'])

const variantLabel = (variant?: string | null) =>
	CI_VARIANTS.find(({ value }) => value === variant)?.label ?? variant ?? ''

/**
 * 로고 — 같은 색 버전·같은 언어형으로 묶는다(사용자 2026-10-15). 기본 묶음은 언어형마다 한 줄에 기본형·워드마크형·
 * 단색(블랙) 3개. 그 밖(단색(화이트), CI 모양이 없는 여백·도판)은 예외형으로 따로 묶고, 모두 3열이다.
 */
function LogoTab() {
	const logos = useLoad(listFoundationLogos)
	const all = logos.data ?? []
	const isMain = (logo: FoundationLogo) =>
		Boolean(logo.ciShape) && (LOGO_COLUMNS as readonly string[]).includes(logo.ciVariant ?? '')
	const shapes = [...new Set(all.filter(isMain).map((logo) => logo.ciShape as string))].sort()
	const exceptions = new Map<string, FoundationLogo[]>()
	for (const logo of all.filter((logo) => !isMain(logo))) {
		const key = logo.ciShape ? variantLabel(logo.ciVariant) : '여백·도판'
		exceptions.set(key, [...(exceptions.get(key) ?? []), logo])
	}
	return (
		<div className="flex flex-col gap-6">
			<Section title="로고" error={logos.error} loading={!logos.data}>
				<div className="flex flex-col gap-2">
					<div className="grid grid-cols-3 gap-3">
						{LOGO_COLUMNS.map((variant) => (
							<Meta key={variant}>{variantLabel(variant)}</Meta>
						))}
					</div>
					{shapes.map((shape) => (
						<div key={shape} className="flex flex-col gap-1">
							<Typography size="xs" weight="medium">
								{shape}
							</Typography>
							<Grid>
								{LOGO_COLUMNS.map((variant) => {
									const logo = all.find(
										(item) =>
											item.ciShape === shape && item.ciVariant === variant,
									)
									return logo ? (
										<LogoCard key={variant} logo={logo} />
									) : (
										<li
											key={variant}
											aria-hidden
											className="rounded-lg border border-dashed border-border"
										/>
									)
								})}
							</Grid>
						</div>
					))}
				</div>
			</Section>
			{[...exceptions].map(([title, members]) => (
				<Section key={title} title={`예외형 · ${title}`}>
					<Grid>
						{members.map((logo) => (
							<LogoCard key={logo.id} logo={logo} />
						))}
					</Grid>
				</Section>
			))}
		</div>
	)
}

function LogoCard({ logo }: { logo: FoundationLogo }) {
	const white = WHITE_VARIANTS.has(logo.ciVariant ?? '')
	return (
		<Card>
			<div
				className={cn(
					'flex h-20 items-center justify-center rounded-md p-3',
					white ? 'bg-neutral-900' : 'bg-white',
				)}
			>
				{logo.url && (
					// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
					<img
						src={logo.url}
						alt={logo.alt ?? logo.name}
						// 칸 높이 안에 맞춘다 — SVG는 원래 크기대로 커지려 한다.
						className="size-full object-contain"
					/>
				)}
			</div>
			<Meta>{logo.name}</Meta>
		</Card>
	)
}

// ── 템플릿 분류 ──────────────────────────────────────────────────────────

const loadThumbs = () => listLatestTemplatesByCategory(4)

/** 템플릿 분류 — 3열 카드, 카드마다 그 분류에서 최근에 고친 템플릿 4개를 2×2 썸네일로(사용자 2026-10-15). */
function CategoryTab() {
	const categories = useLoad(listFoundationCategories)
	const thumbs = useLoad(loadThumbs)
	const error = categories.error ?? thumbs.error
	return (
		<Section title="템플릿 분류" error={error} loading={!categories.data || !thumbs.data}>
			<Grid>
				{(categories.data ?? []).map((category) => {
					const latest = thumbs.data?.get(category.id) ?? []
					return (
						<Card key={category.id}>
							<div className="grid aspect-square grid-cols-2 grid-rows-2 gap-1 overflow-hidden rounded-md">
								{Array.from({ length: 4 }, (_, index) => {
									const template = latest[index]
									return template?.image ? (
										// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
										<img
											key={template.id}
											src={template.image.url}
											alt={template.name}
											className="size-full bg-muted object-cover"
										/>
									) : (
										<span
											// biome-ignore lint/suspicious/noArrayIndexKey: 빈 칸 자리는 위치가 곧 정체다
											key={index}
											aria-hidden
											className="size-full bg-muted"
										/>
									)
								})}
							</div>
							<Typography size="sm" weight="medium" className="truncate">
								{category.title}
							</Typography>
							<Meta>템플릿 {category.templateCount}개</Meta>
						</Card>
					)
				})}
			</Grid>
		</Section>
	)
}

// ── 판형 종류 ────────────────────────────────────────────────────────────

/** 비율 상자의 긴 변(px). */
const ARTBOARD_BOX = 96

/**
 * 판형 종류 — 3열 카드, 실제 크기의 비율을 직사각형으로 보인다(사용자 2026-10-15). 판형은 실물이라 모서리를 둥글리지 않는다.
 * ponytail: 아직 데이터가 아니라 코드 상수(그래픽 스튜디오의 `ARTBOARD_PRESETS`)다 — 여기서 고치려면 컬렉션·마이그레이션이
 * 필요해 사용자 결정 대기.
 */
function ArtboardTab() {
	return (
		<Section title="판형 종류">
			<Grid>
				{Object.entries(ARTBOARD_PRESETS).map(([key, preset]) => {
					const scale = ARTBOARD_BOX / Math.max(preset.width, preset.height)
					return (
						<Card key={key}>
							<div
								className="flex items-center justify-center"
								style={{ height: ARTBOARD_BOX }}
							>
								<span
									aria-hidden
									className="rounded-none border border-foreground/40 bg-muted"
									style={{
										width: preset.width * scale,
										height: preset.height * scale,
									}}
								/>
							</div>
							<Typography size="sm" weight="medium">
								{preset.label}
							</Typography>
							<Meta>{preset.caption}</Meta>
							<Meta>
								{preset.width} × {preset.height} {preset.unit} · {preset.dpi} ppi
							</Meta>
						</Card>
					)
				})}
			</Grid>
		</Section>
	)
}
