'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useEffect, useRef } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
import type { ControlPanelComposition } from '@/components/studio/shared/control-panel'
import {
	StudioSelectionCard,
	StudioSelectionChange,
} from '@/components/studio/shared/studio-selection-card'
import { TemplateSettings } from '@/components/studio/template/template-controls'
import {
	TemplateGraphicSelection,
	TemplateImageSelection,
} from '@/components/studio/template/template-media-controls'
import { Button } from '@/components/ui/button'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { useShellLock } from '@/hooks/use-shell-lock'
import { PANEL_RENDER, useMotionTransition } from '@/lib/motion'

// 두 패널은 같은 시간(`MOTION.tight`)으로 움직인다. 편집 패널은 공용 패널 렌더(`PANEL_RENDER`)로
// 들어오고 나가며, 마스터는 왼쪽 아래 대각선(16px)으로 밀리며 반투명·흐려진다(blur 4px).
const INACTIVE = { x: -16, y: 16, opacity: 0.5, filter: 'blur(4px)' } as const
// 🔴 끝나면 filter를 걷는다 — blur(0px)도 필터라서 남겨 두면 안쪽 backdrop-blur·fixed 배치가 깨진다.
const MASTER_ACTIVE = {
	x: 0,
	y: 0,
	opacity: 1,
	filter: 'blur(0px)',
	transitionEnd: { filter: 'none' },
} as const

/** 두 화면의 편집 진입·이탈 UI. 값 복원과 요청 무효화는 Provider가 소유한다. */
export function TemplateEditingPanel({
	children,
	settings,
}: {
	children: ReactNode
	/** 설정 카드의 방식 행 — 패널 모델(`useTemplatePanel`)의 settings 슬롯. */
	settings: ControlPanelComposition | null
}) {
	const { editing } = useTemplateStudio()
	const panel = useRef<HTMLElement>(null)
	const reducedMotion = useReducedMotion()
	const transition = useMotionTransition('tight')
	const targetId = editing.targetId
	// 상단 이동도 완료·취소 전까지 잠근다 — 헤더는 셸 잠금을 읽어 스스로 inert가 된다.
	useShellLock(Boolean(targetId))
	useEffect(() => {
		if (!targetId) return
		const previous =
			document.activeElement instanceof HTMLElement ? document.activeElement : null
		panel.current?.focus()
		return () => previous?.focus()
	}, [targetId])
	const target = editing.target
	const graphic = target?.mode === 'graphic'
	const image = target?.mode === 'image'
	return (
		<LazyMotion features={domAnimation}>
			<div className="relative h-full min-h-0">
				{/* 편집 중에는 기본 패널을 뒤로 밀어 반투명하게 깐다(Figma 529:28027). */}
				<m.div
					inert={Boolean(targetId)}
					className="h-full"
					initial={false}
					animate={targetId ? INACTIVE : MASTER_ACTIVE}
					transition={transition}
				>
					{children}
				</m.div>
				<AnimatePresence initial={false}>
					{targetId && (
						<m.section
							key="editing"
							ref={panel}
							tabIndex={-1}
							aria-label="선택한 레이어 편집"
							className="scrollbar-none absolute inset-0 flex min-h-0 flex-col gap-4 overflow-y-auto p-4 outline-none"
							// 퇴장 중에는 마지막 화면이 남아 있으므로 클릭을 받지 않는다.
							style={{ transformOrigin: PANEL_RENDER.left.origin }}
							initial={reducedMotion ? false : PANEL_RENDER.left.hidden}
							animate={PANEL_RENDER.left.shown}
							exit={
								reducedMotion
									? undefined
									: { ...PANEL_RENDER.left.hidden, pointerEvents: 'none' }
							}
							transition={transition}
						>
							<ControllerRoot className="aspect-square shrink-0 lg:h-auto">
								<StudioSelectionCard
									title={
										target?.name ??
										(image ? 'Image' : graphic ? 'Graphic' : 'Background')
									}
									subtitle={target?.subtitle}
									image={target?.preview}
									onReset={editing.reset}
									disabled={editing.busy}
									actions={
										(image || graphic) && (
											<StudioSelectionChange
												label={
													graphic ? '그래픽 변경' : '이미지 프로파일 변경'
												}
												disabled={editing.busy}
											>
												{graphic ? (
													<TemplateGraphicSelection />
												) : (
													<TemplateImageSelection />
												)}
											</StudioSelectionChange>
										)
									}
								/>
							</ControllerRoot>
							<TemplateSettings
								settings={settings}
								actions={
									<fieldset
										className="flex gap-2"
										aria-label="편집 완료 또는 취소"
									>
										<Button
											variant="outline"
											className="h-11 flex-1 rounded-lg border-border"
											onClick={editing.cancel}
										>
											취소
										</Button>
										<Button
											variant="muted"
											className="h-11 flex-1 rounded-lg bg-foreground/10 text-foreground hover:bg-foreground/15"
											disabled={editing.busy}
											onClick={editing.complete}
										>
											완료
										</Button>
									</fieldset>
								}
							/>
						</m.section>
					)}
				</AnimatePresence>
			</div>
		</LazyMotion>
	)
}
