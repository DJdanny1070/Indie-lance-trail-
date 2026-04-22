import Link from "next/link";

export default function Home() {
  return (
    <div className="container py-20 animate-fade-in">
      <div className="text-center md:w-2/3 mx-auto flex-col items-center justify-center">
        <h1 className="text-5xl font-bold mb-6">
          Find the Best Indian Freelancers, <span style={{ color: "var(--primary)" }}>Fast</span>
        </h1>
        <p className="text-xl text-muted mb-8">
          The AI-driven freelancing platform connecting top Indian talent with employers worldwide. Zero middleman fees, rapid matching, and secure workspaces.
        </p>
        
        <div className="flex gap-4 justify-center">
          <Link href="/freelancers" className="btn btn-primary text-lg px-6 py-3">
            Hire a Freelancer
          </Link>
          <Link href="/jobs" className="btn btn-outline text-lg px-6 py-3">
            Find Work
          </Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mt-20">
        <div className="card glass text-center">
          <div className="text-4xl mb-4">🤖</div>
          <h3 className="text-2xl font-semibold mb-2">AI Matching</h3>
          <p className="text-muted">Our AI engine instantly pairs the right freelancer profile with your project requirements.</p>
        </div>
        <div className="card glass text-center">
          <div className="text-4xl mb-4">🇮🇳</div>
          <h3 className="text-2xl font-semibold mb-2">Local Talent</h3>
          <p className="text-muted">A dedicated platform highlighting India's top professionals for high-quality, reliable delivery.</p>
        </div>
        <div className="card glass text-center">
          <div className="text-4xl mb-4">💼</div>
          <h3 className="text-2xl font-semibold mb-2">Secure Worksapce</h3>
          <p className="text-muted">Chat, exchange files, and manage milestones all within our trusted project workspace.</p>
        </div>
      </div>
    </div>
  );
}
