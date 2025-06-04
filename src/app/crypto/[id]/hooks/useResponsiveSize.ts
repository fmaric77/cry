import { useState, useEffect, useRef } from 'react';
import { ChartDimensions } from '../types';

interface UseResponsiveSizeOptions {
  initialWidth?: number;
  initialHeight?: number;
  padding?: number;
  aspectRatio?: number;
  minHeight?: number;
  mobilePadding?: number;
  mobileBreakpoint?: number;
}

interface UseResponsiveSizeReturn extends ChartDimensions {
  containerRef: React.RefObject<HTMLDivElement>;
}

/**
 * Custom hook for managing responsive chart dimensions
 */
export function useResponsiveSize({
  initialWidth = 1200,
  initialHeight = 700,
  padding = 80,
  aspectRatio = 0.6,
  minHeight = 320,
  mobilePadding = 32,
  mobileBreakpoint = 600
}: UseResponsiveSizeOptions = {}): UseResponsiveSizeReturn {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(initialWidth);
  const [containerHeight, setContainerHeight] = useState(initialHeight);

  useEffect(() => {
    function handleResize() {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = Math.max(minHeight, Math.round(width * aspectRatio));
        
        setContainerWidth(width);
        setContainerHeight(height);
      }
    }

    // Set up ResizeObserver for more accurate container size tracking
    const resizeObserver = new ResizeObserver(handleResize);
    
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    // Initial size calculation
    handleResize();

    // Fallback to window resize listener
    window.addEventListener('resize', handleResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [aspectRatio, minHeight]);

  // Calculate effective padding based on container width
  const effectivePadding = containerWidth < mobileBreakpoint ? mobilePadding : padding;

  return {
    containerRef,
    containerWidth,
    containerHeight,
    effectivePadding
  };
}
