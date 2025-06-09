import React, { useRef } from "react";
import { useResizePanel } from "@/app/hooks/useResizePanel";

import layoutStyles from "@/app/styles/components/layout/Layout.module.css";
import resizerStyles from "@/app/styles/components/layout/Resizer.module.css";

export const ResizablePanelLayout = ({
  leftPanel,
  rightPanel,
  minLeftWidth,
  maxLeftWidth,
  minRightWidth,
}) => {
  const containerRef = useRef(null);
  const resizerRef = useRef(null);

  const { leftPanelWidth, isResizing, startResizing } = useResizePanel({
    containerRef,
    minLeftWidth,
    maxLeftWidth,
    minRightWidth,
  });

  return (
    <div className={layoutStyles.pageContainer} ref={containerRef}>
      <div
        className={layoutStyles.leftPanel}
        style={{ width: `${leftPanelWidth}%` }}
      >
        {leftPanel}
      </div>

      <div
        ref={resizerRef}
        className={`${resizerStyles.resizer} ${
          isResizing ? resizerStyles.isResizing : ""
        }`}
        onMouseDown={startResizing}
        style={{ left: `${leftPanelWidth}%` }}
      />

      <div className={layoutStyles.rightPanel}>{rightPanel}</div>
    </div>
  );
};
