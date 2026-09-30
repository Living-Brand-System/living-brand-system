import type { Metadata } from 'next'
import type React from 'react'
import { GlobalAgentChat } from '@/components/global/chat/global-agent-chat'
import { GlobalHeader } from '@/components/global/header/global-header'
import { ThemeProvider } from '@/components/global/theme-provider'
import { SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { getGuidelineMetadata } from '@/features/guideline/services/get-guideline-metadata.service'
import { getGuidelineNavigation } from '@/features/guideline/services/get-guideline-navigation.service'
import { TemplateAuthoringHandoffProvider } from '@/features/template-customization/providers/template-authoring-handoff'

import 'streamdown/styles.css'
import './styles.css'

export async function generateMetadata(): Promise<Metadata> {
	const metadata = await getGuidelineMetadata()

	return {
		description: metadata.issuedLabel || metadata.companyName,
		icons: { icon: metadata.faviconHref ?? '/favicons/favicon.png' },
		title: metadata.documentTitle,
	}
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
	const guidelineNavigation = await getGuidelineNavigation()
	const { metadata } = guidelineNavigation
	const brandColorCss = `${
		metadata.primaryHex && metadata.primaryForegroundHex
			? `:root{--primary:${metadata.primaryHex};--primary-foreground:${metadata.primaryForegroundHex}}`
			: ''
	}${
		metadata.primaryDarkHex && metadata.primaryDarkForegroundHex
			? `.dark{--primary:${metadata.primaryDarkHex};--primary-foreground:${metadata.primaryDarkForegroundHex}}`
			: ''
	}`

	return (
		<html lang="ko" className="scroll-pt-[53px]" suppressHydrationWarning>
			{brandColorCss && (
				<head>
					<style>{brandColorCss}</style>
				</head>
			)}
			<body className="h-svh overflow-hidden bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider delayDuration={150}>
						{/* 🔑 챗과 스튜디오의 공통 조상 — 챗이 만든 편집안을 스튜디오로 넘기는 통로다.
						    두 트리가 형제라서 이 자리가 유일한 연결점이다(그 파일이 이유를 갖는다). */}
						<TemplateAuthoringHandoffProvider>
							<SidebarProvider
								className="h-svh"
								defaultOpen={false}
								storageKey="lbs.agentChatSidebarOpen"
								style={{ '--sidebar-width': '25rem' } as React.CSSProperties}
							>
								{/* 앱 셸은 헤더를 본문 위에 겹치고, main·스크롤은 각 라우트가 소유한다. */}
								<div className="relative min-h-0 min-w-0 flex-1">
									<div className="absolute inset-x-0 top-0 z-50">
										<GlobalHeader
											guidelineChapters={guidelineNavigation.chapters}
										/>
									</div>
									<div className="h-full min-h-0 min-w-0 overflow-hidden">
										{children}
									</div>
								</div>
								<GlobalAgentChat />
							</SidebarProvider>
						</TemplateAuthoringHandoffProvider>
					</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
