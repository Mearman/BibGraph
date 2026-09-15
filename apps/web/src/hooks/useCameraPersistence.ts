/**
 * useCameraPersistence - Hook for persisting 3D camera state
 *
 * Saves and restores camera position, rotation, and zoom level
 * using localStorage for cross-session persistence.
 */

import { logger } from "@bibgraph/utils";
import { useCallback, useEffect, useRef,useState } from 'react';

import { isPlainObject } from './extractors/unknown-helpers';

export interface CameraState {
  /**
  Camera position in 3D space
   */
  position: { x: number; y: number; z: number };
  /**
  Camera look-at target
   */
  lookAt: { x: number; y: number; z: number };
  /**
  Camera zoom/distance factor
   */
  zoom?: number;
}

export interface UseCameraPersistenceOptions {
  /**
  Storage key for this camera state
   */
  storageKey?: string;
  /**
  Debounce delay for saving (ms)
   */
  debounceMs?: number;
  /**
  Whether persistence is enabled
   */
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
 */
const parseStoredCameraState = (stored: string | null): CameraState | null => {
  if (stored === null || stored === '') return null;

  try {
    const parsed: unknown = JSON.parse(stored);

    if (!isPlainObject(parsed)) return null;
    const position = parsed.position;
    const lookAt = parsed.lookAt;

    // Validate structure
    if (
      isPlainObject(position) &&
      typeof position.x === 'number' &&
      typeof position.y === 'number' &&
      typeof position.z === 'number' &&
      isPlainObject(lookAt) &&
      typeof lookAt.x === 'number' &&
      typeof lookAt.y === 'number' &&
      typeof lookAt.z === 'number'
    ) {
      return {
        position: {
          x: position.x,
          y: position.y,
          z: position.z,
        },
        lookAt: {
          x: lookAt.x,
          y: lookAt.y,
          z: lookAt.z,
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
  /**
  Current camera state
   */
  cameraState: CameraState;
  /**
  Update camera state (debounced save to storage)
   */
  updateCameraState: (state: Partial<CameraState>) => void;
  /**
  Reset camera to default state
   */
  resetCamera: () => void;
  /**
  Whether the initial state has been loaded
   */
  isLoaded: boolean;
  /**
  Save current state immediately (bypass debounce)
   */
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
export const useCameraPersistence = (options: Readonly<UseCameraPersistenceOptions> = {}): UseCameraPersistenceReturn => {
  const {
    storageKey = DEFAULT_STORAGE_KEY,
    debounceMs = DEFAULT_DEBOUNCE_MS,
    enabled = true,
  } = options;

  const [cameraState, setCameraState] = useState<CameraState>(DEFAULT_CAMERA_STATE);
  const [isLoaded, setIsLoaded] = useState(false);
  const debounceTimerReference = useRef<NodeJS.Timeout | null>(null);
  const latestStateReference = useRef<CameraState>(DEFAULT_CAMERA_STATE);

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
        latestStateReference.current = parsed;
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
      ...latestStateReference.current,
      ...updates,
      position: updates.position
        ? { ...latestStateReference.current.position, ...updates.position }
        : latestStateReference.current.position,
      lookAt: updates.lookAt
        ? { ...latestStateReference.current.lookAt, ...updates.lookAt }
        : latestStateReference.current.lookAt,
    };

    setCameraState(newState);
    latestStateReference.current = newState;

    // Debounce the save
    if (debounceTimerReference.current) {
      clearTimeout(debounceTimerReference.current);
    }
    debounceTimerReference.current = setTimeout(() => {
      saveToStorage(newState);
    }, debounceMs);
  }, [saveToStorage, debounceMs]);

  // Reset camera to default state
  const resetCamera = useCallback(() => {
    setCameraState(DEFAULT_CAMERA_STATE);
    latestStateReference.current = DEFAULT_CAMERA_STATE;
    saveToStorage(DEFAULT_CAMERA_STATE);
  }, [saveToStorage]);

  // Save immediately (bypass debounce)
  const saveImmediate = useCallback(() => {
    if (debounceTimerReference.current) {
      clearTimeout(debounceTimerReference.current);
    }
    saveToStorage(latestStateReference.current);
  }, [saveToStorage]);

  // Cleanup debounce timer and save on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerReference.current) {
        clearTimeout(debounceTimerReference.current);
      }
      // Save final state on unmount
      if (enabled) {
        try {
          localStorage.setItem(storageKey, JSON.stringify(latestStateReference.current));
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
