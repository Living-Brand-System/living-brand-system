'use client'

import { openDataEditorTab } from '@/components/studio/shared/data-editor'
import { FOUNDATION_TABS } from '@/components/studio/template/foundation-editor'
import {
	type ManagerLink,
	ManagerLinkForm,
} from '@/components/studio/template/manager-forms/link-form'
import { useTemplateStudio } from '@/features/template-customization/hooks/use-template-studio'

const BRAND_COLOR_LINKS: readonly ManagerLink[] = [
	{ label: '파운데이션 컬러 열기', onOpen: () => openDataEditorTab(FOUNDATION_TABS.color) },
	{ label: '가이드라인 Color 보기', href: '/guideline/brand-elements/color' },
]

/**
 * 색 스와치의 관리 폼(`color:<control id>` — `text.color`·`background.color`). 스와치 목록은 게시된 컬러 그룹에 담긴
 * 게시된 컬러라(`requestPublishedBrandColors`) 여기서 고치지 않고 링크로 보낸다.
 */
export function TemplateColorManagerForm({ controlId }: { controlId: string }) {
	const subject = controlId.startsWith('background.') ? '배경' : '텍스트'
	return (
		<ManagerLinkForm
			note={`${subject} 스와치는 게시된 컬러 그룹에 담긴 게시된 컬러예요(그룹 순서대로). 색을 더하거나 빼려면 파운데이션의 「컬러」에서 관리해요. 모든 템플릿에 같이 반영돼요.`}
			links={BRAND_COLOR_LINKS}
		/>
	)
}

/**
 * 프롬프트 입력칸의 관리 폼(`control:prompt`) — 입력칸의 기본값·글자 수·안내 문구는 이미지 프로파일이 갖는다.
 * 지금 고른 묶음(배경 또는 이미지 슬롯)이 쓰는 프로파일로 보낸다. 모르면 목록으로 보낸다.
 */
export function TemplatePromptManagerForm() {
	const { layers, images, background } = useTemplateStudio()
	const profileId =
		layers.selectedKind === 'background'
			? background.state.profileId
			: layers.selectedId
				? images.states[layers.selectedId]?.profileId
				: undefined
	return (
		<ManagerLinkForm
			note="프롬프트 기본값·글자 수·안내 문구는 「이미지 프로파일」이 정해요. 같은 프로파일을 쓰는 모든 템플릿에 같이 반영돼요. 입력한 글은 저장되지 않아요."
			links={[
				{
					label: '이미지 프로파일 열기',
					href:
						profileId === undefined
							? '/admin/collections/image-profiles'
							: `/admin/collections/image-profiles/${profileId}`,
				},
			]}
		/>
	)
}

/** 샘플 이미지 카드 하나의 관리 폼(`sample:<샘플 이미지 id>`) — 샘플은 모든 템플릿이 같이 쓴다. */
export function TemplateSampleManagerForm({ sampleId }: { sampleId: string }) {
	return (
		<ManagerLinkForm
			note="샘플 이미지는 모든 템플릿이 같이 써요. 이름·분류·선화 여부는 「샘플 이미지」에서 고쳐요."
			links={[
				{
					label: '샘플 이미지 열기',
					href: /^\d+$/.test(sampleId)
						? `/admin/collections/sample-images/${sampleId}`
						: '/admin/collections/sample-images',
				},
			]}
		/>
	)
}
