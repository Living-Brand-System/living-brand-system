import type { GuidelineDocument } from '@/payload-types'
import { GuidelineImage } from './guideline-image'

/**
 * 히어로가 없는 토픽의 폴백. 🔴 리포의 정적 에셋이라 **환경마다 업로드하지 않아도** 뜬다 —
 * 업로드는 배포를 따라가지 않으므로(`CLAUDE.md` Content Provisioning) 토픽 14개 × 환경 수만큼
 * 사람이 옮겨야 비로소 보이는 상태가 된다. 문서에 `headerImage`가 있으면 그쪽이 이긴다.
 */
const HERO_FALLBACK = { url: '/images/hero_guideline.png' }

export function GuidelineTitleImage({ image }: { image?: GuidelineDocument['headerImage'] }) {
	const value = typeof image === 'object' && image?.url ? image : HERO_FALLBACK

	return (
		<GuidelineImage
			image={value}
			// 비율은 Figma(61:3503)의 프레임 실측이라 `ratio` 어휘에 없다 — admin이 고르는 값이
			// 아니고 이 자리 하나에만 쓰이므로 목록을 늘리지 않고 여기서 직접 준다.
			ratio="original"
			className="aspect-[1509/450] w-full overflow-hidden rounded-xl bg-scrim"
			imgClassName="size-full object-cover"
		/>
	)
}
