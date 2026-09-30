'use client'

import { formatImageEditTransform, isIdentityTransform } from '@/lib/template-image-transform'
import type { TemplateNodeConfig, TemplateNodeConfigMap } from '@/types/template'

/**
 * 편집 transform 문자열의 단일 소유자 — compose(커밋 반영)와 캔버스 오버레이의 라이브
 * 피드백이 같은 포맷을 써야 오버레이가 캐리어 inline transform에서 커밋된 편집 prefix를
 * 결정적으로 벗겨내 base transform을 복원할 수 있다.
 */
export { formatImageEditTransform, isIdentityTransform } from '@/lib/template-image-transform'

/** 래스터 img를 같은 속성(alt·src 제외)의 div로 치환한다 — mask·배경 재구성은 img 콘텐츠에 못 얹는다. */
function replaceImageWithDiv(doc: Document, image: HTMLImageElement): HTMLElement {
	const replaced = doc.createElement('div')
	for (const attribute of Array.from(image.attributes)) {
		if (!['alt', 'src'].includes(attribute.name)) {
			replaced.setAttribute(attribute.name, attribute.value)
		}
	}
	image.replaceWith(replaced)
	return replaced
}

/**
 * 레이어 이름을 정리한다 — **이름 정본(`data-name`)의 유일한 관문**이다.
 *
 * 🔴 Figma가 준 이름에 **보이지 않는 문자**가 섞여 온다. 실측(2026-09-10): 발행된 68개 이름 중
 *    하나가 `"Title\u2028"`(U+2028 LINE SEPARATOR)이었고, 그것이 그대로 인쇄 PDF의
 *    Illustrator 레이어 이름으로 나갔다. Admin이 눈으로 잡을 수 없는 종류의 군더더기다.
 * 🔑 여기서 한 번 지우면 스튜디오 레이어 패널 · Admin 레이어 목록 · PDF의 OCG `/Name`이 **함께**
 *    깨끗해진다 — 셋이 모두 `data-name`을 읽기 때문이다.
 * 🔑 이미 깨끗한 이름에는 아무 일도 하지 않는다(재합성 멱등).
 */
