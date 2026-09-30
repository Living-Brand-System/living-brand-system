import {
	parseStudioArtifactCapabilities,
	type StudioArtifactCapabilities,
} from '@/modules/studio-artifact/studio-artifact'

/** Controller Definition에 저장할 수 있는 직렬화 가능한 값. */
export type ControllerControlValue =
	| string
	| number
	| boolean
	| null
	| ControllerPadValue
	| ControllerPadPairValue

export type ControllerPadValue = { x: number; y: number }
/** 한 판 위의 두 점. 두 점은 서로 구별되지 않는다 — 잡으면 가까운 쪽이 따라온다. */
export type ControllerPadPairValue = { a: ControllerPadValue; b: ControllerPadValue }

export type ControllerAvailability = 'enabled' | 'readonly' | 'disabled'
export type ControllerInteraction = 'idle' | 'hover' | 'focused' | 'error'

export type ControllerRuntimeBinding = {
	availability?: ControllerAvailability
	error?: string
	padAspectRatio?: number
}

export type ControllerRuntimeBindings = Readonly<Record<string, ControllerRuntimeBinding>>

/**
 * 창작자 화면에 나란히 서는 스튜디오들. 🔴 이 목록이 곧 메뉴이자 admin 컬렉션의 갈래다 —
 * 늘리면 프로파일 컬렉션·런타임 카탈로그·라우트가 함께 생겨야 한다.
 */
export type StudioKind = 'template' | 'image' | 'graphic' | 'graph'

/** Admin 제한을 적용하기 전 Studio runtime이 발행하는 결정적 원본 계약. */
export type StudioRuntimeManifest = {
	artifacts: StudioArtifactCapabilities
	controller: {
		groups: readonly ControllerGroupDefinition[]
		/**
		 * 왼쪽 패널에 세울 컨트롤 id — 창작자가 **실제로 다루기를 기대하는** 큰 축이다.
		 * 색 조합과 전반적인 형태가 여기 온다.
		 *
		 * 나머지는 사라지지 않고 **오른쪽 패널**로 간다 — 세기·속도처럼 세밀하고 잡다한 값들이고,
		 * 창작자가 다룰 수는 있으나 다루리라 기대하지는 않는다.
		 *
		 * 🔴 **비워 두면 전부 왼쪽이다.** 아직 정하지 않은 런타임은 선언하지 않는다 —
		 *    빈 배열을 넣으면 왼쪽 패널이 통째로 빈다.
		 *
		 * 지금은 코드가 정하지만 나중에 프로파일(manager)로 옮겨진다. `controllerPresentation`이
		 * 같은 성격으로 이미 그 길을 갔다.
		 */
		left?: readonly string[]
		/**
		 * 오른쪽 패널에 세울 컨트롤 id — 창작자가 다룰 수는 있으나 다루리라 기대하지 않는 축이다.
		 *
		 * 🔑 **여기에도 `left`에도 없는 컨트롤은 창작자 화면에 그려지지 않는다.** 선언은 남아 있어
		 *    manager가 Payload에서 조정할 수 있다 — 지우는 것이 아니라 후처리 자리로 내리는 것이다.
		 *
		 * 🔴 비워 두면 `left`가 아닌 전부가 오른쪽이다. 아직 정하지 않은 런타임의 축이 조용히
		 *    사라지지 않게 한다 — 빈 배열은 「오른쪽에 아무것도 세우지 않는다」는 뜻이다.
		 */
		right?: readonly string[]
		/**
		 * 값이 바뀌면 런타임을 **다시 만들어야** 하는 컨트롤 id.
		 *
		 * 대부분의 컨트롤은 uniform 하나를 바꾸므로 살아 있는 런타임에 흘려 넣으면 된다. 그런데
		 * 「모양」처럼 셰이더 프로그램 자체를 갈아끼우는 축은 update로 반영할 수 없다 — 컴파일된
		 * 프로그램에 없는 uniform은 조용히 무시되고 화면만 옛 모양으로 남는다.
		 *
		 * 🔴 여기 넣은 컨트롤은 만질 때마다 캔버스가 처음부터 다시 뜬다(애니메이션도 되감긴다).
		 *    그 값이 프로그램을 바꾸는 축일 때만 넣는다.
		 */
		remountOn?: readonly string[]
	}
}

/**
 * Admin이 등록한 미리보기 이미지의 표시 계약 — 자산 브라우저 카드와 트리거 배경이 쓴다.
 * 업로드 문서 원본이 아니라 표시에 필요한 두 값만 지난다(docs/07: 안전 계약 필드만 나간다).
 */
export type StudioPreviewImage = {
	url: string
	alt: string
}

/** 모든 Studio가 발행하는 공통 Controller envelope. 도메인 실행 정보는 교차 타입으로 확장한다. */
export type StudioControllerConfig<
	Kind extends StudioKind = StudioKind,
	Id extends string | number = string | number,
> = StudioRuntimeManifest & {
	studio: Kind
	id: Id
	version: 1
	name: string
	/** Runtime 구조와 분리해 Admin이 정한 그룹 표현 정책. Runtime Manifest에는 존재하지 않는다. */
	controllerPresentation?: StudioControllerPresentation
	/** Admin이 고른 미리보기 이미지. Runtime Manifest에는 존재하지 않는다(프로파일·템플릿이 갖는다). */
	previewImage?: StudioPreviewImage
}

export type ControllerOption<Value extends string = string> = {
	value: Value
	label: string
	/**
	 * 이 선택지가 곧 색 조합일 때의 실제 색(#rrggbb). 🔴 새 kind도 새 variant도 만들지 않는다 —
	 * `variant`는 선택지의 **성격**이고 이것은 선택지의 **내용**이다.
	 * 한 control의 선택지는 전부 갖거나 전부 없어야 한다 — 섞이면 색 칩과 글자 목록이 반쪽으로 그려진다.
	 */
	colors?: readonly string[]
	/**
	 * 이 선택지가 곧 형태일 때 그 형태를 그리는 도형 목록. 좌표는 단위 정사각형(0~1)이고,
	 * 킷이 그것을 SVG로 그려 썸네일을 만든다.
	 *
	 * 🔑 이미지가 아니라 **좌표**인 이유: 파일을 두면 이 축이 admin 업로드에 묶여 환경마다 달라지고,
	 * 아이콘 이름을 두면 킷이 런타임의 어휘를 알아야 한다. 좌표는 런타임이 자기 기하를 그대로
	 * 적는 것이라 둘 다 피한다.
	 * `colors`와 마찬가지로 한 control의 선택지는 전부 갖거나 전부 없어야 한다.
	 */
	preview?: readonly ControllerPreviewShape[]
	/**
	 * 같은 성격끼리 묶는 이름. 선택지가 많을 때 **숨기는 대신 묶는다** — 숨기면 창작자는
	 * 무엇이 왜 사라졌는지 알 수 없고, 목록이 조용히 달라지면 고르던 것을 잃는다.
	 * 🔑 `colors`·`preview`와 같은 자리다: `variant`는 선택지의 **성격**이고 이것은 **내용**이다.
	 */
	group?: string
}

