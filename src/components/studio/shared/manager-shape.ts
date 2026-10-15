/** Manager mode 패널 테두리의 모양 계산 — 화면 좌표(y 아래로 증가), 다각형은 시계 방향. */

export type Rect = { left: number; top: number; width: number; height: number }
type Point = readonly [x: number, y: number]

/**
 * 다각형을 꼭짓점마다 원호로 둥글린 SVG path. 볼록한 꼭짓점은 안으로 깎이고(면적이 줄고)
 * 오목한 꼭짓점은 밖으로 메워진다(면적이 는다). 반지름은 양쪽 변 길이의 절반을 넘지 않게 줄인다.
 * `concaveRadius`: 오목한 꼭짓점만 따로 — 옆 요소 모서리와 동심원이 되게 더 크게 줄 때(없으면 `radius`).
 */
export function roundedPolygonPath(
	points: readonly Point[],
	radius: number,
	concaveRadius = radius,
): string {
	const n = points.length
	let d = ''
	for (let i = 0; i < n; i++) {
		const [px, py] = points[i]
		const [ax, ay] = points[(i - 1 + n) % n]
		const [bx, by] = points[(i + 1) % n]
		const la = Math.hypot(ax - px, ay - py)
		const lb = Math.hypot(bx - px, by - py)
		const cross = (px - ax) * (by - py) - (py - ay) * (bx - px)
		// 길이 0인 변이나 일직선 꼭짓점은 둥글릴 것이 없다(두 패널 높이가 같을 때).
		if (la < 0.5 || lb < 0.5 || Math.abs(cross) < 0.5) {
			d += `${d ? 'L' : 'M'}${px} ${py}`
			continue
		}
		const r = Math.min(cross > 0 ? radius : concaveRadius, la / 2, lb / 2)
		const sx = px + ((ax - px) / la) * r
		const sy = py + ((ay - py) / la) * r
		const ex = px + ((bx - px) / lb) * r
		const ey = py + ((by - py) / lb) * r
		// 시계 방향 다각형에서 외적이 양수면 볼록하다 — 원호를 같은 방향(sweep 1)으로 감는다.
		const sweep = cross > 0 ? 1 : 0
		d += `${d ? 'L' : 'M'}${round(sx)} ${round(sy)}A${round(r)} ${round(r)} 0 0 ${sweep} ${round(ex)} ${round(ey)}`
	}
	return `${d}Z`
}

/**
 * 패널 테두리(frame) 하나, 또는 frame에서 캔버스 쪽으로 다리(bridge)를 건너 붙은 새 패널(extension)까지 합친 외곽 다각형.
 * 새 패널은 요소가 든 패널 밖에서 열리도록 `reach`만큼 떨어지고, 그 사이를 높이 min(새 패널, frame)인 다리가 잇는다
 * (사용자 2026-10-14). 셋 다 frame 위끝에 맞춘다 — 새 패널 높이는 내용이 정하므로 frame보다 길 수도 짧을 수도 있다.
 */
export function managerOutline(
	frame: Rect,
	extension?: { width: number; height: number; side: 'left' | 'right'; reach?: number },
): Point[] {
	const x1 = frame.left
	const x2 = frame.left + frame.width
	const y1 = frame.top
	const y2 = frame.top + frame.height
	if (!extension || extension.height <= 0) {
		return [
			[x1, y1],
			[x2, y1],
			[x2, y2],
			[x1, y2],
		]
	}
	const reach = Math.max(0, extension.reach ?? 0)
	const ey2 = y1 + extension.height
	const by2 = y1 + Math.min(extension.height, frame.height)
	if (extension.side === 'left') {
		const bx = x1 - reach
		const ex1 = bx - extension.width
		return dedupe([
			[ex1, y1],
			[x2, y1],
			[x2, y2],
			[x1, y2],
			[x1, by2],
			[bx, by2],
			[bx, ey2],
			[ex1, ey2],
		])
	}
	const bx = x2 + reach
	const ex2 = bx + extension.width
	return dedupe([
		[x1, y1],
		[ex2, y1],
		[ex2, ey2],
		[bx, ey2],
		[bx, by2],
		[x2, by2],
		[x2, y2],
		[x1, y2],
	])
}

/**
 * 겹친 꼭짓점과 일직선 위의 꼭짓점을 걷는다 — 다리가 없거나(reach 0) 높이가 같으면 꼭짓점이 포개지거나 한 줄에 선다.
 * 남겨 두면 둥글리기가 원호를 잃거나, 옆 꼭짓점의 반지름이 그 짧은 토막의 절반으로 잘린다.
 */
function dedupe(points: Point[]): Point[] {
	const kept = [...points]
	for (let i = 0; i < kept.length && kept.length > 3; ) {
		const [ax, ay] = kept[(i - 1 + kept.length) % kept.length]
		const [px, py] = kept[i]
		const [bx, by] = kept[(i + 1) % kept.length]
		const same = Math.abs(px - ax) < 0.5 && Math.abs(py - ay) < 0.5
		const straight = Math.abs((px - ax) * (by - py) - (py - ay) * (bx - px)) < 0.5
		if (same || straight) kept.splice(i, 1)
		else i++
	}
	return kept
}

/** 패널 자리(구멍) — 원본 패널이 보이고 만져지도록 테두리 안쪽을 뚫는다(evenodd라 그리는 방향은 상관없다). */
export function roundedRectPath({ left, top, width, height }: Rect, radius: number): string {
	const points: Point[] = [
		[left, top],
		[left + width, top],
		[left + width, top + height],
		[left, top + height],
	]
	return roundedPolygonPath(points, radius)
}

const round = (value: number) => Math.round(value * 10) / 10
