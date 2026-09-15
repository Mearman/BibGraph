/**
 * Core catalogue hook - state management and list/entity selection
 * Manages the fundamental state for lists and entities
 */

import type { CatalogueEntity, CatalogueList } from "@bibgraph/utils";
import { catalogueEventEmitter } from "@bibgraph/utils";
import { useCallback, useEffect, useState } from "react";

import { useStorageProvider } from "@/contexts/storage-provider-context";

import type { UseCatalogueOptions } from "./types";

/**
 * Core catalogue hook for state management
 * Handles list/entity loading and selection state
 */
export const useCatalogueCore = (options: Readonly<UseCatalogueOptions> = {}) => {
	const storageProvider = useStorageProvider();
	const [lists, setLists] = useState<CatalogueList[]>([]);
	const [entities, setEntities] = useState<CatalogueEntity[]>([]);
	const [selectedList, setSelectedList] = useState<CatalogueList | null>(null);
	const [isLoadingLists, setIsLoadingLists] = useState(true);
	const [isLoadingEntities, setIsLoadingEntities] = useState(false);

	// Load all lists on mount
	useEffect(() => {
		let isMounted = true;

		const loadLists = async () => {
			try {
				setIsLoadingLists(true);
				const allLists = await storageProvider.getAllLists();
				if (isMounted) {
					setLists(allLists);
				}
			} catch (error) {
				console.error("Failed to load lists:", error);
				if (isMounted) {
					setLists([]);
				}
			} finally {
				if (isMounted) {
					setIsLoadingLists(false);
				}
			}
		};

		void loadLists();

		// Listen for catalogue updates using subscribe API
		const unsubscribe = catalogueEventEmitter.subscribe((event) => {
			if (event.type === "list-added" || event.type === "list-updated" || event.type === "list-removed") {
				void loadLists();
			}
			if (event.type === "entity-added" || event.type === "entity-removed" || event.type === "entity-reordered") {
				void loadLists();
			}
		});

		return () => {
			isMounted = false;
			unsubscribe();
		};
	}, [storageProvider]);

	// Auto-select list if option provided
	useEffect(() => {
		if (options.listId === undefined || lists.length === 0) {
			return;
		}

		const list = lists.find(l => l.id === options.listId);
		if (list && list !== selectedList) {
			setSelectedList(list);
		}
	}, [options.listId, lists, selectedList]);

	// Load entities for selected list
	useEffect(() => {
		if (!selectedList) {
			setEntities([]);
			return undefined;
		}

		let isMounted = true;

		const loadEntities = async () => {
			try {
				setIsLoadingEntities(true);
				if (selectedList.id === undefined) {
					if (isMounted) {
						setEntities([]);
					}
					return;
				}
				const listEntities = await storageProvider.getListEntities(selectedList.id);
				if (isMounted) {
					setEntities(listEntities);
				}
			} catch (error) {
				console.error("Failed to load entities:", error);
				if (isMounted) {
					setEntities([]);
				}
			} finally {
				if (isMounted) {
					setIsLoadingEntities(false);
				}
			}
		};

		void loadEntities();

		return () => {
			isMounted = false;
		};
	}, [selectedList, storageProvider]);

	const selectList = useCallback((list: CatalogueList | null) => {
		setSelectedList(list);
	}, []);

	const refreshLists = useCallback(async () => {
		const allLists = await storageProvider.getAllLists();
		setLists(allLists);
	}, [storageProvider]);

	const refreshEntities = useCallback(async () => {
		if (!selectedList) {
			setEntities([]);
			return;
		}
		if (selectedList.id === undefined) {
			setEntities([]);
			return;
		}
		const listEntities = await storageProvider.getListEntities(selectedList.id);
		setEntities(listEntities);
	}, [selectedList, storageProvider]);

	return {
		// State
		lists,
		entities,
		selectedList,
		isLoadingLists,
		isLoadingEntities,

		// State setters for CRUD operations
		setLists,
		setEntities,
		setSelectedList,

		// Actions
		selectList,
		refreshLists,
		refreshEntities,
	};
};
