import { z } from 'zod'

const keySchema = z.string().trim().min(1).max(80)
const valueSchema = z.string().trim().min(1).max(2_000)

export const imageProfilePromptRowsSchema = z
	.array(
		z.object({
			key: keySchema,
			value: valueSchema,
		}),
	)
	.min(1)
	.superRefine((rows, context) => addDuplicateKeyIssues(rows, context))

export const imagePromptNormalizationRowsSchema = z
	.array(
		z.object({
			key: keySchema,
			candidates: z
				.array(z.object({ value: valueSchema }))
				.min(1)
				.superRefine((candidates, context) => {
					const seen = new Set<string>()
					for (const [index, candidate] of candidates.entries()) {
						if (seen.has(candidate.value)) {
							context.addIssue({
								code: 'custom',
								message: '값 후보는 중복될 수 없습니다.',
								path: [index, 'value'],
							})
						}
						seen.add(candidate.value)
					}
				}),
		}),
	)
	.superRefine((rows, context) => addDuplicateKeyIssues(rows, context))

export const imagePromptNormalizationRequestSchema = z.object({
	profilePrompt: imageProfilePromptRowsSchema,
	userPromptNormalization: imagePromptNormalizationRowsSchema.optional().default([]),
	userPrompt: z.string().trim().min(1).max(500),
})

export type ImageProfilePromptRow = z.infer<typeof imageProfilePromptRowsSchema>[number]
export type ImagePromptNormalizationRow = z.infer<typeof imagePromptNormalizationRowsSchema>[number]
export type FlatImagePrompt = Record<string, string>

export function validateImageProfilePromptRows(value: unknown): true | string {
	const result = imageProfilePromptRowsSchema.safeParse(value)
	return result.success ? true : firstIssue(result.error, '프로파일 프롬프트를 확인하세요.')
}

export function validateImagePromptNormalizationRows(value: unknown): true | string {
	const result = imagePromptNormalizationRowsSchema.safeParse(value ?? [])
	return result.success ? true : firstIssue(result.error, '유저 인풋 정규화 값을 확인하세요.')
}

export function mergeImageProfilePrompt(
	profilePrompt: ImageProfilePromptRow[],
	normalizedInput: FlatImagePrompt,
	rawSubject?: string,
): FlatImagePrompt {
	const prompt = {
		...Object.fromEntries(profilePrompt.map(({ key, value }) => [key, value])),
		...normalizedInput,
		...(rawSubject === undefined ? {} : { subject: rawSubject.trim() }),
	}
	return Object.fromEntries(
		Object.entries(prompt).map(([key, value]) => [
			key,
			value
				.split(/\r?\n/)
				.map((line) => line.trim())
				.filter(Boolean)
				.join(', '),
		]),
	)
}

function addDuplicateKeyIssues(rows: { key: string }[], context: z.RefinementCtx): void {
	const seen = new Set<string>()
	for (const [index, row] of rows.entries()) {
		if (seen.has(row.key)) {
			context.addIssue({
				code: 'custom',
				message: '키는 테이블 안에서 중복될 수 없습니다.',
				path: [index, 'key'],
			})
		}
		seen.add(row.key)
	}
}

function firstIssue(error: z.ZodError, fallback: string): string {
	return error.issues[0]?.message ?? fallback
}
