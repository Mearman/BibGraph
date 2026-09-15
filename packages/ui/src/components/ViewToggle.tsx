import { Button, Group } from "@mantine/core";
import { IconCode,IconLayoutGrid, IconList } from "@tabler/icons-react";

export type ViewMode = "compact" | "detailed" | "raw";

export interface ViewToggleProps {
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	disabled?: boolean;
	size?: "xs" | "sm" | "md" | "lg";
	variant?: "outline" | "filled" | "light";
}

export const ViewToggle = ({
	viewMode,
	onViewModeChange,
	disabled = false,
	size = "sm",
	variant = "outline",
}: ViewToggleProps) => <Group gap="xs">
			<Button
				size={size}
				variant={viewMode === "compact" ? "filled" : variant}
				onClick={() => { onViewModeChange("compact"); }}
				disabled={disabled}
				leftSection={<IconList size={14} />}
			>
				Compact
			</Button>
			<Button
				size={size}
				variant={viewMode === "detailed" ? "filled" : variant}
				onClick={() => { onViewModeChange("detailed"); }}
				disabled={disabled}
				leftSection={<IconLayoutGrid size={14} />}
			>
				Detailed
			</Button>
			<Button
				size={size}
				variant={viewMode === "raw" ? "filled" : variant}
				onClick={() => { onViewModeChange("raw"); }}
				disabled={disabled}
				leftSection={<IconCode size={14} />}
			>
				Raw
			</Button>
		</Group>;