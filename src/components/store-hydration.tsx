"use client";

import { useEffect } from "react";

import { useAppStore } from "@/lib/store";

/**
 * Applies the persisted session after mount.
 *
 * The store is created with `skipHydration` so the first client render matches the server exactly;
 * this reads localStorage once the tree is live. Rendering nothing keeps it out of the layout.
 */
export function StoreHydration() {
  useEffect(() => {
    void useAppStore.persist.rehydrate();
  }, []);
  return null;
}
