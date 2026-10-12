/**
 * Work label fetcher: titles and years for the works a screening list shows. Kept apart from the pool loader because the engines rank on citation structure alone; labels are presentation data fetched only for the rows a reviewer can see.
 */

import { normalizeOpenAlexId } from "@bibgraph/utils";

import { ID_LOOKUP_BATCH_SIZE } from "./openalex-pool-fetcher";

export interface WorkLabel {
	readonly title: string;
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
				labels.set(id, { title: work.display_name ?? id, year: work.publication_year });
			}
		}
		return labels;
	};
