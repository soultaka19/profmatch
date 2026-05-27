"use client";

import useSWR from "swr";
import { rhProfesseursApi } from "@/lib/api/rhProfesseurs";

const PAGE_SIZE = 10;

export function useRhProfesseurs(page: number, q: string, pageSize: number = PAGE_SIZE) {
  return useSWR(
    ["rh-professeurs", page, q, pageSize],
    () => rhProfesseursApi.list({ page, pageSize, q }),
    { keepPreviousData: true, revalidateOnFocus: false },
  );
}

export function useRhProfesseurDetail(professeurId: number | null) {
  return useSWR(
    professeurId !== null ? ["rh-professeur-detail", professeurId] : null,
    () => rhProfesseursApi.get(professeurId as number),
    { revalidateOnFocus: false, shouldRetryOnError: false },
  );
}

export const RH_PROFESSEURS_PAGE_SIZE = PAGE_SIZE;
