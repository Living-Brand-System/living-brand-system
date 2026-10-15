'use client'

import { ChevronDown, ChevronUp } from '@carbon/icons-react'
import { useRouter } from 'next/navigation'
import { useMemo, useRef, useState } from 'react'
import {
	canAssignImage,
	isBackgroundLayer,
	type LayerRow,
	moveLayer,
	parseLayers,
} from '@/components/admin/templates/template-layers'
import { LayerAccessToggle } from '@/components/studio/template/manager-forms/layer-access-toggle'
import {
	moveTemplateLayer,
	stackedLayersOf,
	updateTemplateLayerAccess,
} from '@/components/studio/template/manager-forms/template-html-writes'
import { FormNote } from '@/components/studio/template/manager-forms/text-form'
import { Button } from '@/components/ui/button'
import { Typography } from '@/components/ui/typography'
import { useTemplateLayerSource } from '@/features/template-customization/hooks/use-template-layer-source'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import type { TemplateLayerAccess, TemplateNodeConfig } from '@/types/template'

type LayerKind = 'text' | 'vector' | 'image'

/** 묶음마다 어느 레이어가 속하나 — admin 레이어 목록과 같은 판정이다. */
const BELONGS: Record<LayerKind, (row: LayerRow) => boolean> = {
	text: (row) => row.isText,
	vector: (row) => row.isVector && !isBackgroundLayer(row),
	image: (row) => canAssignImage(row) && !isBackgroundLayer(row),
}

/** 숨김이 아니게 될 때 붙일 입력 선언 — admin 레이어 편집기와 같다. */
const DECLARE: Record<LayerKind, 'input' | 'imageInput' | null> = {
	text: 'input',
	vector: null,
	image: 'imageInput',
}

/** 명시 정책이 우선이고, 없으면 입력 선언이 있는 레이어만 편집 가능(`resolveTemplateLayerPolicy`와 같다). */
function accessOf(config: TemplateNodeConfig | undefined, kind: LayerKind): TemplateLayerAccess {
	if (config?.creator?.access) return config.creator.access
	const declared = DECLARE[kind]
	return declared && config?.[declared] ? 'editable' : 'hidden'
}

export function isManagedLayerKind(kind: string): kind is LayerKind {
	return kind in BELONGS
}

/**
 * 순서·권한 쓰기 — 초안에 쌓고 목록(`onChanged`)과 스튜디오 화면을 새로 그린다.
 * 🔑 컨트롤을 막지 않고 차례로 줄 세운다 — 쓰기가 도는 중에 누른 ▲/▼·권한이 막힌 버튼에 떨어져
 *    조용히 사라지지 않게. 각 쓰기는 최신 값을 다시 읽어 고친다.
 */
function useLayerEdit(onChanged: () => void) {
	const router = useRouter()
	const queue = useRef<Promise<void>>(Promise.resolve())
	const [pending, setPending] = useState(0)
	const [error, setError] = useState<string | null>(null)
	const run = (action: () => Promise<void>) => {
		setPending((count) => count + 1)
		setError(null)
		const result = queue.current.then(async () => {
			try {
				await action()
				onChanged()
				router.refresh()
				return true
			} catch (cause) {
				setError(cause instanceof Error ? cause.message : '레이어를 바꾸지 못했어요.')
				return false
			} finally {
				setPending((count) => count - 1)
			}
		})
		queue.current = result.then(() => undefined)
		// 실패면 `false` — 누른 값을 바로 보이던 토글이 되돌린다.
		return result
	}
	return { busy: pending > 0, error, run }
}

/**
 * Layers 묶음 줄의 관리 폼(`layers:<묶음>`) — 그 묶음의 레이어를 **숨김까지** 전부 나열하고 하나씩
 * 겹침 순서·권한(보일지·편집 가능·값 고정)만 정한다. 화면의 칸은 숨김 레이어를 그리지 않으므로, 숨긴 것을 되살리는 자리는 여기다.
 * 레이어 이름과 그 밖의 설정은 오른쪽 패널의 그 요소에서만 고친다(사용자 2026-10-14).
 * 어느 레이어가 이 묶음인지와 Figma 이름은 원본(baseHtml)에서, 순서는 합성 결과에서 읽는다 — 맨 위 레이어가 맨 위.
 */
export function TemplateLayersManagerForm({ kind }: { kind: LayerKind }) {
	const { config } = useTemplateStudio()
	const layers = useTemplateLayerSource(config.id)
	const edit = useLayerEdit(layers.reload)
	const parsed = useMemo(() => {
		if (!layers.source) return null
		const figmaNames = new Map(
			parseLayers(layers.source.baseHtml)
				.filter(BELONGS[kind])
				.map((row) => [row.id, row.name]),
		)
		const stack = stackedLayersOf(layers.source)
		return { figmaNames, stack, rows: stack.filter((row) => figmaNames.has(row.id)).reverse() }
	}, [layers.source, kind])
	if (!layers.source || !parsed) {
		return <FormNote error={layers.error} loading />
	}
	const overrides = layers.source.overrides
	const canMove = (id: string, direction: 'up' | 'down') =>
		moveLayer(overrides, parsed.stack, id, direction) !== null
	return (
		<div className="flex flex-col gap-3">
			<ul className="flex flex-col gap-3">
				{parsed.rows.map((row) => {
					const label = overrides[row.id]?.label ?? ''
					const figmaName = parsed.figmaNames.get(row.id) ?? row.name
					const name = label || figmaName
					return (
						<li key={row.id} className="flex flex-col gap-1">
							<div className="flex items-center gap-0.5">
								<Typography size="sm" className="min-w-0 flex-1 truncate">
									{name}
								</Typography>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`${name} 위로`}
									disabled={!canMove(row.id, 'up')}
									onClick={() =>
										void edit.run(() =>
											moveTemplateLayer(config.id, row.id, 'up'),
										)
									}
								>
									<ChevronUp />
								</Button>
								<Button
									type="button"
									variant="ghost"
									size="icon-sm"
									aria-label={`${name} 아래로`}
									disabled={!canMove(row.id, 'down')}
									onClick={() =>
										void edit.run(() =>
											moveTemplateLayer(config.id, row.id, 'down'),
										)
									}
								>
									<ChevronDown />
								</Button>
							</div>
							<LayerAccessToggle
								label={`${name}: 편집 권한`}
								access={accessOf(overrides[row.id], kind)}
								onChange={(access) =>
									edit.run(() =>
										updateTemplateLayerAccess(
											config.id,
											row.id,
											access,
											DECLARE[kind],
										),
									)
								}
							/>
						</li>
					)
				})}
			</ul>
			<FormNote
				error={edit.error}
				busy={edit.busy}
				note="이름은 오른쪽 패널의 그 요소에서 고쳐요. 순서는 같은 묶음 밖의 레이어와도 바뀔 수 있으니 캔버스에서 확인해 주세요."
			/>
		</div>
	)
}
