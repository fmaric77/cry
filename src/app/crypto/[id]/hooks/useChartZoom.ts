import { useState, useCallback } from 'react';
import { ZoomPanState } from '../types';
import { clamp } from '../utils';

interface UseChartZoomOptions {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  initialPan?: number;
}

interface UseChartZoomReturn extends ZoomPanState {
  setZoom: (zoom: number) => void;
  setPan: (pan: number) => void;
  setIsPanning: (isPanning: boolean) => void;
  setPanStartX: (x: number | null) => void;
  handleWheel: (e: React.WheelEvent<SVGSVGElement>, containerWidth: number, effectivePadding: number) => void;
  handleMouseDown: (e: React.MouseEvent<SVGSVGElement>) => void;
  handleMouseUp: () => void;
  handleMouseMove: (e: React.MouseEvent<SVGSVGElement>, containerWidth: number, effectivePadding: number) => void;
  resetZoom: () => void;
}

/**
 * Custom hook for managing chart zoom and pan functionality
 */
export function useChartZoom({
  minZoom = 1,
  maxZoom = 10,
  initialZoom = 1,
  initialPan = 0
}: UseChartZoomOptions = {}): UseChartZoomReturn {
  const [zoom, setZoomState] = useState(initialZoom);
  const [pan, setPanState] = useState(initialPan);
  const [isPanning, setIsPanning] = useState(false);
  const [panStartX, setPanStartX] = useState<number | null>(null);

  const setZoom = useCallback((newZoom: number) => {
    setZoomState(clamp(newZoom, minZoom, maxZoom));
  }, [minZoom, maxZoom]);

  const setPan = useCallback((newPan: number) => {
    setPanState(clamp(newPan, 0, 1));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomState(1);
    setPanState(0);
  }, []);

  const handleWheel = useCallback((
    e: React.WheelEvent<SVGSVGElement>,
    containerWidth: number,
    effectivePadding: number
  ) => {
    e.preventDefault();
    
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const zoomPoint = (mouseX - effectivePadding) / (containerWidth - 2 * effectivePadding);
    
    const zoomDelta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = clamp(zoom * zoomDelta, minZoom, maxZoom);
    
    // Adjust pan to zoom towards mouse position
    const zoomRatio = newZoom / zoom;
    const newPan = clamp(
      pan + (zoomPoint - 0.5) * (1 - 1/zoomRatio) / newZoom,
      0,
      1
    );
    
    setZoomState(newZoom);
    setPanState(newPan);
  }, [zoom, pan, minZoom, maxZoom]);

  const handleMouseDown = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (zoom <= 1) return; // Only pan when zoomed
    
    setIsPanning(true);
    setPanStartX(e.clientX);
    e.preventDefault();
  }, [zoom]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    setPanStartX(null);
  }, []);

  const handleMouseMove = useCallback((
    e: React.MouseEvent<SVGSVGElement>,
    containerWidth: number,
    effectivePadding: number
  ) => {
    // Handle panning
    if (isPanning && zoom > 1 && panStartX !== null) {
      const deltaX = e.clientX - panStartX;
      const panSensitivity = 1 / (containerWidth - 2 * effectivePadding);
      const newPan = clamp(pan - deltaX * panSensitivity * zoom, 0, 1);
      
      setPanState(newPan);
      setPanStartX(e.clientX);
    }
  }, [isPanning, zoom, panStartX, pan]);

  return {
    zoom,
    pan,
    isPanning,
    panStartX,
    setZoom,
    setPan,
    setIsPanning,
    setPanStartX,
    handleWheel,
    handleMouseDown,
    handleMouseUp,
    handleMouseMove,
    resetZoom
  };
}
