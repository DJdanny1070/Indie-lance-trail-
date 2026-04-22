/**
 * ai-client.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Hybrid matchmaking client for IndieLance.
 *
 * Strategy (per request):
 *   1. Try the Python all-MiniLM-L6-v2 microservice at http://127.0.0.1:8765
 *   2. On any failure (service offline, timeout, error) → fall back to the
 *      built-in TF-IDF + cosine similarity engine (zero-dependency, instant).
 *
 * The returned object always includes a `"model"` field so the UI can show
 * which engine was used:
 *   "all-MiniLM-L6-v2"  → neural embeddings (Python)
 *   "TF-IDF"            → local TypeScript fallback
 * ─────────────────────────────────────────────────────────────────────────────
 */

import {
  matchFreelancersToJob,
  matchJobsToFreelancer,
  type FreelancerDoc,
  type JobDoc,
  type MatchResult,
  type JobMatchResult,
} from "./matchmaking";

const AI_SERVICE = "http://127.0.0.1:8765";
const TIMEOUT_MS = 5000; // give the Python service 5 s before giving up

// ─── Fetch with timeout ───────────────────────────────────────────────────────

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response>{
  const controller = new AbortController();
  const id = setTimeout(() =>controller.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(id);
  }
}

// ─── Shape the Python response into the same MatchResult shape our UI uses ──

function shapeMatchResults(raw: any[]): MatchResult[] {
  return raw.map((m: any) =>({
    freelancer: {
      id:           m.freelancerId,
      userId:       m.userId,
      name:         m.name,
      skills:       m.skills ?? "",
      bio:          m.bio ?? null,
      hourlyRate:   m.hourlyRate ?? null,
      availability: m.availability ?? null,
      portfolioUrl: null,
    },
    score: m.score,
    explanation: {
      skillOverlapPct:   m.skillOverlapPct,
      matchingSkills:    m.matchingSkills   ?? [],
      matchingKeywords:  m.matchingKeywords ?? [],
      relevantExperience: m.relevantExperience ?? "No bio provided.",
    },
  }));
}

function shapeJobResults(raw: any[]): JobMatchResult[] {
  return raw.map((r: any) =>({
    job: {
      id:             r.jobId,
      title:          r.title,
      description:    r.description,
      requiredSkills: r.requiredSkills,
    },
    score: r.score,
    explanation: {
      skillOverlapPct:   r.skillOverlapPct,
      matchingSkills:    r.matchingSkills   ?? [],
      matchingKeywords:  r.matchingKeywords ?? [],
      relevantExperience: "Based on your profile",
    },
  }));
}

// ─── Public API ───────────────────────────────────────────────────────────────

export interface MatchResponse {
  matches: MatchResult[];
  model: string;   // "all-MiniLM-L6-v2" | "TF-IDF"
}

export interface JobRecommendResponse {
  recommendations: JobMatchResult[];
  model: string;
}

/**
 * Rank freelancers for a job.
 * Tries all-MiniLM-L6-v2 first, falls back to TF-IDF.
 */
export async function aiMatchFreelancers(
  job: JobDoc,
  freelancers: FreelancerDoc[],
  topN = 5
): Promise<MatchResponse>{
  // ── Try Python AI service ────────────────────────────────────────────────
  try {
    const res = await fetchWithTimeout(`${AI_SERVICE}/match`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job, freelancers, topN }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        matches: shapeMatchResults(data.matches ?? []),
        model:   data.model ?? "all-MiniLM-L6-v2",
      };
    }
  } catch {
    // timeout or service unavailable → silently fall through
  }

  // ── TF-IDF fallback ──────────────────────────────────────────────────────
  return {
    matches: matchFreelancersToJob(job, freelancers, topN),
    model:   "TF-IDF",
  };
}

/**
 * Rank jobs for a freelancer.
 * Tries all-MiniLM-L6-v2 first, falls back to TF-IDF.
 */
export async function aiRecommendJobs(
  freelancer: FreelancerDoc,
  jobs: JobDoc[],
  topN = 5
): Promise<JobRecommendResponse>{
  // ── Try Python AI service ────────────────────────────────────────────────
  try {
    const res = await fetchWithTimeout(`${AI_SERVICE}/recommend-jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ freelancer, jobs, topN }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        recommendations: shapeJobResults(data.recommendations ?? []),
        model:           data.model ?? "all-MiniLM-L6-v2",
      };
    }
  } catch {
    // timeout or service unavailable → fall through
  }

  // ── TF-IDF fallback ──────────────────────────────────────────────────────
  return {
    recommendations: matchJobsToFreelancer(freelancer, jobs, topN),
    model:           "TF-IDF",
  };
}
