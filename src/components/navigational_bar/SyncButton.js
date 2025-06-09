import React from "react";
import { RotateCw, X } from "lucide-react";
import { useBatch } from "@/components/layout/BatchContext";
import { useContext } from "react";
import { NearContext } from "@/wallets/near";

import styles from "@/app/styles/navigation/SyncButton.module.css";

export const SyncButton = () => {
  const { batchActions, clearActions } = useBatch();
  const { wallet } = useContext(NearContext);

  const handleSync = async () => {
    if (!batchActions.length) return;

    try {
      const formattedTxs = batchActions.map((action) => ({
        ...action,
        actions: action.actions.map((a) => ({
          ...a,
          type: "FunctionCall",
          params: {
            ...a.params,
            gas: "30000000000000",
            deposit: "0",
          },
        })),
      }));

      await wallet.signAndSendTransactions({
        transactions: formattedTxs,
      });
      clearActions();
    } catch (error) {
      console.error("Error executing batch:", error);
    }
  };

  const handleReset = () => {
    if (
      window.confirm("Are you sure you want to discard all pending changes?")
    ) {
      clearActions();
    }
  };

  return (
    <div className={styles.syncButtons}>
      <button
        className={styles.syncButton}
        onClick={handleSync}
        disabled={!batchActions.length}
      >
        <RotateCw size={16} className={styles.syncIcon} />
        <span>Sync ({batchActions.length})</span>
      </button>

      {batchActions.length > 0 && (
        <button
          className={styles.resetButton}
          onClick={handleReset}
          title="Discard all pending changes"
        >
          <X size={16} />
          <span>Reset</span>
        </button>
      )}
    </div>
  );
};
