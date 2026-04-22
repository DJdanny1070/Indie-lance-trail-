/**
 * matchmaking.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Real AI-based matchmaking engine for IndieLance.
 * Uses TF-IDF vectorisation + cosine similarity — no external dependencies.
 *
 * Public API
 *   matchFreelancersToJob(job, freelancers, topN?)  → MatchResult[]
 *   matchJobsToFreelancer(freelancer, jobs, topN?)  → JobMatchResult[]
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Stop-words to ignore during tokenisation ─────────────────────────────────
const STOP_WORDS = new Set([
  "a","an","the","and","or","but","in","on","at","to","for","of","with",
  "by","from","is","are","was","were","be","been","being","have","has","had",
  "do","does","did","will","would","shall","should","may","might","must","can",
  "could","not","no","nor","so","yet","both","either","neither","one","two",
  "i","me","my","we","our","you","your","he","she","it","they","them","their",
  "this","that","these","those","what","which","who","whom","when","where",
  "why","how","all","any","each","few","more","most","other","some","such",
  "than","then","so","very","just","also","well","good","work","experience",
  "years","year","looking","need","required","must","ability","strong","using",
  "use","used","new","create","build","develop","knowledge","understanding",
]);

// ─── Text utilities ────────────────────────────────────────────────────────────

/** Normalise and tokenise a string into meaningful terms. */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9#+.]/g, " ")   // keep C#, C++, .NET tokens
    .split(/\s+/)
    .map(t =>t.trim())
    .filter(t =>t.length >1 && !STOP_WORDS.has(t));
}

/** Build a term-frequency map for a token list. */
function termFrequency(tokens: string[]): Map<string, number>{
  const tf = new Map<string, number>();
  for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
  // normalise by document length
  for (const [k, v] of tf) tf.set(k, v / tokens.length);
  return tf;
}

/** Build the IDF lookup across all documents. */
function buildIDF(documents: string[][]): Map<string, number>{
  const N = documents.length;
  const df = new Map<string, number>();
  for (const doc of documents) {
    const unique = new Set(doc);
    for (const t of unique) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [term, count] of df) {
    idf.set(term, Math.log((N + 1) / (count + 1)) + 1); // smoothed IDF
  }
  return idf;
}

/** Produce a TF-IDF weight vector for a single document. */
function tfidfVector(
  tokens: string[],
  idf: Map<string, number>
): Map<string, number>{
  const tf = termFrequency(tokens);
  const vec = new Map<string, number>();
  for (const [term, tfVal] of tf) {
    vec.set(term, tfVal * (idf.get(term) ?? 1));
  }
  return vec;
}

/** Cosine similarity between two sparse vectors (Maps). */
function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (const [k, v] of a) {
    dot += v * (b.get(k) ?? 0);
    magA += v * v;
  }
  for (const v of b.values()) magB += v * v;
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

// ─── Domain types ─────────────────────────────────────────────────────────────

export interface FreelancerDoc {
  id: string;          // FreelancerProfile.id
  userId: string;
  name: string;
  skills: string;      // comma-separated
  bio: string | null;
  availability: string | null;
  hourlyRate: number | null;
  portfolioUrl: string | null;
}

export interface JobDoc {
  id: string;          // Project.id
  title: string;
  description: string;
  requiredSkills: string; // comma-separated
}

export interface MatchExplanation {
  skillOverlapPct: number;     // 0-100
  matchingKeywords: string[];
  matchingSkills: string[];
  relevantExperience: string;  // short sentence
}

export interface MatchResult {
  freelancer: FreelancerDoc;
  score: number;           // 0-100
  explanation: MatchExplanation;
}

export interface JobMatchResult {
  job: JobDoc;
  score: number;
  explanation: MatchExplanation;
}

// ─── Text builders ────────────────────────────────────────────────────────────

function freelancerText(f: FreelancerDoc): string {
  return [f.skills, f.bio ?? ""].join(" ");
}

function jobText(j: JobDoc): string {
  return [j.title, j.description, j.requiredSkills].join(" ");
}

// ─── Explainability helpers ───────────────────────────────────────────────────

