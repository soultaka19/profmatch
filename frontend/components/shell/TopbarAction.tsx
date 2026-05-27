"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

const SLOT_ID = "app-topbar-page-action";

export function TopbarAction({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    let frame = 0;
    // Le slot vit dans le layout (AppTopbar) ; il est normalement présent au
    // montage de la page. On reste robuste si le slot apparaît une frame plus
    // tard (auth résolue, transition de route) en réessayant brièvement.
    const locate = (attempts: number) => {
      const slot = document.getElementById(SLOT_ID);
      if (slot) {
        setTarget(slot);
        return;
      }
      if (attempts > 0) {
        frame = requestAnimationFrame(() => locate(attempts - 1));
      }
    };
    locate(5);
    return () => cancelAnimationFrame(frame);
  }, []);

  return target ? createPortal(children, target) : null;
}
