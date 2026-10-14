'use client'

import { type ReactNode, useEffect, useState } from 'react'
import { toggleAllowedId } from '@/components/admin/templates/template-layers'
import {
	type ManagerLink,
	ManagerLinkForm,
} from '@/components/studio/template/manager-forms/link-form'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldTitle } from '@/components/ui/field'
import { Label } from '@/components/ui/label'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { fetchCanvasStudioConfigs } from '@/features/graphic-generation/services/list-canvas-studio-configs.client'
import { requestPublishedImageProfiles } from '@/features/image-generation/services/generate-image.client'
import type {
	TemplateBackgroundPolicy,
	TemplateBackgroundType,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateManagerData } from '@/features/template-customization/hooks/use-template-manager-data'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import {
	BACKGROUND_TYPES,
	readBackgroundPolicy,
	updateTemplateBackgroundPolicy,
	withBackgroundTypes,
} from '@/features/template-customization/services/manager-background-policy.client'

/** 화면의 Mode 행과 같은 이름 — 관리자가 보는 글자 그대로 부른다. */
const TYPE_LABELS: Record<TemplateBackgroundType, string> = {
	color: 'Color',
	image: 'Image',
	graphic: 'Graphic',
}

type Profiled = Exclude<TemplateBackgroundType, 'color'>
type Section = 'types' | 'dimmer' | Profiled
type Choice<T> = { id: T; name: string }

/** 어느 칸에서 열었나 — `types`=Mode 행, `dimmer`=Dimming의 Use 행, `profile`=편집 중 대상 카드. 없으면 전부. */
export type BackgroundPolicyFocus = 'types' | 'dimmer' | 'profile'

const loadGraphicChoices = () => fetchCanvasStudioConfigs('graphic')

/**
 * 배경 정책의 관리 폼(`background:` · `control:background.type|dimmer` · `profile:background`) — 허용 형식·처음 형식·
 * Dimming 허용·이미지/그래픽 허용 목록. 작은 칸에서 열면 그 칸의 절만, Layers의 Background 줄에서 열면 전부 보인다.
 * 좁은 칸은 끄면 사라지므로(형식은 Mode에서, Dimming은 행째) 되살리는 자리는 Background 줄이다.
 * 프로파일·브랜드 컬러는 여러 템플릿이 같이 쓰는 데이터라 링크로만 보낸다.
 */
