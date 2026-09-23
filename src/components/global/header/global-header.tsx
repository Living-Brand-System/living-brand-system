'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { NavigationHeader } from '@/components/global/header/navigation-header'
import {
	Command,
	CommandDialog,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from '@/components/ui/command'
import { useLogout } from '@/features/auth/hooks/use-logout'
import { useSession } from '@/features/auth/hooks/use-session'
import type { GetGuidelineNavigationOutput } from '@/features/guideline/services/get-guideline-navigation.service'
import { routes } from '@/lib/routes'

type GuidelineSearchChapter = GetGuidelineNavigationOutput['chapters'][number]

type NavigationHeaderUpdateKey =
	| 'assets'
	| 'graph'
	| 'graphic'
	| 'guideline'
	| 'image'
	| 'mcp'
	| 'review'
	| 'template'
	| 'usage'

type NavigationHeaderUpdates = Partial<Record<NavigationHeaderUpdateKey, boolean>>

type GlobalHeaderProps = {
	guidelineChapters: GuidelineSearchChapter[]
	updates?: NavigationHeaderUpdates
}

function isCurrentPath(pathname: string, href: string) {
	return pathname === href || pathname.startsWith(`${href}/`)
}

type HeaderGuidelineSearchDialogProps = {
	chapters: GuidelineSearchChapter[]
	onOpenChange: (open: boolean) => void
	open: boolean
}

function HeaderGuidelineSearchDialog({
	chapters,
	onOpenChange,
	open,
}: HeaderGuidelineSearchDialogProps) {
	const router = useRouter()

	return (
		<CommandDialog open={open} onOpenChange={onOpenChange} title="가이드라인 검색">
			<Command>
				<CommandInput placeholder="가이드라인 페이지 검색..." />
				<CommandList>
					<CommandEmpty>검색 결과가 없습니다.</CommandEmpty>
					{chapters.map((chapter) => (
						<CommandGroup heading={chapter.title} key={chapter.id}>
							{chapter.topics.map((topic) => (
								<CommandItem
									key={topic.id}
									value={`${chapter.title} ${topic.title}`}
									onSelect={() => {
										onOpenChange(false)
										router.push(topic.href)
									}}
								>
									<span>{topic.title}</span>
								</CommandItem>
							))}
						</CommandGroup>
					))}
				</CommandList>
			</Command>
		</CommandDialog>
	)
}

export function GlobalHeader({ guidelineChapters, updates = {} }: GlobalHeaderProps) {
	const pathname = usePathname()
	const session = useSession()
	const { error: logoutError, loading: loggingOut, logout } = useLogout()
	const [compactOpen, setCompactOpen] = useState(false)
	const [searchOpen, setSearchOpen] = useState(false)

	useEffect(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key !== 'k' || (!event.metaKey && !event.ctrlKey)) return

			const target = (event.target ?? document.activeElement) as HTMLElement | null
			const tagName = target?.tagName
			if (tagName === 'INPUT' || tagName === 'TEXTAREA' || target?.isContentEditable) return

			event.preventDefault()
			setSearchOpen((current) => !current)
		}

		document.addEventListener('keydown', handleKeyDown)
		return () => document.removeEventListener('keydown', handleKeyDown)
	}, [])

	const guidelineItem = {
		current: isCurrentPath(pathname, routes.guideline),
		hasUpdate: updates.guideline,
		href: routes.guideline,
		label: 'Guideline',
	} as const
	const studioCreationItems = [
		{
			current: isCurrentPath(pathname, routes.studio.template),
			hasUpdate: updates.template,
			href: routes.studio.template,
			label: 'Template',
		},
		{
			current: isCurrentPath(pathname, routes.studio.image),
			hasUpdate: updates.image,
			href: routes.studio.image,
			label: 'Image',
		},
		{
			current: isCurrentPath(pathname, routes.studio.graphic),
			hasUpdate: updates.graphic,
			href: routes.studio.graphic,
			label: 'Graphic',
		},
		{
			current: isCurrentPath(pathname, routes.studio.graph),
			hasUpdate: updates.graph,
			href: routes.studio.graph,
			label: 'Graph',
		},
	] as const
	const studioSettingItems = [
		{
			current: isCurrentPath(pathname, routes.studio.mcp),
			hasUpdate: updates.mcp,
			href: routes.studio.mcp,
			label: 'MCP',
		},
		{
			current: isCurrentPath(pathname, routes.studio.review),
			hasUpdate: updates.review,
			href: routes.studio.review,
			label: 'Review',
		},
		{
			current: isCurrentPath(pathname, routes.studio.assets),
			hasUpdate: updates.assets,
			href: routes.studio.assets,
			label: 'Assets',
		},
		{
			current: isCurrentPath(pathname, routes.studio.usage),
			hasUpdate: updates.usage,
			href: routes.studio.usage,
			label: 'Usage',
		},
	] as const
	// 🔴 데스크톱과 컴팩트가 같은 것을 두 번 그린다 — 한 자리로 묶어 한쪽만 고쳐지는 일을 막는다.
	// 세션은 서버가 아니라 브라우저가 묻는다 — 루트 레이아웃이 세션을 읽으면 `/`와 `/guideline`의
	// 정적 렌더가 깨지기 때문이다(docs/05). 모르는 동안(`unknown`)은 아무것도 그리지 않는다.
	const loginItem = {
		current: isCurrentPath(pathname, routes.login),
		href: routes.login,
		label: 'Log in',
	} as const
	const accountItem = {
		current: isCurrentPath(pathname, routes.account),
		href: routes.account,
		label: 'Account',
	} as const
	// 🔴 헤더에는 실패를 적을 자리가 없다 — 그래서 라벨 자체가 다음 행동을 말하고, 사유는
	//    보이지 않는 사람을 위해 live 영역이 읽는다(docs/08 「실패는 원인과 다음 행동을 말한다」).
	const logoutLabel = logoutError ? 'Retry' : loggingOut ? 'Logging out…' : 'Logout'
	const closeCompact = () => setCompactOpen(false)

	return (
		<NavigationHeader.Root>
			<NavigationHeader.Desktop>
				<NavigationHeader.Start>
					{session.status === 'in' && (
						<>
							<NavigationHeader.Link {...accountItem} />
							<NavigationHeader.Action
								aria-busy={loggingOut || undefined}
								label={logoutLabel}
								onClick={logout}
							/>
						</>
					)}
					{session.status === 'out' && <NavigationHeader.Link {...loginItem} />}
					{/* 라벨은 「Retry」까지만 말한다 — 왜 실패했는지는 여기서 읽어 준다. */}
					<span className="sr-only" role="alert">
						{logoutError}
					</span>
				</NavigationHeader.Start>
				<NavigationHeader.Center aria-label="주요 메뉴">
					<NavigationHeader.SymbolLink href={routes.home} />
					<NavigationHeader.Separator />
					<NavigationHeader.Link {...guidelineItem} />
					<NavigationHeader.Separator />
					<NavigationHeader.LinkGroup
						aria-label="Studio 제작"
						items={studioCreationItems}
					/>
					<NavigationHeader.Separator />
					<NavigationHeader.LinkGroup
						aria-label="Studio 설정"
						items={studioSettingItems}
					/>
				</NavigationHeader.Center>
				<NavigationHeader.End>
					<NavigationHeader.SearchTrigger
						aria-label="가이드라인 검색"
						onClick={() => setSearchOpen((current) => !current)}
						open={searchOpen}
					/>
					<NavigationHeader.ChatTrigger />
				</NavigationHeader.End>
			</NavigationHeader.Desktop>

			<NavigationHeader.Compact>
				<NavigationHeader.CompactBar>
					<NavigationHeader.SymbolLink href={routes.home} />
					<NavigationHeader.CompactActions>
						<NavigationHeader.ChatTrigger projection="compact" />
						<NavigationHeader.SearchTrigger
							aria-label="가이드라인 검색"
							onClick={() => setSearchOpen((current) => !current)}
							open={searchOpen}
							projection="compact"
						/>
						<NavigationHeader.MenuTrigger
							aria-controls="navigation-header-compact-menu"
							aria-expanded={compactOpen}
							onClick={() => setCompactOpen((current) => !current)}
						/>
					</NavigationHeader.CompactActions>
				</NavigationHeader.CompactBar>
				{compactOpen && (
					<NavigationHeader.CompactBody id="navigation-header-compact-menu">
						<NavigationHeader.CompactContent aria-label="주요 메뉴">
							<NavigationHeader.CompactLinkGroup>
								<NavigationHeader.Link
									{...guidelineItem}
									onClick={closeCompact}
									surface="compact"
								/>
							</NavigationHeader.CompactLinkGroup>
							<NavigationHeader.CompactSeparator />
							<NavigationHeader.CompactLinkGroup>
								{studioCreationItems.map((item) => (
									<NavigationHeader.Link
										key={item.href}
										{...item}
										onClick={closeCompact}
										surface="compact"
									/>
								))}
							</NavigationHeader.CompactLinkGroup>
							<NavigationHeader.CompactSeparator />
							<NavigationHeader.CompactLinkGroup>
								{studioSettingItems.map((item) => (
									<NavigationHeader.Link
										key={item.href}
										{...item}
										onClick={closeCompact}
										surface="compact"
									/>
								))}
							</NavigationHeader.CompactLinkGroup>
							<NavigationHeader.CompactLinkGroup className="pt-6">
								{session.status === 'in' && (
									<>
										<NavigationHeader.Link
											{...accountItem}
											className="justify-center bg-muted"
											onClick={closeCompact}
											surface="compact"
										/>
										<NavigationHeader.Action
											aria-busy={loggingOut || undefined}
											className="justify-center bg-muted"
											label={logoutLabel}
											onClick={logout}
											surface="compact"
										/>
									</>
								)}
								{session.status === 'out' && (
									<NavigationHeader.Link
										{...loginItem}
										className="justify-center bg-muted"
										onClick={closeCompact}
										surface="compact"
									/>
								)}
							</NavigationHeader.CompactLinkGroup>
						</NavigationHeader.CompactContent>
					</NavigationHeader.CompactBody>
				)}
			</NavigationHeader.Compact>

			<HeaderGuidelineSearchDialog
				chapters={guidelineChapters}
				onOpenChange={setSearchOpen}
				open={searchOpen}
			/>
		</NavigationHeader.Root>
	)
}

export type { NavigationHeaderUpdates }
