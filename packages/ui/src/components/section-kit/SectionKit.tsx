import type { FC,ReactNode } from "react"

export interface SectionKitProps {
	children: ReactNode
	title?: string
}

export const SectionKit: FC<SectionKitProps> = ({ children, title }) => (
	<section>
		{title !== undefined && title !== "" && <h2>{title}</h2>}
		{children}
	</section>
)
