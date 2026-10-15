'use client'

import { Fragment, type ReactNode, useCallback, useEffect, useId, useState } from 'react'
import { ControllerSwatch } from '@/components/shared/controller'
import { ARTBOARD_PRESETS } from '@/components/studio/graphic/output/output-presets'
import { DataEditor } from '@/components/studio/shared/data-editor'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldLabel, FieldTitle } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { Typography } from '@/components/ui/typography'
import { PALETTE_FAMILY_OPTIONS } from '@/features/guideline/domain/contract/palette'
import { CI_VARIANTS } from '@/features/template-core/domain/ci-variants'
import {
	type FoundationCategory,
	type FoundationCollection,
	type FoundationColor,
	type FoundationColorGroup,
	type FoundationLogo,
	listFoundationCategories,
	listFoundationColorGroups,
	listFoundationColors,
	listFoundationLogos,
	listLatestTemplatesByCategory,
	updateFoundationRecord,
} from '@/features/template-customization/services/foundation-records.client'
import { isHexColor } from '@/lib/color'
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
 * 모든 탭이 3열 격자다(사용자 2026-10-15). 카드의 「편집」을 누르면 그 줄 아래로 폼이 열리고, 「저장」하면 바로 게시한다
 * (같은 껍데기의 템플릿 데이터 편집과 같다). 판형 종류는 아직 데이터가 아니라 보기만 한다.
 */
