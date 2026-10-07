import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Dashboard() {
  const [concepts, setConcepts] = useState([]);
  const [path, setPath] = useState([]);
  const [subject, setSubject] = useState(null);
  const [loading, setLoading] = useState(true);

  const location = useLocation();
  const navigate = useNavigate();

  const name = location.state?.name || "Student";
  const email = location.state?.email || "student@example.com";

  const subjects = [
    ["Data Structures", "📘"],
    ["DBMS", "🗄️"],
    ["Operating Systems", "⚙️"],
    ["Computer Networks", "🌐"],
    ["Java Programming", "☕"],
    ["Python Programming", "🐍"],
    ["Algorithms", "🧠"],
  ];

  useEffect(() => {
    Promise.all([
      axios.get("http://localhost:8080/analysis/knowledge-gaps"),
      axios.get("http://localhost:8080/analysis/learning-path"),
    ])
      .then(([c, p]) => {
        setConcepts(c.data);
        setPath(p.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const assessed = concepts.filter(c => c.score != null);

  const average = assessed.length
    ? Math.round(
        assessed.reduce((a, c) => a + Number(c.score), 0) /
          assessed.length
      )
    : 0;

  const weakest = [...assessed].sort(
    (a, b) => Number(a.score) - Number(b.score)
  )[0];

  const strongest = [...assessed].sort(
    (a, b) => Number(b.score) - Number(a.score)
  )[0];

  const getConcepts = s =>
    concepts.filter(c => c.subject === s);

  const getScore = s => {
    const list = getConcepts(s).filter(c => c.score != null);

    return list.length
      ? Math.round(
          list.reduce((a, c) => a + Number(c.score), 0) /
            list.length
        )
      : null;
  };

  const getStatus = score => {
    if (score == null) return "Not Started";
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    if (score >= 40) return "Needs Work";
    return "Critical";
  };

  const getColor = status => {
    if (status === "Strong") return "#22c55e";
    if (status === "Moderate") return "#eab308";
    if (status === "Needs Work") return "#f97316";
    if (status === "Critical") return "#ef4444";
    return "#64748b";
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.loading}>
          ⚡ Initializing AI Learning System...
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>

      <header style={S.header}>
        <div>
          <div style={S.logo}>🎓 LearnTrace</div>
          <small>AI KNOWLEDGE INTELLIGENCE</small>
        </div>

        <div style={S.profile}>
          <div style={S.avatar}>
            {name.charAt(0).toUpperCase()}
          </div>

          <div>
            <b>{name}</b>
            <small style={S.profileEmail}>{email}</small>
          </div>
        </div>
      </header>

      {!subject ? (
        <>
          <section style={S.hero}>
            <div style={S.heroText}>
              <span style={S.live}>● SYSTEM ONLINE</span>

              <h1 style={S.heroTitle}>
                Knowledge Command Center
              </h1>

              <p>
                Welcome back, <b>{name}</b>. Your learning
                intelligence has analyzed{" "}
                <b>{assessed.length}</b> concepts.
              </p>
            </div>

            <div style={S.aiOrb}>🧠</div>

            <button
              style={S.primary}
              onClick={() => navigate("/knowledge-twin")}
            >
              Open AI Twin →
            </button>
          </section>

          <section style={S.insight}>
            <div style={S.insightIcon}>⚡</div>

            <div style={S.insightText}>
              <span style={S.badge}>AI INSIGHT</span>

              <h2 style={S.insightTitle}>
                {weakest
                  ? `Focus on ${weakest.name}`
                  : "Start your first assessment"}
              </h2>

              <p>
                {weakest
                  ? `${weakest.name} is currently your weakest assessed concept at ${Math.round(
                      weakest.score
                    )}%. Improving it can strengthen your learning path.`
                  : "Take a quiz to let LearnTrace begin building your knowledge profile."}
              </p>
            </div>

            {weakest && (
              <button
                style={S.warningBtn}
                onClick={() =>
                  navigate("/quiz", {
                    state: {
                      subject: weakest.subject,
                      concept: weakest.name,
                    },
                  })
                }
              >
                Fix Gap →
              </button>
            )}
          </section>

          <div style={S.metrics}>
            <Metric
              icon="🧠"
              title="Knowledge Score"
              value={`${average}%`}
            />

            <Metric
              icon="📚"
              title="Assessed"
              value={assessed.length}
            />

            <Metric
              icon="🏆"
              title="Strongest"
              value={strongest?.name || "--"}
            />

            <Metric
              icon="🎯"
              title="Focus Area"
              value={weakest?.name || "--"}
            />
          </div>

          <section style={S.twin}>
            <div style={S.twinIcon}>🧬</div>

            <div style={S.twinContent}>
              <span style={S.badge}>
                DIGITAL KNOWLEDGE MODEL
              </span>

              <h2>Your Knowledge Twin</h2>

              <p>
                Explore the connected model of your knowledge,
                prerequisites, strengths and hidden gaps.
              </p>

              <button
                style={S.twinBtn}
                onClick={() => navigate("/knowledge-twin")}
              >
                🧠 Analyze My Knowledge →
              </button>
            </div>

            <div style={S.nodes}>
              <span>FOUNDATION</span>
              <b>→</b>
              <span>SKILL</span>
              <b>→</b>
              <span>MASTERY</span>
            </div>
          </section>

          <h2 style={S.title}>📡 Knowledge Domains</h2>

          <p style={S.muted}>
            Live status of your learning domains.
          </p>

          <div style={S.grid}>
            {subjects.map(([s, icon]) => {
              const score = getScore(s);
              const current = getStatus(score);

              return (
                <div style={S.card} key={s}>
                  <div style={S.cardTop}>
                    <span style={S.subjectIcon}>{icon}</span>

                    <span
                      style={{
                        ...S.status,
                        color: getColor(current),
                      }}
                    >
                      ● {current}
                    </span>
                  </div>

                  <h3>{s}</h3>

                  <p style={S.muted}>
                    {getConcepts(s).length} concepts
                  </p>

                  <div style={S.progress}>
                    <div
                      style={{
                        ...S.fill,
                        width: `${score || 0}%`,
                      }}
                    />
                  </div>

                  <div style={S.cardBottom}>
                    <b>
                      {score == null ? "--" : `${score}%`}
                    </b>

                    <button
                      style={S.small}
                      onClick={() => setSubject(s)}
                    >
                      Analyze →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <section style={S.panel}>
            <span style={S.badge}>
              AI RECOMMENDATION ENGINE
            </span>

            <h2>🧭 Personalized Learning Path</h2>

            <p style={S.muted}>
              Your next recommended learning targets.
            </p>

            {path.length === 0 ? (
              <div style={S.success}>
                🎉 No weak concepts detected.
              </div>
            ) : (
              path.slice(0, 5).map(item => (
                <div style={S.path} key={item.id}>
                  <strong style={S.step}>{item.step}</strong>

                  <div style={S.pathInfo}>
                    <b>{item.name}</b>
                    <small>
                      {item.subject} • {item.status}
                    </small>
                  </div>

                  <b style={{ color: getColor(item.status) }}>
                    {item.score ?? 0}%
                  </b>

                  <button
                    style={S.small}
                    onClick={() => setSubject(item.subject)}
                  >
                    View
                  </button>
                </div>
              ))
            )}
          </section>
        </>
      ) : (
        <>
          <button
            style={S.back}
            onClick={() => setSubject(null)}
          >
            ← Back to Command Center
          </button>

          <section style={S.panel}>
            <span style={S.badge}>DOMAIN ANALYSIS</span>

            <h1>{subject}</h1>

            <p style={S.muted}>
              Concept-level knowledge analysis.
            </p>

            <div style={S.grid}>
              {getConcepts(subject).map(c => (
                <div style={S.card} key={c.id}>
                  <div style={S.cardTop}>
                    <small>NODE #{c.id}</small>

                    <span
                      style={{
                        ...S.status,
                        color: getColor(c.status),
                      }}
                    >
                      ● {c.status}
                    </span>
                  </div>

                  <h3>{c.name}</h3>

                  <h2>
                    {c.score == null
                      ? "Not Assessed"
                      : `${Math.round(c.score)}%`}
                  </h2>

                  <div style={S.progress}>
                    <div
                      style={{
                        ...S.fill,
                        width: `${c.score || 0}%`,
                      }}
                    />
                  </div>

                  <small style={S.muted}>
                    Prerequisite: {c.prerequisite || "None"}
                  </small>

                  <button
                    style={S.primaryFull}
                    onClick={() =>
                      navigate("/quiz", {
                        state: {
                          subject,
                          concept: c.name,
                        },
                      })
                    }
                  >
                    📝 Test Knowledge
                  </button>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon, title, value }) {
  return (
    <div style={S.metric}>
      <span style={S.metricIcon}>{icon}</span>

      <div style={S.metricText}>
        <small>{title}</small>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: "28px 6%",
    background: "#030712",
    color: "#e5e7eb",
    fontFamily: "Inter, Arial, sans-serif",
  },

  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    fontSize: "20px",
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "28px",
  },

  logo: {
    fontSize: "27px",
    fontWeight: "800",
    color: "#a78bfa",
  },

  profile: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 14px 8px 8px",
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: "30px",
  },

  avatar: {
    width: "40px",
    height: "40px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#7c3aed",
    fontWeight: "bold",
  },

  profileEmail: {
    display: "block",
    color: "#64748b",
    marginTop: "2px",
  },

  hero: {
    display: "flex",
    alignItems: "center",
    gap: "25px",
    padding: "35px",
    borderRadius: "22px",
    background: "linear-gradient(135deg,#111827,#1e1b4b)",
    border: "1px solid #312e81",
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    fontSize: "32px",
    margin: "12px 0",
  },

  live: {
    color: "#22d3ee",
    fontSize: "11px",
    fontWeight: "bold",
  },

  aiOrb: {
    fontSize: "65px",
    filter: "drop-shadow(0 0 20px #7c3aed)",
  },

  primary: {
    border: 0,
    padding: "13px 18px",
    borderRadius: "9px",
    background: "#7c3aed",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  insight: {
    display: "flex",
    alignItems: "center",
    gap: "18px",
    marginTop: "18px",
    padding: "20px",
    borderRadius: "16px",
    background: "#0f172a",
    border: "1px solid #312e81",
  },

  insightIcon: {
    fontSize: "35px",
  },

  insightText: {
    flex: 1,
  },

  insightTitle: {
    margin: "5px 0",
  },

  badge: {
    color: "#67e8f9",
    fontSize: "10px",
    fontWeight: "bold",
    letterSpacing: "1px",
  },

  warningBtn: {
    border: "1px solid #f97316",
    background: "transparent",
    color: "#fb923c",
    padding: "10px 15px",
    borderRadius: "8px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  metrics: {
    display: "grid",
    gridTemplateColumns: "repeat(4,1fr)",
    gap: "14px",
    margin: "18px 0",
  },

  metric: {
    display: "flex",
    alignItems: "center",
    gap: "13px",
    padding: "18px",
    borderRadius: "14px",
    background: "#0f172a",
    border: "1px solid #1e293b",
  },

  metricIcon: {
    fontSize: "25px",
  },

  metricText: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },

  twin: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
    padding: "25px",
    margin: "20px 0 35px",
    borderRadius: "20px",
    background: "linear-gradient(135deg,#1e1b4b,#172554)",
    border: "1px solid #4338ca",
  },

  twinIcon: {
    fontSize: "48px",
  },

  twinContent: {
    flex: 1,
  },

  twinBtn: {
    marginTop: "12px",
    padding: "10px 15px",
    border: 0,
    borderRadius: "8px",
    background: "#a78bfa",
    color: "#1e1b4b",
    fontWeight: "bold",
    cursor: "pointer",
  },

  nodes: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "18px",
    borderRadius: "12px",
    background: "rgba(255,255,255,.05)",
    fontSize: "10px",
    color: "#c4b5fd",
  },

  title: {
    marginBottom: "5px",
  },

  muted: {
    color: "#64748b",
  },

  grid: {
    display: "grid",
    gridTemplateColumns:
      "repeat(auto-fit,minmax(260px,1fr))",
    gap: "18px",
    marginTop: "20px",
  },

  card: {
    padding: "20px",
    borderRadius: "16px",
    background: "#0f172a",
    border: "1px solid #1e293b",
  },

  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  subjectIcon: {
    fontSize: "30px",
  },

  status: {
    fontSize: "10px",
    fontWeight: "bold",
  },

  progress: {
    height: "6px",
    margin: "16px 0",
    borderRadius: "10px",
    background: "#1e293b",
    overflow: "hidden",
  },

  fill: {
    height: "100%",
    background: "linear-gradient(90deg,#7c3aed,#06b6d4)",
  },

  cardBottom: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  small: {
    border: "1px solid #334155",
    background: "#111827",
    color: "#c4b5fd",
    padding: "8px 12px",
    borderRadius: "7px",
    cursor: "pointer",
  },

  panel: {
    marginTop: "25px",
    padding: "25px",
    borderRadius: "18px",
    background: "#0b1120",
    border: "1px solid #1e293b",
  },

  path: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
    marginTop: "10px",
    padding: "14px",
    borderRadius: "10px",
    background: "#111827",
  },

  step: {
    width: "32px",
    height: "32px",
    display: "grid",
    placeItems: "center",
    borderRadius: "50%",
    background: "#312e81",
    color: "#c4b5fd",
  },

  pathInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },

  success: {
    marginTop: "15px",
    padding: "15px",
    borderRadius: "10px",
    background: "#052e16",
    color: "#86efac",
  },

  back: {
    border: 0,
    background: "transparent",
    color: "#a78bfa",
    fontWeight: "bold",
    cursor: "pointer",
  },

  primaryFull: {
    width: "100%",
    marginTop: "18px",
    padding: "11px",
    border: 0,
    borderRadius: "8px",
    background: "#7c3aed",
    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },
};

export default Dashboard;