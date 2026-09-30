'use client'

import { useField } from '@payloadcms/ui'
import type { JSONFieldClientComponent } from 'payload'
import type { ComponentProps } from 'react'
import { useEffect, useState } from 'react'
import { AdminSectionHeading } from '@/components/admin/shared/admin-section-heading'
import { Controller } from '@/components/shared/controller'
import type { GraphicStudioConfig } from '@/features/graphic-generation/domain/graphic-studio-config'
import { fetchCanvasStudioConfigs } from '@/features/graphic-generation/services/list-canvas-studio-configs.client'
import {
	type ImageProfileOption,
	requestPublishedImageProfiles,
} from '@/features/image-generation/services/generate-image.client'
import type {
	TemplateBackgroundPolicy,
	TemplateBackgroundType,
} from '@/features/template-customization/domain/template-studio-config'
import { toggleAllowedId } from './template-layers'

const TYPE_ROWS: readonly { value: TemplateBackgroundType; label: string }[] = [
	{ value: 'color', label: '색' },
	{ value: 'image', label: '이미지' },
	{ value: 'graphic', label: '그래픽' },
]

const ON_OFF = [
	{ value: 'on', label: 'On' },
	{ value: 'off', label: 'Off' },
] as const

type Props = ComponentProps<JSONFieldClientComponent>

function readPolicy(value: unknown): TemplateBackgroundPolicy {
	const policy = value && typeof value === 'object' ? (value as TemplateBackgroundPolicy) : {}
	// REST/local API로만 도달 가능한 malformed shape(예: types가 배열이 아님) 방어.
	return Array.isArray(policy.types) ? policy : { ...policy, types: undefined }
}

/** 프로파일당 한 행 + On/Off 세그먼트 — 정본(76:4)의 허용 목록 행. 레이어 카드와 같은 언어다. */
function AllowedProfileRows<T extends string | number>({
	disabled,
	items,
	selectedIds,
	onToggle,
}: {
	disabled?: boolean
	items: readonly { id: T; name: string }[]
	selectedIds: readonly T[] | undefined
	onToggle: (all: T[], id: T) => void
}) {
	const all = items.map((item) => item.id)
	return (
		<>
			{items.map((item) => {
				const on = (selectedIds ?? all).includes(item.id)
				return (
					<Controller.Row key={item.id} label={item.name} disabled={disabled}>
						<Controller.Segmented
							aria-label={`${item.name} 허용`}
							options={ON_OFF}
							value={on ? 'on' : 'off'}
							onChange={() => onToggle(all, item.id)}
						/>
					</Controller.Row>
				)
			})}
		</>
	)
}

export function TemplateBackgroundPolicyField({ path }: Props) {
	const { disabled, setValue, value } = useField<unknown>({ path })
	const policy = readPolicy(value)
	const [profiles, setProfiles] = useState<ImageProfileOption[]>([])
	const [profilesLoadError, setProfilesLoadError] = useState(false)
	// 정본(76:4)은 그래픽도 프로파일 이름으로 토글한다 — 목록은 published GraphicProfile에서
	// 파생된 config(name=프로파일명, id=런타임 id)를 재사용하고, 저장값은 런타임 id로 유지해
	// 소비 계약(graphicConfigIds → config.id 필터)을 바꾸지 않는다.
	const [graphicConfigs, setGraphicConfigs] = useState<GraphicStudioConfig[]>([])
	const [graphicLoadError, setGraphicLoadError] = useState(false)

	useEffect(() => {
		void requestPublishedImageProfiles()
			.then(setProfiles)
			.catch(() => setProfilesLoadError(true))
		void fetchCanvasStudioConfigs('graphic')
			.then(setGraphicConfigs)
			.catch(() => setGraphicLoadError(true))
	}, [])

	const types = policy.types ?? TYPE_ROWS.map((row) => row.value)
	const allows = (type: TemplateBackgroundType) => types.includes(type)

	function patch(next: Partial<TemplateBackgroundPolicy>) {
		setValue({ ...policy, ...next })
	}

	return (
		<div className="lbs-kit field-type json mb-20">
			<AdminSectionHeading>배경 설정</AdminSectionHeading>
			<div className="flex flex-col gap-2 rounded-3xl border bg-background px-3 pt-6 pb-3">
				<Controller.Group
					title="사용할 형식"
					collapsible={false}
					trailing={
						<span className="text-muted-foreground text-xs">
							반드시 하나는 사용합니다
						</span>
					}
				>
					<Controller.Row label="형식">
						<Controller.Chips
							aria-label="사용할 형식"
							options={TYPE_ROWS}
							disabled={disabled}
							// 형식이 하나만 켜져 있으면 그 칩은 끌 수 없다 — getTemplateRuntimeManifest가
							// 배경 형식이 전부 비면 던지고, 그 함수는 어드민 폼 렌더 중에도 불린다.
							disabledValues={types.length === 1 ? types : undefined}
							value={types}
							onChange={(next) => {
								const ordered = TYPE_ROWS.map((row) => row.value).filter((type) =>
									next.includes(type),
								)
								if (ordered.length === 0) return
								patch({ types: ordered })
							}}
						/>
					</Controller.Row>
				</Controller.Group>

				{/* 형식과 같은 정책 언어 — 미지정은 허용, false만 금지(기존 저장분 호환). */}
				<Controller.Group title="배경 위 디머" collapsible={false}>
					<Controller.Row label="허용">
						<Controller.Segmented
							aria-label="디머 허용"
							options={ON_OFF}
							disabled={disabled}
							value={policy.dimmer === false ? 'off' : 'on'}
							onChange={(next) => patch({ dimmer: next === 'on' })}
						/>
					</Controller.Row>
				</Controller.Group>

				{allows('image') ? (
					<Controller.Group title="사용할 이미지 프로파일" collapsible={false}>
						{profilesLoadError ? (
							<p className="text-muted-foreground text-sm">
								이미지 프로파일을 불러오지 못했습니다.
							</p>
						) : profiles.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								발행된 이미지 프로파일이 없습니다.
							</p>
						) : (
							<AllowedProfileRows
								disabled={disabled}
								items={profiles}
								selectedIds={policy.imageConfigIds}
								onToggle={(all, id) =>
									patch({
										imageConfigIds: toggleAllowedId(
											policy.imageConfigIds,
											all,
											id,
										),
									})
								}
							/>
						)}
					</Controller.Group>
				) : null}

				{allows('graphic') ? (
					<Controller.Group title="사용할 그래픽 프로파일" collapsible={false}>
						{graphicLoadError ? (
							<p className="text-muted-foreground text-sm">
								그래픽 프로파일을 불러오지 못했습니다.
							</p>
						) : graphicConfigs.length === 0 ? (
							<p className="text-muted-foreground text-sm">
								발행된 그래픽 프로파일이 없습니다.
							</p>
						) : (
							<AllowedProfileRows
								disabled={disabled}
								// ponytail: 프로파일↔런타임 1:1 가정 — 같은 런타임의 프로파일이 둘이면 함께 토글된다.
								items={graphicConfigs}
								selectedIds={policy.graphicConfigIds}
								onToggle={(all, id) =>
									patch({
										graphicConfigIds: toggleAllowedId(
											policy.graphicConfigIds,
											all,
											id,
										),
									})
								}
							/>
						)}
					</Controller.Group>
				) : null}
			</div>
		</div>
	)
}
