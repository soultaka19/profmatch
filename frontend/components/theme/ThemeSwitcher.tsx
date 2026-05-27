"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { THEMES } from "@/lib/theme/config";
import type { ThemeId } from "@/lib/theme/types";
import { cn } from "@/lib/utils";
import { useTheme } from "./ThemeProvider";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    if (!open) return;
    const selectedIndex = THEMES.findIndex((item) => item.id === theme);
    optionRefs.current[selectedIndex >= 0 ? selectedIndex : 0]?.focus();
    const onClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, theme]);

  const current = THEMES.find((item) => item.id === theme) ?? THEMES[0];

  const handleSelect = (id: ThemeId) => {
    setTheme(id);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const activeIndex = optionRefs.current.findIndex((option) => option === document.activeElement);
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const direction = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (activeIndex + direction + THEMES.length) % THEMES.length;
      optionRefs.current[nextIndex]?.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      optionRefs.current[event.key === "Home" ? 0 : THEMES.length - 1]?.focus();
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex items-center gap-2 rounded-full border border-border bg-canvas-pure px-3 py-1.5 text-xs font-medium text-fg transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring"
      >
        <Palette className="h-3.5 w-3.5 text-fg-subtle" />
        {current.label}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Apparence"
          onKeyDown={handleMenuKeyDown}
          className="absolute right-0 top-full z-50 mt-2 w-[280px] max-w-[calc(100vw-2rem)] rounded-md border border-border bg-canvas-pure p-3 shadow-card"
        >
          <p className="text-sm font-semibold text-fg">Apparence</p>
          <p className="mb-2 mt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            Thème visuel
          </p>
          <div className="space-y-1">
            {THEMES.map((item, index) => {
              const active = item.id === theme;
              return (
                <button
                  key={item.id}
                  ref={(node) => {
                    optionRefs.current[index] = node;
                  }}
                  role="menuitemradio"
                  aria-checked={active}
                  type="button"
                  onClick={() => handleSelect(item.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleSelect(item.id);
                    }
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2 text-left text-sm text-fg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-ring",
                    active
                      ? "border-primary-border bg-primary-soft font-semibold text-primary"
                      : "border-transparent hover:bg-surface"
                  )}
                >
                  <span
                    data-theme-swatch
                    aria-hidden="true"
                    className="h-5 w-5 flex-shrink-0 rounded-full border border-black/10"
                    style={{ backgroundColor: item.swatch }}
                  />
                  <span className="flex-1">{item.label}</span>
                  {active && <Check className="h-4 w-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
