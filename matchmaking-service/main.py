"""
IndieLance — AI Matchmaking Microservice
=========================================
Model  : all-MiniLM-L6-v2  (sentence-transformers, ~90 MB)
Server : FastAPI + uvicorn  (port 8765)

Endpoints
---------
GET  /health                → {"status": "ok", "model": "..."}
POST /match                 → ranked freelancers for a job
POST /recommend-jobs        → ranked jobs for a freelancer

Run with:  python main.py
"""

from __future__ import annotations

import re
from typing import List, Optional

import numpy as np
import uvicorn
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sentence_transformers import SentenceTransformer

# ─── App & model ─────────────────────────────────────────────────────────────

app = FastAPI(title="IndieLance Matchmaking", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_NAME = "all-MiniLM-L6-v2"
print(f"[startup] Loading {MODEL_NAME} …")
_model = SentenceTransformer(MODEL_NAME)
print("[startup] Model ready ✓")

# ─── Helpers ─────────────────────────────────────────────────────────────────

STOP = {
    "a","an","the","and","or","but","in","on","at","to","for","of","with","by",
    "from","is","are","was","were","be","been","have","has","had","do","does","did",
    "will","would","shall","should","may","might","must","can","could","not","no",
    "this","that","these","those","i","me","my","we","our","you","your","he","she",
    "it","they","them","their","very","just","also","well","good","work","use","used",
}

def meaningful_words(text: str) -> set[str]:
    tokens = re.sub(r"[^a-z0-9#+.]", " ", text.lower()).split()
    return {t for t in tokens if len(t) > 2 and t not in STOP}


def skill_overlap(job_skills_str: str, f_skills_str: str) -> tuple[int, list[str]]:
    """Return (overlap_pct, matching_skill_names)."""
    job_skills = [s.strip().lower() for s in job_skills_str.split(",") if s.strip()]
    f_skills   = [s.strip().lower() for s in f_skills_str.split(",")   if s.strip()]
    if not job_skills:
        return 0, []
    matched = [
        s for s in f_skills
        if any(js in s or s in js for js in job_skills)
    ]
    pct = round(len(matched) / len(job_skills) * 100)
    return pct, [s.title() for s in matched[:8]]


def pick_experience(bio: Optional[str], job_words: set[str]) -> str:
    if not bio:
        return "No bio provided."
    sentences = [s.strip() for s in re.split(r"[.!?]", bio) if s.strip()]
    if not sentences:
        return bio[:120]
    best, best_score = sentences[0], 0
    for sent in sentences:
        score = len(meaningful_words(sent) & job_words)
        if score > best_score:
            best, best_score = sent, score
    return best[:120] + ("…" if len(best) > 120 else "")


def cosine(a: np.ndarray, b: np.ndarray) -> float:
    """Normalised dot product (embeddings are already L2-normalised)."""
    return float(np.dot(a, b))

# ─── Request / response models ────────────────────────────────────────────────

class FreelancerIn(BaseModel):
    id: str
    userId: str
    name: str
    skills: str
    bio: Optional[str] = None
    hourlyRate: Optional[float] = None
    availability: Optional[str] = None
    portfolioUrl: Optional[str] = None


class JobIn(BaseModel):
    id: str
    title: str
    description: str
    requiredSkills: str


class MatchRequest(BaseModel):
    job: JobIn
    freelancers: List[FreelancerIn]
    topN: int = 5


class RecommendRequest(BaseModel):
    freelancer: FreelancerIn
    jobs: List[JobIn]
    topN: int = 5

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/health")
def health():
    return {"status": "ok", "model": MODEL_NAME}


@app.post("/match")
def match_freelancers(req: MatchRequest):
    """Rank freelancers for a given job using MiniLM cosine similarity."""
    if not req.freelancers:
        return {"matches": [], "model": MODEL_NAME}

    job = req.job
    job_text = f"{job.title} {job.description} {job.requiredSkills}"
    job_words = meaningful_words(job_text)

    f_texts = [
        f"{f.skills} {f.bio or ''}"
        for f in req.freelancers
    ]

    # Encode everything in one batched call
    all_texts = [job_text] + f_texts
    embeddings = _model.encode(all_texts, normalize_embeddings=True, batch_size=32)
    job_emb = embeddings[0]

    results = []
    for i, f in enumerate(req.freelancers):
        raw = cosine(job_emb, embeddings[i + 1])           # 0..1
        score = min(100, max(0, round(raw * 100)))

        overlap_pct, matching_skills = skill_overlap(job.requiredSkills, f.skills)

        # Shared keywords from bio/skills that appear in job text
        f_words = meaningful_words(f"{f.skills} {f.bio or ''}")
        kw = sorted(f_words & job_words - set(matching_skills_lower := [s.lower() for s in matching_skills]))[:6]

        results.append({
            "freelancerId":      f.id,
            "userId":            f.userId,
            "name":              f.name,
            "skills":            f.skills,
            "bio":               f.bio,
            "hourlyRate":        f.hourlyRate,
            "availability":      f.availability,
            "score":             score,
            "skillOverlapPct":   overlap_pct,
            "matchingSkills":    matching_skills,
            "matchingKeywords":  kw,
            "relevantExperience": pick_experience(f.bio, job_words),
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"matches": results[: req.topN], "model": MODEL_NAME}


@app.post("/recommend-jobs")
def recommend_jobs(req: RecommendRequest):
    """Rank jobs for a given freelancer using MiniLM cosine similarity."""
    if not req.jobs:
        return {"recommendations": [], "model": MODEL_NAME}

    f = req.freelancer
    f_text = f"{f.skills} {f.bio or ''}"
    f_words = meaningful_words(f_text)

    job_texts = [f"{j.title} {j.description} {j.requiredSkills}" for j in req.jobs]

    all_texts = [f_text] + job_texts
    embeddings = _model.encode(all_texts, normalize_embeddings=True, batch_size=32)
    f_emb = embeddings[0]

    results = []
    for i, job in enumerate(req.jobs):
        raw = cosine(f_emb, embeddings[i + 1])
        score = min(100, max(0, round(raw * 100)))

        overlap_pct, matching_skills = skill_overlap(job.requiredSkills, f.skills)
        job_words = meaningful_words(f"{job.title} {job.description} {job.requiredSkills}")
        kw = sorted(f_words & job_words)[:6]

        results.append({
            "jobId":           job.id,
            "title":           job.title,
            "description":     job.description,
            "requiredSkills":  job.requiredSkills,
            "score":           score,
            "skillOverlapPct": overlap_pct,
            "matchingSkills":  matching_skills,
            "matchingKeywords": kw,
        })

    results.sort(key=lambda x: x["score"], reverse=True)
    return {"recommendations": results[: req.topN], "model": MODEL_NAME}


# ─── Entry point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=8765, log_level="info")
