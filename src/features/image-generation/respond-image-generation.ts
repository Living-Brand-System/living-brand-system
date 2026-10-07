/**
 * 이미지 생성 route들이 공유하는 오류→HTTP 응답 표와 공통 후처리.
 * 서비스 오류의 상태 코드 매핑은 이 파일 한 곳만 소유한다.
 */

// 오류 이름 → HTTP 응답 표. 번들·모의 등 모듈 인스턴스가 갈려도 동작하도록 instanceof 대신 error.name으로 매핑한다.
const IMAGE_GENERATION_ERROR_TABLE = {
	ImageGenerationLimitError: {
		status: 429,
		message: '이미지 생성 요청이 많아요. 잠시 후 다시 시도해 주세요.',
		// name 매핑이라 필드도 구조로 읽는다 — retryAfterSeconds가 없으면 창 길이(60초)로 안내한다.
		headers: (error: Error) => ({
			'Retry-After': String(
				(error as { retryAfterSeconds?: number }).retryAfterSeconds ?? 60,
			),
		}),
	},
	// 문구는 오류가 갖는다(오늘/이번 달·한도 숫자) — 표는 상태 코드만 정한다.
	TokenLimitExceededError: { status: 429, message: null },
	ImageGenerationUnavailableError: {
		status: 503,
		message: 'Image generation is unavailable.',
	},
	ImageProfileNotFoundError: { status: 404, message: 'Image profile not found.' },
	InvalidImageControllerInputError: {
		status: 400,
		message: '이미지 프로파일이 허용하지 않는 생성 옵션입니다.',
	},
	InvalidSeedImageError: { status: 400, message: 'Invalid seed image.' },
	UnsupportedImageOutputSizeError: {
		status: 400,
		message: '지원하지 않는 출력 해상도입니다.',
	},
} as const

type ImageGenerationErrorName = keyof typeof IMAGE_GENERATION_ERROR_TABLE

/** 알려진 이미지 생성 오류를 HTTP 응답으로 변환한다. 표에 없으면 null(호출자가 500 폴백). */
export function imageGenerationErrorResponse(
	error: unknown,
	messageOverrides?: Partial<Record<ImageGenerationErrorName, string>>,
): Response | null {
	if (!(error instanceof Error)) return null
	const name = error.name as ImageGenerationErrorName
	const entry = IMAGE_GENERATION_ERROR_TABLE[name]
	if (!entry) return null
	return Response.json(
		{ message: messageOverrides?.[name] ?? entry.message ?? error.message },
		{ status: entry.status, ...('headers' in entry ? { headers: entry.headers(error) } : {}) },
	)
}

interface ImageRouteLogger {
	error: (fields: object, message: string) => void
	info: (fields: object, message: string) => void
}

/** 세 생성 route의 공통 후처리: 빈 결과→502, provider·프롬프트·모델 제거, done/failed 로그, 오류 표 매핑, 그 외 500. */
export async function respondImageGeneration<
	T extends { images: string[]; provider: string; prompt: string; model: string },
>({
	run,
	logger,
	event,
	doneLog,
	failedLog,
}: {
	run: () => Promise<T>
	logger: ImageRouteLogger
	/** 로그 이벤트 접두사 — `${event}.done` / `${event}.failed`로 기록된다. */
	event: string
	doneLog: (result: T) => object
	/** 기본값은 { err: error }. 오류 본문을 남기면 안 되는 route가 재정의한다. */
	failedLog?: (error: unknown) => object
}): Promise<Response> {
	try {
		const result = await run()
		if (result.images.length === 0) {
			return Response.json({ message: 'Image generation failed.' }, { status: 502 })
		}
		// 🔴 합성 프롬프트·모델은 응답에서 뺀다 — 이미지 프로파일의 시스템 프롬프트·모델은 manager 전용
		//    필드라서, 응답에 실으면 worker가 그대로 읽는다.
		const { provider: _provider, prompt: _prompt, model: _model, ...response } = result
		logger.info(doneLog(result), `${event}.done`)
		return Response.json(response)
	} catch (error) {
		logger.error(failedLog ? failedLog(error) : { err: error }, `${event}.failed`)
		return (
			imageGenerationErrorResponse(error) ??
			Response.json({ message: 'Image generation failed.' }, { status: 500 })
		)
	}
}
