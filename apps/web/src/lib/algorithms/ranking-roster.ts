/**
 * Ranking roster: every way the review screens can order candidates once exploration has found seed-to-seed paths. PARSE ranks a path by the geometric mean of its edges' mutual information, so each MI variant gives a distinct ranker (the thesis's SCALE, SKEW, SPAN, ETCH, NOTCH and adaptive variants are novel; the classic link-prediction measures are baselines); the path-ranking baselines score paths by established graph metrics instead. All implementations come from graphwise, and every entry is a uniform runner so the screening engine and the comparison treat them identically.
 */

import type { ExplorationPath } from "graphwise/exploration";
import type { MIFunction } from "graphwise/ranking";
import {
	adamicAdar,
	adaptive,
	betweenness,
	communicability,
	cosine,
	degreeSum,
	etch,
	hittingTime,
	hubPromoted,
	jaccard,
	jaccardArithmetic,
	katz,
	notch,
	overlapCoefficient,
	pagerank,
	parse,
	randomRanking,
	resistanceDistance,
	resourceAllocation,
	scale,
	shortest,
	skew,
	sorensen,
	span,
	widestPath,
} from "graphwise/ranking";

import type { RankingContext, RankingRunner, ScoredPath } from "./ranking-types";
import type { AlgorithmFamily, AlgorithmSpec } from "./registry";

const parseWith =
	(mi: (context: RankingContext) => MIFunction): RankingRunner =>
	(context, paths) =>
		parse(context.graph, paths, { mi: mi(context) }).paths.map((path) => ({
			fromSeed: path.fromSeed,
			toSeed: path.toSeed,
			nodes: path.nodes,
			score: path.salience,
		}));

type PathBaseline = (
	graph: RankingContext["graph"],
	paths: readonly ExplorationPath[],
) => { readonly paths: readonly (ExplorationPath & { readonly score: number })[] };

const baselineRunner =
	(rank: PathBaseline): RankingRunner =>
	(context, paths) =>
		rank(context.graph, paths).paths.map(
			(path): ScoredPath => ({ fromSeed: path.fromSeed, toSeed: path.toSeed, nodes: path.nodes, score: path.score }),
		);

const entry = (
	id: string,
	label: string,
	family: AlgorithmFamily,
	description: string,
	rank: RankingRunner,
): AlgorithmSpec => ({ id, label, family, stage: "ranking", description, rank });

const miEntry = (id: string, label: string, family: AlgorithmFamily, description: string, mi: MIFunction) =>
	entry(`parse-${id}`, `PARSE + ${label}`, family, description, parseWith(() => mi));

const NO_TYPES = " Needs typed nodes or edges; on an untyped citation graph it matches Jaccard.";

export const RANKING_ROSTER: readonly AlgorithmSpec[] = [
	entry(
		"parse-structural",
		"PARSE + structural MI",
		"novel",
		"Scores each path by the geometric mean of the thesis's structural MI: half the sum of bibliographic-coupling and co-citation Jaccard, with direct citation at full strength.",
		parseWith((context) => (_graph, source, target) => context.structuralMi(source, target)),
	),
	miEntry("jaccard", "Jaccard", "baseline", "Neighbourhood overlap of the two works.", jaccard),
	miEntry("adamic-adar", "Adamic-Adar", "baseline", "Shared neighbours, weighting rare ones more.", adamicAdar),
	miEntry("cosine", "cosine", "baseline", "Cosine similarity of the two neighbourhoods.", cosine),
	miEntry("sorensen", "Sorensen", "baseline", "Sorensen-Dice overlap of the two neighbourhoods.", sorensen),
	miEntry("resource-allocation", "resource allocation", "baseline", "Shared neighbours, each weighted by the inverse of its degree.", resourceAllocation),
	miEntry("overlap-coefficient", "overlap coefficient", "baseline", "Shared neighbours relative to the smaller neighbourhood.", overlapCoefficient),
	miEntry("hub-promoted", "hub promoted", "baseline", "Overlap that favours pairs involving a hub.", hubPromoted),
	miEntry("scale", "SCALE", "novel", "Jaccard scaled by the connectivity of the pair's neighbourhood.", scale),
	miEntry("skew", "SKEW", "novel", "Jaccard emphasising sparse-weighted, low-degree works.", skew),
	miEntry("span", "SPAN", "novel", "Jaccard penalising pairs inside a single tight community.", span),
	miEntry("etch", "ETCH", "novel", `Jaccard boosted for rare edge types.${NO_TYPES}`, etch),
	miEntry("notch", "NOTCH", "novel", `Jaccard boosted for rare node types.${NO_TYPES}`, notch),
	miEntry("adaptive", "adaptive", "novel", "Unified MI that adapts its weighting to the graph.", adaptive),
	entry("path-shortest", "shortest path", "baseline", "Prefers the shortest connecting paths.", baselineRunner(shortest)),
	entry("path-degree-sum", "degree sum", "baseline", "Scores a path by the summed degree of its works.", baselineRunner(degreeSum)),
	entry("path-widest", "widest path", "baseline", "Scores a path by its weakest edge.", baselineRunner(widestPath)),
	entry("path-jaccard-arithmetic", "Jaccard arithmetic mean", "baseline", "Arithmetic (not geometric) mean of edge Jaccard along the path.", baselineRunner(jaccardArithmetic)),
	entry("path-pagerank", "PageRank", "baseline", "Scores a path by the PageRank of its works.", baselineRunner(pagerank)),
	entry("path-betweenness", "betweenness", "baseline", "Scores a path by the betweenness centrality of its works.", baselineRunner(betweenness)),
	entry("path-katz", "Katz", "baseline", "Scores a path by Katz centrality, counting all walks with decay.", baselineRunner(katz)),
	entry("path-communicability", "communicability", "baseline", "Scores a path by the communicability between its endpoints.", baselineRunner(communicability)),
	entry("path-resistance-distance", "resistance distance", "baseline", "Scores a path by the effective electrical resistance between its endpoints.", baselineRunner(resistanceDistance)),
	entry("path-random", "random", "baseline", "Orders paths at random with a fixed seed, the chance reference.", baselineRunner(randomRanking)),
	entry("path-hitting-time", "hitting time", "baseline", "Scores a path by the expected random-walk hitting time between its endpoints.", baselineRunner(hittingTime)),
];
