
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "https://learntrace-backend-vp2a.onrender.com/analysis";

const keyOf = (item) =>
  String(item.id ?? `${item.subject || ""}-${item.name || ""}`);

const scoreOf = (item) => {
  if (item?.score === null || item?.score === undefined) return null;
  const value = Number(item.score);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : null;
};

const statusOf = (item) => {
  const score = scoreOf(item);

  if (score === null) return "Not Assessed";
  if (score >= 80) return "Mastered";
  if (score >= 60) return "Developing";
  if (score >= 40) return "Needs Attention";
  return "Critical";
};

const colorOf = (status) => {
  const colors = {
    Mastered: "#249d78",
    Developing: "#6489e9",
    "Needs Attention": "#e99b43",
    Critical: "#df6075",
    "Not Assessed": "#a1a2b8",
  };

  return colors[status] || "#a1a2b8";
};

function KnowledgeTwin() {
  const location = useLocation();
  const navigate = useNavigate();

  const [concepts, setConcepts] = useState([]);
  const [learningPath, setLearningPath] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  const [activeView, setActiveView] = useState("map");
  const [subjectFilter, setSubjectFilter] = useState(
    location.state?.subject || "All subjects"
  );
  const [statusFilter, setStatusFilter] = useState("All concepts");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let mounted = true;

    setLoading(true);
    setError("");

    Promise.allSettled([
      axios.get(`${API}/knowledge-gaps`),
      axios.get(`${API}/learning-path`),
    ])
      .then(([conceptResult, pathResult]) => {
        if (!mounted) return;

        if (conceptResult.status === "fulfilled") {
          const data = Array.isArray(conceptResult.value.data)
            ? conceptResult.value.data
            : [];

          setConcepts(data);

          setSelectedId((current) => {
            if (current && data.some((item) => keyOf(item) === current)) {
              return current;
            }

            const requestedName = location.state?.concept;
            const requestedSubject = location.state?.subject;

            const requested = data.find(
              (item) =>
                requestedName &&
                item.name === requestedName &&
                (!requestedSubject || item.subject === requestedSubject)
            );

            const weakest = [...data]
              .filter((item) => scoreOf(item) !== null)
              .sort((a, b) => scoreOf(a) - scoreOf(b))[0];

            return keyOf(requested || weakest || data[0] || {
              id: "empty",
              name: "empty",
            });
          });
        } else {
          setError(
            "Could not load your concept data. Check the backend and try again."
          );
        }

        if (pathResult.status === "fulfilled") {
          setLearningPath(
            Array.isArray(pathResult.value.data)
              ? pathResult.value.data
              : []
          );
        } else {
          setError((previous) =>
            previous
              ? `${previous} The learning path is also unavailable.`
              : "Could not load the learning path."
          );
        }
      })
      .catch(() => {
        if (mounted) {
          setError("Unable to load Knowledge Twin data.");
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [refresh, location.state?.subject, location.state?.concept]);

  const subjects = useMemo(
    () =>
      [...new Set(concepts.map((item) => item.subject).filter(Boolean))]
        .sort(),
    [concepts]
  );

  const filteredConcepts = useMemo(() => {
    return concepts.filter((item) => {
      const subjectMatches =
        subjectFilter === "All subjects" ||
        item.subject === subjectFilter;

      const status = statusOf(item);

      const statusMatches =
        statusFilter === "All concepts" || status === statusFilter;

      const searchText = `${item.name || ""} ${item.subject || ""} ${
        item.prerequisite || ""
      }`.toLowerCase();

      return (
        subjectMatches &&
        statusMatches &&
        searchText.includes(search.toLowerCase())
      );
    });
  }, [concepts, subjectFilter, statusFilter, search]);

  const selectedConcept =
    filteredConcepts.find((item) => keyOf(item) === selectedId) ||
    concepts.find((item) => keyOf(item) === selectedId) ||
    filteredConcepts[0] ||
    null;

  const assessedCount = concepts.filter(
    (item) => scoreOf(item) !== null
  ).length;

  const masteredCount = concepts.filter(
    (item) => statusOf(item) === "Mastered"
  ).length;

  const attentionCount = concepts.filter((item) =>
    ["Critical", "Needs Attention"].includes(statusOf(item))
  ).length;

  const averageScore = assessedCount
    ? Math.round(
        concepts.reduce((total, item) => {
          const score = scoreOf(item);
          return total + (score === null ? 0 : score);
        }, 0) / assessedCount
      )
    : 0;

  const startAssessment = (item) => {
    if (!item?.subject || !item?.name) return;

    navigate("/quiz", {
      state: {
        subject: item.subject,
        concept: item.name,
      },
    });
  };

  const focusOnConcept = (item) => {
    setSelectedId(keyOf(item));
    if (item.subject) setSubjectFilter(item.subject);
    setStatusFilter("All concepts");
    setSearch("");
    setActiveView("map");
  };

  const mappedNodes = useMemo(() => {
    const lanes = [
      [],
      [],
      [],
      [],
    ];

    filteredConcepts.forEach((item) => {
      const score = scoreOf(item);

      if (score === null) lanes[0].push(item);
      else if (score < 60) lanes[1].push(item);
      else if (score < 80) lanes[2].push(item);
      else lanes[3].push(item);
    });

    lanes.forEach((lane) =>
      lane.sort((a, b) =>
        String(a.name || "").localeCompare(String(b.name || ""))
      )
    );

    const centers = [142, 410, 678, 946];
    const cardWidth = 194;
    const startY = 103;
    const stepY = 88;

    const nodes = [];
    const positions = new Map();

    lanes.forEach((lane, laneIndex) => {
      lane.forEach((item, rowIndex) => {
        const node = {
          ...item,
          nodeKey: keyOf(item),
          lane: laneIndex,
          x: centers[laneIndex] - cardWidth / 2,
          y: startY + rowIndex * stepY,
          width: cardWidth,
          height: 64,
        };

        nodes.push(node);
        positions.set(node.nodeKey, node);
      });
    });

    const height =
      Math.max(...lanes.map((lane) => lane.length), 1) * stepY + 105;

    return { nodes, positions, height, centers };
  }, [filteredConcepts]);

  const edges = useMemo(() => {
    const result = [];

    mappedNodes.nodes.forEach((child) => {
      const prerequisite = String(child.prerequisite || "")
        .trim()
        .toLowerCase();

      if (!prerequisite || prerequisite === "none") return;

      const parent = mappedNodes.nodes.find((candidate) => {
        if (candidate.nodeKey === child.nodeKey) return false;

        const candidateName = String(candidate.name || "").toLowerCase();

        return (
          prerequisite === candidateName ||
          prerequisite.includes(candidateName) ||
          candidateName.includes(prerequisite)
        );
      });

      if (parent) result.push({ parent, child });
    });

    return result;
  }, [mappedNodes]);

  const pathItems = useMemo(() => {
    return learningPath.filter(
      (item) =>
        subjectFilter === "All subjects" ||
        item.subject === subjectFilter
    );
  }, [learningPath, subjectFilter]);

  if (loading) {
    return (
      <div className="twin-loading">
        <style>{twinStyles}</style>
        <div className="twin-loading-orb">✦</div>
        <h2>Building your Knowledge Twin</h2>
        <p>Connecting your learning concepts and performance data…</p>
        <div className="twin-loading-track">
          <span />
        </div>
      </div>
    );
  }

  return (
    <div className="twin-app">
      <style>{twinStyles}</style>

      <header className="twin-topbar">
        <button
          className="twin-brand"
          onClick={() => navigate("/dashboard")}
        >
          <span className="twin-brand-logo">LT</span>

          <span>
            <b>LearnTrace</b>
            <small>KNOWLEDGE INTELLIGENCE</small>
          </span>
        </button>

        <div className="twin-top-title">
          <span>YOUR PERSONAL LEARNING MODEL</span>
          <h1>Knowledge Twin</h1>
        </div>

        <div className="twin-top-actions">
          <span className="twin-live">
            <i /> Connected view
          </span>

          <button
            className="twin-refresh"
            onClick={() => setRefresh((value) => value + 1)}
            title="Reload your learning data"
          >
            ↻ <span>Refresh</span>
          </button>

          <button
            className="twin-back"
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {error && (
        <div className="twin-error">
          <span>⚠</span>
          <p>{error}</p>
          <button onClick={() => setRefresh((value) => value + 1)}>
            Try again
          </button>
        </div>
      )}

      <main className="twin-content">
        <section className="twin-hero">
          <div className="twin-hero-copy">
            <div className="twin-label">
              <span>✦</span> YOUR KNOWLEDGE, CONNECTED
            </div>

            <h2>
              Understand what you know.
              <br />
              <span>Discover what comes next.</span>
            </h2>

            <p>
              Explore your concepts, inspect your progress, and find
              the topics that deserve your attention.
            </p>

            <div className="twin-hero-buttons">
              <button
                className="twin-main-button"
                onClick={() => setActiveView("map")}
              >
                Explore knowledge map <span>→</span>
              </button>

              <button
                className="twin-quiet-button"
                onClick={() => setActiveView("insights")}
              >
                View my insights
              </button>
            </div>
          </div>

          <div className="twin-hero-visual" aria-hidden="true">
            <div className="twin-circle circle-one" />
            <div className="twin-circle circle-two" />
            <div className="twin-circle circle-three" />
            <div className="twin-brain">🧠</div>
            <span className="twin-float float-one">✓</span>
            <span className="twin-float float-two">✧</span>
            <span className="twin-float float-three">↗</span>
          </div>

          <div className="twin-hero-foot">
            <span>✦</span>
            <div>
              <b>Explore at your own pace</b>
              <small>
                Select any concept to inspect its current status.
              </small>
            </div>
          </div>
        </section>

        {/* SUMMARY */}
        <section className="twin-stats">
          <StatCard
            label="Average knowledge score"
            value={`${averageScore}%`}
            icon="◉"
            theme="purple"
            detail="Based on assessed concepts"
          />

          <StatCard
            label="Concepts assessed"
            value={assessedCount}
            icon="▤"
            theme="blue"
            detail={`Out of ${concepts.length} available`}
          />

          <StatCard
            label="Mastered"
            value={masteredCount}
            icon="✦"
            theme="green"
            detail="Scores of 80% or higher"
          />

          <StatCard
            label="Needs attention"
            value={attentionCount}
            icon="◎"
            theme="orange"
            detail="Concepts below 60%"
          />
        </section>

        {/* INTERACTIVE NAVIGATION */}
        <section className="twin-workspace">
          <div className="twin-workspace-heading">
            <div>
              <span className="twin-eyebrow">KNOWLEDGE EXPLORER</span>
              <h2>Your learning space</h2>
              <p>
                Switch views to inspect concepts, performance, and
                recommended next steps.
              </p>
            </div>

            <div className="twin-control-group">
              <label>
                <span>Subject</span>

                <select
                  value={subjectFilter}
                  onChange={(event) => {
                    setSubjectFilter(event.target.value);
                    setSelectedId("");
                  }}
                >
                  <option>All subjects</option>
                  {subjects.map((subject) => (
                    <option key={subject} value={subject}>
                      {subject}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Concept status</span>

                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setSelectedId("");
                  }}
                >
                  <option>All concepts</option>
                  <option>Not Assessed</option>
                  <option>Critical</option>
                  <option>Needs Attention</option>
                  <option>Developing</option>
                  <option>Mastered</option>
                </select>
              </label>
            </div>
          </div>

          <div className="twin-tabs">
            <button
              className={activeView === "map" ? "selected" : ""}
              onClick={() => setActiveView("map")}
            >
              <span>⌘</span> Knowledge map
            </button>

            <button
              className={activeView === "insights" ? "selected" : ""}
              onClick={() => setActiveView("insights")}
            >
              <span>◉</span> Insights & gaps
            </button>

            <button
              className={activeView === "path" ? "selected" : ""}
              onClick={() => setActiveView("path")}
            >
              <span>⌁</span> Learning path
            </button>
          </div>

          {activeView === "map" && (
            <div className="twin-map-layout">
              <section className="twin-map-panel">
                <div className="twin-panel-heading">
                  <div>
                    <h3>Interactive concept map</h3>
                    <p>
                      Click a node to see its details on the right.
                    </p>
                  </div>

                  <span className="twin-node-count">
                    {filteredConcepts.length} nodes
                  </span>
                </div>

                <div className="twin-map-legend">
                  {[
                    ["Not Assessed", "#a1a2b8"],
                    ["Needs Attention", "#e99b43"],
                    ["Developing", "#6489e9"],
                    ["Mastered", "#249d78"],
                  ].map(([label, color]) => (
                    <span key={label}>
                      <i style={{ background: color }} />
                      {label}
                    </span>
                  ))}
                </div>

                {filteredConcepts.length === 0 ? (
                  <EmptyTwin
                    text="No concepts match these filters. Try another subject, status, or search."
                  />
                ) : (
                  <>
                    <div className="twin-map-scroll">
                      <svg
                        className="twin-svg"
                        viewBox={`0 0 1100 ${mappedNodes.height}`}
                        style={{ height: mappedNodes.height }}
                        role="group"
                        aria-label="Interactive concept map. Select any concept."
                      >
                        {[
                          ["NOT ASSESSED", 142],
                          ["NEEDS ATTENTION", 410],
                          ["DEVELOPING", 678],
                          ["MASTERED", 946],
                        ].map(([label, center], index) => (
                          <g key={label}>
                            <rect
                              x={center - 99}
                              y="14"
                              width="198"
                              height="39"
                              rx="12"
                              fill={
                                [
                                  "#f1f0f8",
                                  "#fff2df",
                                  "#edf2ff",
                                  "#e9f9f2",
                                ][index]
                              }
                            />

                            <text
                              x={center}
                              y="38"
                              textAnchor="middle"
                              className="svg-lane-label"
                            >
                              {label}
                            </text>
                          </g>
                        ))}

                        {edges.map(({ parent, child }) => {
                          const startX = parent.x + parent.width;
                          const startY = parent.y + 32;
                          const endX = child.x;
                          const endY = child.y + 32;
                          const midX = (startX + endX) / 2;

                          return (
                            <path
                              key={`${parent.nodeKey}-${child.nodeKey}`}
                              d={`M ${startX} ${startY} C ${midX} ${startY}, ${midX} ${endY}, ${endX} ${endY}`}
                              fill="none"
                              stroke="#d9d2f4"
                              strokeWidth="2"
                              strokeDasharray="5 5"
                            />
                          );
                        })}

                        {mappedNodes.nodes.map((node) => {
                          const selected =
                            selectedConcept &&
                            keyOf(selectedConcept) === node.nodeKey;

                          const color = colorOf(statusOf(node));
                          const score = scoreOf(node);

                          const displayName =
                            String(node.name || "Unnamed concept").length > 23
                              ? `${String(node.name).slice(0, 21)}…`
                              : node.name || "Unnamed concept";

                          return (
                            <g
                              key={node.nodeKey}
                              role="button"
                              tabIndex="0"
                              aria-label={`Select ${node.name}`}
                              className="svg-node"
                              onClick={() => setSelectedId(node.nodeKey)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  setSelectedId(node.nodeKey);
                                }
                              }}
                              style={{ cursor: "pointer" }}
                            >
                              <title>
                                {node.name} —{" "}
                                {score === null
                                  ? "Not assessed"
                                  : `${Math.round(score)}%`}
                              </title>

                              <rect
                                x={node.x}
                                y={node.y}
                                width={node.width}
                                height={node.height}
                                rx="13"
                                fill={selected ? "#f1edff" : "#ffffff"}
                                stroke={selected ? "#8768ec" : "#e9e6f3"}
                                strokeWidth={selected ? "2.5" : "1.2"}
                              />

                              <rect
                                x={node.x}
                                y={node.y + 12}
                                width="4"
                                height="40"
                                rx="2"
                                fill={color}
                              />

                              <circle
                                cx={node.x + 19}
                                cy={node.y + 21}
                                r="4"
                                fill={color}
                              />

                              <text
                                x={node.x + 30}
                                y={node.y + 25}
                                className="svg-node-name"
                              >
                                {displayName}
                              </text>

                              <text
                                x={node.x + 15}
                                y={node.y + 48}
                                className="svg-node-sub"
                              >
                                {score === null
                                  ? "Ready to explore"
                                  : `${Math.round(score)}% score`}
                              </text>

                              <text
                                x={node.x + node.width - 13}
                                y={node.y + 47}
                                textAnchor="end"
                                className="svg-node-status"
                                fill={color}
                              >
                                {score === null
                                  ? "—"
                                  : score >= 80
                                  ? "✓"
                                  : "●"}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div className="twin-map-footer">
                      <span>
                        <i className="map-legend-line" />
                        Dashed lines show detected prerequisite matches.
                      </span>

                      <span>
                        Connections appear when prerequisite names match
                        available concept names.
                      </span>
                    </div>
                  </>
                )}
              </section>

              <ConceptDetail
                concept={selectedConcept}
                onAssess={startAssessment}
                onShowPath={() => setActiveView("path")}
              />
            </div>
          )}

          {activeView === "insights" && (
            <div className="twin-insight-view">
              <div className="twin-insight-main">
                <div className="twin-panel-heading">
                  <div>
                    <h3>Performance insights</h3>
                    <p>
                      Explore concepts based on your current results.
                    </p>
                  </div>
                </div>

                <div className="twin-performance-bars">
                  {[
                    {
                      label: "Mastered",
                      count: concepts.filter(
                        (item) => statusOf(item) === "Mastered"
                      ).length,
                      color: "#249d78",
                    },
                    {
                      label: "Developing",
                      count: concepts.filter(
                        (item) => statusOf(item) === "Developing"
                      ).length,
                      color: "#6489e9",
                    },
                    {
                      label: "Needs attention",
                      count: attentionCount,
                      color: "#e99b43",
                    },
                    {
                      label: "Not assessed",
                      count: concepts.filter(
                        (item) => statusOf(item) === "Not Assessed"
                      ).length,
                      color: "#a1a2b8",
                    },
                  ].map((item) => (
                    <div className="twin-performance-row" key={item.label}>
                      <div>
                        <span>
                          <i style={{ background: item.color }} />
                          {item.label}
                        </span>

                        <b>{item.count}</b>
                      </div>

                      <div className="twin-performance-track">
                        <span
                          style={{
                            width: `${
                              concepts.length
                                ? (item.count / concepts.length) * 100
                                : 0
                            }%`,
                            background: item.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="twin-insight-note">
                  <span>✦</span>
                  <p>
                    Your knowledge score reflects the concepts assessed
                    so far; unassessed concepts are not treated as
                    zero-score assessments.
                  </p>
                </div>
              </div>

              <div className="twin-gap-panel">
                <div className="twin-panel-heading">
                  <div>
                    <h3>Review next</h3>
                    <p>
                      Your lower-scoring assessed concepts.
                    </p>
                  </div>
                </div>

                <div className="twin-gap-list">
                  {[...filteredConcepts]
                    .filter((item) => scoreOf(item) !== null)
                    .sort((a, b) => scoreOf(a) - scoreOf(b))
                    .slice(0, 6)
                    .map((item) => (
                      <button
                        key={keyOf(item)}
                        className="twin-gap-item"
                        onClick={() => focusOnConcept(item)}
                      >
                        <span
                          className="twin-gap-indicator"
                          style={{
                            background: colorOf(statusOf(item)),
                          }}
                        />

                        <span className="twin-gap-name">
                          <b>{item.name}</b>
                          <small>{item.subject}</small>
                        </span>

                        <strong
                          style={{ color: colorOf(statusOf(item)) }}
                        >
                          {Math.round(scoreOf(item))}%
                        </strong>

                        <span className="twin-gap-arrow">→</span>
                      </button>
                    ))}

                  {filteredConcepts.every(
                    (item) => scoreOf(item) === null
                  ) && (
                    <EmptyTwin text="No assessed concepts match the current filters." />
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === "path" && (
            <section className="twin-path-view">
              <div className="twin-path-header">
                <div>
                  <span className="twin-eyebrow">
                    YOUR NEXT STEPS
                  </span>
                  <h3>Personalized learning path</h3>
                  <p>
                    Select a recommended concept to inspect it, or start
                    its assessment.
                  </p>
                </div>

                <span className="twin-path-count">
                  {pathItems.length} recommendations
                </span>
              </div>

              {pathItems.length === 0 ? (
                <EmptyTwin
                  text="No learning-path recommendations are available for this subject yet."
                />
              ) : (
                <div className="twin-path-list">
                  {pathItems.map((item, index) => (
                    <div
                      className="twin-path-item"
                      key={item.id ?? `${item.subject}-${item.name}-${index}`}
                    >
                      <div className="twin-path-number">
                        {item.step || index + 1}
                      </div>

                      <div className="twin-path-info">
                        <b>{item.name || "Recommended concept"}</b>

                        <span>
                          {item.subject || "Subject"} ·{" "}
                          {item.status || "Recommended"}
                        </span>
                      </div>

                      <div className="twin-path-score">
                        <strong
                          style={{ color: colorOf(statusOf(item)) }}
                        >
                          {item.score == null
                            ? "—"
                            : `${Math.round(Number(item.score))}%`}
                        </strong>
                        <small>Current score</small>
                      </div>

                      <button
                        className="twin-review-button"
                        onClick={() => {
                          const match = concepts.find(
                            (concept) =>
                              concept.name === item.name &&
                              concept.subject === item.subject
                          );

                          if (match) {
                            focusOnConcept(match);
                          } else {
                            startAssessment({
                              name: item.name,
                              subject: item.subject,
                            });
                          }
                        }}
                      >
                        Explore <span>→</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </section>

        <footer className="twin-footer">
          <span>LearnTrace · Knowledge Twin</span>
          <span>
            Understand your progress <b>✦</b> Take the next step
          </span>
        </footer>
      </main>
    </div>
  );
}

function StatCard({ label, value, icon, theme, detail }) {
  return (
    <article className={`twin-stat twin-stat-${theme}`}>
      <div className="twin-stat-top">
        <span className="twin-stat-icon">{icon}</span>
        <span className="twin-stat-mark">↗</span>
      </div>

      <strong>{value}</strong>
      <b>{label}</b>
      <small>{detail}</small>
    </article>
  );
}

function ConceptDetail({ concept, onAssess, onShowPath }) {
  if (!concept) {
    return (
      <aside className="twin-detail-panel">
        <div className="twin-detail-empty">✦</div>
        <h3>Select a concept</h3>
        <p>
          Choose any concept on the map to view its current progress.
        </p>
      </aside>
    );
  }

  const score = scoreOf(concept);
  const status = statusOf(concept);
  const color = colorOf(status);

  return (
    <aside className="twin-detail-panel">
      <div className="twin-detail-heading">
        <span>SELECTED CONCEPT</span>
        <span
          className="twin-detail-dot"
          style={{ background: color }}
        />
      </div>

      <div
        className="twin-detail-icon"
        style={{ color, background: `${color}17` }}
      >
        ✧
      </div>

      <h3>{concept.name}</h3>
      <p className="twin-detail-subject">{concept.subject}</p>

      <div
        className="twin-detail-status"
        style={{ color, background: `${color}17` }}
      >
        {status}
      </div>

      <div className="twin-detail-score">
        <div>
          <span>Current score</span>
          <strong>{score === null ? "—" : `${Math.round(score)}%`}</strong>
        </div>

        <div className="twin-mini-ring">
          <div
            style={{
              background: `conic-gradient(${color} ${
                score === null ? 0 : score * 3.6
              }deg, #eeedf6 0deg)`,
            }}
          >
            <span>{score === null ? "—" : Math.round(score)}</span>
          </div>
        </div>
      </div>

      <div className="twin-detail-progress">
        <span
          style={{
            width: `${score || 0}%`,
            background: color,
          }}
        />
      </div>

      <div className="twin-detail-facts">
        <div>
          <span>Subject</span>
          <b>{concept.subject || "Not specified"}</b>
        </div>

        <div>
          <span>Prerequisite</span>
          <b>{concept.prerequisite || "Not specified"}</b>
        </div>

        <div>
          <span>Next step</span>
          <b>
            {score === null
              ? "Take an assessment"
              : score >= 80
              ? "Keep your knowledge fresh"
              : "Review and practice"}
          </b>
        </div>
      </div>

      <button
        className="twin-detail-action"
        onClick={() => onAssess(concept)}
      >
        Take this assessment <span>→</span>
      </button>

      <button
        className="twin-detail-secondary"
        onClick={onShowPath}
      >
        View learning path
      </button>

      <p className="twin-detail-footnote">
        Scores and prerequisite details are based on the data available
        for this concept.
      </p>
    </aside>
  );
}

function EmptyTwin({ text }) {
  return (
    <div className="twin-empty">
      <span>✧</span>
      <p>{text}</p>
    </div>
  );
}

const twinStyles = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');

*{box-sizing:border-box}
.twin-app{min-height:100vh;background:#f8f8fd;color:#292742;font-family:'DM Sans',Arial,sans-serif;font-size:13px}
.twin-app button,.twin-app select,.twin-app input{font:inherit}
.twin-app button{cursor:pointer}
.twin-topbar{height:90px;background:#fff;border-bottom:1px solid #eeedf6;padding:0 4%;display:flex;align-items:center;gap:32px;position:relative;z-index:2}
.twin-brand{display:flex;align-items:center;gap:10px;min-width:220px;border:0;background:transparent;color:inherit;text-align:left;padding:0}
.twin-brand-logo{width:41px;height:41px;border-radius:13px;display:grid;place-items:center;background:linear-gradient(145deg,#a58bff,#7455e0);box-shadow:0 7px 18px #8a70e62d;color:#fff;font:800 15px Manrope,sans-serif}
.twin-brand>span:last-child{display:flex;flex-direction:column;gap:4px}
.twin-brand b{font:800 16px Manrope,sans-serif}
.twin-brand small{font-size:8px;letter-spacing:1px;color:#9b99b3;font-weight:800}
.twin-top-title{border-left:1px solid #edeaf5;padding-left:25px;flex:1}
.twin-top-title>span{font-size:8px;letter-spacing:1.35px;color:#9990bd;font-weight:800}
.twin-top-title h1{margin:4px 0 0;font:800 21px Manrope,sans-serif;letter-spacing:-.7px}
.twin-top-actions{display:flex;align-items:center;gap:11px}
.twin-live{display:flex;align-items:center;gap:7px;color:#369a7a;font-size:10px;font-weight:800;background:#e9faf2;padding:8px 10px;border-radius:9px;white-space:nowrap}
.twin-live i{width:6px;height:6px;border-radius:50%;background:#32bf90;box-shadow:0 0 0 3px #3cbd8d1c}
.twin-refresh,.twin-back{border:1px solid #e9e6f3;background:#fff;color:#77728f;border-radius:10px;padding:10px 12px;font-size:10px;font-weight:800;white-space:nowrap}
.twin-refresh{font-size:15px}
.twin-refresh span{font-size:10px;margin-left:4px}
.twin-back:hover,.twin-refresh:hover{border-color:#bfb1f6;color:#795de0}
.twin-content{max-width:1700px;padding:25px 4% 0;margin:auto}
.twin-error{display:flex;align-items:center;gap:12px;background:#fff6e8;border:1px solid #f7d6a1;color:#8c641c;margin:18px 4% 0;padding:12px 15px;border-radius:12px}
.twin-error p{flex:1;font-size:11px;margin:0}
.twin-error>span{font-size:18px}
.twin-error button{border:0;background:transparent;color:#8c641c;font-weight:800;font-size:10px}
.twin-hero{min-height:245px;position:relative;overflow:hidden;border-radius:22px;padding:29px 34px 70px;background:linear-gradient(110deg,#7760df,#9278ef 60%,#b6a0f9);color:#fff;box-shadow:0 13px 30px #8167e51e}
.twin-hero-copy{position:relative;z-index:2;max-width:67%}
.twin-label{display:inline-flex;align-items:center;gap:7px;border:1px solid #ffffff49;background:#ffffff1f;border-radius:20px;padding:7px 10px;font-size:8px;letter-spacing:1px;font-weight:800}
.twin-label span{color:#ffe49a;font-size:13px}
.twin-hero h2{font:800 clamp(25px,3vw,35px)/1.2 Manrope,sans-serif;letter-spacing:-1.3px;margin:16px 0 9px}
.twin-hero h2 span{color:#ffe8a5}
.twin-hero-copy>p{font-size:11px;line-height:1.8;color:#f1edff;max-width:460px;margin:0}
.twin-hero-buttons{display:flex;align-items:center;gap:17px;margin-top:17px;flex-wrap:wrap}
.twin-main-button{border:0;border-radius:10px;background:#fff;color:#7458d8;padding:12px 15px;font-size:10px;font-weight:800;box-shadow:0 6px 14px #3f2f8b20}
.twin-main-button span{margin-left:12px}
.twin-quiet-button{border:0;background:transparent;color:#fff;font-size:10px;font-weight:800}
.twin-hero-visual{position:absolute;width:245px;height:210px;right:7%;top:10px;display:grid;place-items:center}
.twin-circle{position:absolute;border:1px solid #ffffff58;border-radius:50%;transform:rotate(-30deg)}
.circle-one{width:185px;height:185px}
.circle-two{width:205px;height:135px;transform:rotate(40deg)}
.circle-three{width:150px;height:210px;transform:rotate(25deg)}
.twin-brain{width:97px;height:97px;background:linear-gradient(145deg,#fff8de,#efddff);display:grid;place-items:center;border-radius:30px;font-size:42px;box-shadow:0 12px 27px #493b912c;transform:rotate(-7deg)}
.twin-float{position:absolute;display:grid;place-items:center;width:32px;height:32px;border-radius:11px;background:#fff;color:#795ee1;box-shadow:0 6px 18px #44329120;font-weight:900}
.float-one{right:19px;top:24px;color:#249f77;background:#dffff0}
.float-two{left:14px;bottom:28px;background:#fff0c9;color:#b07c1e}
.float-three{right:18px;bottom:22px;background:#e2f5ff;color:#448fc1}
.twin-hero-foot{position:absolute;right:21px;bottom:17px;background:#fff;border-radius:12px;padding:9px 12px;display:flex;align-items:center;gap:9px;color:#3c3858;box-shadow:0 6px 18px #42318c1e}
.twin-hero-foot>span{display:grid;place-items:center;width:27px;height:27px;background:#fff1ca;border-radius:9px;color:#bb8b22}
.twin-hero-foot>div{display:flex;flex-direction:column;gap:3px}
.twin-hero-foot b{font-size:9px}
.twin-hero-foot small{font-size:8px;color:#9793ad}
.twin-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:13px;margin:17px 0 21px}
.twin-stat{background:#fff;border:1px solid #eeedf6;border-radius:15px;padding:15px 17px;box-shadow:0 3px 12px #45328c08}
.twin-stat-top{display:flex;align-items:center;justify-content:space-between}
.twin-stat-icon{display:grid;place-items:center;width:31px;height:31px;border-radius:10px;font-size:17px}
.twin-stat-purple .twin-stat-icon{background:#f0eaff;color:#8968e7}
.twin-stat-blue .twin-stat-icon{background:#e7f4ff;color:#599fdf}
.twin-stat-green .twin-stat-icon{background:#e5faf1;color:#2eaa80}
.twin-stat-orange .twin-stat-icon{background:#fff0e3;color:#e7974d}
.twin-stat-mark{font-size:12px;color:#bbb6ce}
.twin-stat>strong{display:block;font:800 25px Manrope,sans-serif;letter-spacing:-.8px;margin-top:11px}
.twin-stat>b{display:block;font-size:10px;margin-top:4px}
.twin-stat>small{display:block;font-size:9px;color:#999bb0;margin-top:6px;line-height:1.5}
.twin-workspace{background:#fff;border:1px solid #eeedf6;border-radius:19px;overflow:hidden;box-shadow:0 4px 16px #40308309}
.twin-workspace-heading{padding:23px 23px 17px;display:flex;align-items:flex-end;justify-content:space-between;gap:18px}
.twin-eyebrow{color:#9986cb;font-size:8px;font-weight:800;letter-spacing:1.3px}
.twin-workspace-heading h2{font:800 19px Manrope,sans-serif;letter-spacing:-.6px;margin:6px 0}
.twin-workspace-heading>div:first-child>p{font-size:10px;line-height:1.6;color:#9697ad;margin:0}
.twin-control-group{display:flex;gap:9px;flex-wrap:wrap}
.twin-control-group label{display:flex;flex-direction:column;gap:5px}
.twin-control-group label>span{font-size:8px;color:#9997b2;font-weight:800}
.twin-control-group select{border:1px solid #e8e5f2;background:#fbfaff;border-radius:9px;padding:9px 11px;color:#676481;font-size:10px;outline:none;max-width:200px}
.twin-control-group select:focus{border-color:#a18bf0}
.twin-tabs{display:flex;gap:7px;border-bottom:1px solid #eeedf6;padding:0 23px}
.twin-tabs button{display:flex;align-items:center;gap:8px;padding:14px 14px 13px;border:0;border-bottom:2px solid transparent;background:transparent;color:#9292aa;font-size:10px;font-weight:800;white-space:nowrap}
.twin-tabs button span{font-size:15px}
.twin-tabs button.selected{color:#795de0;border-bottom-color:#876aeb}
.twin-map-layout{display:grid;grid-template-columns:minmax(0,1fr) 285px;align-items:start}
.twin-map-panel{min-width:0;border-right:1px solid #efedf6}
.twin-panel-heading{padding:20px 19px 12px;display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.twin-panel-heading h3{font:800 13px Manrope,sans-serif;margin:0 0 5px}
.twin-panel-heading p{font-size:9px;color:#9899af;line-height:1.6;margin:0}
.twin-node-count{white-space:nowrap;padding:6px 9px;border-radius:8px;background:#f3efff;color:#8266d9;font-size:9px;font-weight:800}
.twin-map-legend{display:flex;gap:10px;flex-wrap:wrap;padding:0 19px 12px}
.twin-map-legend>span{display:flex;align-items:center;gap:5px;color:#8c8da4;font-size:8px}
.twin-map-legend i{width:7px;height:7px;border-radius:50%}
.twin-map-scroll{width:100%;max-height:700px;overflow:auto;background-color:#fcfbff;background-image:radial-gradient(#ddd8ef 0.7px,transparent 0.7px);background-size:17px 17px;border-top:1px solid #f0edf8;border-bottom:1px solid #f0edf8;scrollbar-color:#d5cdef #f8f7fc;scrollbar-width:thin}
.twin-svg{display:block;width:100%;min-width:850px}
.svg-lane-label{fill:#716c8e;font:800 10px 'DM Sans',Arial,sans-serif;letter-spacing:.8px}
.svg-node{outline:none}
.svg-node:focus rect:first-child{stroke:#7354df;stroke-width:3}
.svg-node-name{font:700 11px 'DM Sans',Arial,sans-serif;fill:#403d5b}
.svg-node-sub{font:500 9px 'DM Sans',Arial,sans-serif;fill:#9a98af}
.svg-node-status{font:800 12px 'DM Sans',Arial,sans-serif}
.twin-map-footer{padding:12px 17px;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#9998af;font-size:8px;line-height:1.6}
.twin-map-footer>span{display:flex;align-items:center;gap:6px}
.map-legend-line{display:inline-block;width:16px;border-top:2px dashed #c7bbea}
.twin-detail-panel{padding:21px 18px;min-width:0;background:linear-gradient(155deg,#fff,#fdfcff);position:sticky;top:12px}
.twin-detail-heading{display:flex;align-items:center;justify-content:space-between;color:#9890b9;font-size:8px;letter-spacing:1px;font-weight:800}
.twin-detail-dot{width:8px;height:8px;border-radius:50%;box-shadow:0 0 0 4px #f0eef7}
.twin-detail-icon{width:46px;height:46px;border-radius:15px;display:grid;place-items:center;font-size:24px;margin-top:23px}
.twin-detail-panel h3{font:800 16px/1.4 Manrope,sans-serif;margin:12px 0 5px;overflow-wrap:anywhere}
.twin-detail-subject{color:#9696ad;font-size:10px;margin:0}
.twin-detail-status{display:inline-block;padding:7px 10px;border-radius:8px;font-size:9px;font-weight:800;margin-top:14px}
.twin-detail-score{display:flex;justify-content:space-between;align-items:center;margin-top:22px}
.twin-detail-score>div:first-child{display:flex;flex-direction:column;gap:7px}
.twin-detail-score>div:first-child span{color:#9b9bb0;font-size:9px}
.twin-detail-score>div:first-child strong{font:800 28px Manrope,sans-serif;letter-spacing:-1px}
.twin-mini-ring{width:52px;height:52px;border-radius:50%;display:grid;place-items:center;background:#f3efff}
.twin-mini-ring>div{width:43px;height:43px;border-radius:50%;display:grid;place-items:center}
.twin-mini-ring span{display:grid;place-items:center;width:35px;height:35px;border-radius:50%;background:#fff;font-size:9px;font-weight:800;color:#6c6689}
.twin-detail-progress{height:6px;background:#efedf7;border-radius:99px;overflow:hidden;margin-top:12px}
.twin-detail-progress span{display:block;height:100%;border-radius:99px;transition:width .3s}
.twin-detail-facts{margin:19px 0;border-top:1px solid #eeedf6}
.twin-detail-facts>div{padding:11px 0;border-bottom:1px solid #f0eef7;display:flex;flex-direction:column;gap:5px}
.twin-detail-facts span{font-size:9px;color:#9999af}
.twin-detail-facts b{font-size:10px;line-height:1.5;overflow-wrap:anywhere}
.twin-detail-action{width:100%;display:flex;align-items:center;justify-content:center;border:0;background:#8064e9;color:#fff;padding:12px;border-radius:10px;font-size:10px;font-weight:800;box-shadow:0 6px 14px #8064e91e}
.twin-detail-action span{margin-left:8px}
.twin-detail-secondary{display:block;width:100%;background:#f7f4ff;border:1px solid #ebe4ff;color:#8064e9;padding:11px;border-radius:10px;font-size:10px;font-weight:800;margin-top:8px}
.twin-detail-footnote{font-size:8px;line-height:1.6;color:#a1a0b5;margin:12px 0 0}
.twin-detail-empty{width:45px;height:45px;display:grid;place-items:center;border-radius:14px;background:#f1edff;color:#8164e7;font-size:23px}
.twin-detail-panel>p:last-child{font-size:10px;color:#9997af;line-height:1.7}
.twin-insight-view{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:17px;padding:20px}
.twin-insight-main,.twin-gap-panel{border:1px solid #eeedf6;border-radius:14px;padding:17px;min-width:0}
.twin-performance-bars{display:flex;flex-direction:column;gap:19px;margin-top:16px}
.twin-performance-row>div:first-child{display:flex;align-items:center;justify-content:space-between}
.twin-performance-row>div:first-child>span{display:flex;align-items:center;gap:8px;font-size:10px;color:#777790}
.twin-performance-row>div:first-child i{width:8px;height:8px;border-radius:50%}
.twin-performance-row>div:first-child>b{font-size:11px}
.twin-performance-track{height:8px;border-radius:99px;background:#f0eef8;overflow:hidden;margin-top:8px}
.twin-performance-track span{display:block;height:100%;border-radius:99px;transition:width .35s}
.twin-insight-note{display:flex;align-items:flex-start;gap:10px;background:#f6f2ff;border-radius:10px;padding:12px;margin-top:23px}
.twin-insight-note span{font-size:18px;color:#8264e7}
.twin-insight-note p{font-size:9px;line-height:1.7;color:#77728f;margin:0}
.twin-gap-list{display:flex;flex-direction:column;margin-top:6px}
.twin-gap-item{display:flex;align-items:center;gap:9px;width:100%;padding:12px 0;border:0;border-bottom:1px solid #f1eff7;background:transparent;text-align:left;color:#393752}
.twin-gap-item:last-child{border-bottom:0}
.twin-gap-indicator{width:8px;height:8px;border-radius:50%;flex:0 0 8px}
.twin-gap-name{display:flex;flex-direction:column;gap:4px;flex:1;min-width:0}
.twin-gap-name b{font-size:10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.twin-gap-name small{font-size:8px;color:#a0a0b4}
.twin-gap-item>strong{font-size:10px}
.twin-gap-arrow{font-size:15px;color:#9981e5}
.twin-path-view{padding:20px 23px 24px}
.twin-path-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:15px}
.twin-path-header h3{font:800 17px Manrope,sans-serif;margin:6px 0}
.twin-path-header p{font-size:10px;line-height:1.7;color:#9696ad;margin:0}
.twin-path-count{border-radius:8px;background:#f2eeff;color:#8569db;font-size:9px;font-weight:800;padding:8px;white-space:nowrap}
.twin-path-list{display:flex;flex-direction:column}
.twin-path-item{display:flex;align-items:center;gap:13px;padding:14px 4px;border-bottom:1px solid #efedf6}
.twin-path-item:last-child{border-bottom:0}
.twin-path-number{display:grid;place-items:center;width:34px;height:34px;flex:0 0 34px;border-radius:12px;background:#f2edff;color:#8869e9;font:800 12px Manrope,sans-serif}
.twin-path-info{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.twin-path-info b{font-size:11px;overflow-wrap:anywhere}
.twin-path-info span{color:#9999af;font-size:9px}
.twin-path-score{display:flex;flex-direction:column;gap:4px;min-width:70px;text-align:right}
.twin-path-score strong{font-size:12px}
.twin-path-score small{font-size:8px;color:#a0a0b5}
.twin-review-button{border:1px solid #e8e2fb;background:#fff;border-radius:9px;padding:9px 11px;color:#8064e9;font-size:9px;font-weight:800;white-space:nowrap}
.twin-review-button span{margin-left:6px}
.twin-empty{padding:30px 15px;text-align:center;color:#9796af}
.twin-empty span{font-size:25px;color:#a18ae8}
.twin-empty p{max-width:410px;margin:9px auto 0;font-size:10px;line-height:1.8}
.twin-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 2px 25px;color:#a3a3b7;font-size:9px}
.twin-footer b{color:#9274e8;margin:0 4px}
.twin-loading{min-height:100vh;background:#f8f8fd;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#2c2948;font-family:'DM Sans',Arial,sans-serif}
.twin-loading-orb{width:57px;height:57px;border-radius:19px;background:linear-gradient(140deg,#a58cff,#7356e2);color:#fff;display:grid;place-items:center;font-size:27px;box-shadow:0 10px 24px #8266e730;animation:twinpulse 1.6s infinite}
.twin-loading h2{font:800 19px Manrope,sans-serif;margin:21px 0 7px}
.twin-loading p{font-size:11px;color:#9291aa}
.twin-loading-track{width:180px;height:5px;background:#e9e4fa;border-radius:99px;overflow:hidden;margin-top:16px}
.twin-loading-track span{display:block;width:42%;height:100%;background:#8669e9;border-radius:99px;animation:twinloading 1s ease-in-out infinite alternate}
@keyframes twinloading{from{transform:translateX(-25%)}to{transform:translateX(150%)}}
@keyframes twinpulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}

@media(min-width:1500px){
  .twin-content{padding-left:4.5%;padding-right:4.5%}
  .twin-map-layout{grid-template-columns:minmax(0,1fr) 315px}
}
@media(max-width:1100px){
  .twin-topbar{padding:0 22px;gap:15px}
  .twin-brand{min-width:175px}
  .twin-content{padding-left:22px;padding-right:22px}
  .twin-map-layout{grid-template-columns:minmax(0,1fr) 255px}
  .twin-detail-panel{padding:18px 14px}
  .twin-hero-visual{right:1%}
  .twin-hero-copy{max-width:72%}
}
@media(max-width:820px){
  .twin-topbar{height:auto;min-height:80px;flex-wrap:wrap;padding:14px 18px;gap:10px}
  .twin-brand{min-width:0;flex:1}
  .twin-top-title{border:0;padding:0;flex:1 1 100%;order:3}
  .twin-top-title h1{font-size:19px}
  .twin-top-actions{gap:6px}
  .twin-live{font-size:8px;padding:8px}
  .twin-back{font-size:9px;padding:9px}
  .twin-refresh{padding:8px;font-size:13px}
  .twin-refresh span{display:none}
  .twin-content{padding:16px 13px 0}
  .twin-hero{padding:24px 21px 65px;min-height:260px}
  .twin-hero-copy{max-width:100%}
  .twin-hero-visual{right:-55px;opacity:.22}
  .twin-stats{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}
  .twin-workspace-heading{padding:18px;align-items:flex-start;flex-direction:column}
  .twin-control-group{width:100%}
  .twin-control-group label{flex:1;min-width:0}
  .twin-control-group select{width:100%;max-width:none}
  .twin-tabs{padding:0 8px;gap:0}
  .twin-tabs button{padding:13px 9px;font-size:9px;gap:5px}
  .twin-map-layout{grid-template-columns:1fr}
  .twin-map-panel{border-right:0}
  .twin-detail-panel{position:static;border-top:1px solid #eeedf6;padding:20px}
  .twin-detail-facts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 15px}
  .twin-detail-score{max-width:300px}
  .twin-insight-view{grid-template-columns:1fr;padding:13px}
  .twin-path-view{padding:17px}
}
@media(max-width:520px){
  .twin-brand b{font-size:14px}
  .twin-brand small{font-size:7px}
  .twin-brand-logo{width:35px;height:35px}
  .twin-back{font-size:8px;padding:8px}
  .twin-hero{padding:21px 17px 64px}
  .twin-hero h2{font-size:25px}
  .twin-hero-copy>p{font-size:10px}
  .twin-hero-foot{left:12px;right:12px;bottom:12px;justify-content:flex-start}
  .twin-hero-foot small{font-size:8px}
  .twin-stat{padding:13px}
  .twin-stat>strong{font-size:23px}
  .twin-stat>b{font-size:9px}
  .twin-stat>small{font-size:8px}
  .twin-tabs button{flex:1;justify-content:center;font-size:8px;padding:12px 4px}
  .twin-tabs button span{display:none}
  .twin-map-scroll{max-height:560px}
  .twin-svg{min-width:850px}
  .twin-map-footer{font-size:8px}
  .twin-path-item{gap:8px}
  .twin-path-number{width:29px;height:29px;flex-basis:29px}
  .twin-path-score{min-width:43px}
  .twin-path-score small{font-size:7px}
  .twin-review-button{padding:8px}
  .twin-path-info b{font-size:10px}
  .twin-path-info span{font-size:8px}
  .twin-path-header h3{font-size:15px}
  .twin-footer{font-size:8px;align-items:flex-start}
  .twin-footer span:last-child{text-align:right}
  .twin-detail-facts{grid-template-columns:1fr}
}
`;

export default KnowledgeTwin;