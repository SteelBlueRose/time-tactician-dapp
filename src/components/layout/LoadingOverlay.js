"use client";

import React from "react";
import styles from "@/app/styles/components/dialog/Loading.module.css";
import { Loader2 } from "lucide-react";

export const LoadingOverlay = ({ message = "Loading..." }) => {
  return (
    <div className={styles.overlay}>
      <div className={styles.content}>
        <Loader2 className={styles.spinner} size={36} />
        <p className={styles.messageText}>{message}</p>
      </div>
    </div>
  );
};
