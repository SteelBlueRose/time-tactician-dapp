import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { useLayout } from "./LayoutContext";
import styles from "@/app/styles/components/layout/MainLayout.module.css";

export const LayoutWrapper = ({ children }) => {
  const { isExpanded, isPinned } = useLayout();
  const pathname = usePathname();
  const isMainPage = pathname === "/";
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && !isMainPage) {
      const mainContent = document.querySelector(`.${styles.mainContent}`);
      if (mainContent) {
        const shouldExpand = isExpanded || isPinned;
        mainContent.style.marginLeft = shouldExpand ? "256px" : "64px";
        mainContent.style.width = shouldExpand
          ? "calc(100% - 256px)"
          : "calc(100% - 64px)";
      }
    }
  }, [isExpanded, isPinned, isMainPage, mounted]);

  const baseClasses = [
    styles.mainContent,
    isMainPage && styles.mainPage,
  ].filter(Boolean);

  if (mounted && !isMainPage) {
    if (isExpanded || isPinned) {
      baseClasses.push(styles.shifted);
    }
    baseClasses.push(styles.withSidebar);
  }

  return (
    <div className={styles.layoutWrapper}>
      {!isMainPage && <Sidebar />}
      <main className={baseClasses.join(" ")}>{children}</main>
    </div>
  );
};
