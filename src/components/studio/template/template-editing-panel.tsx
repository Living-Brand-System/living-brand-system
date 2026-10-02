'use client'

import { AnimatePresence, domAnimation, LazyMotion, useReducedMotion } from 'motion/react'
import * as m from 'motion/react-m'
import { type ReactNode, useEffect, useRef } from 'react'
import { ControllerRoot } from '@/components/shared/controller/layout'
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
import { useMotionTransition } from '@/lib/motion'

// 비활성 패널(밀려난 마스터, 들어오기 전·나간 뒤의 편집 패널)은 절반 자리에서 반투명하다.
const INACTIVE = { x: '-50%', opacity: 0.5 } as const
const ACTIVE = { x: 0, opacity: 1 } as const

/** 두 화면의 편집 진입·이탈 UI. 값 복원과 요청 무효화는 Provider가 소유한다. */
export function TemplateEditingPanel({ children }: { children: ReactNode }) {
	const { editing } = useTemplateStudio()
	const panel = useRef<HTMLElement>(null)
	const reducedMotion = useReducedMotion()
	// 마스터·편집 패널이 같은 프리셋을 쓴다 — 함께 출발해 함께 멈춘다.
	const transition = useMotionTransition('panel')
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
				{/* 편집 중에는 기본 패널을 폭의 절반만큼 밀어 뒤에 깐다(Figma 529:28027). */}
				<m.div
					inert={Boolean(targetId)}
					className="h-full"
					initial={false}
					animate={targetId ? INACTIVE : ACTIVE}
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
							// 편집 패널은 -50%에서 제자리로 들어오고, 나갈 때 같은 자리로 되돌아간다.
							// 퇴장 중에는 마지막 화면이 남아 있으므로 클릭을 받지 않는다.
							initial={reducedMotion ? false : INACTIVE}
							animate={ACTIVE}
							// 나갈 때는 끝까지 흐려져 툭 사라지지 않는다.
							exit={
								reducedMotion
									? undefined
									: { ...INACTIVE, opacity: 0, pointerEvents: 'none' }
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
