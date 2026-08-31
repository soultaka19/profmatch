"use client";

import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "@/components/auth/AuthProvider";
import { demoApi } from "@/lib/api/demo";
import type { UserRole } from "@/lib/types/api";
import type { BacASable } from "@/lib/types/demo";

const CLE_JETONS = "demo_jetons";
const CLE_EXPIRATION = "demo_expire_le";

/** Cadence de rafraîchissement du budget IA.
 *
 * Les appels au modèle partent d'endroits variés — téléversement d'un CV,
 * consultation d'une justification, et bientôt d'ailleurs. Plutôt que de
 * brancher un compteur sur chacun (et d'en oublier un), on relit la source de
 * vérité : le serveur. La requête est un `SELECT` sur une ligne.
 */
const PERIODE_RAFRAICHISSEMENT_MS = 30_000;

interface DemoContextValue {
  estDemo: boolean;
  expireLe: Date | null;
  /** Secondes avant effacement, 0 une fois expiré. */
  resteSecondes: number;
  expire: boolean;
  appelsTotal: number;
  appelsRestants: number;
  demarrer: () => Promise<void>;
  changerDeRole: (role: UserRole) => void;
  rafraichir: () => void;
  quitter: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

function lireJetons(): Partial<Record<UserRole, string>> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(CLE_JETONS) ?? "{}");
  } catch {
    return {};
  }
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { adopterJeton, logout } = useAuth();

  const [expireLe, setExpireLe] = useState<Date | null>(null);
  const [appelsTotal, setAppelsTotal] = useState(0);
  const [appelsRestants, setAppelsRestants] = useState(0);
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const demarrage = useRef(false);

  const estDemo = expireLe !== null;

  const oublier = useCallback(() => {
    try {
      localStorage.removeItem(CLE_JETONS);
      localStorage.removeItem(CLE_EXPIRATION);
    } catch {
      // localStorage indisponible (mode privé) : l'état en mémoire suffit.
    }
    setExpireLe(null);
    setAppelsTotal(0);
    setAppelsRestants(0);
  }, []);

  const rafraichir = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("access_token")) return;

    demoApi
      .statut()
      .then((s) => {
        if (!s.est_demo || !s.expire_le) {
          oublier();
          return;
        }
        setExpireLe(new Date(s.expire_le));
        setAppelsTotal(s.appels_ia_total ?? 0);
        setAppelsRestants(s.appels_ia_restants ?? 0);
      })
      .catch(() => {
        // Jeton expiré ou API injoignable : on n'affiche pas un compte à
        // rebours dont on ne répond plus.
        oublier();
      });
  }, [oublier]);

  // Un rechargement de page garde le jeton mais perd le compte à rebours :
  // c'est le serveur qui le rétablit.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(CLE_EXPIRATION)) rafraichir();
  }, [rafraichir]);

  useEffect(() => {
    if (!estDemo) return;
    const battement = setInterval(() => setMaintenant(Date.now()), 1000);
    const suivi = setInterval(rafraichir, PERIODE_RAFRAICHISSEMENT_MS);
    return () => {
      clearInterval(battement);
      clearInterval(suivi);
    };
  }, [estDemo, rafraichir]);

  const adopter = useCallback(
    (bac: BacASable) => {
      try {
        localStorage.setItem(CLE_JETONS, JSON.stringify(bac.jetons));
        localStorage.setItem(CLE_EXPIRATION, bac.expire_le);
      } catch {
        // Sans stockage, la session vit le temps de l'onglet — acceptable.
      }
      setExpireLe(new Date(bac.expire_le));
      setAppelsTotal(bac.appels_ia_total);
      setAppelsRestants(bac.appels_ia_restants);
    },
    []
  );

  const demarrer = useCallback(async () => {
    if (demarrage.current) return;
    demarrage.current = true;
    try {
      const bac = await demoApi.creer();
      adopter(bac);
      // On entre par le rôle professeur : c'est là que commence le scénario,
      // avec le téléversement d'un CV.
      await adopterJeton(bac.jetons.prof);
      router.push("/dashboard/prof");
    } finally {
      demarrage.current = false;
    }
  }, [adopter, adopterJeton, router]);

  const changerDeRole = useCallback(
    (role: UserRole) => {
      const jeton = lireJetons()[role];
      if (!jeton) return;
      void adopterJeton(jeton).then(() => router.push(`/dashboard/${role}`));
    },
    [adopterJeton, router]
  );

  const quitter = useCallback(() => {
    oublier();
    logout();
    router.push("/login");
  }, [logout, oublier, router]);

  const resteSecondes = useMemo(() => {
    if (!expireLe) return 0;
    return Math.max(0, Math.floor((expireLe.getTime() - maintenant) / 1000));
  }, [expireLe, maintenant]);

  const value = useMemo(
    () => ({
      estDemo,
      expireLe,
      resteSecondes,
      expire: estDemo && resteSecondes === 0,
      appelsTotal,
      appelsRestants,
      demarrer,
      changerDeRole,
      rafraichir,
      quitter,
    }),
    [
      estDemo,
      expireLe,
      resteSecondes,
      appelsTotal,
      appelsRestants,
      demarrer,
      changerDeRole,
      rafraichir,
      quitter,
    ]
  );

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemo doit être appelé dans un DemoProvider");
  return ctx;
}
