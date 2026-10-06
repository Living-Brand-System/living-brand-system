import { createEnv } from '@t3-oss/env-nextjs'
import { z } from 'zod'

// 배포(Vercel)에서만 필수인 값. 빠지면 `next build`가 실패해 새 배포가 올라가지 않고 이전 배포가 남는다.
// 로컬·CI 빌드에는 운영 키가 없으므로 그쪽에서는 선택으로 둔다(`VERCEL`은 Vercel이 넣는 시스템 변수).
const onVercel = process.env.VERCEL === '1'
const requiredOnVercel = <T extends z.ZodTypeAny>(schema: T) =>
	onVercel ? schema : schema.optional()

export const env = createEnv({
	server: {
		ANTHROPIC_API_KEY: z.string().min(1).optional(),
		ANTHROPIC_MODEL: z.string().min(1).optional(),
		BLOB_READ_WRITE_TOKEN: requiredOnVercel(z.string().min(1)),
		CHAT_MODEL: z.string().min(1).optional(),
		DATABASE_URL: z.string().url(),
		EMAIL_FROM_ADDRESS: z.string().email().optional(),
		EMAIL_FROM_NAME: requiredOnVercel(z.string().min(1)),
		GEMINI_API_KEY: z.string().min(1).optional(),
		NEXT_PHASE: z.string().min(1).optional(),
		NODE_ENV: z.enum(['development', 'production', 'test']).optional(),
		// 이미지 생성 정식 엔진 gpt-image-2의 키 — 없으면 OpenAI 프리셋 생성은 불가로 닫힌다.
		OPENAI_API_KEY: z.string().min(1).optional(),
		PAYLOAD_DB_PUSH: z.enum(['true', 'false']).optional(),
		PAYLOAD_RUN_MIGRATIONS_ON_STARTUP: z.enum(['true', 'false']).optional(),
		PAYLOAD_SECRET: z.string().min(1),
		RESEND_API_KEY: z.string().min(1).optional(),
		VERCEL_URL: z.string().min(1).optional(),
	},
	client: {
		NEXT_PUBLIC_SITE_URL: requiredOnVercel(z.string().url()),
	},
	runtimeEnv: {
		ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
		ANTHROPIC_MODEL: process.env.ANTHROPIC_MODEL,
		BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
		CHAT_MODEL: process.env.CHAT_MODEL,
		DATABASE_URL: process.env.DATABASE_URL,
		EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
		EMAIL_FROM_NAME: process.env.EMAIL_FROM_NAME,
		GEMINI_API_KEY: process.env.GEMINI_API_KEY,
		NEXT_PHASE: process.env.NEXT_PHASE,
		NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
		NODE_ENV: process.env.NODE_ENV,
		OPENAI_API_KEY: process.env.OPENAI_API_KEY,
		PAYLOAD_DB_PUSH: process.env.PAYLOAD_DB_PUSH,
		PAYLOAD_RUN_MIGRATIONS_ON_STARTUP: process.env.PAYLOAD_RUN_MIGRATIONS_ON_STARTUP,
		PAYLOAD_SECRET: process.env.PAYLOAD_SECRET,
		RESEND_API_KEY: process.env.RESEND_API_KEY,
		VERCEL_URL: process.env.VERCEL_URL,
	},
	isServer: typeof window === 'undefined' || process.env.VITEST === 'true',
	emptyStringAsUndefined: true,
})
