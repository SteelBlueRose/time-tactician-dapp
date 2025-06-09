import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, useContext, useRef, useCallback } from "react";
import { NearContext } from "@/wallets/near";
import { HelloNearContract } from "@/config";
import { SyncButton } from "./SyncButton";
import { useLoading } from "@/components/layout/LoadingContext";
import { useLayout } from "@/components/layout/LayoutContext";

import styles from "@/app/styles/navigation/Navigation.module.css";
import rewardPointsStyles from "@/app/styles/navigation/RewardPoints.module.css";
import errorStyles from "@/app/styles/components/status/Error.module.css";

export const Navigation = () => {
  const { signedAccountId, wallet } = useContext(NearContext);
  const { showLoading, hideLoading } = useLoading();
  const { isExpanded, isPinned } = useLayout();
  const [label, setLabel] = useState("Loading...");
  const [rewardPoints, setRewardPoints] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const initialRenderRef = useRef(true);
  const [error, setError] = useState(null);
  const lastPathRef = useRef(pathname);
  const isMainPage = pathname === "/";

  const handleLoginLogout = useCallback(() => {
    if (signedAccountId) {
      setShowDropdown((prev) => !prev);
    } else if (wallet) {
      lastPathRef.current = pathname;
      wallet.signIn();
    }
  }, [signedAccountId, wallet, pathname]);

  const handleLogout = useCallback(async () => {
    if (wallet) {
      try {
        setShowDropdown(false);
        showLoading("Logging out...");
        await wallet.signOut();
        await router.push("/");
      } finally {
        setTimeout(hideLoading, 500);
      }
    }
  }, [wallet, router, showLoading, hideLoading]);

  const handleClickOutside = useCallback((event) => {
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setShowDropdown(false);
    }
  }, []);

  const loadRewardPoints = useCallback(async () => {
    if (wallet && signedAccountId) {
      try {
        const response = await wallet.viewMethod({
          contractId: HelloNearContract,
          method: "get_reward_points",
          args: { account_id: signedAccountId },
        });

        if (response.Success !== undefined) {
          setRewardPoints(response.Success);
        } else if (response.Error) {
          console.error("Error loading reward points:", response.Error);
          setError("Failed to load reward points");
        }
      } catch (error) {
        console.error("Error loading reward points:", error);
        setError("Failed to load reward points");
      }
    }
  }, [wallet, signedAccountId]);

  useEffect(() => {
    if (!wallet) {
      setLabel("Login");
      return;
    }

    const updateState = async () => {
      if (signedAccountId) {
        setLabel(signedAccountId);
        if (!initialRenderRef.current) {
          if (pathname === "/") {
            const redirectPath = lastPathRef.current || "/tasks";
            await router.push(redirectPath);
          }
        }
        await loadRewardPoints();
      } else {
        setLabel("Login");
        if (!initialRenderRef.current) {
          await router.push("/");
        }
      }
    };

    updateState();
    initialRenderRef.current = false;
  }, [signedAccountId, wallet, router, loadRewardPoints, pathname]);

  useEffect(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [handleClickOutside]);

  return (
    <>
      <nav
        className={`${styles.navbar} ${
          isMainPage
            ? styles.mainPage
            : isExpanded || isPinned
            ? styles.shifted
            : ""
        }`}
      >
        <div className={styles["navbar-left"]}>
          {!isMainPage && (
            <div className={styles.syncButtonContainer}>
              <SyncButton />
            </div>
          )}
        </div>

        <div className={styles["navbar-center"]}>
          <p>
            Contract: <code className={styles.code}>{HelloNearContract}</code>
          </p>
        </div>

        <div className={styles["navbar-right"]}>
          {signedAccountId && (
            <div
              className={`button-primary ${rewardPointsStyles.rewardPoints}`}
            >
              <span className={rewardPointsStyles.rewardValue}>
                {rewardPoints}
              </span>
              <span className={rewardPointsStyles.rewardLabel}>RP</span>
            </div>
          )}
          <button
            className={`button-primary ${styles.navButton}`}
            onClick={handleLoginLogout}
          >
            {label}
          </button>
          {showDropdown && (
            <div className={styles.dropdownMenu} ref={dropdownRef}>
              <button
                className={styles.dropdownMenuButton}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </nav>
      {error && (
        <div
          className={errorStyles.container}
          style={{
            position: "fixed",
            top: "80px",
            right: "20px",
            zIndex: 1000,
            marginBottom: 0,
          }}
        >
          {error}
        </div>
      )}
    </>
  );
};