/** 썸네일 선분 — 단위 정사각형 안의 `[x1, y1, x2, y2]`. */
export type ControllerPreviewLine = readonly [number, number, number, number]

/**
 * 썸네일 원 — `[cx, cy, r]`.
 * 🔴 선분으로 근사하지 않는다. 20px 남짓한 칩에서 다각형은 원이 아니라 **다각형으로 읽힌다**.
 */
export type ControllerPreviewCircle = readonly [number, number, number]

/** 값의 길이가 곧 종류다 — 넷이면 선분, 셋이면 원. */
export type ControllerPreviewShape = ControllerPreviewLine | ControllerPreviewCircle

type ControllerControlBase = {
	id: string
	label: string
	availability?: ControllerAvailability
}

/**
 * Controller primitive가 받을 수 있는 데이터 정의. 현재 값·콜백·상호작용 상태는 Studio Provider와
 * 표현 컴포넌트가 결합하고, 이 계약에는 직렬화 가능한 기본값과 제약만 둔다.
 */
export type ControllerControlDefinition =
	| (ControllerControlBase & {
			kind: 'text'
			defaultValue: string | null
			multiline?: boolean
			/** 여러 줄 필드가 한 번에 보여 줄 줄 수. 표 데이터처럼 줄이 많은 값이 쓴다. */
			rows?: number
			/**
			 * 줄·칸으로 된 값을 **격자로도** 편집하게 한다. 배열은 열 제목이고, 모자란 열은 제목 없이 선다.
			 *
			 * 🔑 값은 여전히 문자열이다 — 격자는 같은 값의 다른 표현이라 control 값 타입이 넓어지지 않고,
			 * 격자와 입력창이 한 값을 공유해 한쪽을 고치면 다른 쪽이 바로 따라온다.
			 * 🔴 `multiline`과 함께 쓴다. 한 줄 입력에는 격자로 보여 줄 줄이 없다.
			 */
			grid?: readonly string[]
			maxLength?: number
			placeholder?: string
			/**
			 * 값을 기본값으로 되돌리는 버튼을 세운다. 값이 기본값과 같으면 버튼이 없다 —
			 * 되돌릴 것이 없는데 버튼이 있으면 눌러도 아무 일이 없는 조작 요소가 된다.
			 *
			 * 🔑 새 control kind를 만들지 않는 이유: 이 버튼은 값을 **이 control의 기본값으로**
			 * 되돌리는 것뿐이라 자기 값도 자기 자리도 갖지 않는다. 계약이 이미 아는 것만 쓴다.
			 */
			resettable?: boolean
	  })
	| (ControllerControlBase & {
			kind: 'toggle'
			defaultValue: boolean
	  })
	| (ControllerControlBase & {
			kind: 'select'
			defaultValue: string | null
			options: readonly ControllerOption[]
			placeholder?: string
			/**
			 * 선택지를 어떻게 내놓는가. 기본 `list`는 드롭다운이라 **누르기 전까지 무엇이 있는지 모른다**.
			 * `segmented`는 선택지를 한 줄에 다 펴 놓고 배경 pill만 미끄러진다 — 선택지가 몇 개인지가
			 * 곧 정보인 축(꼴처럼 정본이 세트로 제시하는 것)에 쓴다. 선택지가 많으면 폭을 먹으므로
			 * 목록형이 기본이다.
			 */
			variant?: 'list' | 'segmented'
	  })
	| (ControllerControlBase & {
			kind: 'color'
			defaultValue: string | null
			/** 허용 색 목록(#rrggbb). 없으면 자유 색상이다 — select의 options에 대응한다. */
			values?: readonly string[]
	  })
	| (ControllerControlBase & {
			kind: 'range'
			defaultValue: number
			min: number
			max: number
			step: number
			display?: { unit?: string; precision?: number }
	  })
	| (ControllerControlBase & {
			kind: 'pad'
			defaultValue: ControllerPadValue
			aspectRatio?: number
	  })
	| (ControllerControlBase & {
			kind: 'pad-pair'
			defaultValue: ControllerPadPairValue
			aspectRatio?: number
	  })
	| (ControllerControlBase & {
			kind: 'asset'
			/** 고른 자산의 URL. 고르지 않은 상태가 `null`이다. */
			defaultValue: string | null
			/**
			 * 고를 자산의 출처. 🔴 킷은 목록을 모른다 — 이 값으로 **화면이** 피커를 고른다.
			 * 목록을 계약에 넣으면 정의가 환경(업로드된 자산)에 묶여 admin 저장마다 달라진다.
			 */
			source: 'sample-images'
	  })

export type ControllerGroupDefinition = {
	id: string
	title: string
	controls: readonly ControllerControlDefinition[]
}

/**
 * 창작자에게 **보이는** 축만 남긴다 — 좌·우를 한 자리에 이어 그리는 화면이 쓴다.
 *
 * 🔑 `splitControllerGroups`로 가른 뒤 두 벌을 잇지 **않는다.** 한 그룹의 컨트롤이 좌·우로
 *    갈려 있으면 같은 제목의 섹션이 두 번 그려진다. 여기서는 원래 그룹 순서·컨트롤 순서를
 *    유지하며 걸러내므로 그 일이 없다. 보임 규칙은 `splitControllerGroups`와 같은 것이다.
 */
export function visibleControllerGroups(
	groups: readonly ControllerGroupDefinition[],
	left: readonly string[] | undefined,
	right?: readonly string[],
): readonly ControllerGroupDefinition[] {
	// 선언이 반쪽이면 전부 보인다 — 선언하지 않은 런타임의 화면이 비지 않게 한다.
	if (!left || !right) return groups
	const visible = new Set([...left, ...right])
	return groups
		.map((group) => ({
			...group,
			controls: group.controls.filter((control) => visible.has(control.id)),
		}))
		.filter((group) => group.controls.length > 0)
}

/**
 * 셰이더 프로그램을 갈아끼우는 축들의 지문.
 *
 * 🔴 대부분의 컨트롤은 살아 있는 런타임에 흘려 넣으면 되지만, 「모양」처럼 프로그램 자체를
 *    바꾸는 축은 update로 반영되지 않는다 — 컴파일된 프로그램에 없는 uniform은 조용히 무시되고
 *    화면만 옛 모양으로 남는다. 어느 컨트롤이 그런지는 런타임이 `remountOn`으로 선언한다.
 * 🔑 문자열인 이유는 effect 의존성이라 값 비교가 되어야 하기 때문이다.
 * 🔴 런타임을 세우는 화면이 둘 이상이므로(Graphic 캔버스·Template 배경) 지문 계산이 한 곳에 있어야
 *    한다 — 한쪽만 갖고 있으면 그쪽 화면에서만 모양이 갈린다.
 */
