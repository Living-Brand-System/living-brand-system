'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { ARTBOARD_PRESETS } from '@/components/studio/graphic/output/output-presets'
import {
	DataEditor,
	type DataEditorColumn,
	DataEditorTable,
} from '@/components/studio/shared/data-editor'
import { Typography } from '@/components/ui/typography'
import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
import {
	type FoundationCategory,
	type FoundationColor,
	type FoundationColorGroup,
	type FoundationLogo,
	listFoundationCategories,
	listFoundationColorGroups,
	listFoundationColors,
	listFoundationLogos,
} from '@/features/template-customization/services/foundation-records.client'

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
 * ponytail: 지금은 배치만 — 읽기 전용 목록이다. 고치는 폼은 칸마다 정해지면 붙인다.
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

/** 목록 하나를 읽는다 — 실패하면 빈 목록 대신 그 사실을 보인다. */
function useRows<Row>(load: () => Promise<Row[]>) {
	const [rows, setRows] = useState<Row[] | null>(null)
	const [error, setError] = useState<string | null>(null)
	useEffect(() => {
		load()
			.then(setRows)
			.catch((cause: unknown) =>
				setError(cause instanceof Error ? cause.message : '불러오지 못했어요.'),
			)
	}, [load])
	return { rows, error }
}

function Section({
	title,
	error,
	children,
}: {
	title: string
	error: string | null
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
			) : (
				children
			)}
		</section>
	)
}

function Swatch({ hex, label }: { hex: string; label: string }) {
	return (
		<span
			role="img"
			aria-label={label}
			className="inline-block size-5 shrink-0 rounded-sm border border-border align-middle"
			style={{ backgroundColor: hex }}
		/>
	)
}

const COLOR_COLUMNS: readonly DataEditorColumn<FoundationColor>[] = [
	{ key: 'swatch', header: '', cell: (color) => <Swatch hex={color.hex} label={color.name} /> },
	{ key: 'name', header: '이름', cell: (color) => color.name },
	{ key: 'hex', header: 'RGB (HEX)', cell: (color) => color.hex },
	{ key: 'cmyk', header: 'CMYK', cell: (color) => color.cmyk ?? '—' },
	{ key: 'pantone', header: 'Pantone', cell: (color) => color.pantone ?? '—' },
	{ key: 'group', header: '그룹', cell: (color) => color.colorGroup ?? '—' },
	{ key: 'main', header: '대표', cell: (color) => (color.isMain ? '대표' : '') },
]

const GROUP_COLUMNS: readonly DataEditorColumn<FoundationColorGroup>[] = [
	{ key: 'name', header: '이름', cell: (group) => group.name },
	{ key: 'family', header: '계열', cell: (group) => group.family ?? '—' },
	{
		key: 'colors',
		header: '컬러',
		cell: (group) => (
			<span className="flex flex-wrap gap-1">
				{group.colors.map((color) => (
					<Swatch key={color.id} hex={color.hex} label={color.hex} />
				))}
			</span>
		),
	},
]

function ColorTab() {
	const colors = useRows(listFoundationColors)
	const groups = useRows(listFoundationColorGroups)
	return (
		<div className="flex flex-col gap-6">
			<Section title="컬러" error={colors.error}>
				<DataEditorTable
					columns={COLOR_COLUMNS}
					rows={colors.rows}
					rowKey={(color) => color.id}
					empty="컬러가 없어요."
				/>
			</Section>
			<Section title="컬러 그룹" error={groups.error}>
				<DataEditorTable
					columns={GROUP_COLUMNS}
					rows={groups.rows}
					rowKey={(group) => group.id}
					empty="컬러 그룹이 없어요."
				/>
			</Section>
		</div>
	)
}

const LOGO_COLUMNS: readonly DataEditorColumn<FoundationLogo>[] = [
	{
		key: 'preview',
		header: '',
		cell: (logo) =>
			logo.url ? (
				// biome-ignore lint/performance/noImgElement: 업로드 URL은 next/image 최적화 대상이 아니다
				<img
					src={logo.url}
					alt={logo.alt ?? logo.name}
					className="h-8 w-16 rounded-sm bg-muted object-contain p-1"
				/>
			) : null,
	},
	{ key: 'name', header: '이름', cell: (logo) => logo.name },
	{ key: 'shape', header: 'CI 모양', cell: (logo) => logo.ciShape ?? '—' },
	{
		key: 'variant',
		header: '색 버전',
		cell: (logo) =>
			CI_VARIANTS.find(({ value }) => value === logo.ciVariant)?.label ??
			logo.ciVariant ??
			'—',
	},
]

function LogoTab() {
	const logos = useRows(listFoundationLogos)
	return (
		<Section title="로고" error={logos.error}>
			<DataEditorTable
				columns={LOGO_COLUMNS}
				rows={logos.rows}
				rowKey={(logo) => logo.id}
				empty="로고가 없어요."
			/>
		</Section>
	)
}

const CATEGORY_COLUMNS: readonly DataEditorColumn<FoundationCategory>[] = [
	{ key: 'order', header: '순서', cell: (category) => category.displayOrder ?? '—' },
	{ key: 'title', header: '이름', cell: (category) => category.title },
	{ key: 'description', header: '설명', cell: (category) => category.description ?? '—' },
	{ key: 'count', header: '템플릿', cell: (category) => `${category.templateCount}개` },
]

function CategoryTab() {
	const categories = useRows(listFoundationCategories)
	return (
		<Section title="템플릿 분류" error={categories.error}>
			<DataEditorTable
				columns={CATEGORY_COLUMNS}
				rows={categories.rows}
				rowKey={(category) => category.id}
				empty="템플릿 분류가 없어요."
			/>
		</Section>
	)
}

type Artboard = (typeof ARTBOARD_PRESETS)[keyof typeof ARTBOARD_PRESETS] & { key: string }
const ARTBOARDS: readonly Artboard[] = Object.entries(ARTBOARD_PRESETS).map(([key, preset]) => ({
	key,
	...preset,
}))

const ARTBOARD_COLUMNS: readonly DataEditorColumn<Artboard>[] = [
	{ key: 'label', header: '이름', cell: (artboard) => artboard.label },
	{ key: 'caption', header: '용도', cell: (artboard) => artboard.caption },
	{
		key: 'size',
		header: '크기',
		cell: (artboard) => `${artboard.width} × ${artboard.height} ${artboard.unit}`,
	},
	{ key: 'dpi', header: '해상도', cell: (artboard) => `${artboard.dpi} ppi` },
]

function ArtboardTab() {
	return (
		<Section title="판형 종류" error={null}>
			{/* ponytail: 판형 종류는 아직 데이터가 아니라 코드 상수다(그래픽 스튜디오의 `ARTBOARD_PRESETS`) — 여기서
			    고치려면 컬렉션·마이그레이션이 필요해 사용자 결정 대기. 지금은 무엇이 있는지만 보인다. */}
			<DataEditorTable
				columns={ARTBOARD_COLUMNS}
				rows={ARTBOARDS}
				rowKey={(artboard) => artboard.key}
				empty="판형 종류가 없어요."
			/>
		</Section>
	)
}
