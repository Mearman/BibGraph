/**
 * Core Analysis Component
 * Provides UI for k-core decomposition and core-periphery analysis
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import {
	Accordion,
	Button,
	Group,
	NumberInput,
	Stack,
	Text,
	Tooltip,
} from '@mantine/core';
import { IconChartDonut, IconFocusCentered, IconHierarchy } from '@tabler/icons-react';
import { useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useKCore, useCorePeriphery } from '@/hooks/use-graph-algorithms';
import type { KCoreResult, CorePeripheryResult } from '@/services/graph-algorithms';

interface CoreAnalysisProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	onHighlightNodes?: (nodeIds: string[]) => void;
}

export const CoreAnalysis = ({
	nodes,
	edges,
	onHighlightNodes,
}: CoreAnalysisProps) => {
	const [kCoreValue, setKCoreValue] = useState<number>(2);
	const [coreThreshold, setCoreThreshold] = useState<number>(0.7);

	const kCore = useKCore(nodes, edges, kCoreValue);
	const corePeriphery = useCorePeriphery(nodes, edges, coreThreshold);

	// Handle k-core highlight
	const handleKCoreHighlight = () => {
		if (onHighlightNodes && kCore.nodes.length > 0) {
			onHighlightNodes(kCore.nodes);
		}
	};

	return (
		<Stack gap="sm">
			{/* K-Core Decomposition */}
			<Accordion.Item value="kcore">
				<Accordion.Control icon={<IconHierarchy size={ICON_SIZE.LG} />}>
					K-Core Decomposition
					{kCore.nodes.length > 0 && (
						<Text
							component="span"
							ml="xs"
							size="sm"
							c="dimmed"
						>
							({kCore.nodes.length} nodes)
						</Text>
					)}
				</Accordion.Control>
				<Accordion.Panel>
					<Stack gap="sm">
						<NumberInput
							label="K Value"
							description="Minimum degree for nodes in the k-core"
							value={kCoreValue}
							onChange={(value) => setKCoreValue(typeof value === 'number' ? value : 2)}
							min={1}
							max={20}
							step={1}
						/>

						{kCore.nodes.length > 0 ? (
							<Stack gap="xs">
								<Group justify="space-between">
									<Text size="sm" c="dimmed">Nodes in {kCoreValue}-core</Text>
									<Text size="sm" fw={500}>{kCore.nodes.length}</Text>
								</Group>
								<Button
									variant="light"
									size="xs"
									onClick={handleKCoreHighlight}
									leftSection={<IconChartDonut size={ICON_SIZE.SM} />}
								>
									Highlight K-Core
								</Button>
							</Stack>
						) : (
							<Text size="sm" c="dimmed">
								No {kCoreValue}-core exists (try a lower k value)
							</Text>
						)}
					</Stack>
				</Accordion.Panel>
			</Accordion.Item>

			{/* Core-Periphery Decomposition */}
			<Accordion.Item value="core-periphery">
				<Accordion.Control icon={<IconFocusCentered size={ICON_SIZE.LG} />}>
					Core-Periphery
					{corePeriphery && (
						<Text
							component="span"
							ml="xs"
							size="sm"
							c="dimmed"
						>
							({corePeriphery.coreNodes.length} core / {corePeriphery.peripheryNodes.length} periphery)
						</Text>
					)}
				</Accordion.Control>
				<Accordion.Panel>
					<Stack gap="sm">
						<Text size="xs" c="dimmed">
							Identifies densely connected core nodes and sparsely connected periphery nodes
							(Borgatti-Everett model).
						</Text>
						<NumberInput
							label="Core Threshold"
							description="Coreness score above this = core member (0-1)"
							value={coreThreshold}
							onChange={(value) => setCoreThreshold(typeof value === 'number' ? value : 0.7)}
							min={0.1}
							max={0.95}
							step={0.05}
							decimalScale={2}
						/>

						{corePeriphery ? (
							<Stack gap="xs">
								<Group justify="space-between">
									<Text size="sm" c="dimmed">Core Nodes</Text>
									<Text size="sm" fw={500} c="blue">{corePeriphery.coreNodes.length}</Text>
								</Group>
								<Group justify="space-between">
									<Text size="sm" c="dimmed">Periphery Nodes</Text>
									<Text size="sm" fw={500} c="gray">{corePeriphery.peripheryNodes.length}</Text>
								</Group>
								<Group justify="space-between">
									<Text size="sm" c="dimmed">Fit Quality</Text>
									<Tooltip label="Correlation with ideal core-periphery structure (-1 to 1)">
										<Text
											size="sm"
											fw={500}
											c={corePeriphery.fitQuality > 0.5 ? 'green' : (corePeriphery.fitQuality > 0 ? 'yellow' : 'red')}
										>
											{corePeriphery.fitQuality.toFixed(3)}
										</Text>
									</Tooltip>
								</Group>
								<Group gap="xs">
									<Button
										variant="light"
										size="xs"
										color="blue"
										onClick={() => onHighlightNodes?.(corePeriphery.coreNodes)}
									>
										Highlight Core
									</Button>
									<Button
										variant="light"
										size="xs"
										color="gray"
										onClick={() => onHighlightNodes?.(corePeriphery.peripheryNodes)}
									>
										Highlight Periphery
									</Button>
								</Group>
							</Stack>
						) : (
							<Text size="sm" c="dimmed">
								Requires at least 3 nodes for core-periphery analysis.
							</Text>
						)}
					</Stack>
				</Accordion.Panel>
			</Accordion.Item>
		</Stack>
	);
};
