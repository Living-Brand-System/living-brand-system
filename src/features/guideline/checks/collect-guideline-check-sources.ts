import type { ApplicationImage, GuidelineDocument, Rule } from '@/payload-types'
import { sectionTitle } from '../sections/model'
import { projectSection } from '../sections/projection'
import {
	buildCheckSourceSnapshot,
	type GuidelineCheckDocument,
} from './build-check-source-snapshot'
import type { CheckEvidence, CheckReferenceAssetRole } from './check-source'

/** 근거가 놓인 섹션. 문서 자신의 rule이면 null이다. */
export interface GuidelineCheckSection {
	anchor: string
	title: string
	/** 문서 본문에서의 위치. 검수 화면이 섹션 순서를 지면 순서와 맞추는 데 쓴다. */
	order: number
}

export interface GuidelineCheckSource {
	rule: Rule
	blockName: string | null
	// 🔴 documentId만으로는 근거가 토픽까지만 좁혀진다. 섹션이 문서였을 때의 정밀도를 되돌리려면
	//    앵커가 함께 있어야 한다(2026-08-26 이관으로 3단계 문서가 section 블록이 됐다).
	source: { documentId: number; section: GuidelineCheckSection | null }
	evidence: CheckEvidence
	referenceAssets: { asset: ApplicationImage; role: CheckReferenceAssetRole }[]
}

/** 문서와 섹션이 참조하는 Rule을 실행 가능한 source snapshot과 함께 수집한다. */
export function collectGuidelineCheckSources(
	document: GuidelineCheckDocument,
): GuidelineCheckSource[] {
	// 가이드라인은 검수 참조 자산을 내지 않는다 — 섹션은 referenceAssets: [], 헤더 이미지는 카드 썸네일이다.
	const assets = new Map<number, ApplicationImage>()
	const documentSnapshot = buildCheckSourceSnapshot(document)
	const documentSources = toSources(
		document.rules,
		document.id,
		null,
		null,
		documentSnapshot,
		assets,
	)
	const sectionSources = (document.sections ?? []).flatMap((section, order) =>
		toSources(
			section.rules,
			document.id,
			{ anchor: section.anchor ?? '', title: sectionTitle(section), order },
			sectionTitle(section),
			projectSection(section),
			assets,
		),
	)
	return [...documentSources, ...sectionSources]
}

function toSources(
	rules: GuidelineDocument['rules'] | undefined,
	documentId: number,
	section: GuidelineCheckSection | null,
	blockName: string | null,
	snapshot: ReturnType<typeof buildCheckSourceSnapshot>,
	assets: Map<number, ApplicationImage>,
): GuidelineCheckSource[] {
	if (!snapshot) return []

	// depth 부족으로 populate되지 않은 관계(number)는 실행할 수 없으므로 건너뛴다.
	return (rules ?? []).flatMap((rule) => {
		if (typeof rule !== 'object' || rule === null) return []

		return [
			{
				rule,
				blockName,
				source: { documentId, section },
				evidence: snapshot.evidence,
				referenceAssets: snapshot.referenceAssets.flatMap((reference) => {
					const asset = assets.get(reference.id)
					return asset ? [{ asset, role: reference.role }] : []
				}),
			},
		]
	})
}
