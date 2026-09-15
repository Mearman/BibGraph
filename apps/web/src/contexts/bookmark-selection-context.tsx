/**
 * Bookmark selection context for bulk operations
 */

import React, { createContext, type ReactNode, use, useCallback, useMemo, useReducer } from "react";

export interface BookmarkSelectionState {
  selectedIds: Set<string>;
  isAllSelected: boolean;
  totalCount: number;
}

export type BookmarkSelectionAction =
  | { type: "SELECT_BOOKMARK"; payload: string }
  | { type: "DESELECT_BOOKMARK"; payload: string }
  | { type: "SELECT_ALL"; payload: readonly string[] }
  | { type: "DESELECT_ALL" }
  | { type: "TOGGLE_SELECTION"; payload: string }
  | { type: "SET_TOTAL_COUNT"; payload: number };

const initialState: BookmarkSelectionState = {
  selectedIds: new Set(),
  isAllSelected: false,
  totalCount: 0,
};

const bookmarkSelectionReducer = (
  state: BookmarkSelectionState,
  action: BookmarkSelectionAction,
): BookmarkSelectionState => {
  switch (action.type) {
    case "SELECT_BOOKMARK": {
      if (state.selectedIds.has(action.payload)) {
        return state; // Already selected, no change
      }
      const newSelectedIds = new Set(state.selectedIds);
      newSelectedIds.add(action.payload);
      const isNewIsAllSelected = newSelectedIds.size === state.totalCount && state.totalCount > 0;

      // Only return new state if something actually changed
      if (state.selectedIds.size === newSelectedIds.size && state.isAllSelected === isNewIsAllSelected) {
        return state;
      }

      return {
        ...state,
        selectedIds: newSelectedIds,
        isAllSelected: isNewIsAllSelected,
      };
    }

    case "DESELECT_BOOKMARK": {
      if (!state.selectedIds.has(action.payload)) {
        return state; // Not selected, no change
      }
      const newSelectedIds = new Set(state.selectedIds);
      newSelectedIds.delete(action.payload);

      return {
        ...state,
        selectedIds: newSelectedIds,
        isAllSelected: false,
      };
    }

    case "TOGGLE_SELECTION": {
      const newSelectedIds = new Set(state.selectedIds);
      if (newSelectedIds.has(action.payload)) {
        newSelectedIds.delete(action.payload);
      } else {
        newSelectedIds.add(action.payload);
      }
      const isNewIsAllSelected = newSelectedIds.size === state.totalCount && state.totalCount > 0;

      // Only return new state if something actually changed
      if (state.selectedIds.size === newSelectedIds.size && state.isAllSelected === isNewIsAllSelected) {
        return state;
      }

      return {
        ...state,
        selectedIds: newSelectedIds,
        isAllSelected: isNewIsAllSelected,
      };
    }

    case "SELECT_ALL": {
      const newSelectedIds = new Set(action.payload);
      const isNewIsAllSelected = action.payload.length > 0;

      // Only return new state if something actually changed
      if (state.selectedIds.size === newSelectedIds.size && state.isAllSelected === isNewIsAllSelected) {
        return state;
      }

      return {
        ...state,
        selectedIds: newSelectedIds,
        isAllSelected: isNewIsAllSelected,
      };
    }

    case "DESELECT_ALL": {
      if (state.selectedIds.size === 0 && !state.isAllSelected) {
        return state; // Already empty, no change
      }

      return {
        ...state,
        selectedIds: new Set(),
        isAllSelected: false,
      };
    }

    case "SET_TOTAL_COUNT": {
      if (state.totalCount === action.payload) {
        return state; // Same count, no change
      }
      const isNewIsAllSelected = state.selectedIds.size === action.payload && action.payload > 0;

      return {
        ...state,
        totalCount: action.payload,
        isAllSelected: isNewIsAllSelected,
      };
    }

    default:
      return state;
  }
};

// Context
const BookmarkSelectionContext = createContext<{
  state: BookmarkSelectionState;
  dispatch: React.Dispatch<BookmarkSelectionAction>;
} | null>(null);

// Provider component
export const BookmarkSelectionProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(bookmarkSelectionReducer, initialState);

  const contextValue = useMemo(() => ({ state, dispatch }), [state, dispatch]);

  return (
    <BookmarkSelectionContext value={contextValue}>
      {children}
    </BookmarkSelectionContext>
  );
};

// Hook for using bookmark selection state
export const useBookmarkSelection = () => {
  const context = use(BookmarkSelectionContext);
  if (!context) {
    throw new Error(
      "useBookmarkSelection must be used within a BookmarkSelectionProvider",
    );
  }
  return context;
};

// Selector hooks for optimized re-renders
export const useSelectedBookmarks = () => {
  const { state } = useBookmarkSelection();
  return state.selectedIds;
};

export const useSelectionCount = () => {
  const { state } = useBookmarkSelection();
  return state.selectedIds.size;
};

export const useIsAllSelected = () => {
  const { state } = useBookmarkSelection();
  return state.isAllSelected;
};

// Action hooks
export const useBookmarkSelectionActions = () => {
  const { dispatch } = useBookmarkSelection();

  return {
    selectBookmark: useCallback((id: string) => { dispatch({ type: "SELECT_BOOKMARK", payload: id }); }, [dispatch]),
    deselectBookmark: useCallback((id: string) => { dispatch({ type: "DESELECT_BOOKMARK", payload: id }); }, [dispatch]),
    toggleSelection: useCallback((id: string) => { dispatch({ type: "TOGGLE_SELECTION", payload: id }); }, [dispatch]),
    selectAll: useCallback((ids: readonly string[]) => { dispatch({ type: "SELECT_ALL", payload: ids }); }, [dispatch]),
    deselectAll: useCallback(() => { dispatch({ type: "DESELECT_ALL" }); }, [dispatch]),
    setTotalCount: useCallback((count: number) => { dispatch({ type: "SET_TOTAL_COUNT", payload: count }); }, [dispatch]),
  };
};