'use client'

import { ColorPalette, Image, TextFont } from '@carbon/icons-react'
import { Controller } from '@/components/shared/controller'
import { Typography } from '@/components/ui/typography'
import {
	TEMPLATE_BACKGROUND_SECTION_ID,
	templateSlotFocusTarget,
} from '@/features/template-customization/contexts/template-studio-context'
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
 * 1. 우측 컨트롤러가 너무 많다 — 묶음을 고르면 그 묶음의 컨트롤만 남는다.
 * 2. 창작자가 대략적인 레이어 계층을 알고는 있어야 한다.
 *
 * 🔴 **묶음도 하위도 다 누를 수 있고, 무엇을 누르든 고른 것은 묶음 전체다**(사용자 지시, 2026-09-29).
 *    갈리는 것은 **어느 하나를 집느냐**뿐이다 — 하위를 누르면 그 레이어를, 묶음을 누르면 그 안의
 *    첫 레이어를 집는다. 그래서 판을 클릭하는 것과 결과가 같아지고, 입구가 둘이어도 규칙은 하나다.
 * 🔴 **풀리지 않는다.** 판과 같다 — 다시 눌렀을 때 컨트롤이 사라지면 조작이 죽은 것처럼 보인다.
 * 🔴 **일러스트레이터·피그마처럼 모든 레이어를 보여 주지 않는다.** text·image·CI·background의
 *    몇 개의 큰 묶음으로 묶고 그 아래에 이름을 늘어놓는다.
 * 🔴 **자기 위치를 모른다.** 값을 prop으로 받지 않고 컨텍스트에서 직접 읽으므로 좌·우·헤더·본문
 *    어디에 꽂아도 그대로 돈다 — 위치를 정하는 코드는 꽂는 자리 한 줄뿐이다.
 * 🔴 **선택(`layers.selectedKind`)과 `focus`는 다른 것이다.** 선택은 묶음을 가리키고 `focus`는
 *    「지금 만지는 한 레이어」를 가리킨다 — 하나로 합치면 입력칸에 커서가 들어가는 순간 묶음이
 *    바뀌어 컨트롤이 통째로 사라진다.
 */
export function TemplateLayerPanel() {
	const { config, layers, focus, editing } = useTemplateStudio()
	const groups = listTemplateLayerGroups(config.template.slots)
	const focusedNodeIds = focus.target?.kind === 'nodes' ? focus.target.nodeIds : []

	/**
	 * 🔑 판을 클릭하는 것과 **같은 일**을 한다 — 묶음을 고르고, 그 안의 한 레이어를 집고,
	 *    텍스트면 그 입력칸으로 커서까지 보낸다.
	 */
	const select = (group: TemplateLayerGroup, memberId?: string) => {
		if (editing.targetId) return
		layers.select(group.kind)
		if (group.kind === 'background') {
			// 배경은 노드가 아니라 도화지다 — 집을 것이 없고 캔버스 상자가 곧 답이다.
			focus.set({ sectionId: TEMPLATE_BACKGROUND_SECTION_ID, kind: 'canvas' })
			return
		}
		// 묶음을 눌렀으면 알아서 첫 레이어를 집는다(사용자 지시) — 고른 뒤 만질 것이 정해져 있어야 한다.
		const nodeId = memberId ?? group.members[0]?.id
		if (!nodeId) return
		focus.set(templateSlotFocusTarget(group.kind, nodeId, { caret: group.kind === 'text' }))
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
							<LayerRow
								kind={group.kind}
								icon={GROUP_ICON[group.kind]}
								label={group.label}
								// 🔑 개수는 **여럿일 때만** — 「이미지 1」은 알려 주는 것이 없다.
								count={group.members.length > 1 ? group.members.length : undefined}
								selected={layers.selectedKind === group.kind}
								onSelect={() => select(group)}
							/>
							{group.members.length > 0 && (
								// 🔑 안내선 하나로 「이 줄들은 위 묶음에 속한다」가 읽힌다 — 들여쓰기만
								//    쓰면 묶음 사이 구분선과 섞여 계층이 흐려진다.
								<ul className="mt-0.5 ml-3 flex flex-col gap-0.5 border-border border-l pl-1">
									{group.members.map((member) => (
										<li key={member.id}>
											<LayerRow
												kind={group.kind}
												memberId={member.id}
												label={member.label}
												indented
												// 숨긴 레이어도 목록에 남는다 — 지우면 되살릴 방법이 없다.
												concealed={layers.visibility[member.id] === false}
												// 🔑 묶음 안에서 **지금 만지는 한 줄**을 표시한다.
												selected={focusedNodeIds.includes(member.id)}
												onSelect={() => select(group, member.id)}
											/>
										</li>
									))}
								</ul>
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
	kind,
	memberId,
	icon,
	label,
	count,
	indented = false,
	concealed = false,
	selected,
	onSelect,
}: {
	/** 이 줄이 고르는 종류. 이름이 개수와 붙어 있어(Text3) 라벨로는 집기 어려우므로 DOM에 남긴다. */
	kind: TemplateLayerGroup['kind']
	/** 하위 줄이면 그 레이어의 id — 묶음 줄에는 없다. */
	memberId?: string
	/** 묶음 아이콘 — CI는 주지 않는다. 없어도 자리는 지킨다. */
	icon?: typeof TextFont
	label: string
	/** 묶음에 든 레이어 수 — 여럿일 때만 준다. */
	count?: number
	indented?: boolean
	/** 숨긴 레이어인가. 목록에는 남는다. */
	concealed?: boolean
	selected: boolean
	onSelect: () => void
}) {
	return (
		<button
			type="button"
			data-slot="layer-row"
			data-layer-kind={kind}
			{...(memberId ? { 'data-layer-member': memberId } : {})}
			aria-pressed={selected}
			onClick={onSelect}
			className={cn(
				'flex w-full min-w-0 items-center gap-2 rounded px-2 py-1.5 text-left text-sm transition-colors',
				'hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring',
				indented && 'text-xs',
				selected && 'bg-accent font-semibold',
				concealed && 'text-muted-foreground line-through',
			)}
		>
			{!indented && <GroupIcon icon={icon} />}
			<span className="min-w-0 flex-1 truncate">{label}</span>
			{count !== undefined && (
				<span className="shrink-0 text-muted-foreground text-xs">{count}</span>
			)}
		</button>
	)
}
