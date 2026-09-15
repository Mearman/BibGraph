import type { OpenAlexEntity } from "@bibgraph/types";
import type { ReactNode } from "react";

/**
 * Look up an entity property by an arbitrary field name without a type assertion.
 * @param entity - The entity to read the field from
 * @param field - The field name to look up
 * @returns The field's value, or undefined if the entity has no such field
 */
const getEntityFieldValue = (entity: Readonly<OpenAlexEntity>, field: string): unknown => {
	const match = Object.entries(entity).find(([key]) => key === field);
	return match?.[1];
};

/**
 * Format an arbitrary field value for display, without relying on Object's default stringification
 * @param value - The value to format
 * @returns A human-readable string representation of the value
 */
const formatFieldValue = (value: unknown): string => {
	if (value === undefined || value === null) return "N/A";
	if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
		return String(value);
	}
	return JSON.stringify(value);
};

export interface RichEntityViewProps {
	entity: OpenAlexEntity;
	entityType: string;
	fields: string[];
	viewMode: "compact" | "detailed" | "raw";
	loading?: boolean;
	error?: string | null;
	className?: string;
	children?: ReactNode;
}

export const RichEntityView = ({
	entity,
	entityType,
	fields,
	viewMode,
	loading = false,
	error = null,
	className,
	children,
}: RichEntityViewProps) => {
	if (loading) {
		return <div className={`rich-entity-view loading ${className ?? ""}`}>Loading...</div>;
	}

	if (error !== null && error !== "") {
		return <div className={`rich-entity-view error ${className ?? ""}`}>Error: {error}</div>;
	}

	return (
		<div className={`rich-entity-view ${viewMode} ${className ?? ""}`}>
			<div className="entity-header">
				<h2>{entity.display_name || (("title" in entity ? entity.title : null) ?? "Unknown Entity")}</h2>
				<span className="entity-type">{entityType}</span>
			</div>

			<div className="entity-content">
				{viewMode === "compact" && (
					<div className="compact-view">
						{entity.display_name !== "" && <p>{entity.display_name}</p>}
						{"description" in entity && entity.description !== undefined && entity.description !== "" && <p>{entity.description}</p>}
					</div>
				)}

				{viewMode === "detailed" && (
					<div className="detailed-view">
						{fields.map(field => (
							<div key={field} className="field">
								<span className="field-label">{field}:</span>
								<span className="field-value">{formatFieldValue(getEntityFieldValue(entity, field))}</span>
							</div>
						))}
					</div>
				)}

				{viewMode === "raw" && (
					<pre className="raw-view">
						{JSON.stringify(entity, null, 2)}
					</pre>
				)}
			</div>

			{children}
		</div>
	);
};