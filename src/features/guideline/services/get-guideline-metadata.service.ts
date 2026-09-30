import { cache } from 'react'
import { findGuidelineMetadataGlobal } from '@/features/guideline/repositories/guideline-view.payload.repository'
import { getContrastingForeground, isValidHex } from '@/lib/color'

export interface GetGuidelineMetadataOutput {
	companyName: string
	documentTitle: string
	faviconHref: string | null
	issuedLabel: string | null
	primaryDarkForegroundHex: string | null
	primaryDarkHex: string | null
	primaryForegroundHex: string | null
	primaryHex: string | null
}

/**
 * Creator UI는 발행된 가이드라인의 문서 메타데이터만 읽는다.
 * 표지, 내비게이션 제목, 푸터 문구는 이 값을 기준으로 조합한다.
 * Payload 조회는 guideline-view repository가 소유한다.
 */
export const getGuidelineMetadata = cache(async (): Promise<GetGuidelineMetadataOutput> => {
	const guideline = await findGuidelineMetadataGlobal()
	const primaryHex = normalizeHex(guideline.primaryHex)
	const primaryDarkHex = normalizeHex(guideline.primaryDarkHex) ?? primaryHex

	return {
		companyName: guideline.companyName,
		documentTitle: guideline.documentTitle,
		faviconHref: guideline.faviconHref,
		issuedLabel: guideline.issuedLabel,
		primaryDarkForegroundHex: primaryDarkHex ? getContrastingForeground(primaryDarkHex) : null,
		primaryDarkHex,
		primaryForegroundHex: primaryHex ? getContrastingForeground(primaryHex) : null,
		primaryHex,
	}
})

function normalizeHex(value: string | null): string | null {
	if (!value || !isValidHex(value)) return null
	return value.startsWith('#') ? value : `#${value}`
}
