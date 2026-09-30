import type { DisplayData } from '@/features/guideline/domain/contract/display'
import { CardCaption, type CardCaptionData } from './component'
import { DisplaySpecs, TypeLanguageCaptionTitle } from './display-specs'

/** 카드의 저작 캡션과 위젯의 파생 명세를 연결한다. */
export function DisplayCaption({
	caption,
	display,
}: {
	caption?: CardCaptionData | null
	display: DisplayData
}) {
	switch (display.blockType) {
		case 'typeLanguageWidget':
			return (
				<CardCaption
					caption={caption}
					layout="split"
					title={<TypeLanguageCaptionTitle display={display} />}
				>
					<DisplaySpecs display={display} />
				</CardCaption>
			)
		case 'typeHierarchyWidget':
			return (
				<CardCaption caption={caption} layout="split" fallbackTitle="타입 위계">
					<DisplaySpecs display={display} />
				</CardCaption>
			)
		case 'layoutGridOverlayWidget':
			return (
				<CardCaption caption={caption}>
					<DisplaySpecs display={display} />
				</CardCaption>
			)
		default:
			return <CardCaption caption={caption} />
	}
}