export function controllerRemountKey(
	remountOn: readonly string[] | undefined,
	values: ControllerValues,
): string {
	return (remountOn ?? []).map((id) => `${id}=${String(values[id])}`).join('&')
}

/**
 * 그룹을 왼쪽/오른쪽 두 벌로 가른다. 그룹 구조는 양쪽에서 그대로 유지되고,
 * 남는 컨트롤이 없는 그룹은 그 쪽에서 빠진다.
 *
 * 🔑 **어느 쪽에도 없는 컨트롤은 어느 쪽에도 그려지지 않는다** — 선언은 남으므로 manager는
 *    Payload에서 그 값을 조정할 수 있다. 창작자 화면에서만 내려가는 세 번째 층이다.
 *
 * 🔴 `left`가 없으면 전부 왼쪽이다 — 선언하지 않은 런타임의 화면이 비지 않게 한다.
 * 🔴 `right`가 없으면 왼쪽이 아닌 전부가 오른쪽이다. 빈 배열은 그것과 다르다 —
 *    「오른쪽에 아무것도 세우지 않는다」는 뜻이다.
 */
export function splitControllerGroups(
	groups: readonly ControllerGroupDefinition[],
	left: readonly string[] | undefined,
	right?: readonly string[],
): { left: readonly ControllerGroupDefinition[]; right: readonly ControllerGroupDefinition[] } {
	if (!left) return { left: groups, right: [] }
	const leftIds = new Set(left)
	const rightIds = right && new Set(right)
	const pick = (side: 'left' | 'right') =>
		groups
			.map((group) => ({
				...group,
				controls: group.controls.filter((control) =>
					side === 'left'
						? leftIds.has(control.id)
						: rightIds
							? rightIds.has(control.id)
							: !leftIds.has(control.id),
				),
			}))
			.filter((group) => group.controls.length > 0)

	return { left: pick('left'), right: pick('right') }
}

export type ControllerGroupPresentation = {
	groupId: string
	collapsible: boolean
	defaultOpen: boolean
}

export type StudioControllerPresentation = {
	groups: readonly ControllerGroupPresentation[]
}

/** Base Definition의 kind·표현 정보를 복제하지 않는 Admin 제한값. */
export type ControllerControlRestriction = {
	controlId: string
	availability?: Exclude<ControllerAvailability, 'enabled'>
	defaultValue?: ControllerControlValue
	maxLength?: number
	optionValues?: readonly string[]
	/** color control의 허용 색 좁힘 — optionValues의 색 버전이다. */
	colorValues?: readonly string[]
	min?: number
	max?: number
}

export type StudioControllerRestrictions = {
	controls: readonly ControllerControlRestriction[]
}

export type ControllerValues = Record<string, ControllerControlValue>

const STUDIO_KINDS: readonly StudioKind[] = ['template', 'image', 'graphic', 'graph']
const AVAILABILITIES: readonly ControllerAvailability[] = ['enabled', 'readonly', 'disabled']
const COLOR_PATTERN = /^#[0-9a-f]{6}$/i
const CONTROL_BASE_KEYS = ['id', 'kind', 'label', 'defaultValue', 'availability'] as const
type SelectVariant = NonNullable<
	Extract<ControllerControlDefinition, { kind: 'select' }>['variant']
>
const SELECT_VARIANTS: readonly SelectVariant[] = ['list', 'segmented']
type AssetSource = Extract<ControllerControlDefinition, { kind: 'asset' }>['source']
const ASSET_SOURCES: readonly AssetSource[] = ['sample-images']

/** unknown Admin/Payload 입력에서 공통 envelope와 Controller Definition v1을 검증한다. */
export function parseStudioControllerConfig(input: unknown): StudioControllerConfig {
	const config = asRecord(input, 'StudioConfig')
	assertJsonValue(config.controller, 'controller')

	if (!STUDIO_KINDS.includes(config.studio as StudioKind))
		invalid('studio', '지원하지 않는 값입니다.')
	if (
		(typeof config.id !== 'string' || config.id.length === 0) &&
		(typeof config.id !== 'number' || !Number.isFinite(config.id))
	) {
		invalid('id', '비어 있지 않은 문자열 또는 유한한 숫자여야 합니다.')
	}
	if (config.version !== 1) invalid('version', '지원하는 버전은 1입니다.')
	assertNonEmptyString(config.name, 'name')
	if (config.previewImage != null) validatePreviewImage(config.previewImage)
	parseStudioArtifactCapabilities(config.artifacts)

	const controller = asRecord(config.controller, 'controller')
	assertOnlyKeys(controller, ['groups', 'left', 'remountOn', 'right'], 'controller')
	if (!Array.isArray(controller.groups)) invalid('controller.groups', '배열이어야 합니다.')

	const groupIds = new Set<string>()
	const controlIds = new Set<string>()
	for (const [groupIndex, groupValue] of controller.groups.entries()) {
		const groupPath = `controller.groups[${groupIndex}]`
		const group = asRecord(groupValue, groupPath)
		assertOnlyKeys(group, ['id', 'title', 'controls'], groupPath)
		assertNonEmptyString(group.id, `${groupPath}.id`)
		if (groupIds.has(group.id)) invalid(`${groupPath}.id`, `중복되었습니다: ${group.id}`)
		groupIds.add(group.id)
		assertNonEmptyString(group.title, `${groupPath}.title`)
		if (!Array.isArray(group.controls)) invalid(`${groupPath}.controls`, '배열이어야 합니다.')
		for (const [controlIndex, controlValue] of group.controls.entries()) {
			validateControl(controlValue, `${groupPath}.controls[${controlIndex}]`)
			controlIds.add((controlValue as { id: string }).id)
		}
	}
	if (controller.left !== undefined)
		validateControlIdList(controller.left, controlIds, 'controller.left')
	if (controller.right !== undefined)
		validateControlIdList(controller.right, controlIds, 'controller.right')
	if (controller.remountOn !== undefined)
		validateControlIdList(controller.remountOn, controlIds, 'controller.remountOn')
	if (config.controllerPresentation !== undefined) {
		validateControllerPresentation(config.controllerPresentation, groupIds)
	}

	createControllerValues(controller.groups as readonly ControllerGroupDefinition[])
	return input as StudioControllerConfig
}