export function BackgroundPolicyForm({ focus }: { focus?: BackgroundPolicyFocus }) {
	const { config, editing, background } = useTemplateStudio()
	const manager = useTemplateManagerData<{ backgroundPolicy?: unknown }>(config.id, [
		'backgroundPolicy',
	])
	if (!manager.data) return <FormNote error={manager.error} loading />

	const policy = readBackgroundPolicy(manager.data.backgroundPolicy)
	const types = policy.types ?? BACKGROUND_TYPES
	const defaultType =
		policy.defaultType && types.includes(policy.defaultType) ? policy.defaultType : types[0]
	const mode = editing.target?.mode
	const sections: readonly Section[] =
		focus === 'types' || focus === 'dimmer'
			? [focus]
			: focus === 'profile'
				? [mode === 'image' || mode === 'graphic' ? mode : 'types']
				: ['types', 'dimmer', ...types.filter((type): type is Profiled => type !== 'color')]
	const links = linksFor(focus, mode, background.state)
	// 늘 최신 초안을 읽어 고친다 — 화면이 들고 있는 값은 고를 거리를 그리는 데만 쓴다.
	const change = (update: (policy: TemplateBackgroundPolicy) => TemplateBackgroundPolicy) =>
		void manager.save(() => updateTemplateBackgroundPolicy(config.id, update))

	return (
		<div className="flex flex-col gap-4">
			{sections.includes('types') && (
				<FormSection title="Mode에 보일 형식">
					<ToggleGroup
						type="multiple"
						variant="outline"
						size="sm"
						spacing={0}
						value={[...types]}
						disabled={manager.busy}
						onValueChange={(next) =>
							next.length > 0 &&
							change(
								(fresh) =>
									withBackgroundTypes(fresh, next as TemplateBackgroundType[]) ??
									fresh,
							)
						}
						aria-label="Mode에 보일 형식"
						className="w-full"
					>
						{BACKGROUND_TYPES.map((type) => (
							<ToggleGroupItem
								key={type}
								value={type}
								// 하나는 꼭 남는다 — 비면 스튜디오가 배경을 못 그린다.
								disabled={types.length === 1 && types[0] === type}
							>
								{TYPE_LABELS[type]}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
					{types.length > 1 && (
						<>
							<FieldTitle>처음 열면 고른 형식</FieldTitle>
							<ToggleGroup
								type="single"
								variant="outline"
								size="sm"
								spacing={0}
								value={defaultType}
								disabled={manager.busy}
								onValueChange={(next) =>
									next &&
									next !== defaultType &&
									change((fresh) => ({
										...fresh,
										defaultType: next as TemplateBackgroundType,
									}))
								}
								aria-label="처음 열면 고른 형식"
								className="w-full"
							>
								{types.map((type) => (
									<ToggleGroupItem key={type} value={type}>
										{TYPE_LABELS[type]}
									</ToggleGroupItem>
								))}
							</ToggleGroup>
						</>
					)}
				</FormSection>
			)}

			{sections.includes('dimmer') && (
				<FormSection title="Dimming">
					<ToggleGroup
						type="single"
						variant="outline"
						size="sm"
						spacing={0}
						value={policy.dimmer === false ? 'off' : 'on'}
						disabled={manager.busy}
						onValueChange={(next) =>
							next &&
							change((fresh) => ({
								...fresh,
								// 미지정이 허용이다 — 켤 때는 키를 걷는다(false만 금지).
								dimmer: next === 'off' ? false : undefined,
							}))
						}
						aria-label="Dimming 허용"
						className="w-full"
					>
						<ToggleGroupItem value="on">허용</ToggleGroupItem>
						<ToggleGroupItem value="off">숨김</ToggleGroupItem>
					</ToggleGroup>
				</FormSection>
			)}

			{sections.includes('image') && (
				<AllowedList
					title="쓸 수 있는 이미지 프로파일"
					load={requestPublishedImageProfiles}
					selected={policy.imageConfigIds}
					busy={manager.busy}
					onToggle={(all, id) =>
						change((fresh) => ({
							...fresh,
							imageConfigIds: toggleAllowedId(fresh.imageConfigIds, all, id),
						}))
					}
				/>
			)}

			{sections.includes('graphic') && (
				<AllowedList
					title="쓸 수 있는 그래픽"
					load={loadGraphicChoices}
					selected={policy.graphicConfigIds}
					busy={manager.busy}
					onToggle={(all, id) =>
						change((fresh) => ({
							...fresh,
							graphicConfigIds: toggleAllowedId(fresh.graphicConfigIds, all, id),
						}))
					}
				/>
			)}

			{links.length > 0 && (
				<ManagerLinkForm
					note="프로파일과 브랜드 컬러는 여러 템플릿이 같이 써서 각자의 페이지에서 고쳐요."
					links={links}
				/>
			)}

			<FormNote error={manager.error} busy={manager.busy} note={noteFor(focus)} />
		</div>
	)
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
	return (
		<Field className="gap-1.5">
			<FieldTitle>{title}</FieldTitle>
			{children}
		</Field>
	)
}

/** 허용 목록 — 전부 켜져 있으면 「목록 없음」(=앞으로 생길 것까지 허용)으로 저장된다(`toggleAllowedId`). */
function AllowedList<T extends string | number>({
	title,
	load,
	selected,
	busy,
	onToggle,
}: {
	title: string
	/** 모듈 수준 함수여야 한다 — 바뀌면 다시 불러온다. */
	load: () => Promise<readonly Choice<T>[]>
	selected: readonly T[] | undefined
	busy: boolean
	onToggle: (all: T[], id: T) => void
}) {
	const [items, setItems] = useState<readonly Choice<T>[] | null>(null)
	const [failed, setFailed] = useState(false)
	useEffect(() => {
		load()
			.then(setItems)
			.catch(() => setFailed(true))
	}, [load])

	const all = items?.map((item) => item.id) ?? []
	return (
		<FormSection title={title}>
			{failed || !items || items.length === 0 ? (
				<FormNote
					error={failed ? '목록을 불러오지 못했어요.' : null}
					loading={!items}
					note="발행된 항목이 없어요."
				/>
			) : (
				<ul className="flex flex-col gap-2">
					{items.map((item) => (
						<li key={item.id}>
							<Label className="font-normal">
								<Checkbox
									checked={(selected ?? all).includes(item.id)}
									disabled={busy}
									onCheckedChange={() => onToggle(all, item.id)}
								/>
								{item.name}
							</Label>
						</li>
					))}
				</ul>
			)}
		</FormSection>
	)
}

function linksFor(
	focus: BackgroundPolicyFocus | undefined,
	mode: 'image' | 'graphic' | 'color' | undefined,
	state: { profileId?: number; graphicConfigId?: string },
): ManagerLink[] {
	if (!focus) {
		return [
			{ label: '브랜드 컬러', href: '/admin/collections/brand-colors' },
			{ label: '이미지 프로파일', href: '/admin/collections/image-profiles' },
			{ label: '그래픽 프로파일', href: '/admin/collections/graphic-profiles' },
		]
	}
	if (focus !== 'profile') return []
	if (mode === 'image') {
		return [
			{
				label: '지금 이미지 프로파일',
				href: `/admin/collections/image-profiles${state.profileId ? `/${state.profileId}` : ''}`,
			},
		]
	}
	if (mode === 'graphic') {
		return [
			{
				label: '지금 그래픽 프로파일',
				// 그래픽은 런타임 id로 고르고, 프로파일은 런타임마다 하나다(GraphicProfiles.runtime unique).
				href: state.graphicConfigId
					? `/admin/collections/graphic-profiles?where[runtime][equals]=${encodeURIComponent(state.graphicConfigId)}`
					: '/admin/collections/graphic-profiles',
			},
		]
	}
	return [{ label: '브랜드 컬러', href: '/admin/collections/brand-colors' }]
}

function noteFor(focus: BackgroundPolicyFocus | undefined): string | undefined {
	if (focus === 'types') return '끈 형식은 Layers의 Background 줄에서 다시 켜요.'
	if (focus === 'dimmer') return '숨기면 이 행이 사라지고, Layers의 Background 줄에서 되살려요.'
	return undefined
}