function buildExplanation(
  jobSkills: string[],
  freelancerSkills: string[],
  jobTokens: string[],
  freelancerTokens: string[],
  freelancerBio: string | null
): MatchExplanation {
  // Normalise
  const normJob = jobSkills.map(s =>s.trim().toLowerCase());
  const normFreelancer = freelancerSkills.map(s =>s.trim().toLowerCase());

  const matchingSkills = normFreelancer.filter(s =>normJob.includes(s));
  const skillOverlapPct =
    normJob.length >0
      ? Math.round((matchingSkills.length / normJob.length) * 100)
      : 0;

  // Shared keywords (beyond skills)
  const jobTokenSet = new Set(jobTokens);
  const sharedKeywords = [...new Set(
    freelancerTokens.filter(t =>jobTokenSet.has(t) && !STOP_WORDS.has(t))
  )].slice(0, 8);

  // Brief experience sentence from bio
  let relevantExperience = "No bio provided.";
  if (freelancerBio) {
    const sentences = freelancerBio.split(/[.!?]+/).map(s =>s.trim()).filter(Boolean);
    // pick the sentence that has the most overlap with job tokens
    let best = sentences[0] ?? "";
    let bestCount = 0;
    for (const sent of sentences) {
      const tokens = new Set(tokenize(sent));
      const overlap = [...tokens].filter(t =>jobTokenSet.has(t)).length;
      if (overlap >bestCount) { bestCount = overlap; best = sent; }
    }
    relevantExperience = best.length >120 ? best.slice(0, 120) + "…" : best;
  }

  return {
    skillOverlapPct,
    matchingSkills: matchingSkills.map(s =>
      s.charAt(0).toUpperCase() + s.slice(1)
    ),
    matchingKeywords: sharedKeywords,
    relevantExperience,
  };
}

// ─── Main public functions ────────────────────────────────────────────────────

/**
 * Rank freelancers for a given job using TF-IDF + cosine similarity.
 * Returns the top-N results sorted by score descending.
 */
export function matchFreelancersToJob(
  job: JobDoc,
  freelancers: FreelancerDoc[],
  topN = 10
): MatchResult[] {
  if (freelancers.length === 0) return [];

  const jobTxt = jobText(job);
  const freelancerTexts = freelancers.map(freelancerText);

  // Build corpus for IDF (job doc + all freelancer docs)
  const corpus = [tokenize(jobTxt), ...freelancerTexts.map(tokenize)];
  const idf = buildIDF(corpus);

  const jobTokens = tokenize(jobTxt);
  const jobVec = tfidfVector(jobTokens, idf);

  const jobSkills = job.requiredSkills.split(",");

  const results: MatchResult[] = freelancers.map((f, i) =>{
    const fTokens = corpus[i + 1];
    const fVec = tfidfVector(fTokens, idf);
    const rawScore = cosineSimilarity(jobVec, fVec);
    const score = Math.min(100, Math.round(rawScore * 200)); // scale to 0-100

    const explanation = buildExplanation(
      jobSkills,
      f.skills.split(","),
      jobTokens,
      fTokens,
      f.bio
    );

    return { freelancer: f, score, explanation };
  });

  return results
    .filter(r =>r.score >0)
    .sort((a, b) =>b.score - a.score)
    .slice(0, topN);
}

/**
 * Rank jobs for a given freelancer using TF-IDF + cosine similarity.
 * Returns the top-N results sorted by score descending.
 */
export function matchJobsToFreelancer(
  freelancer: FreelancerDoc,
  jobs: JobDoc[],
  topN = 10
): JobMatchResult[] {
  if (jobs.length === 0) return [];

  const freelancerTxt = freelancerText(freelancer);
  const jobTexts = jobs.map(jobText);

  // Build corpus for IDF
  const corpus = [tokenize(freelancerTxt), ...jobTexts.map(tokenize)];
  const idf = buildIDF(corpus);

  const fTokens = corpus[0];
  const fVec = tfidfVector(fTokens, idf);
  const freelancerSkills = freelancer.skills.split(",");

  const results: JobMatchResult[] = jobs.map((job, i) =>{
    const jobTokens = corpus[i + 1];
    const jobVec = tfidfVector(jobTokens, idf);
    const rawScore = cosineSimilarity(fVec, jobVec);
    const score = Math.min(100, Math.round(rawScore * 200));

    const explanation = buildExplanation(
      job.requiredSkills.split(","),
      freelancerSkills,
      jobTokens,
      fTokens,
      freelancer.bio
    );

    return { job, score, explanation };
  });

  return results
    .filter(r =>r.score >0)
    .sort((a, b) =>b.score - a.score)
    .slice(0, topN);
}
