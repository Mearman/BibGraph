/**
 * Work label fetcher: titles and years for the works the review screens show, their seeds and their evidence paths. Kept apart from the pool loader because the engines rank on citation structure alone; labels are presentation data fetched only for what a reviewer can see.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";

import { ID_LOOKUP_BATCH_SIZE } from "./openalex-pool-fetcher";

export interface WorkLabel {
	/**
	 * The work's title, or null when OpenAlex has none, so the screen can mark the id as standing in for a missing title instead of presenting it as a title.
	 */
	readonly title: string | null;
	readonly year: number | null;
}

/**
 * The minimal works API the label fetcher needs; the cached OpenAlex client satisfies it through an adapter.
 */
export interface LabelWorksApi {
	readonly getWorks: (params: {
		filter: string;
		per_page: number;
		select: string[];
	}) => Promise<{
		results: readonly {
			readonly id: string;
			readonly display_name: string | null;
			readonly publication_year: number | null;
		}[];
	}>;
}

const LABEL_FIELDS = ["id", "display_name", "publication_year"];

export type WorkLabelFetcher = (ids: readonly string[]) => Promise<ReadonlyMap<string, WorkLabel>>;

export const createWorkLabelFetcher =
	(api: LabelWorksApi): WorkLabelFetcher =>
	async (ids) => {
		const labels = new Map<string, WorkLabel>();
		for (let start = 0; start < ids.length; start += ID_LOOKUP_BATCH_SIZE) {
			const batch = ids.slice(start, start + ID_LOOKUP_BATCH_SIZE);
			const response = await api.getWorks({
				filter: `openalex_id:${batch.join("|")}`,
				per_page: ID_LOOKUP_BATCH_SIZE,
				select: LABEL_FIELDS,
			});
			for (const work of response.results) {
				const id = normalizeOpenAlexId(work.id);
				labels.set(id, { title: work.display_name, year: work.publication_year });
			}
		}
		return labels;
	};
