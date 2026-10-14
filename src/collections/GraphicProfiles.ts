import {
	deriveGraphicStudioConfig,
	GRAPHIC_RUNTIME_OPTIONS,
	graphicRuntimeManifests,
} from '@/features/graphic-generation/domain/graphic-studio-manifest'
import { canvasProfileCollection } from './canvas-profile-collection'

export const GraphicProfiles = canvasProfileCollection({
	slug: 'graphic-profiles',
	dbName: 'graphic_profiles',
	source: 'graphic',
	name: '그래픽',
	runtimeOptions: GRAPHIC_RUNTIME_OPTIONS,
	runtimeManifests: graphicRuntimeManifests,
	deriveConfig: deriveGraphicStudioConfig,
})
