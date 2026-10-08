/**
 * 컨트롤러 렌더러 — 직렬화된 Definition과 세션 값을 킷 primitive로 투영한다(docs/10 §3.6).
 * 🔑 킷(`../controller`)과 계약(`modules/studio-controller`)을 **둘 다 아는 유일한 층**이라 킷 밖에 둔다 —
 *    킷은 계약을 모르고, 화면은 이 렌더러나 킷만 쓴다.
 */
export { type ControllerAssetSources, ControllerControlRenderer } from './control'
export {
	ControllerDefinitionGroup,
	type ControllerDefinitionGroupProps,
	ControllerGroupRenderer,
	ControllerRenderer,
} from './group'
