export type RecommendationFilter = "all" | "forte" | "reserves" | "examiner";

export function getRecommendationFilter(total: number): Exclude<RecommendationFilter, "all"> {
  if (Number(total) >= 0.8) return "forte";
  if (Number(total) >= 0.6) return "reserves";
  return "examiner";
}