// biome-ignore lint/suspicious/noControlCharactersInRegex: 제어문자를 **찾는 것**이 목적이다 — 규칙의 전제(「보통 실수다」)가 여기서는 성립하지 않는다
const LAYER_NAME_JUNK = /data-name="[^"]*(?:[\u0000-\u001f\u007f-\u009f\u2028\u2029]|^\s|\s")/

export function normalizeLayerName(value: string): string {
	return (
		value
			// biome-ignore lint/suspicious/noControlCharactersInRegex: 제어문자를 **지우는 것**이 이 함수의 목적이다
			.replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	)
}

/** compose가 컬러 치환용으로 만든 오버레이 노드 id — 편집 UI(레이어 패널)에서 숨기는 판별 계약. */
export function isImageColorizeOverlayId(nodeId: string): boolean {
	return nodeId.endsWith('-colorize')
}

/**
 * 캐리어 탐색 계약의 단일 소유자 — 생산자(import)가 표면 자신 또는 clip 프레임의 직계 자식에
 * 마킹하므로 자신 또는 직계 자식만 본다. 마킹된 직계 자식이 2개 이상이면 null — 추측하지
 * 않는다(각 자식이 자기 주소로 배정된다).
 */
export function findImageCarrier(el: Element): HTMLElement | null {
	if (el instanceof HTMLElement && el.hasAttribute('data-image-carrier')) return el
	let found: HTMLElement | null = null
	for (const child of Array.from(el.children)) {
		if (child instanceof HTMLElement && child.hasAttribute('data-image-carrier')) {
			if (found) return null
			found = child
		}
	}
	return found
}

function readImageCarrierUrl(carrier: HTMLElement): string | null {
	if (carrier instanceof HTMLImageElement) return carrier.getAttribute('src')
	const values = [
		carrier.style.backgroundImage,
		...Array.from(carrier.children).map((child) =>
			child instanceof HTMLElement ? child.style.maskImage : '',
		),
	]
	for (const value of values) {
		const urls = Array.from(value.matchAll(/url\(["']?(.*?)["']?\)/g), (match) => match[1])
		if (urls.length) return urls.at(-1) ?? null
	}
	return null
}

/**
 * 컬러 치환: 생성 이미지(단색 라인 아트)를 luminance 마스크로 써서 캐리어를 재구성한다.
 * background 명시 시 2겹 — 바닥(캐리어)=line 색, 오버레이(자식)=background 색. 마스크의 밝은
 * 영역만 배경색이 남고 어두운 선 부분은 바닥의 line 색이 비친다(AA 경계는 luminance 비율 혼합).
 * background 생략 시(기본) 단일 레이어 반전 마스크 — 선만 line 색으로 칠하고 나머지는 완전
 * 투명이라 캔버스가 그대로 비친다. 바닥에는 아무것도 칠하지 않는다.
 * 발행 검증(metadataRef)이 style URL과 data-asset-*의 동일 요소 짝을 요구하므로 에셋 참조를
 * 마스크 URL을 가진 오버레이로 옮기고, URL을 잃은 캐리어에서는 제거한다.
 * 반환값은 박스·transform을 소유하는 요소 — img 캐리어는 div로 치환돼 캐리어가 바뀐다.
 */
function applyImageColorize(
	doc: Document,
	carrier: HTMLElement,
	colorize: NonNullable<TemplateNodeConfig['imageColorize']>,
	imageUrl: string,
): HTMLElement {
	// 래스터 폴백 img 캐리어는 vectorColor와 같은 방식으로 div 치환 — mask는 img 콘텐츠에 못 얹는다.
	const base = carrier instanceof HTMLImageElement ? replaceImageWithDiv(doc, carrier) : carrier
	if (base !== carrier) {
		// img는 background-*가 없어 아래 maskSize 읽기가 폴백('100% 100%')을 쓴다. 치환 div에 같은
		// 값(img 렌더 상당)을 명시해 두면, 2차 합성에서 배정 분기의 "없을 때만 기본값" 가드가 이
		// 값을 보존해 maskSize가 1차와 같아진다 — 명시하지 않으면 2차에 'cover'를 받아 드리프트.
		base.style.backgroundSize = '100% 100%'
		base.style.backgroundPosition = 'center'
		base.style.backgroundRepeat = 'no-repeat'
	}

	// 캐리어가 프레임을 못 덮는 영역(축소·회전, 서브픽셀 틈)에 부모 clip 프레임 자체의 fill이
	// 새어 보이므로 편집 대상 슬롯의 프레임 fill은 투명이 기본이다. backgroundImage는 shorthand
	// background: rgb(...) 선언 시 'initial'/'none'을 반환할 수 있어 url( 존재 여부로 검사한다.
	// 프레임이 템플릿 루트(캔버스, 부모가 body)면 건드리지 않는다 — 캔버스 배경이 사라지면 안 된다.
	// 전제: 캐리어가 프레임의 유일한 요소 자식이어야 한다 — 형제(캡션 등)가 있으면 캐리어가
	// 프레임을 덮는다는 전제가 깨지고, 투명화가 형제 콘텐츠의 배경(프레임 fill)을 날린다.
	// (재합성 시 colorize 오버레이는 캐리어 안에 들어가므로 프레임 자식 수는 불변 — 멱등 유지.)
	// ponytail: solid fill만 무력화 — gradient 쇼트핸드 fill은 background-color만 지워져 그대로
	// 샌다(천장). 필요 시 프레임 배경을 직접 지정해 회피.
	const frame = base.parentElement
	if (
		frame instanceof HTMLElement &&
		frame.parentElement !== doc.body &&
		frame.children.length === 1 &&
		frame.style.overflow === 'hidden' &&
		!/url\(/.test(frame.style.backgroundImage)
	) {
		frame.style.backgroundColor = 'transparent'
	}

	// 재합성 멱등성: published html을 base로 2차 compose하는 스튜디오 경로에서 이전 합성
	// 오버레이(옛 마스크·옛 에셋 참조)가 남아 있다 — 지우고 새로 만든다. nodeId에 콜론이
	// 섞여 selector 조립 대신 직계 자식(오버레이는 항상 직계) 순회로 찾는다.
	const overlayId = `${base.getAttribute('data-node-id')}-colorize`
	for (const child of Array.from(base.children)) {
		if (child.getAttribute('data-node-id') !== overlayId) continue
		for (const name of ['data-asset-collection', 'data-asset-id']) {
			const value = child.getAttribute(name)
			if (value !== null && !base.hasAttribute(name)) base.setAttribute(name, value)
		}
		child.remove()
	}

	const overlay = doc.createElement('div')
	// 검증이 모든 요소에 유일한 data-node-id를 요구한다 — 캐리어 id에서 파생한 합성 id를 준다.
	overlay.setAttribute('data-node-id', overlayId)
	// 캐리어(임포트가 절대배치·크기를 굳힘)를 기준 박스로 꽉 채운다 — inset은 허용 목록에 없다.
	overlay.style.position = 'absolute'
	overlay.style.left = '0'
	overlay.style.top = '0'
	overlay.style.width = '100%'
	overlay.style.height = '100%'
	// 프레이밍은 치환 전 렌더와 동일하게 — background-*를 mask-*로 옮긴다(img는 기본 fill 상당).
	const maskSize = base.style.backgroundSize || '100% 100%'
	const maskPosition = base.style.backgroundPosition || 'center'
	const maskRepeat = base.style.backgroundRepeat || 'no-repeat'
	if (colorize.background) {
		// 2겹: 오버레이=배경색 + luminance 마스크(밝은 영역만 배경색, 어두운 선은 바닥이 비침).
		overlay.style.backgroundColor = colorize.background
		overlay.style.maskImage = `url("${imageUrl}")`
		overlay.style.maskMode = 'luminance'
		overlay.style.maskSize = maskSize
		overlay.style.maskPosition = maskPosition
		overlay.style.maskRepeat = maskRepeat
	} else {
		// 단일 레이어 반전 마스크: 기준층(백색 gradient)에서 이미지 luminance를 빼면(subtract)
		// 어두운 선 영역만 불투명 — 선만 line 색으로 칠해지고 나머지는 완전 투명(캔버스가 비침).
		// 기준층은 4px 인셋 — 박스 가장자리 AA 픽셀에 선 색이 남는 잔선을 막는다.
		overlay.style.backgroundColor = colorize.line
		overlay.style.maskImage = `linear-gradient(#ffffff,#ffffff), url("${imageUrl}")`
		overlay.style.maskMode = 'alpha, luminance'
		overlay.style.maskComposite = 'subtract'
		overlay.style.maskSize = `calc(100% - 4px) calc(100% - 4px), ${maskSize}`
		overlay.style.maskPosition = `center, ${maskPosition}`
		overlay.style.maskRepeat = `no-repeat, ${maskRepeat}`
	}
	for (const name of ['data-asset-collection', 'data-asset-id']) {
		const value = base.getAttribute(name)
		if (value !== null) overlay.setAttribute(name, value)
		base.removeAttribute(name)
	}

	// 프레이밍(background-size/position/repeat)은 남긴다 — 재합성 시 위 배정 분기의 "없을 때만
	// 기본값" 가드가 원본 프레이밍(contain/tile 등)을 보존해 마스크가 그대로 물려받는다(멱등성).
	base.style.backgroundImage = ''
	// 배경 명시 시에만 바닥=line 색. 생략 시 바닥은 투명이어야 캔버스가 그대로 비친다.
	base.style.backgroundColor = colorize.background ? colorize.line : ''
	base.appendChild(overlay)
	return base
}

/**
 * 캔버스(템플릿 최상위 프레임) 배경 — 노드 오버라이드가 아니다. 배경의 주소는 노드가 아니라
 * 도화지 자체이고, 노드 조회는 data-node-id 정확 일치라서 노드 맵으로는 표현할 수 없다.
 */
export type TemplateCanvasBackground = {
	clear?: boolean
	color?: string
	imageUrl?: string
	/**
	 * 배경 위에 깔 디머의 불투명도(0~1) — 배경 형식과 무관하게 캔버스 전면을 덮는다.
	 * 값을 주지 않으면 디머를 건드리지 않는다: graphic 래스터 경로가 이미 디머가 들어간 HTML을
	 * 한 번 더 합성하므로, 미지정을 "지우기"로 읽으면 그 경로에서 디머가 사라진다.
	 */
	dimmer?: number
}

const CANVAS_DIMMER_ATTRIBUTE = 'data-canvas-dimmer'

/**
 * 배경 바로 위·템플릿 콘텐츠 바로 아래에 반투명 검정을 한 겹 깐다 — 밝은 배경에서 글자가 묻히는 것을 막는다.
 * 루트 프레임의 첫 자식이므로 프레임 자신의 배경(색·이미지)과 뒤에 깔린 graphic shader를 함께 덮고,
 * 뒤따르는 형제 노드(텍스트·로고)는 그 위에 그려진다.
 */
function applyCanvasDimmer(doc: Document, root: HTMLElement, opacity: number) {
	// 재합성이 멱등이어야 한다 — 이전 디머를 지우고 다시 넣는다(colorize 오버레이와 같은 규칙).
	for (const child of Array.from(root.children)) {
		if (child.hasAttribute(CANVAS_DIMMER_ATTRIBUTE)) child.remove()
	}
	// 세션 값이 그대로 흘러오는 자리다 — 범위를 벗어난 수는 CSS에서 조용히 무시되므로 여기서 자른다.
	const alpha = Math.min(1, Math.max(0, opacity))
	if (alpha === 0) return
	// 루트가 static이면 디머가 조상 기준으로 퍼진다 — 자기 프레임에 가둔다.
	if (!root.style.position) root.style.position = 'relative'
	const dimmer = doc.createElement('div')
	dimmer.setAttribute(CANVAS_DIMMER_ATTRIBUTE, '')
	dimmer.style.position = 'absolute'
	dimmer.style.left = '0'
	dimmer.style.top = '0'
	dimmer.style.width = '100%'
	dimmer.style.height = '100%'
	dimmer.style.backgroundColor = `rgba(0, 0, 0, ${alpha})`
	// 캔버스는 슬롯을 눌러 고르는 편집면이다 — 전면을 덮는 장식이 클릭을 가로채면 안 된다.
	dimmer.style.pointerEvents = 'none'
	root.insertBefore(dimmer, root.firstChild)
}

/**
 * base HTML에 nodeId별 앱 설정을 적용해 Create·Chat·Import가 렌더할 HTML을 만든다.
 * 외부 I/O는 없으며 브라우저 DOMParser만 사용한다.
 * options.canvasBackground는 노드가 아닌 캔버스(body 직계 자식인 루트 프레임)에 얹는다.
 */
export function composeTemplateHtml(
	baseHtml: string,
	nodeConfigs: TemplateNodeConfigMap,
	options?: { canvasBackground?: TemplateCanvasBackground },
): string {
	if (!baseHtml) return baseHtml
	const canvasBackground = options?.canvasBackground
	const hasCanvasBackground = Boolean(
		canvasBackground?.clear ||
			canvasBackground?.color ||
			canvasBackground?.imageUrl ||
			canvasBackground?.dimmer !== undefined,
	)
	// 🔴 이름에 군더더기가 있으면 설정이 없어도 파싱한다 — 그 군더더기는 Admin이 손대지 않은
	//    이름에 들어 있으므로, 설정 유무로 일찍 반환하면 영원히 정리되지 않는다.
	const needsNameCleanup = LAYER_NAME_JUNK.test(baseHtml)
	if (
		!hasCanvasBackground &&
		!needsNameCleanup &&
		(!nodeConfigs || Object.keys(nodeConfigs).length === 0)
	) {
		return baseHtml
	}

	const doc = new DOMParser().parseFromString(baseHtml, 'text/html')

	for (const [nodeId, config] of Object.entries(nodeConfigs ?? {})) {
		const el = Array.from(doc.querySelectorAll('[data-node-id]')).find(
			(candidate) => candidate.getAttribute('data-node-id') === nodeId,
		)
		if (!el) continue // base에 더 이상 없는 노드 설정은 무시한다.
		if (config.visible === false && el instanceof HTMLElement) el.style.display = 'none'
		// 🔴 레이어 이름은 `data-name` **한 자리**에만 쓴다 — 스튜디오 패널·Admin 목록·인쇄 PDF의
		//    Illustrator 레이어명이 모두 그것을 읽으므로, 여기서 쓰면 셋이 함께 따라온다.
		if (config.label) el.setAttribute('data-name', config.label)

		// 텍스트는 텍스트 노드(<p>)에만. background는 요소(HTMLElement)에.
		if (typeof config.text === 'string' && el.tagName.toLowerCase() === 'p') {
			el.textContent = config.text
		}
		// 텍스트 색 오버라이드 — import가 만든 inline color 위에 그대로 덮는다.
		if (
			typeof config.color === 'string' &&
			el.tagName.toLowerCase() === 'p' &&
			el instanceof HTMLElement
		) {
			el.style.color = config.color
		}
		// 이미지 배정은 캐리어 전용 — 임포트가 이미지 표면(클립 프레임의 외동 이미지 자식·자식 없는
		// 이미지 fill·래스터 폴백 img)을 전부 data-image-carrier로 마킹하며, 마킹하지 않은 노드의
		// backgroundImage는 무시된다. 프레임 배경에 직접 쓰면 위에 얹힌 자식이 이미지를 가린다.
		// 캐리어 사각형을 직접 선택해 설정한 경우 요소 자신이 캐리어다.
		const carrier =
			(config.backgroundImage || config.imageColorize) && el instanceof HTMLElement
				? findImageCarrier(el)
				: null
		if (carrier) {
			if (config.backgroundImage && carrier instanceof HTMLImageElement) {
				carrier.src = config.backgroundImage
			} else if (config.backgroundImage) {
				carrier.style.backgroundImage = `url("${config.backgroundImage}")`
				// import가 scaleMode에서 굳힌 background-size/position은 보존하고 없을 때만 기본값.
				if (!carrier.style.backgroundSize) carrier.style.backgroundSize = 'cover'
				if (!carrier.style.backgroundPosition) {
					carrier.style.backgroundPosition = 'center'
				}
				if (!carrier.style.backgroundRepeat) carrier.style.backgroundRepeat = 'no-repeat'
			}
			// 세션이 실은 assetRef가 우선이고, Admin이 저장한 generatedImageId가 그 다음이다.
			const assetRef =
				config.assetRef ??
				(config.generatedImageId
					? ({ collection: 'generated-images', id: config.generatedImageId } as const)
					: undefined)
			if (config.backgroundImage && assetRef) {
				// 발행 검증(metadataRef)이 요소의 data-asset-*와 실제 URL의 일치를 요구하므로
				// placeholder 에셋 참조를 실제로 배정된 자산 참조로 바꾼다.
				carrier.setAttribute('data-asset-collection', assetRef.collection)
				carrier.setAttribute('data-asset-id', String(assetRef.id))
			}
			// 컬러 치환은 transform보다 먼저 — img 캐리어가 div로 치환될 수 있고, transform은
			// 치환 결과(2겹 전체)의 캐리어에 붙어야 이동·회전이 컬러 결과를 통째로 움직인다.
			const imageUrl = config.backgroundImage ?? readImageCarrierUrl(carrier)
			const visual =
				config.imageColorize && imageUrl
					? applyImageColorize(doc, carrier, config.imageColorize, imageUrl)
					: carrier
			const edit = config.imageTransform
			if (edit && !isIdentityTransform(edit)) {
				// 재합성 비멱등 — transform이 있는 config는 항상 baseHtml에서 합성해야 한다
				// (이전 출력에 다시 적용하면 prefix가 누적된다).
				// 합성 규칙: 편집 transform을 import가 만든 base transform 앞에 붙인다(prepend).
				// 맨 왼쪽 CSS transform이 부모(프레임) 좌표계에서 적용되므로 pan이 프레임 안에서
				// 이미지를 옮기는 느낌이 되고, Figma 소유의 base transform(rotate 등)은 보존된다.
				// transform-origin은 기본값(center) 유지. identity(0,0,1,0)면 아무것도 쓰지 않는다.
				const editTransform = formatImageEditTransform(edit)
				const baseTransform = visual.style.transform
				visual.style.transform = baseTransform
					? `${editTransform} ${baseTransform}`
					: editTransform
			}
			// img 캐리어가 div로 치환(replaceWith)됐어도 아래 벡터 경로에 진입하지 않는다.
			// 캐리어 없는 img에 backgroundImage가 와도(UI상 불가능한 조합) 벡터 경로는
			// vectorAsset·vectorColor·vectorFit만 보므로 이미지 배정 없이 무해하다.
		} else if (
			config.vectorColor &&
			el instanceof HTMLElement &&
			!(el instanceof HTMLImageElement) &&
			el.style.maskImage
		) {
			el.style.backgroundColor = config.vectorColor
		} else if (el instanceof HTMLImageElement) {
			if (config.vectorAsset) {
				el.src = config.vectorAsset.src
				el.dataset.assetCollection = config.vectorAsset.collection
				el.dataset.assetId = String(config.vectorAsset.id)
			}
			const src = el.getAttribute('src')
			const fit = config.vectorFit ?? 'fill'

			if (config.vectorColor && src) {
				const mask = replaceImageWithDiv(doc, el)
				mask.style.backgroundColor = config.vectorColor
				mask.style.maskImage = `url("${src}")`
				mask.style.maskPosition = 'center'
				mask.style.maskRepeat = 'no-repeat'
				// mask-size는 기본값이 없어 태생적으로 명시가 필요하다 — vectorFit 미지정이면 fill 상당.
				mask.style.maskSize = fit === 'contain' ? 'contain' : '100% 100%'
			} else if (config.vectorFit) {
				// 명시된 vectorFit만 기록한다 — 무조건 기록하면 base의 object-fit을 덮어쓴다.
				el.style.objectFit = config.vectorFit
			}
		}
	}

	// 레이어 이름 정리 — Figma가 준 이름의 보이지 않는 문자를 지운다. 설정이 없는 노드까지 훑는다
	// (군더더기는 Admin이 손대지 않은 이름에 들어 있다).
	for (const element of Array.from(doc.querySelectorAll('[data-name]'))) {
		const current = element.getAttribute('data-name') ?? ''
		const cleaned = normalizeLayerName(current)
		if (cleaned && cleaned !== current) element.setAttribute('data-name', cleaned)
	}

	// 레이어 겹침 순서 — Admin이 정한 `childOrder`대로 DOM을 재배치한다.
	// 🔴 값을 다 적용한 **뒤에** 돈다. 컬러 치환(`applyImageColorize`)·마스크 치환이 요소를 다른
	//    요소로 바꿔치기하므로, 그 전에 옮기면 옮긴 것이 버려진 노드일 수 있다.
	for (const [nodeId, config] of Object.entries(nodeConfigs ?? {})) {
		if (!config.childOrder?.length) continue
		// 🔴 selector를 조립하지 않는다 — nodeId에 콜론이 섞인다(`147:16`). 위 배정 루프와 같은 방식.
		const parent = Array.from(doc.querySelectorAll('[data-node-id]')).find(
			(candidate) => candidate.getAttribute('data-node-id') === nodeId,
		)
		if (!parent) continue
		const children = Array.from(parent.children)
		const listed = config.childOrder
			.map((childId) =>
				children.find((candidate) => candidate.getAttribute('data-node-id') === childId),
			)
			.filter((child): child is Element => child !== undefined)
		if (listed.length < 2) continue

		// 🔴 **목록이 이름 댄 자식들이 지금 차지한 자리에만** 그 순서를 채운다. 목록에 없는 자식은
		//    제 자리를 지킨다 — 그래야 재import로 새로 생긴 노드가 Figma가 놓은 자리에 그대로 남고,
		//    끝으로 쓸려 가 다른 레이어에 가려지거나 위를 덮지 않는다.
		//    「초안은 Figma, 수정은 Admin」이 이 규칙이다: Admin은 자기가 이름 댄 것만 뒤바꾼다.
		const positions = children.flatMap((child, index) =>
			listed.includes(child) ? [index] : [],
		)
		const next = [...children]
		for (const [index, position] of positions.entries()) next[position] = listed[index]
		// 🔑 순서대로 다시 붙인다 — 이미 그 순서면 DOM이 바뀌지 않는다(재합성 멱등).
		for (const child of next) parent.appendChild(child)
	}

	// 캔버스 배경 — 루트 프레임(body 직계 자식)의 inline 배경을 덮는다. 값을 준 갈래만 쓰므로
	// 색만/이미지만/둘 다가 모두 성립하고, 같은 입력이면 같은 선언이 나와 재합성이 멱등이다.
	const root = doc.body.firstElementChild
	if (canvasBackground && root instanceof HTMLElement) {
		if (canvasBackground.clear) root.style.background = 'transparent'
		if (canvasBackground.color) root.style.backgroundColor = canvasBackground.color
		if (canvasBackground.imageUrl) {
			root.style.backgroundImage = `url("${canvasBackground.imageUrl}")`
			root.style.backgroundSize = 'cover'
			root.style.backgroundPosition = 'center'
			root.style.backgroundRepeat = 'no-repeat'
		}
		if (canvasBackground.dimmer !== undefined) {
			applyCanvasDimmer(doc, root, canvasBackground.dimmer)
		}
	}

	return doc.body.innerHTML
}
