import { Ai, Catalog, Search } from '@carbon/icons-react'
import Link from 'next/link'
import { Spinner } from '@/components/ui/spinner'
import type { AgentChatMessage } from '@/features/agent-chat/agent-chat.agent'
import {
	getAgentCitations,
	getAgentGeneratedImages,
	getAgentMessageText,
	getAgentReasoningMarker,
	getAgentSkillMarker,
	getAgentTemplateAttachments,
	getAgentToolMarker,
} from '@/features/agent-chat/utils/derive-agent-message'
import { AgentChatAgentBubble, AgentChatUserBubble } from './agent-chat-bubbles'
import { AgentChatGeneratedImages } from './agent-chat-generated-images'
import { AgentChatTemplateAttachment } from './agent-chat-template-attachment'
import { AgentChatMarker } from './agent-chat-tool-marker'

type AgentChatMessageItemProps = {
	message: AgentChatMessage
	canReact?: boolean
	isActive: boolean
}

export function AgentChatMessageItem({
	message,
	canReact = false,
	isActive,
}: AgentChatMessageItemProps) {
	const messageText = getAgentMessageText(message)

	if (message.role === 'user') {
		const files = message.parts.filter((part) => part.type === 'file')

		return (
			<div
				data-slot="agent-chat-message-item"
				className="flex w-full flex-col items-end gap-2"
			>
				<AgentChatUserBubble text={messageText} files={files} />
			</div>
		)
	}

	const reasoningMarker = getAgentReasoningMarker(message, isActive)
	const skillMarker = getAgentSkillMarker(message)
	const marker = getAgentToolMarker(message)
	const citations = getAgentCitations(message)
	const templateAttachments = getAgentTemplateAttachments(message)
	const generatedImages = getAgentGeneratedImages(message)

	return (
		<div data-slot="agent-chat-message-item" className="flex w-full flex-col items-start gap-2">
			<AgentChatMarker
				marker={reasoningMarker}
				icon={reasoningMarker?.isPending ? <Spinner /> : <Ai />}
			/>
			<AgentChatMarker marker={skillMarker} icon={<Catalog />} />
			<AgentChatMarker
				marker={marker}
				icon={<Search />}
				isPending={marker?.isPending || isActive}
			/>
			{templateAttachments.map(({ attachment, key }) => (
				<AgentChatTemplateAttachment key={key} attachment={attachment} />
			))}
			{generatedImages.map(({ attachment, key }) => (
				<AgentChatGeneratedImages key={key} attachment={attachment} />
			))}
			<AgentChatAgentBubble
				agentChatMessageId={message.metadata?.agentChatMessageId}
				agentChatSessionId={message.metadata?.agentChatSessionId}
				canReact={canReact && !isActive}
				initialReaction={message.metadata?.reaction}
				text={messageText}
				isStreaming={isActive}
			/>
			{citations.length > 0 && (
				<div className="flex flex-wrap items-center gap-x-2 gap-y-1 font-body text-xs font-normal text-muted-foreground">
					<span>출처</span>
					{citations.map((citation) =>
						citation.href ? (
							<Link
								key={citation.key}
								href={citation.href}
								className="underline underline-offset-2 hover:text-foreground"
							>
								{citation.title}
							</Link>
						) : (
							<span key={citation.key}>{citation.title}</span>
						),
					)}
				</div>
			)}
		</div>
	)
}