/** Payload의 sparse 그룹 표현값을 Runtime 그룹 순서의 완전한 Effective 정책으로 투영한다. */
export function resolveControllerPresentation(
	groups: readonly ControllerGroupDefinition[],
	input: unknown,
): StudioControllerPresentation {
	const overrides = new Map<string, { collapsible?: boolean; defaultOpen?: boolean }>()
	if (input != null) {
		const root = asRecord(input, 'controller presentation')
		assertOnlyKeys(root, ['groups'], 'controller presentation')
		if (root.groups != null) {
			if (!Array.isArray(root.groups))
				invalid('controller presentation.groups', '배열이어야 합니다.')
			const knownIds = new Set(groups.map(({ id }) => id))
			for (const [index, value] of root.groups.entries()) {
				const path = `controller presentation.groups[${index}]`
				const group = asRecord(value, path)
				assertOnlyKeys(group, ['groupId', 'collapsible', 'defaultOpen'], path)
				assertNonEmptyString(group.groupId, `${path}.groupId`)
				if (!knownIds.has(group.groupId))
					invalid(`${path}.groupId`, 'Runtime 그룹을 찾을 수 없습니다.')
				if (overrides.has(group.groupId)) invalid(`${path}.groupId`, '중복되었습니다.')
				if (group.collapsible !== undefined && typeof group.collapsible !== 'boolean') {
					invalid(`${path}.collapsible`, 'boolean이어야 합니다.')
				}
				if (group.defaultOpen !== undefined && typeof group.defaultOpen !== 'boolean') {
					invalid(`${path}.defaultOpen`, 'boolean이어야 합니다.')
				}
				if (group.collapsible === false && group.defaultOpen === false) {
					invalid(path, '접을 수 없는 그룹은 닫힌 상태로 시작할 수 없습니다.')
				}
				overrides.set(group.groupId, {
					...definedProperty('collapsible', group.collapsible as boolean | undefined),
					...definedProperty('defaultOpen', group.defaultOpen as boolean | undefined),
				})
			}
		}
	}

	return {
		groups: groups.map(({ id }) => {
			const override = overrides.get(id)
			const collapsible = override?.collapsible ?? true
			return {
				groupId: id,
				collapsible,
				defaultOpen: collapsible ? (override?.defaultOpen ?? true) : true,
			}
		}),
	}
}

/** Payload JSON을 kind-free Controller Restrictions 계약으로 읽는다. */
export function projectPayloadControllerRestrictions(
	input: unknown,
): StudioControllerRestrictions | null {
	if (!input || typeof input !== 'object') return null
	const record = asRecord(input, 'controller restrictions')
	assertOnlyKeys(record, ['controls'], 'controller restrictions')
	if (record.controls == null) return null
	if (!Array.isArray(record.controls))
		invalid('controller restrictions.controls', '배열이어야 합니다.')
	return { controls: record.controls.map(projectControllerRestriction) }
}

/** Admin Restrictions를 stable control id로 찾아 Base Definition보다 좁은 값만 적용한다. */
export function applyControllerRestrictions(
	baseGroups: readonly ControllerGroupDefinition[],
	restrictions: StudioControllerRestrictions | null,
): readonly ControllerGroupDefinition[] {
	if (!restrictions) return baseGroups
	const controlsById = new Map(
		baseGroups.flatMap((group) =>
			group.controls.map((control) => [control.id, control] as const),
		),
	)
	const restrictionsById = new Map<string, ControllerControlRestriction>()
	for (const control of restrictions.controls) {
		if (restrictionsById.has(control.controlId)) {
			throw new Error(
				`Controller restriction control id가 중복되었습니다: ${control.controlId}`,
			)
		}
		if (!controlsById.has(control.controlId)) {
			throw new Error(
				`Controller restriction control을 찾을 수 없습니다: ${control.controlId}`,
			)
		}
		restrictionsById.set(control.controlId, control)
	}

	// 🔴 팔레트가 있는 색 조합 그룹의 색 칸에는 「허용 색」을 걸 수 없다. 걸면 그 칸이 띠에서 빠져
	//    팔레트 칩이 채울 짝을 잃고 — 칩은 눌리고 선택 링도 옮겨가는데 색과 화면이 하나도 안 바뀌는
	//    조용한 사망이 된다. 창작자 화면에서 조용히 죽는 대신 admin 저장에서 거부한다.
	for (const group of baseGroups) {
		const hasPalette = group.controls.some(
			(control) =>
				control.kind === 'select' &&
				control.options.every((option) => option.colors?.length),
		)
		if (!hasPalette) continue
		const restricted = group.controls.find(
			(control) =>
				control.kind === 'color' && restrictionsById.get(control.id)?.colorValues?.length,
		)
		if (restricted) {
			throw new Error(
				`색 조합 그룹의 색 칸에는 허용 색을 지정할 수 없습니다: ${restricted.id}`,
			)
		}
	}

	return baseGroups.map((group) => ({
		...group,
		controls: group.controls.map((base) => {
			const control = restrictionsById.get(base.id)
			return control ? applyControlRestriction(base, control) : base
		}),
	}))
}

/** Definition의 기본값으로 편집 세션을 시작한다. 중복 id는 값 덮어쓰기를 막기 위해 거부한다. */
export function createControllerValues(
	groups: readonly ControllerGroupDefinition[],
): ControllerValues {
	const values: ControllerValues = {}
	for (const group of groups) {
		for (const control of group.controls) {
			if (control.id in values) {
				throw new Error(`Controller control id가 중복되었습니다: ${control.id}`)
			}
			values[control.id] = control.defaultValue
		}
	}
	return values
}

/** 편집 중에는 표시할 수 있도록 초과 text를 보존하되, 잠긴 값과 잘못된 kind는 거부한다. */
export function acceptsControllerDraftValue(
	control: ControllerControlDefinition,
	value: ControllerControlValue,
	binding?: ControllerRuntimeBinding,
): boolean {
	if (resolveControllerAvailability(control.availability, binding?.availability) !== 'enabled') {
		return false
	}
	return isControllerValueShape(control, value, false)
}

/** 실행 경계는 draft text를 포함한 값을 완전히 검증하고 잠긴 control에는 기본값만 허용한다. */
export function acceptsControllerExecutionValue(
	control: ControllerControlDefinition,
	value: ControllerControlValue,
): boolean {
	if (!isControllerValueShape(control, value, true)) return false
	return (
		(control.availability ?? 'enabled') === 'enabled' ||
		controllerValuesEqual(value, control.defaultValue)
	)
}

/** 실행 직전 전체 Definition 값이 빠짐없이 유효한지 한 번에 확인한다. */
export function acceptsControllerExecutionValues(
	groups: readonly ControllerGroupDefinition[],
	values: Readonly<ControllerValues>,
): boolean {
	return groups.every((group) =>
		group.controls.every(
			(control) =>
				Object.hasOwn(values, control.id) &&
				acceptsControllerExecutionValue(control, values[control.id]),
		),
	)
}

/** Published와 runtime availability를 더 제한적인 한 값으로 합친다. */
export function resolveControllerAvailability(
	published: ControllerAvailability = 'enabled',
	runtime: ControllerAvailability = 'enabled',
): ControllerAvailability {
	if (published === 'disabled' || runtime === 'disabled') return 'disabled'
	if (published === 'readonly' || runtime === 'readonly') return 'readonly'
	return 'enabled'
}

