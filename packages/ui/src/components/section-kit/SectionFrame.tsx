import { Box, Button, Collapse,Group, Paper, Text, Title } from "@mantine/core"
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react"
import type { FC,ReactNode } from "react"
import { useState } from "react"

export interface SectionFrameProps {
	children: ReactNode
	title?: string
	subtitle?: string
	icon?: ReactNode
	actions?: ReactNode
	defaultExpanded?: boolean
	storageKey?: string
	onToggle?: (expanded: boolean) => void
	withShadow?: boolean
	withBorder?: boolean
	padding?: "xs" | "sm" | "md" | "lg" | "xl"
	className?: string
	"data-testid"?: string
}

/**
 * A framed section component that provides a structured container for content
 * with optional title, subtitle, icon, actions, and collapsible functionality.
 * @example
 * ```tsx
 * <SectionFrame
 *   title="Recent Works"
 *   subtitle="Latest publications"
 *   icon={<IconBook size={16} />}
 *   actions={<Button>Add Work</Button>}
 *   defaultExpanded={true}
 * >
 *   <EntityCollectionList entities={works} />
 * </SectionFrame>
 * ```
 */
const SUBTITLE_MARGIN_BOTTOM = 4

export const SectionFrame: FC<SectionFrameProps> = ({
	children,
	title,
	subtitle,
	icon,
	actions,
	defaultExpanded = true,
	storageKey,
	onToggle,
	withShadow = false,
	withBorder = true,
	padding = "md",
	className,
	...restProps
}) => {
	const [isExpanded, setIsExpanded] = useState<boolean>(() => {
		if (storageKey !== undefined && typeof window !== "undefined") {
			try {
				const stored = localStorage.getItem(`section-frame-${storageKey}`)
				if (stored === null) return defaultExpanded
				const parsed: unknown = JSON.parse(stored)
				return typeof parsed === "boolean" ? parsed : defaultExpanded
			} catch {
				return defaultExpanded
			}
		}

		return defaultExpanded
	})

	const toggleExpanded = () => {
		const isNewExpanded = !isExpanded
		setIsExpanded(isNewExpanded)

		// Persist to localStorage if storageKey is provided
		if (storageKey !== undefined && typeof window !== "undefined") {
			try {
				localStorage.setItem(`section-frame-${storageKey}`, JSON.stringify(isNewExpanded))
			} catch {
				// Silently fail if localStorage is not available
			}
		}

		// Call external toggle handler
		onToggle?.(isNewExpanded)
	}

	const hasTitle = title !== undefined && title !== ""
	const hasSubtitle = subtitle !== undefined && subtitle !== ""
	const hasIcon = icon !== undefined && icon !== null
	const hasActions = actions !== undefined && actions !== null
	const hasHeader = hasTitle || hasSubtitle || hasIcon || hasActions

	return (
		<Paper
			withBorder={withBorder}
			shadow={withShadow ? "sm" : undefined}
			className={className}
			{...restProps}
		>
			{hasHeader && (
				<Box p={padding}>
					<Group justify="space-between" wrap="nowrap">
						<Button
							variant="subtle"
							onClick={toggleExpanded}
							leftSection={
								<span style={{ display: "flex", alignItems: "center" }}>
									{isExpanded ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
								</span>
							}
							styles={{
								inner: { justifyContent: "flex-start" },
								label: { flex: 1 },
							}}
							fullWidth
						>
							<Group gap="xs" wrap="nowrap" style={{ width: "100%" }}>
								{hasIcon && <span style={{ display: "flex", alignItems: "center" }}>{icon}</span>}
								<Box style={{ flex: 1, minWidth: 0 }}>
									{hasTitle && (
										<Title order={4} mb={hasSubtitle ? SUBTITLE_MARGIN_BOTTOM : 0}>
											{title}
										</Title>
									)}
									{hasSubtitle && (
										<Text size="sm" c="dimmed">
											{subtitle}
										</Text>
									)}
								</Box>
							</Group>
						</Button>

						{hasActions && <Box style={{ flexShrink: 0 }}>{actions}</Box>}
					</Group>
				</Box>
			)}

			<Collapse expanded={isExpanded}>
				<Box p={hasHeader ? 0 : padding} pt={hasHeader ? padding : 0}>
					{children}
				</Box>
			</Collapse>
		</Paper>
	)
}
