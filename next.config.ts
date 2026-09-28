import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { withPayload } from '@payloadcms/next/withPayload'
import type { NextConfig } from 'next'
import { legacyPageRedirects } from './src/lib/routes'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
	output: 'standalone',
	// 프로덕션 빌드를 dev 서버와 나란히 돌리기 위한 출구. 기본값은 `.next` 그대로라
	// 배포에는 영향이 없고, `pnpm preview`만 다른 디렉터리를 쓴다.
	//
	// 🔴 왜 필요한가: `next dev`는 프리렌더·라우트 캐시를 끈다(그게 dev의 목적이다). 그래서
	//    캐시·무효화 관련 결함은 **dev에서 구조적으로 재현되지 않는다.** 확인하려면 프로덕션
	//    빌드가 필요한데, 그것이 `.next`를 덮어써 돌던 dev 서버를 죽이면 아무도 확인하지 않게 된다.
	distDir: process.env.NEXT_DIST_DIR || '.next',
	outputFileTracingIncludes: {
		'/*': ['node_modules/@img/sharp-libvips-linux-x64/**/*'],
	},
	async redirects() {
		return legacyPageRedirects.map((redirect) => ({ ...redirect }))
	},
	// 응답 보안 헤더 (docs/07 #31). CSP는 Payload admin 인라인 스크립트 영향 검증 후 별도 도입한다.
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{ key: 'X-Content-Type-Options', value: 'nosniff' },
					// Payload admin live preview가 same-origin iframe을 쓰므로 DENY가 아닌 SAMEORIGIN.
					{ key: 'X-Frame-Options', value: 'SAMEORIGIN' },
					{ key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
					// HTTPS 배포에서만 브라우저가 적용한다. 로컬 http에는 영향 없다.
					{
						key: 'Strict-Transport-Security',
						value: 'max-age=31536000; includeSubDomains',
					},
				],
			},
		]
	},
	images: {
		localPatterns: [
			{ pathname: '/brand/hd/**', search: '' },
			{ pathname: '/guideline/reference/**', search: '' },
			{ pathname: '/api/application-images/file/**', search: '' },
			{ pathname: '/api/brand-icons/file/**', search: '' },
			{ pathname: '/api/brand-logos/file/**', search: '' },
			{ pathname: '/api/brand-typefaces/file/**', search: '' },
			{ pathname: '/api/generated-images/file/**', search: '' },
			{ pathname: '/api/sample-images/file/**', search: '' },
			{ pathname: '/api/template-assets/file/**', search: '' },
			{
				pathname: '/api/media/file/**',
			},
		],
	},
	webpack: (webpackConfig) => {
		webpackConfig.resolve.extensionAlias = {
			'.cjs': ['.cts', '.cjs'],
			'.js': ['.ts', '.tsx', '.js', '.jsx'],
			'.mjs': ['.mts', '.mjs'],
		}

		return webpackConfig
	},
	turbopack: {
		root: path.resolve(dirname),
	},
}

export default withPayload(nextConfig, { devBundleServerPackages: false })
