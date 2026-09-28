import type { ApplicationImage, GuidelineDocument, Rule } from '@/payload-types'
import {
	type CheckEvidence,
	type CheckReferenceAssetRole,
	type GuidelineBlock,
	snapshotBlock,
} from '../blocks/projection'
import { sectionTitle } from '../sections/model'
import { projectSection } from '../sections/projection'
import { relationshipId } from '../utils/block-text'
import {
	buildCheckSourceSnapshot,
	type GuidelineCheckDocument,
} from './build-check-source-snapshot'

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

/** 문서와 임베디드 Block이 참조하는 Rule을 실행 가능한 source snapshot과 함께 수집한다. */
export function collectGuidelineCheckSources(
	document: GuidelineCheckDocument,
): GuidelineCheckSource[] {
	const assets = collectApplicationImages(document)
	const documentSnapshot = buildCheckSourceSnapshot(document)
	const documentSources = toSources(
		document.rules,
		document.id,
		null,
		null,
		documentSnapshot,
		assets,
	)
	const blockSources = flattenBlocks(
		document.contentModel === 'sections' ? [] : document.blocks,
	).flatMap(({ block, section }) =>
		toSources(
			block.rules,
			document.id,
			section,
			block.blockName?.trim() || block.blockType,
			snapshotBlock(block),
			assets,
		),
	)

	const sectionSources =
		document.contentModel === 'sections'
			? (document.sections ?? []).flatMap((section, order) =>
					toSources(
						section.rules,
						document.id,
						{ anchor: section.anchor ?? '', title: sectionTitle(section), order },
						sectionTitle(section),
						projectSection(section),
						assets,
					),
				)
			: []
	return [...documentSources, ...blockSources, ...sectionSources]
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

/**
 * 모든 루트 블록을 읽되 section에만 앵커 출처를 붙인다. 카드·디스플레이는 rules를 갖지 않아
 * 내려가지 않는다. 카드 캡션의 평문은 snapshotBlock이 조립한다(docs/11 §4).
 */
function flattenBlocks(
	blocks: GuidelineCheckDocument['blocks'],
): { block: GuidelineBlock; section: GuidelineCheckSection | null }[] {
	return (blocks ?? []).map((block, order) => ({
		block,
		section:
			block.blockType === 'section' && block.title
				? {
						// 앵커는 저장 시 제목에서 자동으로 채워지지만(section/schema.ts) 타입은 선택이다.
						anchor: block.anchor ?? '',
						title: block.title,
						order,
					}
				: null,
	}))
}

function collectApplicationImages(document: GuidelineCheckDocument): Map<number, ApplicationImage> {
	const values: unknown[] = []
	if ('headerImage' in document) values.push(document.headerImage)

	// 🔴 컨테이너 Block의 자식 위젯 이미지는 넣지 않는다 — 검수가 읽는 것은 Block이 소유한
	//    title·description·rule뿐이고 자식 위젯은 사람이 보는 표현이라는 결정(2026-08-12,
	//    `blocks/block/projection.ts`가 정본)이다. projectBlock·projectSection이 referenceAssets를
	//    비워 돌려주므로 여기서 모아 봐야 참조하는 쪽이 없다. 그래서 지금 여기 들어오는 것은
	//    헤더 이미지 하나뿐이다.

	return new Map(
		values.flatMap((value): [number, ApplicationImage][] => {
			const id = relationshipId(value)
			return id != null && typeof value === 'object' && value !== null
				? [[id, value as ApplicationImage]]
				: []
		}),
	)
}
