"use client";

import { useEffect } from "react";

/** Загрузка данных после mount без синхронного setState в теле effect. */
export function useOnMount(load: () => void | Promise<void>) {
  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      if (!cancelled) void load();
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [load]);
}
