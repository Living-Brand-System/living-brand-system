export const STUDIO_ARTIFACT_KINDS = ['raster', 'vector', 'video', 'original'] as const

export type StudioArtifactKind = (typeof STUDIO_ARTIFACT_KINDS)[number]

export const STUDIO_VIDEO_FPS_VALUES = [24, 30, 60] as const

export type StudioVideoFrameRate = (typeof STUDIO_VIDEO_FPS_VALUES)[number]

export const STUDIO_VIDEO_FPS_OPTIONS: readonly { label: string; value: StudioVideoFrameRate }[] =
	STUDIO_VIDEO_FPS_VALUES.map((value) => ({ label: `${value}fps`, value }))

export type StudioArtifactCapabilities = {
	raster?: Record<string, never>
	vector?: Record<string, never>
	video?: {
		fps: readonly StudioVideoFrameRate[]
		maxWidth: number
		maxHeight: number
		maxDurationSeconds: number
	}
	original?: Record<string, never>
}

export function parseStudioArtifactCapabilities(input: unknown): StudioArtifactCapabilities {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('Studio Runtime Artifact capability가 객체가 아닙니다.')
	}
	const artifacts = input as Record<string, unknown>
	for (const kind of Object.keys(artifacts)) {
		if (!STUDIO_ARTIFACT_KINDS.includes(kind as StudioArtifactKind)) {
			throw new Error(`Studio Runtime Artifact 종류가 올바르지 않습니다: ${kind}`)
		}
	}
	for (const kind of ['raster', 'vector', 'original'] as const) {
		const capability = artifacts[kind]
		if (
			capability !== undefined &&
			(!capability ||
				typeof capability !== 'object' ||
				Array.isArray(capability) ||
				Object.keys(capability).length > 0)
		) {
			throw new Error(`Studio Runtime ${kind} capability가 올바르지 않습니다.`)
		}
	}
	if (artifacts.video !== undefined) parseVideoCapability(artifacts.video)
	return input as StudioArtifactCapabilities
}

export function getStudioArtifactKinds(
	capabilities: StudioArtifactCapabilities,
): readonly StudioArtifactKind[] {
	return STUDIO_ARTIFACT_KINDS.filter((kind) => capabilities[kind] !== undefined)
}

function parseVideoCapability(input: unknown): void {
	if (!input || typeof input !== 'object' || Array.isArray(input)) {
		throw new Error('Studio Runtime video capability가 객체가 아닙니다.')
	}
	const video = input as Record<string, unknown>
	const keys = new Set(['fps', 'maxWidth', 'maxHeight', 'maxDurationSeconds'])
	if (Object.keys(video).some((key) => !keys.has(key))) {
		throw new Error('Studio Runtime video capability에 알 수 없는 필드가 있습니다.')
	}
	if (
		!Array.isArray(video.fps) ||
		video.fps.length === 0 ||
		video.fps.some((fps) => !STUDIO_VIDEO_FPS_VALUES.includes(fps as StudioVideoFrameRate)) ||
		new Set(video.fps).size !== video.fps.length
	) {
		throw new Error('Studio Runtime video fps가 올바르지 않습니다.')
	}
	for (const key of ['maxWidth', 'maxHeight', 'maxDurationSeconds'] as const) {
		if (typeof video[key] !== 'number' || !Number.isFinite(video[key]) || video[key] <= 0) {
			throw new Error(`Studio Runtime video ${key}가 양수가 아닙니다.`)
		}
	}
}

type Artifact<Kind extends StudioArtifactKind, Source> = {
	kind: Kind
	source: Source
}

export type RasterRenderOptions = {
	width?: number
	height?: number
}

export type RasterSurface =
	| {
			kind: 'canvas'
			element: HTMLCanvasElement
			width: number
			height: number
	  }
	| {
			kind: 'element'
			element: HTMLElement
			width: number
			height: number
	  }

export type RasterArtifactSource = {
	withSurface<Result>(
		options: RasterRenderOptions,
		consume: (surface: RasterSurface) => Result | Promise<Result>,
	): Result | Promise<Result>
}

export type RasterArtifact = Artifact<'raster', RasterArtifactSource>
export type VectorArtifact<Source = unknown> = Artifact<'vector', Source>
export type VideoArtifact<Source = unknown> = Artifact<'video', Source>
export type OriginalArtifact<Source = unknown> = Artifact<'original', Source>

export type StudioArtifact = RasterArtifact | VectorArtifact | VideoArtifact | OriginalArtifact

/**
 * 🔑 디자인 툴이 개체로 푸는 최소 집합만 둔다. Figma는 CSS 클래스·`<style>`보다
 * presentation attribute를 안정적으로 읽으므로 직렬화기가 그것만 쯜다.
 * 🔴 `foreignObject`는 넣지 않는다 — 확장자만 svg이고 Figma·Illustrator에서 빈 화면으로 열린다.
 */
