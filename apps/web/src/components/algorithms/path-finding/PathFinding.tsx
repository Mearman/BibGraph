/**
 * Path Finding Component
 * Provides UI for finding shortest paths between nodes in a graph
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { Badge, Button, Card, Group, Select, Stack, Switch, Text, ThemeIcon } from '@mantine/core';
import { IconAlertCircle, IconCircleCheck, IconRoute } from '@tabler/icons-react';
import { useState } from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { type PathResult, findShortestPath } from '@/services/graph-algorithms';

interface PathFindingProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	onHighlightPath?: (path: string[]) => void;
	/** Controlled source node (optional) */
	pathSource?: string | null;
	/** Controlled target node (optional) */
	pathTarget?: string | null;
	/** Callback when source changes */
	onPathSourceChange?: (nodeId: string | null) => void;
	/** Callback when target changes */
	onPathTargetChange?: (nodeId: string | null) => void;
}

export const PathFinding = ({
	nodes,
	edges,
	onHighlightPath,
	pathSource: controlledPathSource,
	pathTarget: controlledPathTarget,
	onPathSourceChange,
	onPathTargetChange,
}: PathFindingProps) => {
	const [internalPathSource, setInternalPathSource] = useState<string | null>(null);
	const [internalPathTarget, setInternalPathTarget] = useState<string | null>(null);
	const [pathResult, setPathResult] = useState<PathResult | null>(null);
	const [pathDirected, setPathDirected] = useState<boolean>(true);

	// Use controlled values if provided, otherwise use internal state
	const isControlled = controlledPathSource !== undefined || controlledPathTarget !== undefined;
	const pathSource = isControlled ? (controlledPathSource ?? null) : internalPathSource;
	const pathTarget = isControlled ? (controlledPathTarget ?? null) : internalPathTarget;

	const setPathSource = (value: string | null) => {
		if (onPathSourceChange) {
			onPathSourceChange(value);
		}
		if (!isControlled) {
			setInternalPathSource(value);
		}
	};

	const setPathTarget = (value: string | null) => {
		if (onPathTargetChange) {
			onPathTargetChange(value);
		}
		if (!isControlled) {
			setInternalPathTarget(value);
		}
	};

	// Create node options for select dropdowns
	const nodeOptions = nodes.map((node) => ({
		value: node.id,
		label: node.label || node.id,
	}));

	// Handle path finding
	const handleFindPath = () => {
		if (pathSource && pathTarget) {
			const result = findShortestPath(nodes, edges, pathSource, pathTarget, pathDirected);
			setPathResult(result);
			if (result.found && onHighlightPath) {
				onHighlightPath(result.path);
			}
		}
	};

	return (
		<Stack gap="sm">
			<Select
				label="Source Node"
				placeholder="Select starting node"
				data={nodeOptions}
				value={pathSource}
				onChange={setPathSource}
				searchable
				clearable
			/>
			<Select
				label="Target Node"
				placeholder="Select destination node"
				data={nodeOptions}
				value={pathTarget}
				onChange={setPathTarget}
				searchable
				clearable
			/>
			<Switch
				label="Respect edge direction"
				description={pathDirected
					? "Only traverse edges from source → target"
					: "Traverse edges in both directions"
				}
				checked={pathDirected}
				onChange={(e) => setPathDirected(e.currentTarget.checked)}
			/>
			<Button
				onClick={handleFindPath}
				disabled={!pathSource || !pathTarget}
				leftSection={<IconRoute size={ICON_SIZE.MD} />}
			>
				Find Path
			</Button>

			{pathResult && (
				<Card style={{ border: BORDER_STYLE_GRAY_3 }} p="sm" bg="gray.0">
					{pathResult.found ? (
						<Stack gap="xs">
							<Group justify="space-between">
								<Text size="sm" fw={500} c="green">
									<ThemeIcon size={ICON_SIZE.MD} variant="light" c="green">
										<IconCircleCheck size={ICON_SIZE.XS} />
									</ThemeIcon>
									{' '}Path Found
								</Text>
								<Badge variant="light">{pathResult.distance} hops</Badge>
							</Group>
							<Text size="xs" c="dimmed">
								Path: {pathResult.path.length} nodes
							</Text>
						</Stack>
					) : (
						<Text size="sm" c="red">
							<ThemeIcon size={ICON_SIZE.MD} variant="light" c="red">
								<IconAlertCircle size={ICON_SIZE.XS} />
							</ThemeIcon>
							{' '}No path exists
						</Text>
					)}
				</Card>
			)}
		</Stack>
	);
};
