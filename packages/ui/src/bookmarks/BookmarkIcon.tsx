import { Transition } from "@mantine/core";
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react";

export interface BookmarkIconProps {
	active: boolean;
	size?: number | string;
	color?: string;
	className?: string;
}

export const BookmarkIcon = ({
	active,
	size = 20,
	color,
	className,
}: BookmarkIconProps) => <div
			style={{
				position: "relative",
				display: "inline-flex",
				alignItems: "center",
				justifyContent: "center",
				width: typeof size === "number" ? `${String(size)}px` : size,
				height: typeof size === "number" ? `${String(size)}px` : size,
			}}
			className={className}
		>
			<Transition
				mounted={!active}
				transition="fade"
				duration={200}
				timingFunction="ease-in-out"
			>
				{(styles) => (
					<div style={{ ...styles, position: "absolute" }}>
						<IconBookmark size={size} color={color} />
					</div>
				)}
			</Transition>
			<Transition
				mounted={active}
				transition="fade"
				duration={200}
				timingFunction="ease-in-out"
			>
				{(styles) => (
					<div style={{ ...styles, position: "absolute" }}>
						<IconBookmarkFilled size={size} color={color} />
					</div>
				)}
			</Transition>
		</div>;
