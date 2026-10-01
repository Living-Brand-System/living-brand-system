'use client'

import { useEffect, useState } from 'react'
import { applyTemplateSessionPatch } from '@/features/template-customization/domain/apply-template-session-patch'
import type {
	PublishedTemplateView,
	TemplateStudioConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'
import { useTemplateAuthoringHandoff } from '@/features/template-customization/providers/template-authoring-handoff'
import { TemplateStudioProvider } from '@/features/template-customization/providers/template-studio-provider'
import { TemplateWorkspace } from './template-workspace'

type TemplateGeneratorProps = {
	onTemplateChange?: (slug: string) => void
	config: TemplateStudioConfig
	/** 식별 카드의 부제 — 교체 후보 목록은 자산 브라우저가 열릴 때 따로 가져온다. */
	categoryTitle: string | null
	template: PublishedTemplateView
	/**
	 * 편집 중인 슬롯을 집어 보여 줄 때 쓰는 브랜드 색 — 값의 정본은 `brand-colors` 컬렉션이다.
	 * 🔑 없어도 스튜디오는 열린다(캔버스가 토큰으로 폴백한다) — 그래서 optional이다.
	 */
	highlightColor?: string | null
}

/**
 * Figma에서 가져온 published HTML의 열린 슬롯(input이 달린 텍스트 노드,
 * imageInput이 달린 프레임 이미지 슬롯)을 편집해
 * 미리보기의 Raster Artifact를 공통 Export Layer가 PNG·JPEG·TIFF·PDF·MP4로 변환한다. 서버 상태 변경은 없다 —
 * 입력값은 로컬 state로만 합성한다.
 * 사이드바(컨트롤러)와 캔버스(작업 공간)는 서로를 모른다 — 편집 세션 상태는
 * TemplateStudioProvider(features)가 단일 소유하고 둘 다 컨텍스트로만 소통한다.
 */
export function TemplateGenerator({
	config,
	categoryTitle,
	template,
	highlightColor = null,
	onTemplateChange,
}: TemplateGeneratorProps) {
	const [revision, setRevision] = useState(0)
	return (
		<TemplateStudioProvider
			key={revision}
			config={config}
			template={template}
			categoryTitle={categoryTitle}
			highlightColor={highlightColor}
		>
			<TemplateSession
				template={template}
				onChange={onTemplateChange}
				onReset={() => setRevision((value) => value + 1)}
			/>
		</TemplateStudioProvider>
	)
}

function TemplateSession({
	template,
	onChange,
	onReset,
}: {
	template: PublishedTemplateView
	onChange?: (slug: string) => void
	onReset: () => void
}) {
	const session = useTemplateStudio()
	useTemplateAuthoringPatch(template.id, session)
	return <TemplateWorkspace onChange={onChange} onReset={onReset} />
}

/**
 * 챗이 만든 편집안을 이 스튜디오에 얹는다.
 *
 * 🔑 소비를 **provider가 아니라 이 조립 지점**에서 한다 — 세션 provider는 챗을 몰라야 한다
 *    (사이드바·캔버스가 서로를 모르는 것과 같은 이유다).
 * 🔴 `templateId`가 다르면 집어 가지 않는다. 챗이 A 템플릿용 편집안을 만들고 사용자가 B 스튜디오를
 *    열어도 B가 그것을 먹으면 안 된다 — 슬롯 id가 우연히 겹치면 조용히 엉뚱한 값이 들어간다.
 * 🔑 이미지 슬롯의 프롬프트는 **여기서 곧바로 생성까지 태운다** — 사용자가 사이드바를 만지지 않는
 *    것이 이 기능의 목적이라, 프롬프트만 장전하고 멈추면 세 축(제목·본문·이미지) 중 하나가 정확히
 *    사이드바로 되돌아간다. 🔴 유료 호출이므로 패치가 담은 슬롯만 돈다.
 */
function useTemplateAuthoringPatch(
	templateId: number,
	session: ReturnType<typeof useTemplateStudio>,
) {
	const { pending, clear } = useTemplateAuthoringHandoff()
	useEffect(() => {
		if (!pending || pending.templateId !== templateId) return
		applyTemplateSessionPatch(session, pending.patch)
		for (const [slotId, image] of Object.entries(pending.patch.images ?? {})) {
			// 프롬프트를 인자로 넘긴다 — 같은 tick이라 세션 상태에는 아직 반영되지 않았다.
			if (image.prompt) void session.images.generate(slotId, image.prompt)
		}
		// 🔑 얹은 즉시 비운다 — 남겨 두면 사용자가 손으로 고친 값을 리렌더마다 되돌린다.
		clear(pending.id)
	}, [clear, pending, session, templateId])
}
