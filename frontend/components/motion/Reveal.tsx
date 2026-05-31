"use client";

import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface RevealProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Décalage avant le déclenchement, pour échelonner une liste (stagger). */
  delayMs?: number;
}

/**
 * Conteneur « reveal au scroll » — fondu + légère montée (fade + rise).
 *
 * L'élément démarre légèrement transparent et décalé vers le bas, puis se
 * révèle (opacité 1, translation 0) à son entrée dans le viewport, une seule
 * fois. Style sobre type Linear/Vercel : court (350 ms), discret (12 px).
 *
 * - Respecte `prefers-reduced-motion` : les classes d'animation sont sous le
 *   variant `motion-safe`, donc l'élément reste pleinement visible si l'usager
 *   a désactivé les animations.
 * - Dégradation gracieuse : sans IntersectionObserver, le contenu est affiché
 *   immédiatement.
 * - Wrapper neutre en flux bloc : la marge des enfants se fusionne (margin
 *   collapsing), le rythme vertical existant est préservé.
 */
export function Reveal({ delayMs = 0, className, style, children, ...rest }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      data-shown={shown}
      style={{ transitionDelay: delayMs ? `${delayMs}ms` : undefined, ...style }}
      className={cn(
        "transition-all duration-[350ms] ease-out will-change-[opacity,transform]",
        "motion-safe:opacity-0 motion-safe:translate-y-3",
        shown && "motion-safe:opacity-100 motion-safe:translate-y-0",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
