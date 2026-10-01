import type {
	ControllerControlValue,
	ControllerGroupDefinition,
} from '@/modules/studio-controller/controller-definition'

/**
 * 가이드라인 블록이 발행하는 컨트롤 계약.
 *
 * 🔑 **타입을 새로 만들지 않고 Studio Controller의 것을 받아쓴다.** 컨트롤의 종류·범위·단위 어휘는
 *    이미 `ControllerControlDefinition`이 갖고 있고(`kind`·`min`·`max`·`step`·`defaultValue`·
 *    `display.unit`), 그것을 그리는 도메인 무지 렌더러도 이미 있다. 여기서 같은 어휘를 다시
 *    정의하면 두 표면의 컨트롤이 조용히 갈라진다.
 *
 * Studio의 `StudioRuntimeManifest`를 그대로 쓰지 않는 이유는 그쪽이 `artifacts`(내보내기 능력)를
 * 함께 싣기 때문이다 — 가이드라인 블록은 내보내지 않는다. 겹치는 부분만 가져온다.
 */
export type GuidelineControllerManifest = {
	/** 레지스트리 키이자 사람이 읽는 이름. 위젯 폴더 이름과 같게 둔다. */
	id: string
	groups: readonly ControllerGroupDefinition[]
}

export type { ControllerControlValue }
