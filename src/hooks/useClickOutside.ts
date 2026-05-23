"use client";

import type { RefObject } from "react";
import { useEffect } from "react";

export function useClickOutside<T extends HTMLElement>(
  ref: RefObject<T | null>,
  onOutsideClick: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return;

    function handlePointerDown(event: PointerEvent) {
      const element = ref.current;
      if (!element || element.contains(event.target as Node)) return;
      onOutsideClick();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onOutsideClick();
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [enabled, onOutsideClick, ref]);
}
