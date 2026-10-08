import type { StudioOutputFormat, VideoExportSpec } from './export-contract'
import type { PrintPpi } from './print-policy'

/** 저장 실행 하나 — 지금 요청으로 낼 수 있는가와 실행. */
export type ExportAction = { canExport: boolean; run: () => void }

/**
 * 스튜디오 Output 카드가 읽는 공통 모양 — 세 export 훅(Graphic·Image·Template)이 같은 모양으로 낸다.
 *
 * 🔑 「이 행이 보여야 하나」는 화면이 아니라 훅(출력 정책)이 정한다. 이번 요청이 쓰지 않는 축은 `null`이다 —
 *    값은 남아 있어도 화면이 조건을 다시 추론하지 않는다(docs/10 §3.7 Output 카드).
 */
export type StudioOutputView = {
	format: {
		value: StudioOutputFormat | null
		options: readonly StudioOutputFormat[]
		set: (next: StudioOutputFormat) => void
	}
	/** 인쇄 해상도. 이번 요청이 ppi를 쓰지 않으면 `null`. */
	print: {
		ppi: PrintPpi
		options: readonly PrintPpi[]
		set: (next: PrintPpi) => void
	} | null
	/** 영상 사양. MP4가 아니거나 영상 계약이 없으면 `null`. */
	video: {
		fps: VideoExportSpec['fps']
		fpsOptions: readonly VideoExportSpec['fps'][]
		durationSeconds: number
		maxDurationSeconds: number
		setFps: (next: VideoExportSpec['fps']) => void
		setDuration: (next: number) => void
	} | null
	/** 단일 저장, 또는 결과가 여러 장인 스튜디오(Image)의 선택·전체 저장. */
	save: ExportAction | { selected: ExportAction; all: ExportAction }
	busy: boolean
	error: string | null
	/** 실패는 아니지만 알려야 할 것 — 결과물이 원본과 다른 점이나 낼 수 없는 형식. */
	notices: readonly string[]
}