export type VectorPrimitive =
	| {
			kind: 'line'
			x1: number
			y1: number
			x2: number
			y2: number
			stroke: string
			strokeWidth: number
			lineCap?: 'butt' | 'round' | 'square'
			/**
			 * 점선 패턴 — `[칠, 빈]` 길이 목록. 좌표와 같은 단위다.
			 * 🔑 보조선을 데이터 선과 **층위로** 가르는 자리다. 색만 연하게 하면 흰 판에서
			 * 사라지고(오남용 ①), 같은 실선이면 데이터와 같은 층위로 읽힌다.
			 */
			dash?: readonly number[]
	  }
	| { kind: 'circle'; cx: number; cy: number; radius: number; fill: string }
	| {
			kind: 'rect'
			x: number
			y: number
			width: number
			height: number
			fill?: string
			stroke?: string
			strokeWidth?: number
			/** 교차 반지름은 SVG가 못 표현한다 — 네 모서리가 같을 때만 적는다. */
			radius?: number
			opacity?: number
	  }
	| {
			kind: 'text'
			x: number
			/** baseline y. DOM은 상단 기준이므로 변환기가 baseline을 직접 재서 넣는다. */
			y: number
			text: string
			fontFamily: string
			fontSize: number
			fontWeight?: number
			letterSpacing?: number
			fill: string
			textAnchor?: 'start' | 'middle' | 'end'
			opacity?: number
	  }
	| {
			kind: 'image'
			x: number
			y: number
			width: number
			height: number
			/** data: URI를 권장한다 — 외부 URL은 받는 쪽 네트워크에서 깨진다. */
			href: string
			/** CSS object-fit에 대응한다. 생략하면 상자를 꽉 채운다. */
			preserveAspectRatio?: string
			opacity?: number
	  }
	| {
			/**
			 * 임의 도형. 두 자리에서 쓴다 — 라인 아트를 트레이싱해 채우는 레이어와,
			 * 글자를 아웃라인으로 뺄 때다. 둘 다 `image`·`text`를 이것으로 갈아끼우는 형태라
			 * 계약을 다시 넓히지 않는다.
			 */
			kind: 'path'
			/** SVG path `d`. 좌표는 아래 `x`·`y`를 원점으로 읽는다. */
			d: string
			/**
			 * 이 path의 원점. 자유 transform 문자열 대신 평행이동만 둔다 — SVG는 `translate`,
			 * PDF는 `drawSvgPath`의 x·y로 그대로 간다. 회전·기울임은 아직 쓰는 곳이 없다.
			 */
			x?: number
			y?: number
			/**
			 * 균등 배율. viewBox를 가진 자산(로고 SVG)을 상자에 맞출 때 쓴다.
			 * 🔴 균등만 둔다 — SVG는 `scale(s)`, PDF는 `drawSvgPath`의 `scale`로 그대로 가고,
			 *    비균등이면 두 출력의 표현이 갈린다.
			 */
			scale?: number
			fill?: string
			stroke?: string
			strokeWidth?: number
			/** 겹치는 윤곽을 구멍으로 읽는다. 트레이싱 결과는 대개 evenodd다. */
			fillRule?: 'nonzero' | 'evenodd'
			opacity?: number
	  }
	| {
			kind: 'group'
			/** Figma·Illustrator가 레이어 이름으로 읽는다. */
			label?: string
			/**
			 * 이 subtree가 속한 **묶음**. 인쇄 PDF가 묶음 하나를 Form XObject 하나로 싣고
			 * Illustrator가 그것을 그룹 하나로 연다(2026-09-11 실측).
			 * 🔴 `label`과 다르다 — label은 노드 하나의 이름이고 이것은 여러 노드가 함께 드는 이름이다.
			 */
			layer?: string
			transform?: string
			opacity?: number
			/** 상자 밖을 잘라낸다. 그래픽 배경을 판 안에 가두는 데 쓴다. */
			clip?: { x: number; y: number; width: number; height: number }
			children: readonly VectorPrimitive[]
	  }

export type VectorScene = {
	width: number
	height: number
	/**
	 * 판 자신의 바닥색. 🔴 **없으면 아무것도 칠하지 않는다** — 인쇄에서 칠하지 않은 자리는 종이다.
	 *
	 * 🔴 예전에는 이 값이 없을 때 직렬화기가 흰색을 발명했다. 그러면 템플릿 판이 **판 전체 크기
	 *    흰 사각형 두 장**으로 나갔다 — 하나는 이 발명이고 하나는 루트 프레임 자신의 rect다.
	 *    실측(2026-09-10, PDF 바이트): 어떤 OCG에도 안 들어간 동일 좌표 흰 path가 2개.
	 *    Illustrator 레이어 패널에서 판이 두 장 겹쳐 열린다.
	 * 🔴 **그것이 「아트보드 2개」의 원인이라는 근거는 없다.** 아트보드는 **페이지에서만** 온다
	 *    (아트보드 ↔ 페이지 1:1). 우리 파일은 페이지 1장이고 페이지 상자도 `/MediaBox` 하나뿐이며,
	 *    나머지 네 상자는 명세상 그것으로 기본값이 잡힌다 — 그래서 `setCropBox`·`setTrimBox`를
	 *    더해도 Illustrator에서 달라지는 것이 **0**이다. 상자를 만지지 말 것.
	 * 🔑 템플릿은 이 값을 갖지 않는다 — 판의 바닥은 루트 프레임이 소유하고 걷기가 이미 집는다.
	 *    실측(2026-09-10): 발행된 12개 전부 판 사각형이 정확히 **1장**이다.
	 *    그래픽 런타임은 자기 `backgroundColor`를 여기 싣는다(그쪽은 루트 프레임이 없다).
	 */
	background?: string
	primitives: readonly VectorPrimitive[]
}

export type VectorSceneArtifact = VectorArtifact<VectorScene>

export type BlobOriginalSource = {
	load(): Promise<Blob>
	extension(blob: Blob): string
	mimeType(blob: Blob): string
}

export type CanvasVideoSource = {
	canvas: HTMLCanvasElement
	renderFrame(timeSeconds: number, width: number, height: number): void
	restore(): void
}

export type StudioArtifactProducer<Artifact extends StudioArtifact = StudioArtifact> = () =>
	| Artifact
	| Promise<Artifact>
