
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "https://learntrace-backend-vp2a.onrender.com";

const SUBJECTS = [
  ["Data Structures", "📘", "Build strong foundations"],
  ["DBMS", "🗄️", "Understand data systems"],
  ["Operating Systems", "⚙️", "Explore processes and memory"],
  ["Computer Networks", "🌐", "Connect the concepts"],
  ["Java Programming", "☕", "Strengthen programming basics"],
  ["Python Programming", "🐍", "Practice core concepts"],
  ["Algorithms", "🧠", "Improve problem-solving"],
];

function readStoredUser() {
  try {
    const user = JSON.parse(localStorage.getItem("user") || "null");
    return user && typeof user === "object" ? user : null;
  } catch {
    return null;
  }
}

function Dashboard() {
  const [concepts, setConcepts] = useState([]);
  const [path, setPath] = useState([]);
  const [subject, setSubject] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [apiWarning, setApiWarning] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyUnavailable, setHistoryUnavailable] = useState(false);
  const [logoutError, setLogoutError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const storedUser = readStoredUser();
  const name =
    storedUser?.name || location.state?.name || "Student";
  const email =
    storedUser?.email || location.state?.email || "";

  useEffect(() => {
    let alive = true;

    async function loadDashboard() {
      const token = localStorage.getItem("authToken");

      if (!token) {
        localStorage.removeItem("user");
        navigate("/login", { replace: true });
        return;
      }

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      };

      try {
        const results = await Promise.allSettled([
          axios.get(`${API}/analysis/knowledge-gaps`, config),
          axios.get(`${API}/analysis/learning-path`, config),
          axios.get(`${API}/quiz/history`, config),
        ]);

        if (!alive) return;

        const unauthorized = results.some(
          (result) =>
            result.status === "rejected" &&
            result.reason?.response?.status === 401
        );

        if (unauthorized) {
          localStorage.removeItem("user");
          localStorage.removeItem("authToken");
          navigate("/login", { replace: true });
          return;
        }

        const [conceptResult, pathResult, historyResult] = results;

        if (conceptResult.status === "fulfilled") {
          setConcepts(
            Array.isArray(conceptResult.value.data)
              ? conceptResult.value.data
              : []
          );
        } else {
          setApiWarning(true);
          console.error(
            "Knowledge gaps API failed:",
            conceptResult.reason
          );
        }

        if (pathResult.status === "fulfilled") {
          setPath(
            Array.isArray(pathResult.value.data)
              ? pathResult.value.data
              : []
          );
        } else {
          setApiWarning(true);
          console.error(
            "Learning path API failed:",
            pathResult.reason
          );
        }

        if (historyResult.status === "fulfilled") {
          setHistory(
            Array.isArray(historyResult.value.data)
              ? historyResult.value.data
              : []
          );
        } else {
          setHistoryUnavailable(true);
          setApiWarning(true);
          console.error("Quiz history API failed:", historyResult.reason);
        }
      } catch (error) {
        if (alive) {
          setApiWarning(true);
          console.error("Dashboard loading failed:", error);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }

    loadDashboard();

    return () => {
      alive = false;
    };
  }, [navigate]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError("");

    try {
      const token = localStorage.getItem("authToken");
      if (token) {
        await axios.post(`${API}/auth/logout`, null, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      localStorage.removeItem("user");
      localStorage.removeItem("authToken");
      navigate("/login", { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");
        navigate("/login", { replace: true });
      } else {
        setLogoutError("Could not invalidate your server session. Check your connection and try again.");
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const assessed = useMemo(
    () => concepts.filter((c) => c.score != null),
    [concepts]
  );

  const average = assessed.length
    ? Math.round(
        assessed.reduce(
          (total, c) => total + Number(c.score || 0),
          0
        ) / assessed.length
      )
    : 0;

  const weakest = [...assessed].sort(
    (a, b) => Number(a.score) - Number(b.score)
  )[0];

  const strongest = [...assessed].sort(
    (a, b) => Number(b.score) - Number(a.score)
  )[0];

  const masteredCount = assessed.filter(
    (c) => Number(c.score) >= 80
  ).length;

  const getConcepts = (selectedSubject) =>
    concepts.filter(
      (c) =>
        (c.subject || "").toLowerCase() ===
        (selectedSubject || "").toLowerCase()
    );

  const getScore = (selectedSubject) => {
    const list = getConcepts(selectedSubject).filter(
      (c) => c.score != null
    );

    return list.length
      ? Math.round(
          list.reduce(
            (total, c) => total + Number(c.score || 0),
            0
          ) / list.length
        )
      : null;
  };

  const getStatus = (score) => {
    if (score == null) return "Not Started";
    if (score >= 80) return "Strong";
    if (score >= 60) return "Moderate";
    if (score >= 40) return "Needs Work";
    return "Critical";
  };

  const getColor = (status) => {
    if (status === "Strong") return "#15966b";
    if (status === "Moderate") return "#b77908";
    if (status === "Needs Work") return "#e47735";
    if (status === "Critical") return "#dc4c64";
    return "#8991a7";
  };

  const handleSearchChange = (value) => {
    setSearch(value);
    setSubject(null);

    if (value.trim()) {
      setActiveSection("domains");
    }
  };

  const visibleSubjects = SUBJECTS.filter(([label]) =>
    label.toLowerCase().includes(search.trim().toLowerCase())
  );

  const chartConcepts = [...assessed]
    .sort((a, b) => Number(b.score) - Number(a.score))
    .slice(0, 8);

  const chooseSection = (section) => {
    setSubject(null);
    setActiveSection(section);
    setSearch("");
  };

  const openSubject = (label) => {
    setSubject(label);
    setSearch("");
  };

  if (loading) {
    return (
      <div className="lt-loading-screen">
        <style>{styles}</style>
        <div className="loading-mark">LT</div>
        <h2>Preparing your learning overview</h2>
        <p>Collecting your progress and recommended topics…</p>
        <div className="loading-track">
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="lt-app">
      <style>{styles}</style>

      <aside className="lt-sidebar">
        <button
          className="brand"
          onClick={() => chooseSection("overview")}
          aria-label="LearnTrace home"
        >
          <span className="brand-mark">
            L<span>T</span>
          </span>
          <span className="brand-copy">
            <b>LearnTrace</b>
            <small>LEARN WITH CLARITY</small>
          </span>
        </button>

        <div className="sidebar-caption">WORKSPACE</div>

        <nav className="side-nav">
          <button
            className={
              !subject && activeSection === "overview"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => chooseSection("overview")}
          >
            <span className="nav-icon">◫</span>
            <span>Overview</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={!subject && activeSection === "history" ? "nav-item active" : "nav-item"}
            onClick={() => chooseSection("history")}
          >
            <span className="nav-icon">◷</span>
            <span>Assessment history</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={
              !subject && activeSection === "domains"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => chooseSection("domains")}
          >
            <span className="nav-icon">▦</span>
            <span>Knowledge domains</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className={
              !subject && activeSection === "path"
                ? "nav-item active"
                : "nav-item"
            }
            onClick={() => chooseSection("path")}
          >
            <span className="nav-icon">⌁</span>
            <span>Learning path</span>
            <span className="nav-arrow">›</span>
          </button>

          <button
            className="nav-item"
            onClick={() => navigate("/knowledge-twin")}
          >
            <span className="nav-icon">✧</span>
            <span>Knowledge Twin</span>
            <span className="nav-arrow">↗</span>
          </button>
        </nav>

        <div className="sidebar-tip">
          <div className="tip-spark">✦</div>
          <b>Small steps add up.</b>
          <p>
            Review one concept at a time and keep building
            your understanding.
          </p>
          <div className="tip-stamp">
            YOUR NEXT LEVEL STARTS HERE
          </div>
        </div>

        <div className="sidebar-bottom">
          <div className="profile-avatar">
            {name.charAt(0).toUpperCase()}
          </div>
          <div className="sidebar-person">
            <b>{name}</b>
            <small>Student account</small>
          </div>
          <span className="online-dot" title="Dashboard active" />
        </div>
      </aside>

      <main className="lt-main">
        <header className="lt-topbar">
          <div className="mobile-brand">
            <span className="brand-mark">
              L<span>T</span>
            </span>
            <b>LearnTrace</b>
          </div>

          <div className="page-intro">
            <div className="eyebrow">
              YOUR PERSONAL LEARNING SPACE
            </div>
            <h1>
              {subject
                ? subject
                : activeSection === "domains"
                ? "Knowledge domains"
                : activeSection === "path"
                ? "Your learning path"
                : activeSection === "history"
                ? "Assessment history"
                : "Learning overview"}
            </h1>
          </div>

          <div className="topbar-tools">
            <label className="search-box">
              <span>⌕</span>
              <input
                value={search}
                onChange={(event) =>
                  handleSearchChange(event.target.value)
                }
                placeholder="Search subjects…"
                aria-label="Search subjects"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Clear search"
                >
                  ×
                </button>
              )}
            </label>

            <div className="top-profile">
              <div className="profile-avatar mini">
                {name.charAt(0).toUpperCase()}
              </div>
              <div>
                <b>{name}</b>
                <small>{email}</small>
              </div>
            </div>
            <button className="mobile-history-shortcut" onClick={() => chooseSection("history")}>
              History
            </button>
            <button className="top-logout" onClick={handleLogout} disabled={loggingOut}>
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          </div>
        </header>

        {logoutError && <div className="api-warning" role="alert">{logoutError}</div>}

        {apiWarning && (
          <div className="api-warning">
            Some learning data could not be loaded. If this continues,
            check the backend logs and refresh the page.
          </div>
        )}

        {subject ? (
          <section className="content-section">
            <button
              className="back-link"
              onClick={() => setSubject(null)}
            >
              ← Back to{" "}
              {activeSection === "overview"
                ? "overview"
                : activeSection === "path"
                ? "learning path"
                : "knowledge domains"}
            </button>

            <div className="detail-banner">
              <div>
                <span className="eyebrow">SUBJECT BREAKDOWN</span>
                <h2>{subject}</h2>
                <p>
                  Check each concept, review its status, and
                  take an assessment when you are ready.
                </p>
              </div>
              <div className="detail-score">
                <span>
                  {getScore(subject) == null
                    ? "—"
                    : `${getScore(subject)}%`}
                </span>
                <small>Overall score</small>
              </div>
            </div>

            <div className="section-heading">
              <div>
                <h2>Concept review</h2>
                <p>
                  Your concept-level performance for this subject.
                </p>
              </div>
              <span className="soft-count">
                {getConcepts(subject).length} concepts
              </span>
            </div>

            {getConcepts(subject).length === 0 ? (
              <EmptyState text="No concepts are available for this subject yet." />
            ) : (
              <div className="concept-grid">
                {getConcepts(subject).map((concept) => {
                  const status = getStatus(concept.score);
                  const score =
                    concept.score == null
                      ? 0
                      : Math.max(
                          0,
                          Math.min(100, Number(concept.score))
                        );

                  return (
                    <article
                      className="concept-card"
                      key={concept.id ?? concept.name}
                    >
                      <div className="concept-top">
                        <span className="concept-symbol">✦</span>
                        <span
                          className="status-pill"
                          style={{
                            color: getColor(status),
                            background: `${getColor(status)}16`,
                          }}
                        >
                          {status}
                        </span>
                      </div>

                      <h3>{concept.name}</h3>

                      <div className="concept-score-row">
                        <b>
                          {concept.score == null
                            ? "Not assessed"
                            : `${Math.round(score)}%`}
                        </b>
                        <span>
                          {concept.score == null
                            ? "Start here"
                            : score >= 80
                            ? "Great progress"
                            : "Keep improving"}
                        </span>
                      </div>

                      <div className="progress-track">
                        <span
                          style={{
                            width: `${score}%`,
                            background: getColor(status),
                          }}
                        />
                      </div>

                      <p className="prereq">
                        Prerequisite:{" "}
                        <b>
                          {concept.prerequisite ||
                            "No prerequisite listed"}
                        </b>
                      </p>

                      <button
                        className="button-primary full-button"
                        onClick={() =>
                          navigate("/quiz", {
                            state: {
                              subject,
                              concept: concept.name,
                            },
                          })
                        }
                      >
                        Take assessment <span>→</span>
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        ) : activeSection === "domains" ? (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <h2>Explore your subjects</h2>
                <p>
                  Select a domain to see performance by concept.
                </p>
              </div>
              <span className="soft-count">
                {visibleSubjects.length} subjects
              </span>
            </div>

            {visibleSubjects.length ? (
              <div className="subject-grid">
                {visibleSubjects.map(
                  ([label, icon, description], index) => {
                    const score = getScore(label);
                    const status = getStatus(score);

                    return (
                      <SubjectCard
                        key={label}
                        label={label}
                        icon={icon}
                        description={description}
                        score={score}
                        status={status}
                        color={getColor(status)}
                        count={getConcepts(label).length}
                        onClick={() => openSubject(label)}
                        index={index}
                      />
                    );
                  }
                )}
              </div>
            ) : (
              <EmptyState text="No subjects match your search." />
            )}
          </section>
        ) : activeSection === "path" ? (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <h2>A clear next step</h2>
                <p>
                  Work through recommendations in order and
                  revisit concepts as needed.
                </p>
              </div>
              <span className="soft-count">
                {path.length} recommendations
              </span>
            </div>

            <LearningPath
              path={path}
              getColor={getColor}
              onView={(item) => openSubject(item.subject)}
            />
          </section>
        ) : activeSection === "history" ? (
          <section className="content-section">
            <div className="section-heading">
              <div>
                <h2>Your assessment history</h2>
                <p>Recent quiz results saved to your student account.</p>
              </div>
              <span className="soft-count">{history.length} attempts</span>
            </div>
            <div className="surface legacy-history-notice" role="note">
              <strong>Unassigned legacy history</strong>
              <p>
                Older shared scores or quiz attempts may still exist. Records
                without verified student ownership are kept separate and are
                not included in this personal history.
              </p>
            </div>
            {historyUnavailable ? (
              <EmptyState text="Assessment history could not be loaded. Refresh the page to try again." />
            ) : history.length ? (
              <div className="surface history-list">
                {history.map((attempt) => (
                  <article className="history-row" key={attempt.id}>
                    <div className="history-title">
                      <b>{attempt.concept || "Assessment"}</b>
                      <span>{attempt.subject}</span>
                    </div>
                    <div className="history-result">
                      <b>{Math.round(Number(attempt.score) || 0)}%</b>
                      <span>{attempt.correctAnswers}/{attempt.totalQuestions} correct</span>
                    </div>
                    <time dateTime={attempt.attemptedAt}>
                      {attempt.attemptedAt ? new Date(attempt.attemptedAt).toLocaleString() : "Date unavailable"}
                    </time>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState text="Your quiz attempts will appear here after your first assessment." />
            )}
          </section>
        ) : (
          <>
            <section className="welcome-hero">
              <div className="hero-copy">
                <span className="hero-chip">
                  <span className="hero-chip-dot" />
                  YOUR PROGRESS, AT A GLANCE
                </span>

                <h2>
                  You’re building
                  <br />
                  <span>real understanding,</span>{" "}
                  {name.split(" ")[0]}.
                </h2>

                <p>
                  See what you already know, discover what needs
                  attention, and decide what to learn next.
                </p>

                <div className="hero-actions">
                  <button
                    className="button-white"
                    onClick={() => chooseSection("domains")}
                  >
                    Explore subjects <span>→</span>
                  </button>
                  <button
                    className="hero-text-button"
                    onClick={() => navigate("/knowledge-twin")}
                  >
                    Explore Knowledge Twin ↗
                  </button>
                </div>
              </div>

              <div className="hero-art" aria-hidden="true">
                <div className="art-orbit orbit-one" />
                <div className="art-orbit orbit-two" />
                <div className="art-orbit orbit-three" />
                <div className="art-center">✦</div>
                <span className="art-bubble bubble-one">✓</span>
                <span className="art-bubble bubble-two">↗</span>
                <span className="art-bubble bubble-three">✧</span>
              </div>

              <div className="hero-note">
                <span>✦</span>
                <div>
                  <b>Progress over perfection</b>
                  <small>
                    Every assessment helps you see the next step.
                  </small>
                </div>
              </div>
            </section>

            <div className="stats-grid">
              <MetricCard
                icon="◉"
                label="Knowledge score"
                value={`${average}%`}
                note="Across assessed concepts"
                theme="purple"
              />
              <MetricCard
                icon="▤"
                label="Concepts assessed"
                value={assessed.length}
                note="Your learning coverage"
                theme="blue"
              />
              <MetricCard
                icon="✦"
                label="Strong concepts"
                value={masteredCount}
                note="Scored 80% or above"
                theme="green"
              />
              <MetricCard
                icon="◎"
                label="Focus area"
                value={weakest?.name || "Not set"}
                note={
                  weakest
                    ? `${Math.round(Number(weakest.score))}% — a chance to improve`
                    : "Take an assessment to begin"
                }
                theme="orange"
                compact={!!weakest}
              />
            </div>

            <div className="insight-card">
              <div className="insight-illustration">✦</div>
              <div className="insight-copy">
                <span className="eyebrow">A SMART NEXT STEP</span>
                <h3>
                  {weakest
                    ? `Give ${weakest.name} a little extra attention`
                    : "Start with your first assessment"}
                </h3>
                <p>
                  {weakest
                    ? `${weakest.name} is currently your lowest-scoring assessed concept at ${Math.round(Number(weakest.score))}%. Revisiting it can strengthen your foundation.`
                    : "Complete a concept assessment to help LearnTrace identify strengths and recommend what to study next."}
                </p>
              </div>

              {weakest && (
                <button
                  className="button-primary"
                  onClick={() =>
                    navigate("/quiz", {
                      state: {
                        subject: weakest.subject,
                        concept: weakest.name,
                      },
                    })
                  }
                >
                  Review concept <span>→</span>
                </button>
              )}
            </div>

            <div className="dashboard-grid">
              <section className="surface chart-surface">
                <div className="surface-heading">
                  <div>
                    <span className="eyebrow">
                      PERFORMANCE SNAPSHOT
                    </span>
                    <h2>Concept score overview</h2>
                    <p>
                      How your assessed concepts are performing.
                    </p>
                  </div>
                  <span className="chart-badge">
                    {assessed.length} assessed
                  </span>
                </div>

                {chartConcepts.length ? (
                  <div
                    className="bar-chart"
                    role="img"
                    aria-label="Bar chart of assessed concept scores"
                  >
                    <div className="chart-grid-lines">
                      <span>100%</span>
                      <span>75%</span>
                      <span>50%</span>
                      <span>25%</span>
                      <span>0%</span>
                    </div>

                    <div className="bars-area">
                      {chartConcepts.map((concept, index) => {
                        const score = Math.max(
                          0,
                          Math.min(100, Number(concept.score || 0))
                        );

                        return (
                          <div
                            className="bar-column"
                            key={concept.id ?? concept.name}
                            title={`${concept.name}: ${Math.round(score)}%`}
                          >
                            <div className="bar-value">
                              {Math.round(score)}%
                            </div>
                            <div className="bar-track">
                              <span
                                className={`bar-fill fill-${index % 4}`}
                                style={{
                                  height: `${Math.max(score, 3)}%`,
                                }}
                              />
                            </div>
                            <div className="bar-label">
                              {concept.name}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <EmptyState text="Your concept scores will appear here after your first assessment." />
                )}

                <button
                  className="plain-link"
                  onClick={() => chooseSection("domains")}
                >
                  View all knowledge domains <span>→</span>
                </button>
              </section>

              <section className="surface focus-surface">
                <div className="surface-heading">
                  <div>
                    <span className="eyebrow">
                      YOUR LEARNING PROFILE
                    </span>
                    <h2>At a glance</h2>
                    <p>
                      A quick look at your current position.
                    </p>
                  </div>
                </div>

                <div className="ring-wrap">
                  <div
                    className="score-ring"
                    style={{
                      background: `conic-gradient(#8b6cf6 ${average * 3.6}deg, #eeeafb 0deg)`,
                    }}
                  >
                    <div className="score-ring-inner">
                      <strong>{average}%</strong>
                      <small>KNOWLEDGE</small>
                    </div>
                  </div>
                </div>

                <div className="profile-summary">
                  <div>
                    <span className="summary-dot purple-dot" />
                    <span>Strongest concept</span>
                    <b>{strongest?.name || "—"}</b>
                  </div>
                  <div>
                    <span className="summary-dot orange-dot" />
                    <span>Focus concept</span>
                    <b>{weakest?.name || "—"}</b>
                  </div>
                  <div>
                    <span className="summary-dot green-dot" />
                    <span>Mastered concepts</span>
                    <b>{masteredCount}</b>
                  </div>
                </div>

                <button
                  className="soft-button full-button"
                  onClick={() => navigate("/knowledge-twin")}
                >
                  Open Knowledge Twin <span>↗</span>
                </button>
              </section>
            </div>

            <section className="surface domains-surface">
              <div className="surface-heading">
                <div>
                  <span className="eyebrow">YOUR SUBJECTS</span>
                  <h2>Knowledge domains</h2>
                  <p>
                    Choose a subject to inspect the concepts within it.
                  </p>
                </div>
                <button
                  className="plain-link header-link"
                  onClick={() => chooseSection("domains")}
                >
                  See all subjects <span>→</span>
                </button>
              </div>

              <div className="subject-grid">
                {visibleSubjects.slice(0, 4).map(
                  ([label, icon, description], index) => {
                    const score = getScore(label);
                    const status = getStatus(score);

                    return (
                      <SubjectCard
                        key={label}
                        label={label}
                        icon={icon}
                        description={description}
                        score={score}
                        status={status}
                        color={getColor(status)}
                        count={getConcepts(label).length}
                        onClick={() => openSubject(label)}
                        index={index}
                      />
                    );
                  }
                )}
              </div>

              {!visibleSubjects.length && (
                <EmptyState text="No subjects match your search." />
              )}
            </section>

            <section className="surface path-surface">
              <div className="surface-heading">
                <div>
                  <span className="eyebrow">
                    RECOMMENDED FOR YOU
                  </span>
                  <h2>Your personalized learning path</h2>
                  <p>
                    Prioritize the concepts that can make the
                    biggest difference.
                  </p>
                </div>
                <button
                  className="plain-link header-link"
                  onClick={() => chooseSection("path")}
                >
                  Full learning path <span>→</span>
                </button>
              </div>

              <LearningPath
                path={path.slice(0, 4)}
                getColor={getColor}
                onView={(item) => openSubject(item.subject)}
              />
            </section>
          </>
        )}

        <footer className="lt-footer">
          <span>© LearnTrace</span>
          <span>
            Learn at your pace. Improve with purpose. <b>✦</b>
          </span>
        </footer>
      </main>
    </div>
  );
}

function MetricCard({ icon, label, value, note, theme, compact }) {
  return (
    <article className={`metric-card metric-${theme}`}>
      <div className="metric-top">
        <span className="metric-icon">{icon}</span>
        <span className="metric-spark">↗</span>
      </div>
      <div
        className={
          compact ? "metric-value compact-value" : "metric-value"
        }
      >
        {value}
      </div>
      <div className="metric-label">{label}</div>
      <div className="metric-note">{note}</div>
    </article>
  );
}

function SubjectCard({
  label,
  icon,
  description,
  score,
  status,
  color,
  count,
  onClick,
  index,
}) {
  return (
    <button
      className="subject-card"
      onClick={onClick}
      style={{ "--card-delay": `${index * 45}ms` }}
    >
      <div className="subject-card-top">
        <span className={`subject-icon subject-icon-${index % 4}`}>
          {icon}
        </span>
        <span className="subject-arrow">↗</span>
      </div>

      <h3>{label}</h3>
      <p>{description}</p>

      <div className="subject-progress-meta">
        <span>
          {score == null ? "Not started" : `${score}% complete`}
        </span>
        <span className="subject-status" style={{ color }}>
          {status}
        </span>
      </div>

      <div className="progress-track">
        <span
          style={{
            width: `${score || 0}%`,
            background: color,
          }}
        />
      </div>

      <div className="subject-card-bottom">
        <span>{count} concepts</span>
        <b>
          View details <span>→</span>
        </b>
      </div>
    </button>
  );
}

function LearningPath({ path, getColor, onView }) {
  if (!path.length) {
    return (
      <EmptyState text="Your personalized path will appear here when recommendations are available." />
    );
  }

  return (
    <div className="learning-list">
      {path.map((item, index) => {
        const status =
          item.status ||
          (item.score == null
            ? "Not Started"
            : Number(item.score) >= 80
            ? "Strong"
            : Number(item.score) >= 60
            ? "Moderate"
            : "Needs Work");

        return (
          <div
            className="learning-item"
            key={item.id ?? `${item.subject}-${item.name}-${index}`}
          >
            <div
              className={`learning-step ${
                index === 0 ? "first-step" : ""
              }`}
            >
              {item.step || index + 1}
            </div>

            <div className="learning-info">
              <b>{item.name || "Recommended concept"}</b>
              <span>
                {item.subject || "Subject"} <i>•</i> {status}
              </span>
            </div>

            <div className="learning-score">
              <b style={{ color: getColor(status) }}>
                {item.score == null
                  ? "—"
                  : `${Math.round(Number(item.score))}%`}
              </b>
              <small>current score</small>
            </div>

            <button
              className="view-button"
              onClick={() => item.subject && onView(item)}
            >
              Review <span>→</span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div className="empty-state">
      <span>✧</span>
      <p>{text}</p>
    </div>
  );
}

const styles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');
*{box-sizing:border-box}
.lt-app{--ink:#22223b;--muted:#8a8da7;--line:#efedf7;--purple:#8064e9;min-height:100vh;background:#f8f8fd;color:var(--ink);font-family:'DM Sans',Arial,sans-serif;display:flex;font-size:14px}
button,input{font:inherit}
button{cursor:pointer}
.lt-sidebar{width:248px;flex:0 0 248px;background:#fff;border-right:1px solid #efedf7;min-height:100vh;padding:27px 17px 18px;display:flex;flex-direction:column;position:sticky;top:0;height:100vh;z-index:5}
.brand{border:0;background:transparent;display:flex;align-items:center;gap:11px;text-align:left;padding:0 8px 36px;color:inherit}
.brand-mark{display:grid;place-items:center;width:43px;height:43px;background:linear-gradient(145deg,#9d85ff,#7151de);border-radius:14px;color:#fff;font-family:Manrope,sans-serif;font-weight:800;font-size:18px;box-shadow:0 8px 18px #8b72e832}
.brand-mark span{color:#ffe28b;display:inline}
.brand-copy{display:flex;flex-direction:column;gap:4px}
.brand-copy b{font-family:Manrope,sans-serif;font-size:18px;letter-spacing:-.6px}
.brand-copy small{font-size:9px;letter-spacing:1.25px;color:#9c9bb2;font-weight:700}
.sidebar-caption{padding:0 12px;margin-bottom:12px;color:#a5a5bc;font-weight:700;font-size:10px;letter-spacing:1.4px}
.side-nav{display:flex;flex-direction:column;gap:7px}
.nav-item{height:47px;display:flex;align-items:center;gap:13px;padding:0 13px;border:0;border-radius:12px;background:transparent;color:#7b7d98;text-align:left;font-weight:600;transition:.2s}
.nav-item:hover{background:#f8f6ff;color:#6f51d8}
.nav-item.active{background:#f0ecff;color:#704fe0;box-shadow:inset 3px 0 #8d73f5}
.nav-icon{font-size:20px;width:22px;text-align:center}
.nav-arrow{margin-left:auto;font-size:20px;opacity:.65}
.sidebar-tip{margin-top:auto;border:1px solid #eee9ff;border-radius:18px;background:linear-gradient(150deg,#fbfaff,#f4f0ff);padding:17px 15px 14px;position:relative;overflow:hidden}
.tip-spark{width:32px;height:32px;border-radius:11px;background:#fff1ca;display:grid;place-items:center;color:#b27a12;font-size:17px;margin-bottom:12px}
.sidebar-tip>b{font-family:Manrope,sans-serif;font-size:13px}
.sidebar-tip p{font-size:11px;line-height:1.65;color:#8586a0;margin:7px 0 13px}
.tip-stamp{font-size:8px;letter-spacing:.9px;color:#927ce1;font-weight:800}
.sidebar-bottom{border-top:1px solid #f0eef7;margin-top:17px;padding:16px 4px 0;display:flex;align-items:center;gap:10px}
.profile-avatar{width:37px;height:37px;flex:0 0 37px;display:grid;place-items:center;border-radius:13px;background:linear-gradient(145deg,#ffe5bf,#ffc9ce);color:#8b4f60;font-size:15px;font-weight:800}
.sidebar-person{display:flex;flex-direction:column;gap:4px;min-width:0}
.sidebar-person b{font-size:12px;overflow:hidden;text-overflow:ellipsis}
.sidebar-person small{font-size:10px;color:#999bb1}
.online-dot{width:8px;height:8px;border-radius:50%;background:#38c797;margin-left:auto;box-shadow:0 0 0 4px #e2fbf1}
.lt-main{min-width:0;flex:1;padding:0 33px 0;max-width:1800px;margin:auto}
.lt-topbar{min-height:108px;display:flex;align-items:center;justify-content:space-between;gap:20px;border-bottom:1px solid #eeedf6;margin-bottom:27px}
.page-intro .eyebrow{margin-bottom:7px}
.page-intro h1{font:800 25px Manrope,sans-serif;letter-spacing:-.8px;margin:0}
.topbar-tools{display:flex;align-items:center;gap:20px}
.search-box{height:42px;display:flex;align-items:center;gap:8px;background:#fff;border:1px solid #eae8f3;border-radius:12px;padding:0 12px;color:#9899af;min-width:210px}
.search-box>span{font-size:24px;line-height:1;transform:rotate(-20deg)}
.search-box input{border:0;outline:0;background:transparent;width:100%;min-width:0;font-size:12px;color:#35344f}
.search-box button{border:0;background:transparent;color:#9899af;font-size:19px;padding:0}
.top-profile{display:flex;align-items:center;gap:9px;white-space:nowrap}
.top-profile>div:last-child{display:flex;flex-direction:column;gap:4px}
.top-profile b{font-size:12px}
.top-profile small{max-width:170px;overflow:hidden;text-overflow:ellipsis;color:#999bb1;font-size:10px}
.top-logout{border:1px solid #e3def1;background:#fff;color:#6e55bd;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:800;white-space:nowrap}
.mobile-history-shortcut{display:none;border:1px solid #e3def1;background:#fff;color:#6e55bd;border-radius:9px;padding:9px 12px;font-size:11px;font-weight:800;white-space:nowrap}
.top-logout:disabled{opacity:.6;cursor:wait}
.history-list{padding:0 18px}
.history-row{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:17px 0;border-bottom:1px solid #efedf6}
.history-row:last-child{border-bottom:0}
.history-title,.history-result{display:flex;flex-direction:column;gap:5px}
.history-title b{font-size:13px;color:#302a49}
.history-title span,.history-result span,.history-row time{font-size:11px;color:#89879e}
.history-result{text-align:right;min-width:110px}
.history-result b{font-size:15px;color:#7054d3}
.profile-avatar.mini{width:34px;height:34px;flex-basis:34px;border-radius:11px}
.mobile-brand{display:none}
.api-warning{border:1px solid #ffd9a4;background:#fff8e9;padding:13px 16px;border-radius:12px;color:#946317;margin-bottom:18px;font-size:12px}
.welcome-hero{min-height:276px;padding:29px 34px;background:linear-gradient(111deg,#7660dd 0%,#8b74ef 52%,#b39af8 100%);border-radius:23px;color:#fff;display:flex;align-items:center;position:relative;overflow:hidden;box-shadow:0 14px 32px #7a62df20}
.hero-copy{position:relative;z-index:2;max-width:56%}
.hero-chip{display:inline-flex;align-items:center;gap:8px;background:#ffffff21;border:1px solid #ffffff2b;padding:7px 10px;border-radius:20px;letter-spacing:1px;font-size:8px;font-weight:800}
.hero-chip-dot{width:6px;height:6px;border-radius:50%;background:#c7ffd9;box-shadow:0 0 0 3px #c7ffd927}
.welcome-hero h2{font:800 clamp(26px,2.5vw,36px)/1.19 Manrope,sans-serif;letter-spacing:-1.2px;margin:17px 0 10px}
.welcome-hero h2 span{color:#fce69d}
.welcome-hero p{max-width:450px;font-size:12px;line-height:1.7;color:#f1eaff;margin:0}
.hero-actions{display:flex;align-items:center;gap:17px;margin-top:20px;flex-wrap:wrap}
.button-white{height:39px;padding:0 15px;border:0;border-radius:10px;background:#fff;color:#7157d4;font-size:11px;font-weight:800;box-shadow:0 4px 10px #4f3c9a22}
.button-white span,.button-primary span,.soft-button span{margin-left:10px}
.hero-text-button{border:0;background:transparent;color:#fff;font-weight:700;font-size:11px}
.hero-art{width:250px;height:235px;position:absolute;right:9%;top:15px;display:grid;place-items:center}
.art-orbit{position:absolute;border:1px solid #ffffff55;border-radius:50%;transform:rotate(-24deg)}
.orbit-one{width:205px;height:205px}
.orbit-two{width:165px;height:224px;transform:rotate(39deg)}
.orbit-three{width:220px;height:140px;transform:rotate(8deg)}
.art-center{width:106px;height:106px;border-radius:32px;display:grid;place-items:center;background:linear-gradient(145deg,#fff9d8,#f5d9ff);color:#8668e5;font-size:55px;box-shadow:0 17px 36px #4935a438;transform:rotate(-8deg)}
.art-bubble{position:absolute;display:grid;place-items:center;width:35px;height:35px;border-radius:12px;background:#fff;color:#7b62d9;font-size:15px;font-weight:900;box-shadow:0 6px 17px #55419c25}
.bubble-one{top:28px;right:26px;background:#d6ffe9;color:#269b73}
.bubble-two{bottom:32px;right:20px;background:#ffe4ac;color:#ab6d18}
.bubble-three{bottom:35px;left:15px;background:#dff6ff;color:#3b9db8}
.hero-note{position:absolute;right:25px;bottom:21px;display:flex;align-items:center;gap:8px;background:#fff;color:#393253;padding:10px 13px;border-radius:12px;box-shadow:0 7px 20px #4d3a9b20}
.hero-note>span{width:27px;height:27px;background:#fff2cb;border-radius:9px;display:grid;place-items:center;color:#c38e22}
.hero-note div{display:flex;flex-direction:column;gap:3px}
.hero-note b{font-size:10px}
.hero-note small{font-size:9px;color:#9992b0}
.stats-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin:19px 0}
.metric-card{padding:17px 17px 16px;border:1px solid #eeedf6;border-radius:17px;background:#fff;min-width:0;box-shadow:0 4px 15px #3d2b7510;transition:transform .2s,box-shadow .2s}
.metric-card:hover,.subject-card:hover,.concept-card:hover{transform:translateY(-3px);box-shadow:0 12px 25px #47317d14}
.metric-top{display:flex;align-items:center;justify-content:space-between}
.metric-icon{width:33px;height:33px;border-radius:11px;display:grid;place-items:center;font-size:19px}
.metric-purple .metric-icon{background:#f0ebff;color:#896bea}
.metric-blue .metric-icon{background:#e7f4ff;color:#4f9ce0}
.metric-green .metric-icon{background:#e5fbf1;color:#28aa7e}
.metric-orange .metric-icon{background:#fff0e5;color:#e98b46}
.metric-spark{font-size:12px;color:#b4b0cb}
.metric-value{font:800 27px Manrope,sans-serif;letter-spacing:-1px;margin-top:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.metric-value.compact-value{font-size:18px;margin-top:18px}
.metric-label{font-size:11px;font-weight:800;color:#494763;margin-top:4px}
.metric-note{font-size:9px;color:#999bb0;margin-top:7px;white-space:normal}
.insight-card{display:flex;align-items:center;gap:15px;padding:18px 20px;border:1px solid #eae4ff;border-radius:17px;background:linear-gradient(100deg,#fbf9ff,#fff);margin-bottom:20px}
.insight-illustration{width:44px;height:44px;flex:0 0 44px;border-radius:15px;background:linear-gradient(145deg,#ffedb7,#ffe4c9);color:#b1791f;display:grid;place-items:center;font-size:24px}
.insight-copy{flex:1;min-width:0}
.insight-copy .eyebrow{color:#a28bd9}
.insight-copy h3{font:800 15px Manrope,sans-serif;margin:5px 0 4px;letter-spacing:-.3px}
.insight-copy p{margin:0;color:#8587a0;font-size:11px;line-height:1.6}
.button-primary{border:0;background:#8064e9;color:#fff;padding:11px 15px;border-radius:10px;font-size:11px;font-weight:800;white-space:nowrap;box-shadow:0 6px 14px #8064e928;transition:.2s}
.button-primary:hover{background:#6d51d6;transform:translateY(-1px)}
.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.5fr) minmax(260px,.8fr);gap:17px;margin-bottom:19px}
.surface{background:#fff;border:1px solid #eeedf6;border-radius:19px;padding:22px;box-shadow:0 4px 15px #3d2b7509;min-width:0;margin-bottom:19px}
.dashboard-grid .surface{margin-bottom:0}
.surface-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:15px}
.surface-heading h2,.section-heading h2{font:800 17px Manrope,sans-serif;letter-spacing:-.5px;margin:6px 0}
.surface-heading p,.section-heading p{font-size:11px;color:#9899b0;line-height:1.6;margin:0}
.chart-badge,.soft-count{background:#f5f2ff;color:#8a72d9;font-size:10px;font-weight:800;padding:7px 10px;border-radius:9px;white-space:nowrap}
.bar-chart{height:225px;display:flex;position:relative;margin-top:23px;padding-bottom:36px}
.chart-grid-lines{position:absolute;inset:0 0 36px;display:flex;flex-direction:column;justify-content:space-between;pointer-events:none}
.chart-grid-lines span{height:1px;border-bottom:1px dashed #efedf7;font-size:8px;color:#acadc0;position:relative;padding-left:0}
.bars-area{position:relative;margin-left:37px;display:flex;align-items:stretch;justify-content:space-around;gap:12px;flex:1;min-width:0}
.bar-column{height:100%;display:flex;flex:1;min-width:0;flex-direction:column;align-items:center;justify-content:flex-end;position:relative}
.bar-value{font-size:9px;color:#77718d;font-weight:800;margin-bottom:5px}
.bar-track{height:calc(100% - 25px);width:min(34px,74%);display:flex;align-items:flex-end;background:#f8f7fc;border-radius:8px 8px 3px 3px;overflow:hidden}
.bar-fill{width:100%;border-radius:8px 8px 2px 2px;min-height:3px;animation:growbar .7s ease-out both}
.fill-0{background:linear-gradient(180deg,#aa8cff,#8064e9)}
.fill-1{background:linear-gradient(180deg,#94d8ff,#55a9ee)}
.fill-2{background:linear-gradient(180deg,#a6ebce,#4fc79b)}
.fill-3{background:linear-gradient(180deg,#ffd49e,#f2a95b)}
.bar-label{position:absolute;top:calc(100% + 7px);width:100%;font-size:8px;line-height:1.25;color:#888aa2;text-align:center;overflow-wrap:anywhere;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.plain-link{border:0;background:transparent;padding:0;color:#8064e9;font-size:10px;font-weight:800}
.plain-link span{margin-left:6px}
.chart-surface>.plain-link{margin-top:9px}
.focus-surface{display:flex;flex-direction:column}
.ring-wrap{display:grid;place-items:center;padding:18px 0 12px}
.score-ring{width:133px;height:133px;border-radius:50%;display:grid;place-items:center;position:relative;box-shadow:0 5px 16px #8c70db18}
.score-ring-inner{width:105px;height:105px;border-radius:50%;background:#fff;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px}
.score-ring-inner strong{font:800 28px Manrope,sans-serif;letter-spacing:-1px}
.score-ring-inner small{font-size:8px;letter-spacing:1px;color:#a4a0bb;font-weight:800}
.profile-summary{display:flex;flex-direction:column;gap:12px;border-top:1px solid #f0eef7;padding:15px 0;margin-top:3px}
.profile-summary>div{display:grid;grid-template-columns:9px minmax(0,1fr) auto;gap:8px;align-items:center;font-size:10px;color:#9293aa}
.profile-summary b{font-size:10px;color:#464560;text-align:right;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.summary-dot{width:7px;height:7px;border-radius:50%}
.purple-dot{background:#9a80f5}
.orange-dot{background:#f1a45b}
.green-dot{background:#50c79a}
.soft-button{border:1px solid #e8e1ff;background:#f8f5ff;color:#785de0;padding:11px 12px;border-radius:10px;font-size:10px;font-weight:800}
.full-button{width:100%;text-align:center}
.domains-surface,.path-surface{margin-bottom:19px}
.header-link{margin-top:7px;white-space:nowrap}
.subject-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin-top:17px}
.subject-card{--accent:#8869e9;border:1px solid #eeedf6;background:#fff;border-radius:15px;padding:16px;text-align:left;color:inherit;min-width:0;transition:transform .2s,box-shadow .2s;width:100%;animation:fadein .35s both;animation-delay:var(--card-delay,0ms)}
.subject-card-top{display:flex;align-items:center;justify-content:space-between}
.subject-icon{width:37px;height:37px;border-radius:12px;display:grid;place-items:center;font-size:20px;background:#f0ebff}
.subject-icon-1{background:#e7f5ff}
.subject-icon-2{background:#e4fbf1}
.subject-icon-3{background:#fff0e3}
.subject-arrow{font-size:14px;color:#b2adc9;transition:transform .2s}
.subject-card:hover .subject-arrow{transform:translate(2px,-2px);color:#8064e9}
.subject-card h3{font:800 12px Manrope,sans-serif;margin:14px 0 5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.subject-card>p{font-size:9px;color:#9a9bb0;margin:0;min-height:25px;line-height:1.5}
.subject-progress-meta{display:flex;align-items:center;justify-content:space-between;gap:5px;font-size:9px;color:#9899af;margin-top:15px}
.subject-status{font-weight:800;font-size:8px;white-space:nowrap}
.subject-card-bottom{display:flex;align-items:center;justify-content:space-between;margin-top:13px;gap:8px;font-size:9px;color:#a0a1b5}
.subject-card-bottom b{color:#8064e9;white-space:nowrap;font-size:9px}
.subject-card-bottom b span{margin-left:3px}
.learning-list{margin-top:13px}
.learning-item{display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #f2f0f8;min-width:0}
.learning-item:last-child{border-bottom:0;padding-bottom:0}
.learning-step{width:32px;height:32px;flex:0 0 32px;border-radius:11px;display:grid;place-items:center;background:#f2efff;color:#856ae2;font:800 12px Manrope,sans-serif}
.learning-step.first-step{background:#e5fbf1;color:#269b75}
.learning-info{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.learning-info b{font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.learning-info span{font-size:9px;color:#9b9cb1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.learning-info i{font-style:normal;margin:0 4px;color:#c5c3d5}
.learning-score{display:flex;flex-direction:column;gap:4px;text-align:right;min-width:54px}
.learning-score b{font-size:11px}
.learning-score small{font-size:8px;color:#a3a4b7}
.view-button{border:1px solid #e9e5f7;background:#fff;color:#8064e9;border-radius:8px;padding:8px 10px;font-size:9px;font-weight:800;white-space:nowrap}
.view-button span{margin-left:4px}
.lt-footer{display:flex;align-items:center;justify-content:space-between;gap:15px;color:#a6a7bb;font-size:9px;padding:4px 2px 24px}
.lt-footer b{color:#9576ed}
.content-section{padding-bottom:15px}
.section-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin:6px 0 18px}
.section-heading h2{font-size:19px;margin:0 0 6px}
.section-heading p{font-size:11px}
.detail-banner{display:flex;align-items:center;justify-content:space-between;gap:20px;padding:25px 28px;background:linear-gradient(110deg,#7660dd,#a68cf4);border-radius:20px;color:#fff;margin-bottom:24px}
.detail-banner .eyebrow{color:#e5dcff}
.detail-banner h2{font:800 27px Manrope,sans-serif;margin:8px 0}
.detail-banner p{color:#f1eaff;font-size:11px;margin:0;line-height:1.65}
.detail-score{width:100px;height:100px;flex:0 0 100px;border:1px solid #ffffff65;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#ffffff16}
.detail-score span{font:800 23px Manrope,sans-serif}
.detail-score small{font-size:9px;color:#f0eaff;margin-top:3px}
.back-link{border:0;background:transparent;color:#8064e9;font-weight:800;font-size:11px;padding:0;margin:2px 0 15px}
.concept-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:14px}
.concept-card{background:#fff;border:1px solid #eeedf6;border-radius:16px;padding:19px;transition:transform .2s,box-shadow .2s;min-width:0}
.concept-top{display:flex;align-items:center;justify-content:space-between}
.concept-symbol{width:31px;height:31px;display:grid;place-items:center;border-radius:10px;background:#f2edff;color:#8064e9;font-size:17px}
.status-pill{font-size:9px;font-weight:800;padding:6px 9px;border-radius:30px}
.concept-card h3{font:800 14px Manrope,sans-serif;margin:15px 0 13px}
.concept-score-row{display:flex;align-items:center;justify-content:space-between;gap:10px}
.concept-score-row b{font:800 20px Manrope,sans-serif}
.concept-score-row span{font-size:9px;color:#999ab0}
.prereq{font-size:10px;color:#999ab0;margin:15px 0 0;line-height:1.6}
.prereq b{color:#61617c;font-weight:700}
.empty-state{border:1px dashed #e3dff3;background:#fcfbff;border-radius:14px;padding:24px 18px;text-align:center;color:#9898b1;margin-top:14px}
.empty-state>span{display:block;font-size:25px;color:#9f87ec}
.empty-state p{font-size:11px;line-height:1.65;margin:9px auto 0;max-width:380px}
.lt-loading-screen{min-height:100vh;background:#f8f8fd;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#302e4a;font-family:'DM Sans',Arial,sans-serif}
.loading-mark{width:55px;height:55px;border-radius:17px;background:linear-gradient(145deg,#9d85ff,#7151de);display:grid;place-items:center;color:#fff;font-weight:900;font:800 19px Manrope,sans-serif;box-shadow:0 10px 26px #8b72e832}
.lt-loading-screen h2{font:800 19px Manrope,sans-serif;margin:20px 0 8px}
.lt-loading-screen p{font-size:12px;color:#9293aa}
.loading-track{width:180px;height:5px;background:#ebe7fb;border-radius:20px;overflow:hidden;margin-top:16px}
.loading-track span{display:block;width:45%;height:100%;border-radius:20px;background:#876ce9;animation:loading 1.1s ease-in-out infinite alternate}
@keyframes loading{from{transform:translateX(-25%)}to{transform:translateX(145%)}}
@keyframes growbar{from{transform:scaleY(0);transform-origin:bottom}to{transform:scaleY(1);transform-origin:bottom}}
@keyframes fadein{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
@media(min-width:1500px){.lt-main{padding-left:45px;padding-right:45px}.welcome-hero{min-height:300px}.hero-art{right:12%}.subject-grid{grid-template-columns:repeat(4,minmax(0,1fr))}}
@media(max-width:1200px){.lt-sidebar{width:220px;flex-basis:220px}.lt-main{padding:0 22px}.stats-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.subject-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.hero-art{right:3%;opacity:.9}.hero-copy{max-width:65%}.concept-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.topbar-tools{gap:10px}.top-profile small{max-width:120px}}
@media(max-width:820px){.lt-app{display:block}.lt-sidebar{display:none}.lt-main{padding:0 16px}.lt-topbar{min-height:90px;flex-wrap:wrap;padding:15px 0;gap:13px}.mobile-brand{display:flex;align-items:center;gap:8px;font:800 14px Manrope,sans-serif}.mobile-brand .brand-mark{width:32px;height:32px;border-radius:10px;font-size:14px}.page-intro{flex:1;min-width:170px}.page-intro h1{font-size:21px}.page-intro .eyebrow{font-size:8px}.topbar-tools{width:100%;justify-content:space-between}.search-box{flex:1;min-width:0}.top-profile{display:none}.top-logout{padding:8px 10px}.mobile-history-shortcut{display:inline-flex;padding:8px 10px}.history-row{align-items:flex-start;flex-wrap:wrap;gap:10px}.history-result{text-align:left;min-width:90px}.history-row time{width:100%}.welcome-hero{padding:25px;min-height:290px}.hero-copy{max-width:100%}.welcome-hero h2{font-size:30px}.hero-art{right:-56px;opacity:.22;top:8px}.hero-note{position:relative;right:auto;bottom:auto;margin-top:22px;width:max-content;max-width:100%}.welcome-hero{display:block}.dashboard-grid{grid-template-columns:1fr}.focus-surface{display:block}.subject-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.lt-footer{padding-bottom:20px}.chart-surface,.focus-surface,.surface{padding:17px}.insight-card{align-items:flex-start;flex-wrap:wrap}.insight-copy{min-width:calc(100% - 65px)}.insight-card>.button-primary{margin-left:59px}.detail-banner{padding:21px}.concept-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:540px){.stats-grid{gap:9px}.metric-card{padding:13px}.metric-value{font-size:23px}.metric-value.compact-value{font-size:15px}.metric-note{font-size:8px;line-height:1.5}.metric-label{font-size:10px}.welcome-hero{padding:22px 18px;border-radius:18px}.welcome-hero h2{font-size:27px}.hero-text-button{font-size:10px}.hero-actions{gap:10px}.hero-note{font-size:9px}.surface-heading{gap:8px}.surface-heading h2{font-size:15px}.surface-heading p{font-size:10px}.chart-badge{font-size:8px;padding:6px}.subject-grid{grid-template-columns:1fr}.subject-card{padding:15px}.concept-grid{grid-template-columns:1fr}.learning-item{gap:8px}.learning-step{width:28px;height:28px;flex-basis:28px}.learning-score{min-width:42px}.view-button{padding:7px}.learning-info b{font-size:10px}.learning-info span{font-size:8px}.section-heading h2{font-size:17px}.detail-banner{align-items:flex-start;padding:18px}.detail-banner h2{font-size:22px}.detail-banner p{font-size:10px}.detail-score{width:72px;height:72px;flex-basis:72px}.detail-score span{font-size:19px}.detail-score small{font-size:8px}.lt-footer{font-size:8px}.lt-footer span:last-child{text-align:right}.bar-chart{gap:5px}.bars-area{gap:4px;margin-left:29px}.bar-track{width:min(28px,85%)}.bar-label{font-size:7px}.profile-summary>div{grid-template-columns:8px minmax(0,1fr) auto}.path-surface .surface-heading,.domains-surface .surface-heading{align-items:flex-start}.header-link{font-size:9px}}
`;

export default Dashboard;
