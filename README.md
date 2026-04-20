# Content Repurposing Engine

Content Repurposing Engine converts long-form video into short-form clips optimized for TikTok, YouTube Shorts, and Instagram Reels.

Upload a video (or paste a YouTube URL), and the engine automatically transcribes it, identifies the most engaging moments using LLMs, extracts clips, burns in captions, and reframes them to portrait 9:16 — all with real-time progress streaming.

> **Live:** [studio.leonardseanchua.dev](https://studio.leonardseanchua.dev)

---

## Architecture

The system is split into three independently deployable components:

```
client/        React SPA — project dashboard, upload UI, clip viewer
server/        Bun + Elysia API — auth, job dispatch, SSE progress streaming
workers/       Python — transcription, LLM analysis, FFmpeg processing
infra/         Terraform — AWS ECS Fargate, RDS, S3, CloudFront, ALB
```

**How a job runs in production:**

1. User uploads a video → API stores it in S3 and creates a job record in PostgreSQL
2. API calls `ecs:RunTask` to spin up an **ephemeral Fargate container** for the worker
3. Worker runs the full pipeline (transcribe → analyze → clip → caption → reframe), writing progress to the DB at each stage
4. User sees live progress via **Server-Sent Events** (SSE) polling the job status
5. Worker exits cleanly — container is destroyed, no idle compute

Locally, step 2 spawns a Python subprocess instead, giving an identical developer experience with no cloud dependencies.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS |
| **Backend** | Bun, Elysia, Drizzle ORM, PostgreSQL |
| **Workers** | Python 3.12, uv, Groq (Whisper), Gemini / OpenAI, FFmpeg, boto3 |
| **Auth** | Google OAuth 2.0 (Arctic), JWT |
| **Billing** | Stripe Subscriptions + Webhooks |
| **Infrastructure** | AWS ECS Fargate, RDS PostgreSQL, S3, CloudFront, ALB |
| **IaC** | Terraform (modular — networking, compute, cdn, secrets, cicd) |
| **CI/CD** | GitHub Actions — OIDC auth (zero static credentials), ECR push, rolling ECS deploy |

---

## Key Design Decisions

**Event-driven, ephemeral workers** — Workers are ECS Fargate tasks launched on-demand via `ecs:RunTask`. They start, process one job, and exit. This eliminates always-on worker costs (~$18/mo saved) and Redis/BullMQ entirely.

**Single-domain routing via CloudFront** — `/api/*` routes to the ALB, `/storage/*` routes to S3 media, and `/*` serves the React SPA. No CORS configuration needed.

**No NAT Gateway** — ECS tasks run in public subnets with assigned public IPs, reaching ECR and CloudWatch directly via the Internet Gateway. This avoids a $32+/mo NAT Gateway.

**Secrets at runtime** — All secrets live in AWS SSM Parameter Store and are injected into ECS containers at startup. GitHub Actions only stores the IAM Role ARN (non-sensitive).

---

## Local Development

### Prerequisites

- [Docker](https://docs.docker.com/get-docker/) — for PostgreSQL
- [Bun](https://bun.sh/) — API server runtime
- [Python 3.12+](https://www.python.org/) + [uv](https://github.com/astral-sh/uv) — workers
- [FFmpeg](https://ffmpeg.org/download.html) — in your `$PATH`

### Setup

```bash
# 1. Clone and configure environment
cp .env.example .env
# Fill in: GROQ_API_KEY, GEMINI_API_KEY, Google OAuth, Stripe keys

# 2. Start the full stack
./dev.sh
```

`dev.sh` starts PostgreSQL (Docker), the Bun API server, and the Vite dev server concurrently. Workers are spawned automatically when a job is triggered — no separate process needed.

**Manual startup** (for isolated debugging):

```bash
docker compose up -d postgres    # Database
cd server && bun run dev         # API  → http://localhost:3000
cd client && npm run dev         # SPA  → http://localhost:5173
```

**Stripe webhooks (optional):**
```bash
stripe listen --forward-to localhost:3000/webhooks/stripe
```

---

## Pipeline Stages

Each job runs through five sequential stages, with progress reported to the database after each:

| Stage | What happens |
|-------|-------------|
| **Transcribe** | Groq Whisper Large V3 cloud API converts audio to timestamped transcript |
| **Analyze** | Gemini / OpenAI scores transcript segments for virality and engagement |
| **Clip** | FFmpeg extracts the top-scoring segments from the source video |
| **Caption** | Subtitles are hardcoded (burned in) to each clip |
| **Reframe** | Clips are converted from 16:9 landscape to 9:16 portrait |

---

## Infrastructure (AWS)

Managed with Terraform. Modules live under `infra/modules/`:

- `networking` — VPC, subnets, security groups, IGW
- `database` — RDS PostgreSQL `db.t3.micro` (free tier)
- `storage` — S3 buckets for SPA and media, CloudFront OAC
- `compute` — ECS cluster, ALB, API service, worker task definition, IAM roles
- `cdn` — CloudFront distribution, ACM certificates
- `secrets` — SSM Parameter Store
- `cicd` — GitHub OIDC provider, deploy IAM role, ECR repositories

**Estimated monthly cost:** ~$36/mo (ECS API ~$9, ALB ~$16, Public IPs ~$11; S3/CloudFront/RDS on free tier)

**CI/CD:**

- `ci.yml` — runs on PRs: lint (Biome + Ruff), type check, tests
- `deploy.yml` — runs on `main`: builds & pushes Docker images to ECR, updates ECS service, syncs SPA to S3, invalidates CloudFront
- `drift-detection.yml` — runs daily: `terraform plan` to catch any manual changes in AWS