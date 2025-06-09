import { useState, useCallback, useEffect } from "react";

export const useResizePanel = ({
  containerRef,
  minLeftWidth = 300,
  maxLeftWidth = 800,
  minRightWidth = 400,
}) => {
  const [leftPanelWidth, setLeftPanelWidth] = useState(33);
  const [isResizing, setIsResizing] = useState(false);

  const startResizing = useCallback((e) => {
    setIsResizing(true);
    e.preventDefault();
  }, []);

  const stopResizing = useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = useCallback(
    (e) => {
      if (!isResizing || !containerRef.current) return;

      const container = containerRef.current;
      const containerWidth = container.offsetWidth;

      const newWidth = e.clientX - container.getBoundingClientRect().left;
      const newLeftWidthPercent = (newWidth / containerWidth) * 100;
      const leftPixels = (containerWidth * newLeftWidthPercent) / 100;
      const rightPixels = containerWidth - leftPixels;

      if (
        leftPixels >= minLeftWidth &&
        leftPixels <= maxLeftWidth &&
        rightPixels >= minRightWidth
      ) {
        setLeftPanelWidth(newLeftWidthPercent);
      }
    },
    [isResizing, containerRef, minLeftWidth, maxLeftWidth, minRightWidth]
  );

  useEffect(() => {
    if (isResizing) {
      window.addEventListener("mousemove", resize);
      window.addEventListener("mouseup", stopResizing);
    }

    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, [isResizing, resize, stopResizing]);

  return {
    leftPanelWidth,
    isResizing,
    startResizing,
    stopResizing,
  };
};
