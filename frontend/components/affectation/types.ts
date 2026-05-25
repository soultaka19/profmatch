import type { EtapeProgramme, Programme, Session } from "@/lib/types/api";
import type { Weights } from "./WeightSliders";

export interface GenerationScope {
  session: Pick<Session, "id" | "nom">;
  programmes: Array<Pick<Programme, "id" | "code" | "nom">>;
  etapes: Array<EtapeProgramme & { programmeId: number; programmeCode: string }>;
  weights: Weights;
}

export interface ActionFeedback {
  tone: "success" | "error";
  message: string;
}
