import React, { createContext, useContext, useState, useEffect } from "react";

const LayoutContext = createContext();

export const LayoutProvider = ({ children }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const pinnedState = localStorage.getItem("sidebarPinned") === "true";
    setIsPinned(pinnedState);
    if (pinnedState) {
      setIsExpanded(true);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isPinned) {
      setIsExpanded(true);
    }
  }, [isPinned]);

  const handlePinChange = (pinned) => {
    setIsPinned(pinned);
    localStorage.setItem("sidebarPinned", pinned);
    if (pinned) {
      setIsExpanded(true);
    }
  };

  const handleExpandChange = (expanded) => {
    if (!isPinned) {
      setIsExpanded(expanded);
    }
  };

  if (!mounted) {
    return null;
  }

  return (
    <LayoutContext.Provider
      value={{
        isExpanded,
        isPinned,
        handlePinChange,
        handleExpandChange,
      }}
    >
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (!context) {
    throw new Error("useLayout must be used within a LayoutProvider");
  }
  return context;
};
