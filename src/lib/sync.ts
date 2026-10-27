"use client";

import { useEffect, useRef } from "react";

const SYNC_EVENT_NAME = "parkorbit:datasync";
const BROADCAST_CHANNEL_NAME = "parkorbit:channel";

/**
 * Dispatch an event to immediately notify all listening pages/components
 * in the current window and across browser tabs that data has changed.
 */
export function notifyDataChanged(scope: string = "general") {
  if (typeof window === "undefined") return;

  // 1. Dispatch custom DOM event for current page/tab
  try {
    window.dispatchEvent(
      new CustomEvent(SYNC_EVENT_NAME, {
        detail: { scope, timestamp: Date.now() },
      })
    );
  } catch {
    // ignore
  }

  // 2. Dispatch cross-tab BroadcastChannel message if available
  try {
    if ("BroadcastChannel" in window) {
      const channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
      channel.postMessage({ scope, timestamp: Date.now() });
      channel.close();
    }
  } catch {
    // ignore
  }
}

/**
 * React hook that registers a callback to be invoked:
 * 1. On component mount
 * 2. Whenever notifyDataChanged() is called in this window
 * 3. Whenever notifyDataChanged() is called in another tab (via BroadcastChannel)
 * 4. When the user refocuses this tab / window becomes visible
 * 5. When any supplied dependencies change
 */
export function useDataSync(
  callback: () => void | Promise<void>,
  deps: unknown[] = []
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    // Invoke immediately on mount or when dependencies change
    callbackRef.current();

    if (typeof window === "undefined") return;

    const handleSync = () => {
      callbackRef.current();
    };

    // DOM event listener
    window.addEventListener(SYNC_EVENT_NAME, handleSync);

    // Window focus & visibility listener
    window.addEventListener("focus", handleSync);
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        callbackRef.current();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Cross-tab broadcast channel
    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel(BROADCAST_CHANNEL_NAME);
        channel.onmessage = () => {
          callbackRef.current();
        };
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener(SYNC_EVENT_NAME, handleSync);
      window.removeEventListener("focus", handleSync);
      document.removeEventListener("visibilitychange", handleVisibility);
      try {
        channel?.close();
      } catch {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