export function FoundationEditor({ trigger }: { trigger?: (open: () => void) => ReactNode }) {
	return (
		<DataEditor
			subject="파운데이션"
			trigger={trigger}
			notice={false}
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

/**
 * 읽는다 — 실패하면 빈 화면 대신 그 사실을 보인다. `load`는 모듈 수준 함수여야 한다(바뀌면 다시 읽는다).
 * `reload`는 저장한 뒤 다시 읽을 때 쓴다.
 */
function useLoad<T>(load: () => Promise<T>) {
	const [data, setData] = useState<T | null>(null)
	const [error, setError] = useState<string | null>(null)
	const [version, setVersion] = useState(0)
	// biome-ignore lint/correctness/useExhaustiveDependencies: version은 다시 읽기 신호다
	useEffect(() => {
		load()
			.then(setData)
			.catch((cause: unknown) =>
				setError(cause instanceof Error ? cause.message : '불러오지 못했어요.'),
			)
	}, [load, version])
	const reload = useCallback(() => setVersion((value) => value + 1), [])
	return { data, error, reload }
}

/** 지금 편집 중인 한 건 — 같은 「편집」을 다시 누르면 닫는다. */
function useEditing() {
	const [id, setId] = useState<number | null>(null)
	return {
		id,
		toggle: (next: number) => setId((current) => (current === next ? null : next)),
		close: () => setId(null),
	}
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

function Card({
	children,
	className,
	editing,
	onEdit,
}: {
	children: ReactNode
	className?: string
	/** 이 카드의 폼이 열려 있나. */
	editing?: boolean
	/** 있으면 「편집」 버튼을 둔다. 카드 전체를 버튼으로 만들지 않는다 — 안의 스와치가 라디오라 겹칠 수 없다. */
	onEdit?: () => void
}) {
	return (
		<li
			className={cn(
				'relative flex min-w-0 flex-col gap-2 rounded-lg border border-border p-3',
				editing && 'border-foreground',
				className,
			)}
		>
			{children}
			{onEdit && (
				<Button
					size="xs"
					variant={editing ? 'outline' : 'ghost'}
					className="absolute top-2 right-2"
					aria-expanded={editing}
					onClick={onEdit}
				>
					편집
				</Button>
			)}
		</li>
	)
}

/** 카드 아래로 한 줄 전체를 차지하는 편집 폼 — 「저장」하면 바로 게시하고 목록을 다시 읽는다. */
function EditRow({
	title,
	collection,
	id,
	build,
	onDone,
	children,
}: {
	title: string
	collection: FoundationCollection
	id: number
	/** 보낼 값 — 틀린 칸이 있으면 그 문구(문자열)를 돌려준다. */
	build: () => Record<string, unknown> | string
	onDone: (saved: boolean) => void
	children: ReactNode
}) {
	const [busy, setBusy] = useState(false)
	const [error, setError] = useState<string | null>(null)
	const save = async () => {
		const data = build()
		if (typeof data === 'string') return setError(data)
		setBusy(true)
		setError(null)
		try {
			await updateFoundationRecord(collection, id, data)
			onDone(true)
		} catch (cause) {
			setError(cause instanceof Error ? cause.message : '저장하지 못했어요.')
		} finally {
			setBusy(false)
		}
	}
	return (
		<li className="col-span-3 flex flex-col gap-4 rounded-lg border border-foreground p-4">
			<Typography size="sm" weight="semibold">
				{title}
			</Typography>
			<div className="grid grid-cols-2 gap-3">{children}</div>
			{error && <FieldError>{error}</FieldError>}
			<div className="flex justify-end gap-2">
				<Button variant="ghost" disabled={busy} onClick={() => onDone(false)}>
					취소
				</Button>
				<Button disabled={busy} onClick={() => void save()}>
					{busy ? '저장하는 중…' : '저장'}
				</Button>
			</div>
		</li>
	)
}

function TextField({
	label,
	value,
	onChange,
	multiline,
	inputMode,
}: {
	label: string
	value: string
	onChange: (value: string) => void
	multiline?: boolean
	inputMode?: 'numeric' | 'decimal'
}) {
	const id = useId()
	return (
		<Field className="gap-1.5">
			<FieldLabel htmlFor={id}>{label}</FieldLabel>
			{multiline ? (
				<Textarea
					id={id}
					rows={2}
					value={value}
					onChange={(event) => onChange(event.target.value)}
				/>
			) : (
				<Input
					id={id}
					inputMode={inputMode}
					value={value}
					onChange={(event) => onChange(event.target.value)}
				/>
			)}
		</Field>
	)
}

function CheckField({
	label,
	checked,
	onChange,
}: {
	label: string
	checked: boolean
	onChange: (checked: boolean) => void
}) {
	return (
		<Label className="font-normal">
			<Checkbox checked={checked} onCheckedChange={(next) => onChange(next === true)} />
			{label}
		</Label>
	)
}

/** 고를 것 하나(다시 누르면 비움) — 선택지가 몇 개 안 되는 칸. */
function ChoiceField<T extends string>({
	label,
	options,
	value,
	onChange,
}: {
	label: string
	options: readonly { value: T; label: string }[]
	value: T | null
	onChange: (value: T | null) => void
}) {
	return (
		<Field className="gap-1.5">
			<FieldTitle>{label}</FieldTitle>
			<ToggleGroup
				type="single"
				variant="outline"
				size="sm"
				spacing={0}
				value={value ?? ''}
				onValueChange={(next) => onChange((next || null) as T | null)}
				aria-label={label}
				className="w-full flex-wrap"
			>
				{options.map((option) => (
					<ToggleGroupItem key={option.value} value={option.value}>
						{option.label}
					</ToggleGroupItem>
				))}
			</ToggleGroup>
		</Field>
	)
}

/** 비우면 「없음」, 숫자가 아니면 `undefined`(틀림). */
function parseOptionalNumber(raw: string): number | null | undefined {
	const value = raw.trim()
	if (!value) return null
	const number = Number(value)
	return Number.isFinite(number) ? number : undefined
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
 * 컬러 — 컬러 패널과 같은 둥근 스와치(`ControllerSwatch`)로 보인다(사용자 2026-10-15). 컬러의 그룹 칸(`colorGroup`)으로
 * 묶고, 비면 「그룹 없음」에 모인다. 컬러 그룹(팔레트)은 아래에 따로 있다.
 */
function ColorTab() {
	const colors = useLoad(listFoundationColors)
	const groups = useLoad(listFoundationColorGroups)
	const editing = useEditing()
	const byGroup = new Map<string, FoundationColor[]>()
	for (const color of colors.data ?? []) {
		const key = color.colorGroup ?? '그룹 없음'
		byGroup.set(key, [...(byGroup.get(key) ?? []), color])
	}
	const done = (saved: boolean) => {
		editing.close()
		if (saved) {
			colors.reload()
			groups.reload()
		}
	}
	return (
		<div className="flex flex-col gap-6">
			<Section title="컬러" error={colors.error} loading={!colors.data}>
				<div className="flex flex-col gap-4">
					{[...byGroup].map(([group, members]) => (
						<div key={group} className="flex flex-col gap-2">
							<Typography size="xs" tone="muted">
								{group}
							</Typography>
							<Grid>
								{members.map((color) => (
									<Fragment key={color.id}>
										<Card
											className="flex-row items-center gap-3"
											editing={editing.id === color.id}
											onEdit={() => editing.toggle(color.id)}
										>
											<Swatch hex={color.hex} label={color.name} large />
											<span className="flex min-w-0 flex-col pr-10">
												<Typography
													size="sm"
													weight="medium"
													className="truncate"
												>
													{color.name}
													{color.isMain ? ' · 대표' : ''}
												</Typography>
												<Meta>{color.hex}</Meta>
												<Meta>{color.cmyk ?? 'CMYK —'}</Meta>
												<Meta>{color.pantone ?? 'Pantone —'}</Meta>
											</span>
										</Card>
										{editing.id === color.id && (
											<ColorForm color={color} onDone={done} />
										)}
									</Fragment>
								))}
							</Grid>
						</div>
					))}
				</div>
			</Section>
			<Section title="컬러 그룹" error={groups.error} loading={!groups.data}>
				<Grid>
					{(groups.data ?? []).map((group) => (
						// 그룹 id는 컬러 id와 겹칠 수 있어 편집 표시는 음수로 가른다.
						<Fragment key={group.id}>
							<Card
								editing={editing.id === -group.id}
								onEdit={() => editing.toggle(-group.id)}
							>
								<Typography size="sm" weight="medium" className="truncate pr-10">
									{group.name}
								</Typography>
								<span className="flex flex-wrap gap-1.5">
									{group.colors.map((color) => (
										<Swatch key={color.id} hex={color.hex} label={color.hex} />
									))}
								</span>
								<Meta>{group.family ?? '—'}</Meta>
							</Card>
							{editing.id === -group.id && (
								<GroupForm group={group} colors={colors.data ?? []} onDone={done} />
							)}
						</Fragment>
					))}
				</Grid>
			</Section>
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

const MONO_FILL_OPTIONS = [
	{ value: 'black', label: '검정' },
	{ value: 'white', label: '흰색' },
] as const

function ColorForm({
	color,
	onDone,
}: {
	color: FoundationColor
	onDone: (saved: boolean) => void
}) {
	const [draft, setDraft] = useState({
		name: color.name,
		hex: color.hex,
		cmyk: color.cmyk ?? '',
		pantone: color.pantone ?? '',
		colorGroup: color.colorGroup ?? '',
		tone: color.tone?.toString() ?? '',
		isMain: Boolean(color.isMain),
		allowsFullColorLogo: Boolean(color.allowsFullColorLogo),
		allowsWhiteWordmark: Boolean(color.allowsWhiteWordmark),
		monoLogoFill: color.monoLogoFill ?? null,
	})
	const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }))
	return (
		<EditRow
			title={`컬러 · ${color.name}`}
			collection="brand-colors"
			id={color.id}
			onDone={onDone}
			build={() => {
				if (!draft.name.trim()) return '이름을 적어 주세요.'
				if (!isHexColor(draft.hex.trim())) return 'HEX는 #RRGGBB 형식으로 적어 주세요.'
				const tone = parseOptionalNumber(draft.tone)
				if (tone === undefined || (tone !== null && (tone < 1 || tone > 5)))
					return '톤은 비우거나 1~5로 적어 주세요.'
				return {
					name: draft.name.trim(),
					hex: draft.hex.trim(),
					cmyk: draft.cmyk.trim() || null,
					pantone: draft.pantone.trim() || null,
					colorGroup: draft.colorGroup.trim() || null,
					tone,
					isMain: draft.isMain,
					allowsFullColorLogo: draft.allowsFullColorLogo,
					allowsWhiteWordmark: draft.allowsWhiteWordmark,
					monoLogoFill: draft.monoLogoFill,
				}
			}}
		>
			<TextField label="이름" value={draft.name} onChange={(name) => set({ name })} />
			<div className="flex items-end gap-2">
				<TextField label="HEX" value={draft.hex} onChange={(hex) => set({ hex })} />
				{isHexColor(draft.hex.trim()) && (
					<Swatch hex={draft.hex.trim()} label="미리보기" large />
				)}
			</div>
			<TextField label="CMYK" value={draft.cmyk} onChange={(cmyk) => set({ cmyk })} />
			<TextField
				label="Pantone"
				value={draft.pantone}
				onChange={(pantone) => set({ pantone })}
			/>
			<TextField
				label="그룹"
				value={draft.colorGroup}
				onChange={(colorGroup) => set({ colorGroup })}
			/>
			<TextField
				label="톤 (1~5)"
				inputMode="numeric"
				value={draft.tone}
				onChange={(tone) => set({ tone })}
			/>
			<ChoiceField
				label="이 배경의 단색 로고 색"
				options={MONO_FILL_OPTIONS}
				value={draft.monoLogoFill}
				onChange={(monoLogoFill) => set({ monoLogoFill })}
			/>
			<div className="flex flex-col gap-2">
				<CheckField
					label="대표 컬러"
					checked={draft.isMain}
					onChange={(isMain) => set({ isMain })}
				/>
				<CheckField
					label="이 배경에 기본형 로고 허용"
					checked={draft.allowsFullColorLogo}
					onChange={(allowsFullColorLogo) => set({ allowsFullColorLogo })}
				/>
				<CheckField
					label="이 배경에 흰 워드마크 허용"
					checked={draft.allowsWhiteWordmark}
					onChange={(allowsWhiteWordmark) => set({ allowsWhiteWordmark })}
				/>
			</div>
		</EditRow>
	)
}

/** 컬러 그룹 — 담는 컬러는 고른 순서대로 팔레트에 선다(새로 고른 것은 끝에). ponytail: 순서 바꾸기는 아직 없다. */
function GroupForm({
	group,
	colors,
	onDone,
}: {
	group: FoundationColorGroup
	colors: readonly FoundationColor[]
	onDone: (saved: boolean) => void
}) {
	const [name, setName] = useState(group.name)
	const [family, setFamily] = useState<string | null>(group.family ?? null)
	const [members, setMembers] = useState(() => group.colors.map((color) => color.id))
	return (
		<EditRow
			title={`컬러 그룹 · ${group.name}`}
			collection="brand-color-groups"
			id={group.id}
			onDone={onDone}
			build={() =>
				name.trim() ? { name: name.trim(), family, colors: members } : '이름을 적어 주세요.'
			}
		>
			<TextField label="이름" value={name} onChange={setName} />
			<ChoiceField
				label="팔레트 분류"
				options={PALETTE_FAMILY_OPTIONS}
				value={family}
				onChange={setFamily}
			/>
			<Field className="col-span-2 gap-1.5">
				<FieldTitle>담을 컬러</FieldTitle>
				<div className="grid grid-cols-3 gap-2">
					{colors.map((color) => (
						<Label key={color.id} className="font-normal">
							<Checkbox
								checked={members.includes(color.id)}
								onCheckedChange={(next) =>
									setMembers((current) =>
										next === true
											? [...current, color.id]
											: current.filter((id) => id !== color.id),
									)
								}
							/>
							<span
								aria-hidden
								className="size-3 shrink-0 rounded-full border border-border"
								style={{ backgroundColor: color.hex }}
							/>
							<span className="truncate">{color.name}</span>
						</Label>
					))}
				</div>
			</Field>
		</EditRow>
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
	const editing = useEditing()
	const done = (saved: boolean) => {
		editing.close()
		if (saved) logos.reload()
	}
	const all = logos.data ?? []
	const isMain = (logo: FoundationLogo) =>
		Boolean(logo.ciShape) && (LOGO_COLUMNS as readonly string[]).includes(logo.ciVariant ?? '')
	const shapes = [...new Set(all.filter(isMain).map((logo) => logo.ciShape as string))].sort()
	const exceptions = new Map<string, FoundationLogo[]>()
	for (const logo of all.filter((logo) => !isMain(logo))) {
		const key = logo.ciShape ? variantLabel(logo.ciVariant) : '여백·도판'
		exceptions.set(key, [...(exceptions.get(key) ?? []), logo])
	}
	const card = (logo: FoundationLogo) => (
		<Fragment key={logo.id}>
			<LogoCard
				logo={logo}
				editing={editing.id === logo.id}
				onEdit={() => editing.toggle(logo.id)}
			/>
			{editing.id === logo.id && <LogoForm logo={logo} onDone={done} />}
		</Fragment>
	)
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
										card(logo)
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
					<Grid>{members.map(card)}</Grid>
				</Section>
			))}
		</div>
	)
}

