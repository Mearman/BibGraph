/**
 * Graph Traversal Component
 * Provides UI for BFS and DFS graph traversal algorithms
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { Badge, Button, Card, Group, Select, Stack, Switch, Text, Tooltip } from '@mantine/core';
import { IconArrowsShuffle } from '@tabler/icons-react';
import { useState } from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useBFS, useDFS } from '@/hooks/use-graph-algorithms';

interface GraphTraversalProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	onHighlightNodes?: (nodeIds: string[]) => void;
	onHighlightPath?: (path: string[]) => void;
}

export const GraphTraversal = ({
	nodes,
	edges,
	onHighlightNodes,
	onHighlightPath,
}: GraphTraversalProps) => {
	const [traversalStartNode, setTraversalStartNode] = useState<string | null>(null);
	const [traversalDirected, setTraversalDirected] = useState<boolean>(true);

	const bfsResult = useBFS(nodes, edges, traversalStartNode, traversalDirected);
	const dfsResult = useDFS(nodes, edges, traversalStartNode, traversalDirected);

	// Create node options for select dropdowns
	const nodeOptions = nodes.map((node) => ({
		value: node.id,
		label: node.label || node.id,
	}));

	return (
		<Stack gap="sm">
			<Select
				label="Start Node"
				placeholder="Select starting node for traversal"
				data={nodeOptions}
				value={traversalStartNode}
				onChange={setTraversalStartNode}
				searchable
				clearable
			/>
			<Switch
				label="Directed traversal"
				description={traversalDirected
					? "Only follow edges in their direction"
					: "Traverse edges in both directions"
				}
				checked={traversalDirected}
				onChange={(e) => setTraversalDirected(e.currentTarget.checked)}
			/>

			{traversalStartNode && (
				<Stack gap="xs">
					{/* BFS Results */}
					<Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
						<Group justify="space-between" mb="xs">
							<Text size="sm" fw={500}>Breadth-First Search (BFS)</Text>
							{bfsResult && (
								<Badge size="sm" variant="light">
									{bfsResult.visitOrder.length} nodes
								</Badge>
							)}
						</Group>
						{bfsResult ? (
							<>
								<Text size="xs" c="dimmed" mb="xs">
									Visit order (level by level):
								</Text>
								<Group gap="xs" wrap="wrap">
									{bfsResult.visitOrder.slice(0, 10).map((nodeId, index) => (
										<Tooltip key={nodeId} label={nodeId}>
											<Badge
												size="xs"
												variant="outline"
												style={{ cursor: 'pointer' }}
												onClick={() => onHighlightNodes?.([nodeId])}
											>
												{index + 1}
											</Badge>
										</Tooltip>
									))}
									{bfsResult.visitOrder.length > 10 && (
										<Text size="xs" c="dimmed">+{bfsResult.visitOrder.length - 10} more</Text>
									)}
								</Group>
								<Button
									variant="light"
									size="xs"
									mt="xs"
									onClick={() => onHighlightPath?.(bfsResult.visitOrder)}
								>
									Highlight BFS Order
								</Button>
							</>
						) : (
							<Text size="xs" c="dimmed">Select a start node</Text>
						)}
					</Card>

					{/* DFS Results */}
					<Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
						<Group justify="space-between" mb="xs">
							<Text size="sm" fw={500}>Depth-First Search (DFS)</Text>
							{dfsResult && (
								<Badge size="sm" variant="light">
									{dfsResult.visitOrder.length} nodes
								</Badge>
							)}
						</Group>
						{dfsResult ? (
							<>
								<Text size="xs" c="dimmed" mb="xs">
									Visit order (depth first):
								</Text>
								<Group gap="xs" wrap="wrap">
									{dfsResult.visitOrder.slice(0, 10).map((nodeId, index) => (
										<Tooltip key={nodeId} label={nodeId}>
											<Badge
												size="xs"
												variant="outline"
												style={{ cursor: 'pointer' }}
												onClick={() => onHighlightNodes?.([nodeId])}
											>
												{index + 1}
											</Badge>
										</Tooltip>
									))}
									{dfsResult.visitOrder.length > 10 && (
										<Text size="xs" c="dimmed">+{dfsResult.visitOrder.length - 10} more</Text>
									)}
								</Group>
								<Button
									variant="light"
									size="xs"
									mt="xs"
									onClick={() => onHighlightPath?.(dfsResult.visitOrder)}
								>
									Highlight DFS Order
								</Button>
							</>
						) : (
							<Text size="xs" c="dimmed">Select a start node</Text>
						)}
					</Card>
				</Stack>
			)}
		</Stack>
	);
};
