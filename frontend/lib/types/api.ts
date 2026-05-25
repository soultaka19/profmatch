export interface ApiError {
  detail: string;
}

export type UserRole = "prof" | "rh" | "admin";

export interface TokenResponse {
  access_token: string;
  role: UserRole;
  nom_complet: string;
}

export interface UserOut {
  id: number;
  email: string;
  role: UserRole;
  nom_complet: string;
}

// ── CV ──────────────────────────────────────────────────────────────────────

export type CVStatus = "aucun" | "en_cours" | "traite" | "erreur";
export type TaskStatus = "queued" | "processing" | "done" | "error";

export interface CompetenceItem {
  nom: string;
  niveau: number;
  annees_exp: number | null;
}

export interface ExperienceItem {
  titre: string;
  employeur: string | null;
  date_debut: string | null;
  date_fin: string | null;
}

export interface FormationItem {
  diplome: string;
  etablissement: string | null;
  annee: number | null;
}

export interface LangueItem {
  langue: string;
  niveau: string;
}

export interface CVExtracted {
  competences: CompetenceItem[];
  experiences: ExperienceItem[];
  formations: FormationItem[];
  langues: LangueItem[];
}

export interface CVStatusResponse {
  statut: TaskStatus;
  data: CVExtracted | null;
  champs_erreur: string[] | null;
}

export interface CVUploadResponse {
  task_id: string;
}

// ── Affectations ─────────────────────────────────────────────────────────────

export type AffectationStatus = "proposee" | "validee" | "rejetee";

export interface Affectation {
  id: number;
  professeur_id: number;
  cours_id: number;
  session_id: number;
  score_total: number;
  score_comp: number;
  score_exp: number;
  score_hist: number;
  score_sem: number;
  statut: AffectationStatus;
  justification: string | null;
  valide_par: number | null;
  cree_le: string;
}

// ── Pondérations ─────────────────────────────────────────────────────────────

export interface Ponderation {
  session_id: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  xai_actif: boolean;
}

// ── Utilitaires ──────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}

// ── CV (feature cv-upload) ──────────────────────────────────────────────────

export type CVStatut = "en_attente" | "en_cours" | "traite" | "erreur";

export interface CVResponse {
  id: number;
  nom_original: string;
  statut: CVStatut;
  source: "upload" | "manual";
  taille_octets: number;
  mime_type: string;
  televerse_le: string;
  traite_le: string | null;
  message_erreur: string | null;
}

export interface CVTexteResponse {
  texte_brut: string;
}

// ── Sessions ─────────────────────────────────────────────────────────────────

export type Semestre = "printemps" | "ete" | "automne" | "hiver";
export type SessionStatut = "planifiee" | "ouverte" | "fermee";

export interface Session {
  id: number;
  annee: number;
  semestre: Semestre;
  statut: SessionStatut;
  nom: string;
  cree_le: string;
}

// ── Programmes ────────────────────────────────────────────────────────────────

export interface Programme {
  id: number;
  code: string;
  nom: string;
  departement: string | null;
  semestres_admission: Semestre[];
}

// ── Pondérations ─────────────────────────────────────────────────────────────

export interface PonderationsOut {
  session_id: number;
  w1: number;
  w2: number;
  w3: number;
  w4: number;
  xai_actif: boolean;
  mis_a_jour_le: string;
}

// ── Affectations (complet) ────────────────────────────────────────────────────

export type AffectationStatut = "proposee" | "validee" | "rejetee";

export interface AffectationOut {
  id: number;
  session_id: number;
  professeur_id: number;
  cours_id: number;
  score_total: number;
  score_comp: number;
  score_exp: number;
  score_hist: number;
  score_sem: number;
  justification: string | null;
  statut: AffectationStatut;
  valide_par_user_id: number | null;
  valide_le: string | null;
  cree_le: string;
  cours_nom: string | null;
  cours_code: string | null;
  professeur_nom: string | null;
}

// ── Génération ────────────────────────────────────────────────────────────────

export type GenerationPhase = "pending" | "queued" | "processing" | "done" | "error";

export interface GenerationStatus {
  status: GenerationPhase;
  result?: { session_id: number; nb_affectations: number };
  detail?: string;
}

export interface GenerationResponse {
  task_id: string;
  message: string;
}

// ── Admin Utilisateurs ───────────────────────────────────────────────────────

export interface UserAdmin {
  id: number;
  email: string;
  role: UserRole;
  nom_complet: string;
  actif: boolean;
  est_active: boolean;
}

export type CreatableRole = "prof" | "rh";

export interface UserCreateInput {
  email: string;
  role: CreatableRole;
  nom_complet: string;
}

export interface UserUpdateInput {
  nom_complet?: string;
  role?: UserRole;
}

export interface UserCreateResponse {
  user: UserAdmin;
  activation_token: string;
  activation_url: string;
}

export interface ActivateRequest {
  token: string;
  password: string;
}

// ── Étapes de programme ──────────────────────────────────────────────────────

export interface EtapeProgramme {
  id: number;
  ordre: number;
  nom: string | null;
}
