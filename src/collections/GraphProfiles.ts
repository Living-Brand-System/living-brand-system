import {
	deriveGraphStudioConfig,
	GRAPH_RUNTIME_OPTIONS,
	graphRuntimeManifests,
} from '@/features/graphic-generation/domain/graph-studio-manifest'
import { canvasProfileCollection } from './canvas-profile-collection'

export const GraphProfiles = canvasProfileCollection({
	slug: 'graph-profiles',
	dbName: 'graph_profiles',
	source: 'graph',
	name: 'Graph',
	runtimeOptions: GRAPH_RUNTIME_OPTIONS,
	runtimeManifests: graphRuntimeManifests,
	deriveConfig: deriveGraphStudioConfig,
})
