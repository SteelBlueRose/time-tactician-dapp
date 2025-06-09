"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { NearContext, Wallet } from "@/wallets/near";
import { NetworkId } from "@/config";
import { BatchProvider } from "@/components/layout/BatchContext";
import { LayoutProvider } from "@/components/layout/LayoutContext";
import { LoadingProvider } from "@/components/layout/LoadingContext";
import { LayoutWrapper } from "@/components/layout/LayoutWrapper";
import { Navigation } from "@/components/navigational_bar/navigation";
import { LoadingOverlay } from "@/components/layout/LoadingOverlay";

import "@/app/globals.css";

const wallet = new Wallet({ networkId: NetworkId });

export default function RootLayout({ children }) {
  const [signedAccountId, setSignedAccountId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const handleAccountChange = useCallback((newAccountId) => {
    setSignedAccountId(newAccountId);
  }, []);

  const initWallet = useCallback(async () => {
    try {
      const accountId = await wallet.startUp(handleAccountChange);
      setSignedAccountId(accountId);
    } catch (error) {
      console.error("Error initializing wallet:", error);
      handleAccountChange("");
    } finally {
      setIsLoading(false);
    }
  }, [handleAccountChange]);

  useEffect(() => {
    initWallet();
  }, [initWallet]);

  useEffect(() => {
    if (!isLoading && signedAccountId && initialLoad) {
      if (pathname === "/") {
        setTimeout(() => {
          router.push("/tasks");
        }, 20);
      }
      setInitialLoad(false);
    }
  }, [isLoading, signedAccountId, router, pathname, initialLoad]);

  if (isLoading) {
    return (
      <html lang="en">
        <head />
        <body>
          <LoadingOverlay message="Initializing..." />
        </body>
      </html>
    );
  }

  return (
    <html lang="en">
      <head />
      <body>
        <BatchProvider>
          <NearContext.Provider value={{ wallet, signedAccountId }}>
            <LoadingProvider>
              <LayoutProvider>
                <LayoutWrapper>
                  <Navigation />
                  {children}
                </LayoutWrapper>
              </LayoutProvider>
            </LoadingProvider>
          </NearContext.Provider>
        </BatchProvider>
      </body>
    </html>
  );
}
