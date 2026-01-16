/**
 * Community Detection Component
 * Provides UI for detecting and displaying graph communities
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import {
	Alert,
	Box,
 Badge,
	Group,
	List,
	NumberInput,
	Progress,
	rem,
	Select,
	Stack,
	Text,
	ThemeIcon,
	Tooltip,
} from '@mantine/core';
import { IconCircleDot, IconCircleDot as IconCircleDotFilled, IconUsers } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import type { CommunityDetectionOptions } from '@/hooks/use-graph-algorithms';
import { useCommunityDetection } from '@/hooks/use-graph-algorithms';
import type { ClusteringAlgorithm } from '@/services/graph-algorithms';

import type { CommunityResult } from '../types';

interface CommunityDetectionProps {
	nodes: GraphNode[];
	edges: GraphEdge[];
	onHighlightNodes?: (nodeIds: string[]) => void;
	onSelectCommunity?: (communityId: number, nodeIds: string[]) => void;
	onCommunitiesDetected?: (communities: CommunityResult[], communityColors: Map<number, string>) => void;
}

/**
 * Algorithm descriptions for user guidance
 */
const ALGORITHM_INFO: Record<ClusteringAlgorithm, string> = {
	louvain: 'Fast community detection using modularity optimization. Best for large graphs.',
	leiden: 'Improved Louvain algorithm with better community guarantees.',
	'label-propagation': 'Fast algorithm where nodes adopt labels from neighbors. Scalable.',
	infomap: 'Information-theoretic approach using compression.',
	spectral: 'Uses graph Laplacian eigenvectors. Good for well-separated communities.',
	hierarchical: 'Builds community hierarchy by iteratively merging similar nodes.',
};

