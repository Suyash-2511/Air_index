"use client";

import { useState } from "react";
import { useLocale } from "@/hooks";

/** How long the "copied" message stays in the live region. */
const STATUS_CLEAR_MS = 3000;

/** Shares text with the native share sheet, falling back to the clipboard, and says what happened. */
export function usePledgeSharing() {
  const { t } = useLocale();
  const [statusMessage, setStatusMessage] = useState("");

  const tryNativeShare = async (text: string): Promise<boolean> => {
    if (typeof navigator.share !== "function") return false;
    try {
      await navigator.share({ title: t("pledge_share_title"), text });
      setStatusMessage(t("pledge_shared_msg"));
      return true;
    } catch {
      // The visitor closing the share sheet rejects the promise; the clipboard is the next best thing.
      return false;
    }
  };

  const copyToClipboard = async (text: string) => {
    if (!navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(text);
      setStatusMessage(t("pledge_copied_msg"));
      setTimeout(() => setStatusMessage(""), STATUS_CLEAR_MS);
    } catch {
      setStatusMessage(t("pledge_copy_failed_msg"));
    }
  };

  const share = async (text: string) => {
    if (!(await tryNativeShare(text))) await copyToClipboard(text);
  };

  return { statusMessage, share };
}
