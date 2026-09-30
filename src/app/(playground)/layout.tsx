import { notFound } from 'next/navigation'
import type { ReactNode } from 'react'
import { ThemeProvider } from '@/components/global/theme-provider'
import { TooltipProvider } from '@/components/ui/tooltip'
import '../(frontend)/styles.css'

export default function PlaygroundLayout({ children }: { children: ReactNode }) {
	if (process.env.NODE_ENV !== 'development') notFound()
	return (
		<html lang="ko" suppressHydrationWarning>
			<body className="bg-background text-foreground">
				<ThemeProvider
					attribute="class"
					defaultTheme="system"
					enableSystem
					disableTransitionOnChange
				>
					<TooltipProvider>{children}</TooltipProvider>
				</ThemeProvider>
			</body>
		</html>
	)
}
