"use client";

import { useRef, useState } from "react";

export function useActionLock() {
  const lockedRef = useRef(false);
  const [locked, setLocked] = useState(false);

  function acquire() {
    if (lockedRef.current) return false;
    lockedRef.current = true;
    setLocked(true);
    return true;
  }

  function release() {
    lockedRef.current = false;
    setLocked(false);
  }

  return { locked, acquire, release };
}
