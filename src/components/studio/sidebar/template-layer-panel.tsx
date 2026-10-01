'use client'

import { ColorPalette, Image, TextFont } from '@carbon/icons-react'
import { useState } from 'react'
import { Controller } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import {
	listTemplateLayerGroups,
	type TemplateLayerGroup,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { cn } from '@/lib/utils'

/**
 * 묶음 아이콘. 🔴 **CI에는 아이콘을 주지 않는다**(사용자 지시, 2026-09-10) — 로고 자체가 이미
 * 그림이라 그 옆의 다른 그림이 무엇을 뜻하는지 읽히지 않는다.
 * 🔑 배경은 solid color·image·graphic을 다 담으므로 형식이 아니라 **팔레트**로 가리킨다.
 */
const GROUP_ICON: Partial<Record<TemplateLayerGroup['kind'], typeof TextFont>> = {
	text: TextFont,
	image: Image,
	background: ColorPalette,
}

/**
 * 레이어 패널 — **viewer다.** 순서를 편집하지 않는다(사용자 지시, 2026-09-10).
 *
 * 있는 이유 둘:
 * 1. 우측 컨트롤러가 너무 많다 — 레이어를 고르면 그 레이어의 컨트롤만 남는다.
 * 2. 창작자가 대략적인 레이어 계층을 알고는 있어야 한다.
 *
 * 🔴 **일러스트레이터·피그마처럼 모든 레이어를 보여 주지 않는다.** text·image·CI·background의
 *    **몇 개의 큰 묶음**으로 묶고 그 아래에 레이어 이름을 늘어놓는다.
 * 🔴 **묶음 머리글(Text·Image·CI)은 클릭되지 않는다 — hover만 된다**(사용자 지시). hover하면 그
 *    자식이 모두 함께 hover된 것처럼 보인다. 고르는 것은 **자식**이고, 고르면 우측에 그 레이어의
 *    컨트롤이 나온다. 배경은 하위가 없으므로 **자기 자신이 잎**이다.
 * 🔴 **자기 위치를 모른다.** 값을 prop으로 받지 않고 컨텍스트에서 직접 읽으므로 좌·우·헤더·본문
 *    어디에 꽂아도 그대로 돈다 — 위치를 정하는 코드는 꽂는 자리 한 줄뿐이다.
 * 🔴 **선택(`layers.selectedId`)과 `focus`는 다른 것이다.** 선택은 여기서만 바뀌고, `focus`는
 *    「지금 만지는 자리」라 입력칸에 커서만 들어가도 바뀐다 — 하나로 합치면 컨트롤을 만지는 순간
 *    방금 고른 것이 풀려 컨트롤이 통째로 사라진다.
 * 🔑 그래도 고를 때 `focus`도 같이 준다 — 캔버스 하이라이트가 그것을 읽으므로 판에서도 그 자리가
 *    밝아진다.
 */
export function TemplateLayerPanel() {
	const { config, layers, focus, editing } = useTemplateStudio()
	const groups = listTemplateLayerGroups(config.template.slots)
	/**
	 * hover 중인 묶음. 🔴 CSS `group-hover`로는 안 된다 — 자식에 얹으면 **자식 하나에 hover할 때도**
	 * 형제 전체가 켜진다. 켜는 조건이 「머리글에 hover」이므로 그 사실을 상태로 들고 있는다.
	 */
	const [hovered, setHovered] = useState<string | null>(null)

	const select = (slotId: string) => {
		if (editing.targetId) return
		const next = layers.selectedId === slotId ? null : slotId
		layers.select(next)
		if (next) editing.begin(next)
		focus.set(next ? focusTargetOf(slotId) : null)
	}

	return (
		<Controller.Group title="Layers" collapsible>
			{groups.length === 0 ? (
				<Typography size="sm" tone="muted">
					이 템플릿에는 레이어가 없습니다.
				</Typography>
			) : (
				// 🔴 묶음끼리 **분리된 계층**으로 보여야 한다(사용자 지시) — 사이에 구분선을 넣고
				//    첫 묶음의 것만 지운다(맨 위에 떠 있는 선이 되지 않게).
				<ul className="flex flex-col [&>li+li]:mt-2 [&>li+li]:border-t [&>li+li]:border-border [&>li+li]:pt-2">
					{groups.map((group) => (
						<li key={group.kind}>
							{group.members.length === 0 ? (
								// 하위가 없는 묶음(배경)은 자기 자신이 잎이다 — 머리글을 따로 두지 않는다.
								<LayerRow
									icon={GROUP_ICON[group.kind]}
									label={group.label}
									selected={layers.selectedId === group.kind}
									onSelect={() => select(group.kind)}
								/>
							) : (
								<>
									{/* 🔴 button이 아니라 div다 — 클릭되지 않는 머리글이다(사용자 지시). */}
									<div
										data-slot="layer-group-header"
										onPointerEnter={() => setHovered(group.kind)}
										onPointerLeave={() => setHovered(null)}
										className="flex min-w-0 items-center gap-2 px-2 py-1.5 text-sm"
									>
										<GroupIcon icon={GROUP_ICON[group.kind]} />
										<span className="min-w-0 flex-1 truncate">
											{group.label}
										</span>
										{/* 🔑 개수는 **여럿일 때만** — 「이미지 1」은 알려 주는 것이 없다. */}
										{group.members.length > 1 && (
											<span className="shrink-0 text-muted-foreground text-xs">
												{group.members.length}
											</span>
										)}
									</div>
									{/* 🔑 안내선 하나로 「이 줄들은 위 묶음에 속한다」가 읽힌다 — 들여쓰기만
									    쓰면 묶음 사이 구분선과 섞여 계층이 흐려진다. */}
									<ul className="ml-3 flex flex-col gap-0.5 border-border border-l pl-1">
										{group.members.map((member) => (
											<li key={member.id}>
												<LayerRow
													label={member.label}
													indented
													groupHovered={hovered === group.kind}
													concealed={
														layers.visibility[member.id] === false
													}
													selected={layers.selectedId === member.id}
													onSelect={() => select(member.id)}
												/>
											</li>
										))}
									</ul>
								</>
							)}
						</li>
					))}
				</ul>
			)}
		</Controller.Group>
	)
}

/** 아이콘 자리는 **있는 묶음과 없는 묶음이 같은 폭**을 쓴다 — CI만 이름이 왼쪽으로 밀리면 안 된다. */
function GroupIcon({ icon: Icon }: { icon?: typeof TextFont }) {
	return (
		<span aria-hidden="true" className="flex size-4 shrink-0 items-center justify-center">
			{Icon ? <Icon size={16} className="text-muted-foreground" /> : null}
		</span>
	)
}

function LayerRow({
	icon,
	label,
	indented = false,
	groupHovered = false,
	concealed = false,
	selected,
	onSelect,
}: {
	/** 묶음 아이콘 — CI는 주지 않는다. 없어도 자리는 지킨다. */
	icon?: typeof TextFont
	label: string
	indented?: boolean
	/** 머리글에 hover 중인가 — 그때 형제 전체가 hover된 것처럼 보인다. */
	groupHovered?: boolean
	/** 숨긴 레이어인가. 목록에는 남는다 — 지우면 되살릴 방법이 없다. */
	concealed?: boolean
	selected: boolean
	onSelect: () => void
}) {
	return (
		<button
			type="button"
			data-slot="layer-row"
			aria-pressed={selected}
			data-group-hovered={groupHovered || undefined}
			onClick={onSelect}
			className={cn(
				'flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
				'hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
				indented && 'text-xs',
				groupHovered && 'bg-accent',
				selected && 'bg-accent font-semibold',
				concealed && 'text-muted-foreground line-through',
			)}
		>
			{!indented && <GroupIcon icon={icon} />}
			<span className="min-w-0 flex-1 truncate">{label}</span>
		</button>
	)
}

/**
 * 고른 레이어를 캔버스가 집을 대상으로 바꾼다.
 * 🔴 배경은 노드가 아니라 도화지다 — `kind: 'canvas'`이고 nodeIds를 갖지 않는다.
 */
function focusTargetOf(slotId: string) {
	return slotId === 'background'
		? ({ sectionId: 'section:background', kind: 'canvas' } as const)
		: ({ sectionId: slotId, kind: 'nodes', nodeIds: [slotId] } as const)
}
