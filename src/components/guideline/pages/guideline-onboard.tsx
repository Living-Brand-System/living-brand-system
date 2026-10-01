import { GuidelineChapters } from '@/components/guideline/guideline-chapters'
import { GuidelineFooter } from '@/components/guideline/guideline-footer'
import { GuidelineOnboardDisplay } from '@/components/guideline/guideline-onboard-display'
import { ContentFrame } from '@/components/shared/content-frame'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'

export function GuidelineOnboard({ navigation }: { navigation: GetGuidelineNavigationOutput }) {
	return (
		<>
			<ContentFrame>
				<div className="flex flex-col gap-3">
					<GuidelineOnboardDisplay title={navigation.title} />
					<GuidelineChapters chapters={navigation.chapters} />
				</div>
			</ContentFrame>
			<GuidelineFooter />
		</>
	)
}