function isControllerValueShape(
	control: ControllerControlDefinition,
	value: ControllerControlValue,
	forExecution: boolean,
): boolean {
	switch (control.kind) {
		case 'text':
			return (
				(typeof value === 'string' || value === null) &&
				(!forExecution ||
					value === null ||
					control.maxLength === undefined ||
					value.length <= control.maxLength)
			)
		case 'toggle':
			return typeof value === 'boolean'
		case 'select':
			return (
				value === null ||
				(typeof value === 'string' &&
					control.options.some((option) => option.value === value))
			)
		case 'color':
			if (value === null) return true
			if (typeof value !== 'string' || !COLOR_PATTERN.test(value)) return false
			// 팔레트가 정해진 control은 목록 밖 색을 받지 않는다 — select가 options 밖 값을 막는 것과 같다.
			return !control.values || control.values.includes(value.toLowerCase())
		case 'range':
			return (
				typeof value === 'number' &&
				Number.isFinite(value) &&
				value >= control.min &&
				value <= control.max
			)
		case 'pad':
			return isControllerPadValue(value)
		case 'pad-pair':
			return isControllerPadPairValue(value)
		case 'asset':
			return value === null || typeof value === 'string'
	}
}

/**
 * 기본값이 바뀌었을 때 들고 있던 값이 **따라가야 하는가**.
 *
 * 🔑 기본값이 바뀌었다는 것은 계약이 다른 것을 가리키게 됐다는 뜻이다(표현을 바꾸면 그 표현의
 *    데이터가 기본값이 된다). 따라갈지는 창작자가 그 값을 손댔는가로 갈린다 —
 *    **옛 기본값 그대로면 손대지 않은 것**이므로 새 기본값으로 끌어온다.
 * 🔴 손댄 값은 따라가지 않는다. 덮으면 창작자가 적은 것이 되돌릴 방법 없이 사라진다.
 */
export function followsChangedDefault(
	value: ControllerControlValue,
	before: ControllerControlValue | undefined,
	next: ControllerControlValue,
): boolean {
	if (before === undefined) return false
	if (controllerValuesEqual(before, next)) return false
	return controllerValuesEqual(value, before)
}

export function controllerValuesEqual(left: ControllerControlValue, right: ControllerControlValue) {
	if (isControllerPadValue(left) && isControllerPadValue(right)) {
		return padValuesEqual(left, right)
	}
	if (isControllerPadPairValue(left) && isControllerPadPairValue(right)) {
		return padValuesEqual(left.a, right.a) && padValuesEqual(left.b, right.b)
	}
	return left === right
}

function padValuesEqual(left: ControllerPadValue, right: ControllerPadValue) {
	return left.x === right.x && left.y === right.y
}

export function isControllerPadPairValue(
	value: ControllerControlValue,
): value is ControllerPadPairValue {
	if (typeof value !== 'object' || value === null || !('a' in value) || !('b' in value)) {
		return false
	}
	return isControllerPadValue(value.a) && isControllerPadValue(value.b)
}

export function isControllerPadValue(value: ControllerControlValue): value is ControllerPadValue {
	if (typeof value !== 'object' || value === null || !('x' in value) || !('y' in value)) {
		return false
	}
	return isUnitAxis(value.x) && isUnitAxis(value.y)
}

function isUnitAxis(value: unknown) {
	return typeof value === 'number' && Number.isFinite(value) && value >= -1 && value <= 1
}

