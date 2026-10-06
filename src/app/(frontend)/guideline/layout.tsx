import type React from 'react'
import { SectionLayout } from '@/components/global/section-layout'
import { GuidelineSideNavigation } from '@/components/guideline/navigation/guideline-side-navigation'
import { getGuidelineNavigation } from '@/features/guideline/services/get-guideline-navigation.service'

export default async function GuidelineLayout({ children }: { children: React.ReactNode }) {
	const navigation = await getGuidelineNavigation()

	return (
		// 페이지 상하 여백을 여기서 따로 주지 않는다 — 첫·마지막 프레임의 self-padding(`ContentFrame`의
		// `py-8`)이 그 자리다(docs/09 §7). 여기에 또 주면 상단 여백이 두 곳의 합이 된다.
		<SectionLayout nav={<GuidelineSideNavigation chapters={navigation.chapters} />}>
			{children}
		</SectionLayout>
	)
}
