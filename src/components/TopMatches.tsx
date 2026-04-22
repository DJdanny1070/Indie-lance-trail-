"use client";

/**
 * TopMatches.tsx
 * A fully client-side component that calls /api/matchmaking, then renders
 * ranked freelancer cards with score, skill-overlap, shared keywords,
 * and a hire link.
 */

import { useEffect, useState } from "react";
import Link from "next/link";

interface Explanation {
  skillOverlapPct: number;
  matchingSkills: string[];
  matchingKeywords: string[];
  relevantExperience: string;
}

interface MatchResult {
  freelancer: {
    id: string;
    userId: string;
    name: string;
    skills: string;
    bio: string | null;
    hourlyRate: number | null;
    availability: string | null;
  };
  score: number;
  explanation: Explanation;
}

interface Props {
  jobId: string;
  projectTitle: string;
  topN?: number;
}

function ScoreRing({ score }: { score: number }) {
  const radius = 26;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;
  const color =
    score >= 70 ? "var(--success)" : score >= 40 ? "var(--warning)" : "var(--accent)";

  return (
    <svg width="68" height="68" viewBox="0 0 68 68" aria-label={`${score}% match`}>
      {/* Background ring */}
      <circle cx="34" cy="34" r={radius} fill="none" stroke="var(--card-border)" strokeWidth="7" />
      {/* Progress ring */}
      <circle
        cx="34"
        cy="34"
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth="7"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform="rotate(-90 34 34)"
        style={{ transition: "stroke-dashoffset 0.8s ease" }}
      />
      <text x="34" y="38" textAnchor="middle" fontSize="13" fontWeight="700" fill={color}>
        {score}%
      </text>
    </svg>
  );
}

export default function TopMatches({ jobId, projectTitle, topN = 5 }: Props) {
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() =>{
    async function load() {
      try {
        const res = await fetch("/api/matchmaking", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ jobId, topN }),
        });
        if (!res.ok) throw new Error("Failed to fetch matches");
        const data = await res.json();
        setMatches(data.matches ?? []);
      } catch (e: any) {
        setError(e.message ?? "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [jobId, topN]);

  return (
    <section className="top-matches-section animate-fade-in" style={{ animationDelay: "0.2s" }}>
      <div className="top-matches-header">
        <span className="ai-badge">AI Powered</span>
        <h2 className="text-2xl font-bold" style={{ margin: 0 }}>Top Freelancer Matches</h2>
        <p className="text-muted text-sm" style={{ margin: "0.25rem 0 0" }}>
          Ranked by TF-IDF cosine similarity — the more overlap in skills &amp; context, the higher the score.
        </p>
      </div>

      {loading && (
        <div className="matches-loading">
          <span className="spinner" />
          <span>Analysing freelancer profiles…</span>
        </div>
      )}

      {error && (
        <div className="matches-error">Could not load matches: {error}</div>
      )}

      {!loading && !error && matches.length === 0 && (
        <div className="text-muted text-center" style={{ padding: "2rem 0" }}>
          No matching freelancers found yet. More will appear as freelancers join.
        </div>
      )}

      {!loading && !error && matches.length >0 && (
        <ol className="match-list">
          {matches.map((m, idx) =>(
            <li key={m.freelancer.id} className="match-card glass animate-fade-in" style={{ animationDelay: `${idx * 0.08}s` }}>
              {/* Rank badge */}
              <div className="match-rank">#{idx + 1}</div>

              {/* Avatar */}
              <div className="match-avatar">
                {m.freelancer.name.charAt(0).toUpperCase()}
              </div>

              {/* Details */}
              <div className="match-details">
                <div className="match-name">{m.freelancer.name}</div>
                {m.freelancer.hourlyRate && (
                  <div className="match-rate">₹{m.freelancer.hourlyRate}/hr</div>
                )}

                {/* Explanation pill */}
                <div className="match-explanation">
                  <span className="explanation-label">
                     Matched because: <strong>{m.explanation.skillOverlapPct}% skill match</strong>
                    {m.explanation.matchingSkills.length >0 && (
                      <>, shared skills: <em>{m.explanation.matchingSkills.slice(0, 4).join(", ")}</em></>
                    )}
                  </span>
                </div>

                {/* Relevant experience */}
                {m.explanation.relevantExperience && m.explanation.relevantExperience !== "No bio provided." && (
                  <div className="match-experience">
                     {m.explanation.relevantExperience}
                  </div>
                )}

                {/* Skill tags */}
                <div className="match-skills">
                  {m.freelancer.skills.split(",").slice(0, 5).map((s, i) =>{
                    const normalised = s.trim().toLowerCase();
                    const isMatch = m.explanation.matchingSkills
                      .map(k =>k.toLowerCase())
                      .includes(normalised);
                    return (
                      <span
                        key={i}
                        className={`skill-tag ${isMatch ? "skill-tag--match" : ""}`}
                      >
                        {isMatch && " "}{s.trim()}
                      </span>
                    );
                  })}
                </div>

                {/* Matching keywords */}
                {m.explanation.matchingKeywords.length >0 && (
                  <div className="match-keywords">
                    <span className="keywords-label">Keywords:</span>
                    {m.explanation.matchingKeywords.slice(0, 6).map((kw, i) =>(
                      <span key={i} className="keyword-tag">{kw}</span>
                    ))}
                  </div>
                )}
              </div>

              {/* Score + CTA */}
              <div className="match-cta">
                <ScoreRing score={m.score} />
                <Link
                  href={`/freelancer/${m.freelancer.userId}`}
                  className="btn btn-outline"
                  style={{ fontSize: "0.8rem", padding: "0.4rem 0.8rem" }}
                >
                  View Profile
                </Link>
                <Link
                  href={`/freelancer/${m.freelancer.userId}`}
                  className="btn btn-primary hire-btn"
                >
                  Hire
                </Link>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