function LogoCard({
	logo,
	editing,
	onEdit,
}: {
	logo: FoundationLogo
	editing: boolean
	onEdit: () => void
}) {
	const white = WHITE_VARIANTS.has(logo.ciVariant ?? '')
	return (
		<Card editing={editing} onEdit={onEdit}>
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

/** 로고 — 이름·대체 텍스트·CI 모양·CI 색상. ponytail: 파일 바꾸기는 아직 없다(admin에서). */
function LogoForm({ logo, onDone }: { logo: FoundationLogo; onDone: (saved: boolean) => void }) {
	const [draft, setDraft] = useState({
		name: logo.name,
		alt: logo.alt ?? '',
		ciShape: logo.ciShape ?? '',
		ciVariant: (logo.ciVariant ?? null) as (typeof CI_VARIANTS)[number]['value'] | null,
	})
	const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }))
	return (
		<EditRow
			title={`로고 · ${logo.name}`}
			collection="brand-logos"
			id={logo.id}
			onDone={onDone}
			build={() => {
				if (!draft.name.trim()) return '이름을 적어 주세요.'
				if (!draft.alt.trim()) return '대체 텍스트를 적어 주세요.'
				return {
					name: draft.name.trim(),
					alt: draft.alt.trim(),
					ciShape: draft.ciShape.trim() || null,
					ciVariant: draft.ciVariant,
				}
			}}
		>
			<TextField label="이름" value={draft.name} onChange={(name) => set({ name })} />
			<TextField label="대체 텍스트" value={draft.alt} onChange={(alt) => set({ alt })} />
			<TextField
				label="CI 모양 (같은 로고의 색 버전끼리 같은 값)"
				value={draft.ciShape}
				onChange={(ciShape) => set({ ciShape })}
			/>
			<ChoiceField
				label="CI 색상"
				options={CI_VARIANTS}
				value={draft.ciVariant}
				onChange={(ciVariant) => set({ ciVariant })}
			/>
		</EditRow>
	)
}