function validateControl(value: unknown, path: string) {
	const control = asRecord(value, path)
	assertNonEmptyString(control.id, `${path}.id`)
	assertNonEmptyString(control.label, `${path}.label`)
	if (
		control.availability !== undefined &&
		!AVAILABILITIES.includes(control.availability as ControllerAvailability)
	) {
		invalid(`${path}.availability`, '지원하지 않는 값입니다.')
	}

	switch (control.kind) {
		case 'text':
			assertOnlyKeys(
				control,
				[
					...CONTROL_BASE_KEYS,
					'multiline',
					'rows',
					'grid',
					'maxLength',
					'placeholder',
					'resettable',
				],
				path,
			)
			assertNullableString(control.defaultValue, `${path}.defaultValue`)
			if (control.multiline !== undefined && typeof control.multiline !== 'boolean') {
				invalid(`${path}.multiline`, 'boolean이어야 합니다.')
			}
			if (
				control.grid !== undefined &&
				(!Array.isArray(control.grid) ||
					control.grid.some((label) => typeof label !== 'string'))
			) {
				invalid(`${path}.grid`, '열 제목 문자열 배열이어야 합니다.')
			}
			// 격자는 줄을 행으로 읽는다 — 한 줄 입력에는 읽을 행이 없다.
			if (control.grid !== undefined && !control.multiline) {
				invalid(`${path}.grid`, 'multiline과 함께 써야 합니다.')
			}
			if (
				control.maxLength !== undefined &&
				(typeof control.maxLength !== 'number' ||
					!Number.isInteger(control.maxLength) ||
					control.maxLength <= 0)
			) {
				invalid(`${path}.maxLength`, '0보다 큰 정수여야 합니다.')
			}
			if (
				typeof control.defaultValue === 'string' &&
				typeof control.maxLength === 'number' &&
				control.defaultValue.length > control.maxLength
			) {
				invalid(`${path}.defaultValue`, 'maxLength를 초과할 수 없습니다.')
			}
			if (control.placeholder !== undefined && typeof control.placeholder !== 'string') {
				invalid(`${path}.placeholder`, '문자열이어야 합니다.')
			}
			return
		case 'toggle':
			assertOnlyKeys(control, CONTROL_BASE_KEYS, path)
			if (typeof control.defaultValue !== 'boolean') {
				invalid(`${path}.defaultValue`, 'boolean이어야 합니다.')
			}
			return
		case 'select': {
			assertOnlyKeys(
				control,
				[...CONTROL_BASE_KEYS, 'options', 'placeholder', 'variant'],
				path,
			)
			assertNullableString(control.defaultValue, `${path}.defaultValue`)
			if (!Array.isArray(control.options) || control.options.length === 0) {
				invalid(`${path}.options`, '하나 이상의 선택지가 필요합니다.')
			}
			const optionValues = new Set<string>()
			let colorOptionCount = 0
			let previewOptionCount = 0
			for (const [optionIndex, optionValue] of control.options.entries()) {
				const optionPath = `${path}.options[${optionIndex}]`
				const option = asRecord(optionValue, optionPath)
				assertOnlyKeys(option, ['colors', 'group', 'label', 'preview', 'value'], optionPath)
				assertNonEmptyString(option.value, `${optionPath}.value`)
				assertNonEmptyString(option.label, `${optionPath}.label`)
				// 색 조합 선택지 — 형식·중복 규칙은 color control의 팔레트와 같은 것을 쓴다.
				if (option.colors !== undefined) {
					assertColorValues(option.colors, `${optionPath}.colors`)
					colorOptionCount += 1
				}
				if (option.preview !== undefined) {
					assertPreviewShapes(option.preview, `${optionPath}.preview`)
					previewOptionCount += 1
				}
				if (option.group !== undefined && typeof option.group !== 'string') {
					invalid(`${optionPath}.group`, '문자열이어야 합니다.')
				}
				if (optionValues.has(option.value)) {
					invalid(`${optionPath}.value`, `중복되었습니다: ${option.value}`)
				}
				optionValues.add(option.value)
			}
			// 부분 선언은 막는다 — 일부만 색이면 칩 그리드도 목록도 되지 못하고 반쪽으로 그려진다.
			if (colorOptionCount > 0 && colorOptionCount < control.options.length) {
				invalid(`${path}.options`, 'colors는 모든 선택지에 있거나 없어야 합니다.')
			}
			if (previewOptionCount > 0 && previewOptionCount < control.options.length) {
				invalid(`${path}.options`, 'preview는 모든 선택지에 있거나 없어야 합니다.')
			}
			if (control.defaultValue !== null && !optionValues.has(control.defaultValue)) {
				invalid(`${path}.defaultValue`, 'options에 포함되어야 합니다.')
			}
			if (control.placeholder !== undefined && typeof control.placeholder !== 'string') {
				invalid(`${path}.placeholder`, '문자열이어야 합니다.')
			}
			if (
				control.variant !== undefined &&
				!SELECT_VARIANTS.includes(control.variant as SelectVariant)
			) {
				invalid(`${path}.variant`, '지원하지 않는 값입니다.')
			}
			return
		}
		case 'color': {
			assertOnlyKeys(control, [...CONTROL_BASE_KEYS, 'values'], path)
			assertNullableString(control.defaultValue, `${path}.defaultValue`)
			if (control.defaultValue !== null && !COLOR_PATTERN.test(control.defaultValue)) {
				invalid(`${path}.defaultValue`, '#rrggbb 형식이어야 합니다.')
			}
			if (control.values !== undefined) {
				const values = assertColorValues(control.values, `${path}.values`)
				if (
					control.defaultValue !== null &&
					!values.has(control.defaultValue.toLowerCase())
				) {
					invalid(`${path}.defaultValue`, 'values에 포함되어야 합니다.')
				}
			}
			return
		}
		case 'range':
			assertOnlyKeys(control, [...CONTROL_BASE_KEYS, 'min', 'max', 'step', 'display'], path)
			assertNumber(control.defaultValue, `${path}.defaultValue`)
			assertNumber(control.min, `${path}.min`)
			assertNumber(control.max, `${path}.max`)
			assertNumber(control.step, `${path}.step`)
			if (control.min >= control.max) invalid(path, 'range의 min은 max보다 작아야 합니다.')
			if (control.step <= 0) invalid(`${path}.step`, '0보다 커야 합니다.')
			if (control.defaultValue < control.min || control.defaultValue > control.max) {
				invalid(`${path}.defaultValue`, 'min과 max 사이여야 합니다.')
			}
			if (control.display !== undefined) {
				const display = asRecord(control.display, `${path}.display`)
				assertOnlyKeys(display, ['unit', 'precision'], `${path}.display`)
				if (display.unit !== undefined && typeof display.unit !== 'string') {
					invalid(`${path}.display.unit`, '문자열이어야 합니다.')
				}
				if (
					display.precision !== undefined &&
					(typeof display.precision !== 'number' ||
						!Number.isInteger(display.precision) ||
						display.precision < 0)
				) {
					invalid(`${path}.display.precision`, '0 이상의 정수여야 합니다.')
				}
			}
			return
		case 'pad': {
			assertOnlyKeys(control, [...CONTROL_BASE_KEYS, 'aspectRatio'], path)
			assertPadPoint(control.defaultValue, `${path}.defaultValue`)
			assertPadAspectRatio(control.aspectRatio, path)
			return
		}
		case 'asset': {
			assertOnlyKeys(control, [...CONTROL_BASE_KEYS, 'source'], path)
			assertNullableString(control.defaultValue, `${path}.defaultValue`)
			if (!ASSET_SOURCES.includes(control.source as AssetSource)) {
				invalid(`${path}.source`, '지원하지 않는 값입니다.')
			}
			return
		}
		case 'pad-pair': {
			assertOnlyKeys(control, [...CONTROL_BASE_KEYS, 'aspectRatio'], path)
			const pair = asRecord(control.defaultValue, `${path}.defaultValue`)
			assertOnlyKeys(pair, ['a', 'b'], `${path}.defaultValue`)
			assertPadPoint(pair.a, `${path}.defaultValue.a`)
			assertPadPoint(pair.b, `${path}.defaultValue.b`)
			assertPadAspectRatio(control.aspectRatio, path)
			return
		}
		default:
			invalid(`${path}.kind`, '지원하지 않는 값입니다.')
	}
}

function assertPadPoint(value: unknown, path: string) {
	const point = asRecord(value, path)
	assertOnlyKeys(point, ['x', 'y'], path)
	assertNumber(point.x, `${path}.x`)
	assertNumber(point.y, `${path}.y`)
	if (point.x < -1 || point.x > 1 || point.y < -1 || point.y > 1) {
		invalid(path, 'x와 y는 -1에서 1 사이여야 합니다.')
	}
}

function assertPadAspectRatio(value: unknown, path: string) {
	if (value === undefined) return
	assertNumber(value, `${path}.aspectRatio`)
	if (value <= 0) invalid(`${path}.aspectRatio`, '0보다 커야 합니다.')
}

function validatePreviewImage(value: unknown) {
	const image = asRecord(value, 'previewImage')
	assertOnlyKeys(image, ['url', 'alt'], 'previewImage')
	assertNonEmptyString(image.url, 'previewImage.url')
	// alt는 빈 문자열을 허용한다 — 장식 이미지의 유효한 대체 텍스트이고, 이 값 때문에 Config 파싱이
	// 죽으면 스튜디오 전체가 열리지 않는다.
	if (typeof image.alt !== 'string') invalid('previewImage.alt', '문자열이어야 합니다.')
}

/**
 * Payload upload 문서를 표시 계약으로 좁힌다 — 미리보기가 없거나 파일이 아직 없으면 undefined다.
 * 카드가 쓰는 크기는 320×240 thumbnail이므로 있으면 그것을 쓰고, 없으면 원본으로 떨어진다.
 */
export function toStudioPreviewImage(value: unknown): StudioPreviewImage | undefined {
	if (!value || typeof value !== 'object') return undefined
	const document = value as {
		url?: unknown
		alt?: unknown
		sizes?: { thumbnail?: { url?: unknown } }
	}
	const url = document.sizes?.thumbnail?.url ?? document.url
	if (typeof url !== 'string' || url.length === 0) return undefined
	return { url, alt: typeof document.alt === 'string' ? document.alt : '' }
}

