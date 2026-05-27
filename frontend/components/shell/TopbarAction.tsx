"use client";

import { type ReactNode, useEffect, useState } from "react";
import { createPortal } from "react-dom";

export function TopbarAction({ children }: { children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById("app-topbar-page-action"));
  }, []);

  return target ? createPortal(children, target) : null;
}
