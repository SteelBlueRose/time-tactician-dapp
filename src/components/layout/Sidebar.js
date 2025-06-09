import React, { useState, useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import Logo from "/public/logo.svg";
import ExpandedLogo from "/public/expanded_logo.svg";
import PinExpanded from "/public/pin_expanded.svg";
import PinNotExpanded from "/public/pin_not_expanded.svg";
import TaskIcon from "/public/task.svg";
import RewardIcon from "/public/reward.svg";
import PlannerIcon from "/public/planner.svg";
import TimeSlotIcon from "/public/time_slots.svg";

import { useLayout } from "./LayoutContext";
import styles from "@/app/styles/components/layout/Sidebar.module.css";

export const Sidebar = () => {
  const { isExpanded, isPinned, handlePinChange, handleExpandChange } =
    useLayout();
  const [canClickPin, setCanClickPin] = useState(false);
  const pathname = usePathname();
  const timeoutRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (isPinned) {
      handleExpandChange(true);
      setCanClickPin(true);
    }
  }, [isPinned, handleExpandChange]);

  if (pathname === "/") return null;

  const handleMouseEnter = () => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(() => {
        handleExpandChange(true);
        timeoutRef.current = setTimeout(() => {
          setCanClickPin(true);
        }, 400);
      }, 300);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      handleExpandChange(false);
      setCanClickPin(false);
    }
  };

  const handlePinClick = (e) => {
    e.stopPropagation();
    if (!canClickPin) return;
    handlePinChange(!isPinned);
  };

  const isActive = (path) => pathname === path;

  return (
    <div
      className={`${styles.sidebar} ${
        isExpanded ? styles.expanded : styles.collapsed
      }`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={styles.topStrip}>
        <div className={styles.logoContainer}>
          <Link href="/" passHref>
            <Image
              src={Logo}
              alt="Logo"
              width={32}
              height={32}
              className={`${styles.collapsedLogo} ${
                isExpanded ? styles.hidden : ""
              }`}
            />
          </Link>
          
          <Link href="/" passHref>
            <Image
              src={ExpandedLogo}
              alt="TimeTactician"
              width={160}
              height={40}
              className={`${styles.expandedLogo} ${
                isExpanded ? "" : styles.hidden
              }`}
            />
          </Link>
        </div>
        {isExpanded && (
          <div className={styles.pinContainer} onClick={handlePinClick}>
            <Image
              src={isPinned ? PinExpanded : PinNotExpanded}
              alt="Pin"
              width={24}
              height={24}
              className={`${styles.pinIcon} ${
                canClickPin ? styles.clickable : ""
              }`}
            />
          </div>
        )}
      </div>
      
      <div className={styles.content}>
        <div className={styles.menuItems}>
          <Link
            href="/tasks"
            className={`${styles.menuItem} ${
              isActive("/tasks") ? styles.active : ""
            }`}
          >
            <Image
              src={TaskIcon}
              alt="Tasks"
              width={24}
              height={24}
              className={styles.menuIcon}
            />
            <span
              className={`${styles.menuText} ${
                isExpanded ? "" : styles.hidden
              }`}
            >
              Tasks
            </span>
          </Link>
          <Link
            href="/rewards"
            className={`${styles.menuItem} ${
              isActive("/rewards") ? styles.active : ""
            }`}
          >
            <Image
              src={RewardIcon}
              alt="Rewards"
              width={24}
              height={24}
              className={styles.menuIcon}
            />
            <span
              className={`${styles.menuText} ${
                isExpanded ? "" : styles.hidden
              }`}
            >
              Rewards
            </span>
          </Link>
          <Link
            href="/time-slots"
            className={`${styles.menuItem} ${
              isActive("/time-slots") ? styles.active : ""
            }`}
          >
            <Image
              src={TimeSlotIcon}
              alt="Time Slots"
              width={24}
              height={24}
              className={styles.menuIcon}
            />
            <span
              className={`${styles.menuText} ${
                isExpanded ? "" : styles.hidden
              }`}
            >
              Time Slots
            </span>
          </Link>
          <Link
            href="/planner"
            className={`${styles.menuItem} ${
              isActive("/planner") ? styles.active : ""
            }`}
          >
            <Image
              src={PlannerIcon}
              alt="Planner"
              width={24}
              height={24}
              className={styles.menuIcon}
            />
            <span
              className={`${styles.menuText} ${
                isExpanded ? "" : styles.hidden
              }`}
            >
              Planner
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
};
