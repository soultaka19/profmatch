# ProfMatch

> 🇫🇷 Version française (guide d'installation remis au jury) : [README.fr.md](README.fr.md).

## Overview

ProfMatch is a multi-role web application that turns teacher CVs into structured
profiles and proposes teacher-to-course assignments for a college HR department,
with an explainable justification behind every proposal.

It was built for the *Défi Informatique La Cité 2026* competition (2nd edition)
by a team of four; the repository is fully containerised (`docker compose up`)
and covers the whole flow: CV upload → LLM extraction → weighted scoring →
assignment proposals → HR validation.

## Problem

Assigning teachers to courses each semester is a manual HR task: CVs arrive as
PDF or DOCX files, skills and experience have to be re-read for every course,
and the resulting choices are hard to defend. Two concrete pain points:

- **Unstructured data.** Nothing in a CV file is queryable — skills, experience
  duration, education and languages have to be extracted by hand.
- **Opaque decisions.** Once an assignment is made, there is no record of *why*
  this teacher fits this course, which makes review and arbitration difficult.

## Solution

ProfMatch keeps the decision deterministic and the narration optional:

1. A teacher uploads a CV (PDF/DOCX). Text extraction runs in a Celery worker,
   then an LLM turns it into a structured profile (skills, experience,
   education, languages) that the teacher can review and correct.
2. HR generates assignments for an academic session. Each teacher/course pair
   gets a weighted score
   `Score = W1·skills + W2·experience + W3·history + W4·semantic`, with the
   invariant `W1+W2+W3+W4 = 1.0` enforced in the API, the frontend and a
   PostgreSQL `CHECK` constraint. W4 uses embeddings from the provider's API.
3. Every proposal is committed with a **static, rule-based justification**
   (which skills are covered, how many years of experience, past assignments).
   A background Celery task then asks the LLM for a narrative version; if the
   LLM is slow or unavailable the static justification stays — the feature
   degrades, it never blocks.

## Key Features

- **CV pipeline** — upload (PDF/DOCX, size limit configurable, default 10 MB),
  asynchronous text extraction, LLM structuring, per-field manual correction by
  the teacher, status tracking (`en_attente` → `en_cours` → `traite`/`erreur`).
- **Academic catalogue** — programmes, programme steps, courses, course/skill
  mapping, admission semesters, academic sessions.
- **Weighted assignment engine** — per-session W1–W4 weights, top-N candidates
  per course, programmes filtered by their admission semester.
- **Explainability (XAI)** — a detail endpoint exposing each component score and
  the covered skills, plus lazy LLM narration with a static fallback and an
  explicit `justification_statut` (`statique` / `enrichie` / `echec`).
- **HR workflow** — proposal review, manual assignment, validation/rejection,
  feedback, session history.
- **Roles and accounts** — `prof` / `rh` / `admin` enforced server-side on 76 of
  79 API operations, JWT authentication, admin-created accounts activated
  through a one-shot token link, soft delete/restore.
- **Admin tooling** — platform statistics and an idempotent demo dataset
  (programmes, courses, ~11 teachers with processed CVs) loadable from the UI.

## My Role

Lead developer on a four-person competition team: architecture, backend
pipeline, frontend, CI and Docker.

For transparency, here is what the repository itself records: **58 commits, all
authored from my account**, with co-author trailers crediting two teammates
(Mamadou GB on 3 commits, Arole Kenfack on 1). That distribution reflects how
the team worked under competition conditions — pairing, with one person pushing
— and should be read as a record of the commit workflow, not as a measurement of
each person's contribution. The team is listed in
[README.fr.md](README.fr.md).

Several commits also carry `Co-Authored-By: Claude` trailers: parts of this
codebase were written with an AI assistant, and the history says so rather than
hiding it.

## Architecture

```
Next.js 16 (App Router)          FastAPI                    PostgreSQL 16
┌───────────────────┐   REST    ┌──────────────────┐       ┌──────────────┐
│ pages + components├──────────►│ routers          │──────►│ 15 Alembic   │
│ lib/api (fetch)   │◄──────────┤ services         │       │ migrations   │
│ SWR polling (2 s) │           │ core (auth/conf) │       └──────────────┘
└───────────────────┘           └────────┬─────────┘
                                         │ enqueue
                                    ┌────▼─────┐   Redis 7   ┌──────────────┐
                                    │ Celery   │◄───────────►│ broker/result│
                                    │ worker   │             └──────────────┘
                                    └────┬─────┘
                       CV text ─────────►│◄───────── LLM + embeddings
                       extraction        │           (OpenAI-compatible API)
```

Backend layering is `routers → services → models/schemas`, with `core` holding
configuration, security and FastAPI dependencies, and `tasks` holding the Celery
jobs (CV text extraction, LLM extraction, assignment generation, XAI
enrichment). The frontend centralises every HTTP call in `lib/api`; route
protection is client-side (`ProtectedRoute`), authorisation is enforced by the
API.

```
profmatch/
├── backend/            # FastAPI + Celery (15 routers, 19 services, 17 models)
│   ├── app/{core,models,schemas,services,routers,tasks}/
│   ├── alembic/        # 15 migrations
│   ├── scripts/        # demo seeds + LLM diagnostics
│   └── tests/          # pytest suite + fixtures
├── frontend/           # Next.js 16 + React 19 (18 routes)
│   ├── app/ components/ lib/
├── docker-compose.yml  # frontend, backend, worker, db, redis
└── .env.example
```

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript (strict), Tailwind CSS 3, shadcn/ui (Radix), SWR, react-hook-form + zod, Vitest + Testing Library |
| Backend | Python 3.12, FastAPI, SQLAlchemy 2.0 (async, asyncpg), Pydantic v2, Alembic, pytest |
| Async | Celery 5 + Redis 7 |
| Database | PostgreSQL 16 |
| AI | LLM and embeddings (384 dimensions) through one OpenAI-compatible endpoint — Google Gemini by default; `pdfplumber` / `python-docx` for text extraction |
| Tooling | ruff, pytest-cov, ESLint, tsc, GitHub Actions, Docker / Docker Compose |

## Technical Highlights

- **Decision/narration decoupling.** The scoring result is committed with a
  deterministic justification before any LLM call; narration is enriched later
  by an idempotent, single-attempt Celery task. A dead or slow LLM downgrades
  the wording, never the assignment.
- **Weight invariant enforced three times.** `W1+W2+W3+W4 = 1.0` (±0.001) is
  validated in the scoring dataclass, in the API schema and by the
  `ck_ponderations_somme_1` PostgreSQL CHECK constraint.
- **Embeddings normalised in-house.** The provider only returns unit vectors
  at its native dimensionality; truncated to 384, a `gemini-embedding-001`
  vector has a measured norm of **0.44**. Since `cosine_similarity` reduces the
  comparison to a dot product *assuming* unit vectors, skipping normalisation
  would silently flatten every W4 score toward 0.5 without raising anything.
- **Deterministic embeddings in tests.** An autouse fixture replaces only the
  network call with a hash-based encoder, deliberately un-normalised: the real
  `compute_embedding` path — normalisation included — is still exercised.
- **Graceful CV failures.** Unreadable or spoofed files end as
  `statut = erreur` with a user-facing message, after bounded worker retries.
- **Migrations verified.** `alembic check` reports no drift between models and
  schema, and the 15 migrations downgrade back to base cleanly.

## Challenges & Solutions

| Challenge | Solution |
|---|---|
| LLM latency and outages during a live demo | Static justification committed first, LLM narration enqueued separately with its own timeout (`LLM_XAI_TIMEOUT_S`) and an explicit `echec` status when it fails |
| Local embeddings made the image too heavy to host: 0.63 GB image and 632 MB of worker memory, above the 512 MB of free tiers | Embeddings moved to the provider's API, reusing the same client and key. Image down to 0.21 GB, worker to 198 MB. Changing `EMBEDDING_MODEL` invalidates every stored vector, so `POST /api/admin/maintenance/backfill-embeddings?force=true` recomputes them all |
| Celery worker needs a synchronous DB session while the API is async | Dedicated sync session factory in the worker (`psycopg2`), async engine everywhere else |
| Reproducible builds | Exact version pins in `pyproject.toml` (single source of truth, no `requirements.txt`), `npm ci` from a committed lockfile in CI and in the frontend image |
| `NEXT_PUBLIC_*` values are inlined at build time | Build arg `NEXT_PUBLIC_API_URL` in the frontend Dockerfile, passed by `docker-compose.yml` (`build.args`) |

## Installation

Docker is the supported path — no local Python, Node or PostgreSQL needed.

```bash
git clone <repository-url>
cd profmatch
cp .env.example .env      # then fill SECRET_KEY, DATABASE_URL, LLM_* (see below)
docker compose up --build
```

**Network requirements for the first build** (all documented because they fail
hard when blocked):

| Step | Needs access to | Note |
|---|---|---|
| Backend image | PyPI | Pinned dependencies from `pyproject.toml` |
| Frontend image | `fonts.googleapis.com` | `next/font/google` fetches the fonts at build time and the production build fails without it |
| Runtime | `generativelanguage.googleapis.com` | CV extraction, XAI narration and W4 embeddings all call the provider's API |

The backend image used to bundle PyTorch and the `all-MiniLM-L6-v2` model to
compute W4 embeddings locally — a multi-gigabyte cold build. Embeddings are now
computed by the provider's API, which cut the image from **0.63 GB to 0.21 GB**
and the worker's resident memory from **632 MB to 198 MB** (measured), bringing
it under the 512 MB ceiling of free hosting tiers.

Local development without Docker (backend):

```bash
cd backend
python -m venv .venv && . .venv/bin/activate     # Python 3.12
pip install -e ".[dev]"
alembic upgrade head
uvicorn app.main:app --reload
celery -A app.worker worker --loglevel=info      # in a second shell
```

```bash
cd frontend
npm ci
npm run dev
```

## Environment Variables

Copy `.env.example` to `.env` at the repository root. Docker Compose reads that
file and overrides `DATABASE_URL`, `REDIS_URL`, `UPLOADS_DIR`,
`CELERY_ALWAYS_EAGER` and `SEED_DEMO_ACCOUNTS_ON_START` for the containers.

| Variable | Required | Description |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | yes (Docker) | Credentials of the `db` service |
| `DATABASE_URL` | yes | `postgresql+asyncpg://user:password@host:5432/profmatch` |
| `TEST_DATABASE_URL` | for tests | Separate database used by pytest — the schema is dropped and recreated for every test, never point it at a database you care about |
| `REDIS_URL` | yes | Celery broker and result backend |
| `CELERY_ALWAYS_EAGER` | no (default `false`) | Keep `false` — see *Known limitations* |
| `SEED_DEMO_ACCOUNTS_ON_START` | no (default `false`) | `true` makes the backend entrypoint run `scripts/seed_demo.py` after the migrations (idempotent, non-fatal). `docker-compose.yml` sets it to `true` for demo/jury mode |
| `SECRET_KEY` | yes | JWT signing key — `python -c "import secrets; print(secrets.token_hex(32))"` |
| `JWT_ALGORITHM` / `JWT_TTL_HOURS` | no | Defaults `HS256` / `24` |
| `LLM_API_URL` | yes | Base URL of an **OpenAI-compatible** endpoint (`.../v1`). The project was built against the competition's endpoint (CoCalc proxy, model `gpt-oss-ctx24k:120b`), but any OpenAI-compatible endpoint works |
| `LLM_MODEL` | no | Model name sent to that endpoint |
| `LLM_API_KEY` | yes in practice | Bearer key of the endpoint |
| `LLM_API_COOKIE` | competition only | Cookie required by the competition's CoCalc proxy; leave empty for a standard endpoint |
| `LLM_MAX_RETRIES`, `LLM_EXTRACTION_TIMEOUT_S`, `LLM_XAI_TIMEOUT_S` | no | Retry count and per-call timeouts (defaults `2` / `90` / `45`) |
| `UPLOADS_DIR` | no | Where CV files are stored (`/uploads` volume in Docker) |
| `MAX_UPLOAD_SIZE_MB` | no (default `10`) | Upload size limit enforced by `POST /api/cv/upload` |
| `FRONTEND_URL` | no (default `http://localhost:3000`) | Added to the CORS allow-list (localhost:3000 always allowed) and used to build activation links |
| `NEXT_PUBLIC_API_URL` | build-time | API URL inlined into the frontend bundles at build time — pass it as a **build arg** (Compose already does), a runtime-only value has no effect |

No secret is hard-coded in the source; `.env` is git-ignored.

## Running the Project

| Service | URL |
|---|---|
| Web interface | http://localhost:3000 |
| API | http://localhost:8000 |
| Swagger UI | http://localhost:8000/docs |

Demo accounts are created at start-up when `SEED_DEMO_ACCOUNTS_ON_START=true`
(the value shipped in `docker-compose.yml`): `prof@defi-lacite.ca`,
`rh@defi-lacite.ca`, `admin@defi-lacite.ca`. The passwords are in
`backend/scripts/seed_demo.py` — they are demo credentials, change them before
any real deployment. A richer dataset (programmes, courses, teachers with
processed CVs) can be loaded from the admin dashboard; the operation is
idempotent.

```bash
docker compose logs -f backend        # follow logs
docker compose down                   # stop
docker compose down -v                # stop and drop the database
docker compose -f docker-compose.yml -f docker-compose.dev.yml up  # hot reload
```

### Known limitations

- `CELERY_ALWAYS_EAGER=true` (running tasks inside the API process) breaks
  `POST /api/cv/upload` and `POST /api/affectations/generer`. Keep it `false`
  and run the worker.
- `POST /api/admin/maintenance/seed-demo` is not atomic: each seed script
  commits its own transaction, so a failure of the final embedding backfill
  returns a 500 with the database already partially populated (re-running is
  safe, it is idempotent).
- The JWT is stored in `localStorage` and has no revocation list; a deactivated
  account is rejected on every request, but a stolen token stays valid until it
  expires. There is no rate limiting on `/api/auth/login`, and activation tokens
  are stored unhashed.
- File type validation relies on the client MIME type and the extension, not on
  the file signature; a spoofed file is accepted and then fails cleanly in the
  worker.

## Testing

Backend tests need a **separate** PostgreSQL database and `TEST_DATABASE_URL`
pointing at it (the schema is dropped and recreated for each test). The binary
CV fixtures live in `backend/tests/fixtures`; if they are missing, regenerate
them with the project's own script:

```bash
cd backend
python tests/fixtures/_generate.py   # writes cv_sample.pdf/.docx, cv_corrupt.pdf, cv_image_only.pdf
pytest --cov=app                     # 440 tests, 84 % coverage
ruff check app tests
ruff format --check app tests
```

No test calls the real LLM or downloads a model: an autouse fixture mocks the
LLM client, and another replaces the embedding model with a deterministic
hash-based encoder.

```bash
cd frontend
npm run test          # 59 files, 209 tests (Vitest + Testing Library)
npm run type-check    # tsc --noEmit, strict
npm run lint          # eslint
```

GitHub Actions runs both suites (`.github/workflows/backend-ci.yml` with
PostgreSQL and Redis services, ruff and a 70 % coverage gate;
`.github/workflows/frontend-ci.yml` with `npm ci`, type-check and lint). The
backend workflow reads its database and LLM settings from repository secrets
(`TEST_DATABASE_URL`, `SECRET_KEY`, `LLM_*`).

## Production Build

```bash
docker compose up --build            # full stack
```

Frontend only:

```bash
cd frontend
NEXT_PUBLIC_API_URL=https://api.example.com npm run build   # value inlined into the bundles
```

The frontend image builds Next.js in `standalone` output mode and copies only
`.next/standalone`, `.next/static` and `public` into the runtime stage. The
build needs network access to `fonts.googleapis.com` (see *Installation*).

## Future Improvements

- Verify uploaded files by signature (`%PDF-`, ZIP header) and stream them to
  disk instead of reading them fully in memory.
- Hash activation tokens, add rate limiting on the login endpoint, and move the
  JWT to an `httpOnly` cookie.
- Fix or remove the `CELERY_ALWAYS_EAGER` path, and make the demo seed atomic.
- Self-host the fonts (`next/font/local`) to remove the build-time dependency on
  Google Fonts.
- Raise coverage on the CRUD routers (`extraction`, `utilisateurs`,
  `programmes`, `etapes`, `cursus`) and on `tasks/affectation_tasks.py`.
- Replace the unmaintained `passlib` with a maintained hashing library, and
  speed up the test suite by creating the schema once per session with
  per-test transaction rollback.
