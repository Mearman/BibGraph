/**
 * useCameraPersistence - Hook for persisting 3D camera state
 *
 * Saves and restores camera position, rotation, and zoom level
 * using localStorage for cross-session persistence.
 */

import { logger } from "@bibgraph/utils";
import { useCallback, useEffect, useRef,useState } from 'react';

export interface CameraState {
  /** Camera position in 3D space */
  position: { x: number; y: number; z: number };
  /** Camera look-at target */
  lookAt: { x: number; y: number; z: number };
  /** Camera zoom/distance factor */
  zoom?: number;
}

export interface UseCameraPersistenceOptions {
  /** Storage key for this camera state */
  storageKey?: string;
  /** Debounce delay for saving (ms) */
  debounceMs?: number;
  /** Whether persistence is enabled */
  enabled?: boolean;
}

const DEFAULT_STORAGE_KEY = 'bibgraph-3d-camera-state';
const DEFAULT_DEBOUNCE_MS = 500;

const DEFAULT_CAMERA_STATE: CameraState = {
  position: { x: 0, y: 0, z: 500 },
  lookAt: { x: 0, y: 0, z: 0 },
  zoom: 1,
};

/**
 * Parse stored camera state with validation
 * @param stored
 */
const parseStoredCameraState = (stored: string | null): CameraState | null => {
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);

    // Validate structure
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.position === 'object' &&
      typeof parsed.position.x === 'number' &&
      typeof parsed.position.y === 'number' &&
      typeof parsed.position.z === 'number' &&
      typeof parsed.lookAt === 'object' &&
      typeof parsed.lookAt.x === 'number' &&
      typeof parsed.lookAt.y === 'number' &&
      typeof parsed.lookAt.z === 'number'
    ) {
      return {
        position: {
          x: parsed.position.x,
          y: parsed.position.y,
          z: parsed.position.z,
        },
        lookAt: {
          x: parsed.lookAt.x,
          y: parsed.lookAt.y,
          z: parsed.lookAt.z,
        },
        zoom: typeof parsed.zoom === 'number' ? parsed.zoom : 1,
      };
    }
  } catch {
    // Invalid JSON, return null
  }

  return null;
};

export interface UseCameraPersistenceReturn {
  /** Current camera state */
  cameraState: CameraState;
  /** Update camera state (debounced save to storage) */
  updateCameraState: (state: Partial<CameraState>) => void;
  /** Reset camera to default state */
  resetCamera: () => void;
  /** Whether the initial state has been loaded */
  isLoaded: boolean;
  /** Save current state immediately (bypass debounce) */
  saveImmediate: () => void;
}

/**
 * Hook for managing 3D camera state with localStorage persistence
 * @param options - Configuration options
 * @returns Object with camera state, update functions, and loading state
 * @example
 * ```tsx
 * function Graph3DViewer() {
 *   const { cameraState, updateCameraState, isLoaded } = useCameraPersistence();
 *
 *   useEffect(() => {
 *     if (isLoaded && graphRef.current) {
 *       graphRef.current.cameraPosition(cameraState.position);
 *     }
 *   }, [isLoaded, cameraState]);
 *
 *   const handleCameraMove = (position) => {
 *     updateCameraState({ position });
 *   };
 * }
 * ```
 */
export const useCameraPersistence = (options: UseCameraPersistenceOptions = {}): UseCameraPersistenceReturn => {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enabled = true,
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestStateRef = useRef<CameraState>(DEFAULT_CAMERA_STATE);

  // Load initial state from localStorage
  useEffect(() => {
    if (!enabled) {
      setIsLoaded(true);
      return;
    }

    try {
      const stored = localStorage.getItem(storageKey);
      const parsed = parseStoredCameraState(stored);
      if (parsed) {
        setCameraState(parsed);
        latestStateRef.current = parsed;
      }
    } catch (error) {
      logger.warn("camera", "Failed to load camera state", { error });
    }
    setIsLoaded(true);
  }, [storageKey, enabled]);

  // Save state to localStorage (debounced)
  const saveToStorage = useCallback((state: CameraState) => {
    if (!enabled) return;

    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch (error) {
      logger.warn("camera", "Failed to save camera state", { error });
    }
  }, [storageKey, enabled]);

  // Update camera state with debounced persistence
  const updateCameraState = useCallback((updates: Partial<CameraState>) => {
    const newState: CameraState = {
      ...latestStateRef.current,
      ...updates,
      position: updates.position
        ? { ...latestStateRef.current.position, ...updates.position }
        : latestStateRef.current.position,
      lookAt: updates.lookAt
        ? { ...latestStateRef.current.lookAt, ...updates.lookAt }
        : latestStateRef.current.lookAt,
    };

    setCameraState(newState);
    latestStateRef.current = newState;

    // Debounce the save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      saveToStorage(newState);
    }, debounceMs);
  }, [saveToStorage, debounceMs]);

  // Reset camera to default state
  const resetCamera = useCallback(() => {
    setCameraState(DEFAULT_CAMERA_STATE);
    latestStateRef.current = DEFAULT_CAMERA_STATE;
    saveToStorage(DEFAULT_CAMERA_STATE);
  }, [saveToStorage]);

  // Save immediately (bypass debounce)
  const saveImmediate = useCallback(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    saveToStorage(latestStateRef.current);
  }, [saveToStorage]);

  // Cleanup debounce timer and save on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Save final state on unmount
      if (enabled) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(latestStateRef.current));
        } catch {
          // Ignore errors on unmount
        }
      }
    };
  }, [storageKey, enabled]);

  return {
    cameraState,
    updateCameraState,
    resetCamera,
    isLoaded,
    saveImmediate,
  };
};