function validateControllerPresentation(value: unknown, groupIds: ReadonlySet<string>) {
	const presentation = asRecord(value, 'controllerPresentation')
	assertOnlyKeys(presentation, ['groups'], 'controllerPresentation')
	if (!Array.isArray(presentation.groups)) {
		invalid('controllerPresentation.groups', '배열이어야 합니다.')
	}
	const seen = new Set<string>()
	for (const [index, value] of presentation.groups.entries()) {
		const path = `controllerPresentation.groups[${index}]`
		const group = asRecord(value, path)
		assertOnlyKeys(group, ['groupId', 'collapsible', 'defaultOpen'], path)
		assertNonEmptyString(group.groupId, `${path}.groupId`)
		if (!groupIds.has(group.groupId))
			invalid(`${path}.groupId`, 'Controller 그룹을 찾을 수 없습니다.')
		if (seen.has(group.groupId)) invalid(`${path}.groupId`, '중복되었습니다.')
		seen.add(group.groupId)
		if (typeof group.collapsible !== 'boolean')
			invalid(`${path}.collapsible`, 'boolean이어야 합니다.')
		if (typeof group.defaultOpen !== 'boolean')
			invalid(`${path}.defaultOpen`, 'boolean이어야 합니다.')
		if (!group.collapsible && !group.defaultOpen) {
			invalid(path, '접을 수 없는 그룹은 닫힌 상태로 시작할 수 없습니다.')
		}
	}
	if (seen.size !== groupIds.size) {
		invalid('controllerPresentation.groups', '모든 Controller 그룹의 표현 정책이 필요합니다.')
	}
}

function projectControllerRestriction(value: unknown): ControllerControlRestriction {
	const control = asRecord(value, 'controller restriction control')
	assertOnlyKeys(
		control,
		[
			'controlId',
			'availability',
			'defaultValue',
			'maxLength',
			'optionValues',
			'colorValues',
			'min',
			'max',
		],
		'controller restriction control',
	)
	assertNonEmptyString(control.controlId, 'controller restriction control.controlId')
	const availability = normalizeRestrictionAvailability(control.availability)
	if (control.availability !== undefined && availability === undefined) {
		invalid('controller restriction control.availability', 'readonly 또는 disabled여야 합니다.')
	}
	if (
		control.maxLength !== undefined &&
		(typeof control.maxLength !== 'number' ||
			!Number.isInteger(control.maxLength) ||
			control.maxLength <= 0)
	) {
		invalid('controller restriction control.maxLength', '0보다 큰 정수여야 합니다.')
	}
	if (control.optionValues !== undefined) {
		if (!Array.isArray(control.optionValues) || control.optionValues.length === 0) {
			invalid('controller restriction control.optionValues', '하나 이상의 값이 필요합니다.')
		}
		const values = new Set<string>()
		for (const [index, option] of control.optionValues.entries()) {
			assertNonEmptyString(option, `controller restriction control.optionValues[${index}]`)
			if (values.has(option)) {
				invalid(`controller restriction control.optionValues[${index}]`, '중복되었습니다.')
			}
			values.add(option)
		}
	}
	if (control.colorValues !== undefined) {
		assertColorValues(control.colorValues, 'controller restriction control.colorValues')
	}
	if (control.min !== undefined) assertNumber(control.min, 'controller restriction control.min')
	if (control.max !== undefined) assertNumber(control.max, 'controller restriction control.max')
	if (control.defaultValue !== undefined) {
		assertJsonValue(control.defaultValue, 'controller restriction control.defaultValue')
	}
	return {
		controlId: control.controlId,
		...definedProperty('availability', availability),
		...definedProperty(
			'defaultValue',
			control.defaultValue as ControllerControlValue | undefined,
		),
		...definedProperty('maxLength', control.maxLength as number | undefined),
		...definedProperty('optionValues', control.optionValues as string[] | undefined),
		...definedProperty('colorValues', control.colorValues as string[] | undefined),
		...definedProperty('min', control.min as number | undefined),
		...definedProperty('max', control.max as number | undefined),
	}
}

function normalizeRestrictionAvailability(
	value: ControllerAvailability | null | unknown,
): Exclude<ControllerAvailability, 'enabled'> | undefined {
	return value === 'readonly' || value === 'disabled' ? value : undefined
}

function applyControlRestriction(
	base: ControllerControlDefinition,
	restriction: ControllerControlRestriction,
): ControllerControlDefinition {
	const availability = restriction.availability ?? base.availability
	const rank: Record<ControllerAvailability, number> = { enabled: 0, readonly: 1, disabled: 2 }
	if (rank[availability ?? 'enabled'] < rank[base.availability ?? 'enabled']) {
		throw new Error(`Controller restriction availability가 기본 계약을 확장합니다: ${base.id}`)
	}
	let next: ControllerControlDefinition
	switch (base.kind) {
		case 'text':
			if (
				restriction.optionValues ||
				restriction.colorValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(`text control에 지원하지 않는 restriction입니다: ${base.id}`)
			}
			if (
				base.maxLength !== undefined &&
				restriction.maxLength !== undefined &&
				restriction.maxLength > base.maxLength
			) {
				throw new Error(
					`Controller restriction maxLength가 기본 계약을 확장합니다: ${base.id}`,
				)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty(
					'defaultValue',
					restriction.defaultValue as string | null | undefined,
				),
				...definedProperty('maxLength', restriction.maxLength),
			}
			break
		case 'select': {
			if (
				restriction.maxLength ||
				restriction.colorValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(`select control에 지원하지 않는 restriction입니다: ${base.id}`)
			}
			const allowed = restriction.optionValues ? new Set(restriction.optionValues) : null
			if (
				allowed &&
				[...allowed].some((value) => !base.options.some((o) => o.value === value))
			) {
				throw new Error(
					`Controller restriction options가 기본 계약을 확장합니다: ${base.id}`,
				)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty(
					'defaultValue',
					restriction.defaultValue as string | null | undefined,
				),
				options: allowed
					? base.options.filter((option) => allowed.has(option.value))
					: base.options,
			}
			break
		}
		case 'range': {
			if (restriction.maxLength || restriction.optionValues || restriction.colorValues) {
				throw new Error(`range control에 지원하지 않는 restriction입니다: ${base.id}`)
			}
			const min = restriction.min ?? base.min
			const max = restriction.max ?? base.max
			if (min < base.min || max > base.max) {
				throw new Error(`Controller restriction range가 기본 계약을 확장합니다: ${base.id}`)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty('defaultValue', restriction.defaultValue as number | undefined),
				min,
				max,
			}
			break
		}
		case 'toggle':
			if (
				restriction.maxLength ||
				restriction.optionValues ||
				restriction.colorValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(
					`${base.kind} control에 지원하지 않는 restriction입니다: ${base.id}`,
				)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty('defaultValue', restriction.defaultValue as boolean | undefined),
			}
			break
		case 'color': {
			if (
				restriction.maxLength ||
				restriction.optionValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(
					`${base.kind} control에 지원하지 않는 restriction입니다: ${base.id}`,
				)
			}
			const allowed = restriction.colorValues?.map((value) => value.toLowerCase())
			const baseValues = base.values
			if (allowed && baseValues && allowed.some((value) => !baseValues.includes(value))) {
				throw new Error(
					`Controller restriction colorValues가 기본 계약을 확장합니다: ${base.id}`,
				)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty(
					'defaultValue',
					restriction.defaultValue as string | null | undefined,
				),
				...definedProperty('values', allowed ?? baseValues),
			}
			break
		}
		case 'asset':
			if (
				restriction.maxLength ||
				restriction.optionValues ||
				restriction.colorValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(`asset control에 지원하지 않는 restriction입니다: ${base.id}`)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty(
					'defaultValue',
					restriction.defaultValue as string | null | undefined,
				),
			}
			break
		case 'pad':
		case 'pad-pair':
			if (
				restriction.maxLength ||
				restriction.optionValues ||
				restriction.colorValues ||
				restriction.min !== undefined ||
				restriction.max !== undefined
			) {
				throw new Error(
					`${base.kind} control에 지원하지 않는 restriction입니다: ${base.id}`,
				)
			}
			next = {
				...base,
				...definedProperty('availability', availability),
				...definedProperty(
					'defaultValue',
					restriction.defaultValue as ControllerPadValue & ControllerPadPairValue,
				),
			}
			break
	}
	validateControl(next, `controller restriction ${base.id}`)
	return next
}

