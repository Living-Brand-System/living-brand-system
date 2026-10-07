import { projectTemplateRenderModel } from '@/features/template-core/domain/project-template-render-model'
import { findPublishedTemplate } from '@/features/template-core/services/published-template-catalog.service'
import type {
	PublishedHtmlTemplate,
	PublishedTemplateNodeConfig,
} from '@/features/template-customization/domain/template-studio-config'
import { toStudioPreviewImage } from '@/modules/studio-controller/controller-definition'
import type { TemplateNodeConfigMap } from '@/types/template'

// 노출 경계: 스튜디오가 쓰는 creator·input(aiInstruction 제외)·imageInput·imageColorize·vectorColor만 남긴다.
// aiInstruction·vectorAsset·generatedImageId 등 저작 내부 정보는 SSR 페이로드에 싣지 않는다.
// agent/MCP 경로(projectTemplateRenderModel 직행)는 의도적으로 전체 config를 쓴다 — 이 프로젝션을
// "안전한 투영"으로 오독해 새 공개 표면에 renderModel을 그대로 태우지 말 것.
function projectStudioNodeConfigs(
	nodeConfigs: TemplateNodeConfigMap,
): Record<string, PublishedTemplateNodeConfig> {
	const projected: Record<string, PublishedTemplateNodeConfig> = {}
	for (const [
		nodeId,
		{ creator, input, imageInput, imageColorize, vectorColor },
	] of Object.entries(nodeConfigs)) {
		if (!creator && !input && !imageInput && !imageColorize && !vectorColor) continue
		const config: PublishedTemplateNodeConfig = {}
		if (creator) config.creator = creator
		if (input) {
			const { aiInstruction: _internal, ...studioInput } = input
			config.input = studioInput
		}
		if (imageInput) config.imageInput = imageInput
		if (imageColorize) config.imageColorize = imageColorize
		if (vectorColor) config.vectorColor = vectorColor
		projected[nodeId] = config
	}
	return projected
}

/**
 * Create 화면이 쓰는 published 템플릿 단건 read service.
 * Payload 조회는 template-core의 published-template-catalog service가 소유한다.
 * 읽기 계약: 렌더 가능한 canonical HTML이 아니면 노출하지 않고,
 * nodeConfigs는 projectStudioNodeConfigs가 남긴 스튜디오용 부분집합만 노출한다.
 */
export async function getPublishedTemplate(
	templateSlug: string,
): Promise<PublishedHtmlTemplate | null> {
	const template = await findPublishedTemplate(templateSlug)

	if (!template) {
		return null
	}

	const renderModel = projectTemplateRenderModel(template)

	if (!renderModel) return null

	return {
		kind: 'html',
		id: template.id,
		name: template.name,
		templateVersion: template.updatedAt,
		exportPolicy: template.exportPolicy,
		backgroundPolicy: template.backgroundPolicy as PublishedHtmlTemplate['backgroundPolicy'],
		previewImage: toStudioPreviewImage(template.previewImage),
		defaultSession: template.defaultSession ?? undefined,
		...renderModel,
		// 🔑 스프레드 뒤에 둔다 — 앞에 두면 renderModel이 같은 이름을 갖게 될 때 조용히 덮인다.
		...toTemplateSize(template),
		nodeConfigs: projectStudioNodeConfigs(renderModel.nodeConfigs),
	}
}

/**
 * 판형 크기 — 인쇄판은 mm(printSizeMm), 디지털판은 px(digitalSizePx)다. 둘 중 하나만 싣는다.
 * 디지털판이 아직 판형 크기를 저장하지 않았으면(가져오기 직후) Figma 판 크기가 곧 판형 크기다.
 */
function toTemplateSize(template: {
	outputKind?: 'digital' | 'print' | null
	width?: number | null
	height?: number | null
	size?: { width?: number | null; height?: number | null } | null
}): {
	printSizeMm?: { width: number; height: number }
	digitalSizePx?: { width: number; height: number }
} {
	const positive = (value: unknown): value is number => typeof value === 'number' && value > 0
	if (template.outputKind === 'print') {
		const { width, height } = template.size ?? {}
		return positive(width) && positive(height) ? { printSizeMm: { width, height } } : {}
	}
	const width = template.size?.width ?? template.width
	const height = template.size?.height ?? template.height
	return positive(width) && positive(height) ? { digitalSizePx: { width, height } } : {}
}