// ── 템플릿 분류 ──────────────────────────────────────────────────────────

const loadThumbs = () => listLatestTemplatesByCategory(4)

/** 템플릿 분류 — 3열 카드, 카드마다 그 분류에서 최근에 고친 템플릿 4개를 2×2 썸네일로(사용자 2026-10-15). */
function CategoryTab() {
	const categories = useLoad(listFoundationCategories)
	const thumbs = useLoad(loadThumbs)
	const editing = useEditing()
	const done = (saved: boolean) => {
		editing.close()
		if (saved) categories.reload()
	}
	const error = categories.error ?? thumbs.error
	return (
		<Section title="템플릿 분류" error={error} loading={!categories.data || !thumbs.data}>
			<Grid>
				{(categories.data ?? []).map((category) => {
					const latest = thumbs.data?.get(category.id) ?? []
					return (
						<Fragment key={category.id}>
							<Card
								editing={editing.id === category.id}
								onEdit={() => editing.toggle(category.id)}
							>
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
							{editing.id === category.id && (
								<CategoryForm category={category} onDone={done} />
							)}
						</Fragment>
					)
				})}
			</Grid>
		</Section>
	)
}

/** 템플릿 분류 — 이름·설명·순서(작을수록 먼저). 주소(slug)는 이름에서 서버가 만든다. */
function CategoryForm({
	category,
	onDone,
}: {
	category: FoundationCategory
	onDone: (saved: boolean) => void
}) {
	const [draft, setDraft] = useState({
		title: category.title,
		description: category.description ?? '',
		displayOrder: String(category.displayOrder ?? 0),
	})
	const set = (patch: Partial<typeof draft>) => setDraft((current) => ({ ...current, ...patch }))
	return (
		<EditRow
			title={`템플릿 분류 · ${category.title}`}
			collection="template-categories"
			id={category.id}
			onDone={onDone}
			build={() => {
				if (!draft.title.trim()) return '이름을 적어 주세요.'
				const order = parseOptionalNumber(draft.displayOrder)
				if (order == null || order < 0 || !Number.isInteger(order))
					return '순서는 0 이상의 정수로 적어 주세요.'
				return {
					title: draft.title.trim(),
					description: draft.description.trim() || null,
					displayOrder: order,
				}
			}}
		>
			<TextField label="이름" value={draft.title} onChange={(title) => set({ title })} />
			<TextField
				label="순서 (작을수록 먼저)"
				inputMode="numeric"
				value={draft.displayOrder}
				onChange={(displayOrder) => set({ displayOrder })}
			/>
			<div className="col-span-2">
				<TextField
					label="설명"
					multiline
					value={draft.description}
					onChange={(description) => set({ description })}
				/>
			</div>
		</EditRow>
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