function assertJsonValue(value: unknown, path: string, ancestors = new Set<object>()) {
	if (value === null || typeof value === 'string' || typeof value === 'boolean') return
	if (typeof value === 'number') {
		assertNumber(value, path)
		return
	}
	if (typeof value !== 'object') invalid(path, 'JSON으로 직렬화할 수 없는 값입니다.')
	if (ancestors.has(value)) invalid(path, '순환 참조는 허용하지 않습니다.')
	ancestors.add(value)
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries())
			assertJsonValue(item, `${path}[${index}]`, ancestors)
	} else {
		const prototype = Object.getPrototypeOf(value)
		if (prototype !== Object.prototype && prototype !== null) {
			invalid(path, 'JSON 객체여야 합니다.')
		}
		for (const [key, item] of Object.entries(value)) {
			assertJsonValue(item, `${path}.${key}`, ancestors)
		}
	}
	ancestors.delete(value)
}

function asRecord(value: unknown, path: string): Record<string, unknown> {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		invalid(path, '객체여야 합니다.')
	}
	return value as Record<string, unknown>
}

/**
 * 기본 컨트롤 선언을 검증한다.
 *
 * 🔴 **없는 id를 통과시키면 안 된다.** 오타 하나가 「그 컨트롤이 조용히 고급으로 밀린 것」과
 *    구분되지 않고, 화면에서는 컨트롤 하나가 이유 없이 사라진 것으로만 보인다.
 */
/** 존재하는 control id만 담은 중복 없는 배열인가 — `left`·`right`·`remountOn`이 같은 규칙을 쓴다. */
function validateControlIdList(value: unknown, controlIds: ReadonlySet<string>, field: string) {
	if (!Array.isArray(value)) invalid(field, '배열이어야 합니다.')
	const seen = new Set<string>()
	for (const [index, id] of value.entries()) {
		const path = `${field}[${index}]`
		assertNonEmptyString(id, path)
		if (seen.has(id)) invalid(path, `중복되었습니다: ${id}`)
		seen.add(id)
		if (!controlIds.has(id)) invalid(path, `존재하지 않는 control id입니다: ${id}`)
	}
}

/** 단위 정사각형(0~1) 안의 도형 목록인가 — 밖으로 나가면 썸네일이 잘려 무엇인지 안 읽힌다. */
function assertPreviewShapes(value: unknown, path: string) {
	if (!Array.isArray(value) || value.length === 0) invalid(path, '하나 이상의 도형이 필요합니다.')
	for (const [index, shape] of value.entries()) {
		const shapePath = `${path}[${index}]`
		if (!Array.isArray(shape) || (shape.length !== 4 && shape.length !== 3))
			invalid(shapePath, '선분 [x1, y1, x2, y2] 또는 원 [cx, cy, r]이어야 합니다.')
		for (const coordinate of shape) {
			if (typeof coordinate !== 'number' || !Number.isFinite(coordinate))
				invalid(shapePath, '좌표는 유한한 숫자여야 합니다.')
			if (coordinate < 0 || coordinate > 1) invalid(shapePath, '좌표는 0~1이어야 합니다.')
		}
		// 반지름 0은 아무것도 그리지 않는다 — 조용히 사라지는 대신 정의를 거부한다.
		if (shape.length === 3 && shape[2] <= 0)
			invalid(shapePath, '원의 반지름은 0보다 커야 합니다.')
	}
}

function assertOnlyKeys(value: Record<string, unknown>, allowed: readonly string[], path: string) {
	const allowedKeys = new Set(allowed)
	for (const key of Object.keys(value)) {
		if (!allowedKeys.has(key)) invalid(`${path}.${key}`, '지원하지 않는 필드입니다.')
	}
}

function assertNonEmptyString(value: unknown, path: string): asserts value is string {
	if (typeof value !== 'string' || value.length === 0)
		invalid(path, '비어 있지 않은 문자열이어야 합니다.')
}

function assertNullableString(value: unknown, path: string): asserts value is string | null {
	if (value !== null && typeof value !== 'string') invalid(path, '문자열 또는 null이어야 합니다.')
}

/** 허용 색 목록을 검증하고 비교용 소문자 집합으로 돌려준다 — hex 대소문자는 같은 색이다. */
function assertColorValues(value: unknown, path: string): ReadonlySet<string> {
	if (!Array.isArray(value) || value.length === 0) {
		invalid(path, '하나 이상의 색이 필요합니다.')
	}
	const values = new Set<string>()
	for (const [index, item] of value.entries()) {
		assertNonEmptyString(item, `${path}[${index}]`)
		if (!COLOR_PATTERN.test(item)) invalid(`${path}[${index}]`, '#rrggbb 형식이어야 합니다.')
		const normalized = item.toLowerCase()
		if (values.has(normalized)) invalid(`${path}[${index}]`, '중복되었습니다.')
		values.add(normalized)
	}
	return values
}

function assertNumber(value: unknown, path: string): asserts value is number {
	if (typeof value !== 'number' || !Number.isFinite(value))
		invalid(path, '유한한 숫자여야 합니다.')
}

function invalid(path: string, message: string): never {
	throw new Error(`StudioControllerConfig ${path}: ${message}`)
}

function definedProperty<Key extends string, Value>(key: Key, value: Value | undefined) {
	return value === undefined ? {} : ({ [key]: value } as Record<Key, Value>)
}