export const CommunityDetection = ({
	nodes,
	edges,
	onHighlightNodes,
	onSelectCommunity,
	onCommunitiesDetected,
}: CommunityDetectionProps) => {
	const [communityAlgorithm, setCommunityAlgorithm] = useState<ClusteringAlgorithm>('louvain');
	const [resolution, setResolution] = useState<number>(1);
	const [numClusters, setNumClusters] = useState<number>(5);
	const [linkage, setLinkage] = useState<'single' | 'complete' | 'average'>('average');

	const communityOptions: CommunityDetectionOptions = useMemo(
		() => ({ algorithm: communityAlgorithm, resolution, numClusters, linkage }),
		[communityAlgorithm, resolution, numClusters, linkage]
	);

	const { communities, modularity, isComputing } = useCommunityDetection(
		nodes,
		edges,
		communityOptions
	);

	// Handle community selection
	const handleCommunityClick = (communityId: number, nodeIds: string[]) => {
		if (onHighlightNodes) {
			onHighlightNodes(nodeIds);
		}
		if (onSelectCommunity) {
			onSelectCommunity(communityId, nodeIds);
		}
	};

	// Sort communities by size
	const sortedCommunities = useMemo(
		() => [...communities].sort((a, b) => b.size - a.size),
		[communities]
	);

	// Community colors for visualization
	const communityColors = useMemo(() => {
		const colors = [
			'#3b82f6', // blue
			'#22c55e', // green
			'#f59e0b', // amber
			'#ef4444', // red
			'#8b5cf6', // purple
			'#ec4899', // pink
			'#14b8a6', // teal
			'#f97316', // orange
			'#06b6d4', // cyan
			'#84cc16', // lime
		];
		const colorMap = new Map<number, string>();
		communities.forEach((community, index) => {
			colorMap.set(community.id, colors[index % colors.length]);
		});
		return colorMap;
	}, [communities]);

	// Notify parent when communities are detected
	// Note: This effect is commented out in the original component during this extraction
	// React.useEffect(() => {
	//   if (onCommunitiesDetected && sortedCommunities.length > 0) {
	//     onCommunitiesDetected(sortedCommunities, communityColors);
	//   }
	// }, [sortedCommunities, communityColors, onCommunitiesDetected]);

	return (
		<Stack gap="sm">
			{/* Computing indicator */}
			{isComputing && (
				<Alert
					icon={<IconCircleDotFilled size={ICON_SIZE.MD} />}
					color="blue"
					variant="light"
					styles={{ root: { padding: 'var(--mantine-spacing-xs)' } }}
				>
					<Text size="sm">Computing community structure...</Text>
				</Alert>
			)}

			{/* Algorithm Selection */}
			<Select
				label="Algorithm"
				description={ALGORITHM_INFO[communityAlgorithm]}
				disabled={isComputing}
				data={[
					{
						group: 'Modularity-based',
						items: [
							{ value: 'louvain', label: 'Louvain' },
							{ value: 'leiden', label: 'Leiden' },
						],
					},
					{
						group: 'Propagation-based',
						items: [
							{ value: 'label-propagation', label: 'Label Propagation' },
						],
					},
					{
						group: 'Information-theoretic',
						items: [
							{ value: 'infomap', label: 'Infomap' },
						],
					},
					{
						group: 'Matrix-based',
						items: [
							{ value: 'spectral', label: 'Spectral Partitioning' },
						],
					},
					{
						group: 'Agglomerative',
						items: [
							{ value: 'hierarchical', label: 'Hierarchical Clustering' },
						],
					},
				]}
				value={communityAlgorithm}
				onChange={(value) => setCommunityAlgorithm(value as ClusteringAlgorithm)}
			/>

			{/* Resolution Parameter - for louvain, leiden */}
			{(communityAlgorithm === 'louvain' || communityAlgorithm === 'leiden') && (
				<NumberInput
					label="Resolution"
					description="Higher = more communities, Lower = fewer communities"
					disabled={isComputing}
					value={resolution}
					onChange={(value) => setResolution(typeof value === 'number' ? value : 1)}
					min={0.1}
					max={3}
					step={0.1}
					decimalScale={2}
				/>
			)}

			{/* Number of clusters - for spectral and hierarchical */}
			{(communityAlgorithm === 'spectral' || communityAlgorithm === 'hierarchical') && (
				<NumberInput
					label="Number of Clusters"
					description="Target number of communities/partitions"
					disabled={isComputing}
					value={numClusters}
					onChange={(value) => setNumClusters(typeof value === 'number' ? value : 5)}
					min={2}
					max={20}
					step={1}
				/>
			)}

			{/* Linkage method - for hierarchical */}
			{communityAlgorithm === 'hierarchical' && (
				<Select
					label="Linkage Method"
					description="How to measure distance between clusters"
					disabled={isComputing}
					data={[
						{ value: 'single', label: 'Single (minimum)' },
						{ value: 'complete', label: 'Complete (maximum)' },
						{ value: 'average', label: 'Average (UPGMA)' },
					]}
					value={linkage}
					onChange={(value) => setLinkage(value as 'single' | 'complete' | 'average')}
				/>
			)}

			{/* Modularity Score */}
			{communities.length > 0 && (
				<Group justify="space-between">
					<Text size="sm" c="dimmed">Modularity Score</Text>
					<Tooltip label="Quality metric (higher is better, 0.3-0.7 typical)">
						<Badge
							color={modularity > 0.4 ? 'green' : (modularity > 0.2 ? 'yellow' : 'red')}
							variant="light"
						>
							{modularity.toFixed(4)}
						</Badge>
					</Tooltip>
				</Group>
			)}

			{/* Loading indicator */}
			{isComputing && <Progress value={100} animated size="xs" />}

			{/* Community List */}
			{sortedCommunities.length > 0 && (
				<Box>
					<Text size="sm" fw={500} mb="xs">
						Communities (sorted by size)
					</Text>
					<List spacing="xs" size="sm">
						{sortedCommunities.slice(0, 10).map((community) => (
							<List.Item
								key={community.id}
								icon={
									<ThemeIcon
										size={ICON_SIZE.XL}
										radius="xl"
										style={{ backgroundColor: communityColors.get(community.id) }}
									>
										<IconCircleDot size={ICON_SIZE.XS} />
									</ThemeIcon>
								}
								style={{ cursor: 'pointer' }}
								onClick={() => handleCommunityClick(community.id, community.nodeIds)}
							>
								<Group justify="space-between" wrap="nowrap">
									<Text size="sm" truncate style={{ maxWidth: rem(150) }}>
										Community {community.id + 1}
									</Text>
									<Group gap="xs" wrap="nowrap">
										<Badge size="xs" variant="light">
											{community.size} nodes
										</Badge>
										<Badge size="xs" variant="outline">
											{(community.density * 100).toFixed(0)}% dense
										</Badge>
									</Group>
								</Group>
							</List.Item>
						))}
						{sortedCommunities.length > 10 && (
							<Text size="xs" c="dimmed" mt="xs">
								+{sortedCommunities.length - 10} more communities
							</Text>
						)}
					</List>
				</Box>
			)}
		</Stack>
	);
};
