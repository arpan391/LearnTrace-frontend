import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API = "https://learntrace-backend-vp2a.onrender.com";
const WIDTH = 164;
const HEIGHT = 64;

const NODES = [
  { id: "arrays", label: "Array Fundamentals", subject: "Data Structures", aliases: ["arrays", "array", "array fundamentals"], x: 38, y: 58 },
  { id: "linked-lists", label: "Linked Lists", subject: "Data Structures", aliases: ["linked lists", "linked list"], x: 258, y: 18 },
  { id: "stacks", label: "Stacks", subject: "Data Structures", aliases: ["stacks", "stack"], x: 258, y: 108 },
  { id: "queues", label: "Queues", subject: "Data Structures", aliases: ["queues", "queue"], x: 258, y: 198 },
  { id: "trees", label: "Trees", subject: "Data Structures", aliases: ["trees", "tree", "tree data structure"], x: 488, y: 58 },
  { id: "graphs", label: "Graph Traversal", subject: "Data Structures", aliases: ["graph traversal", "graphs", "graph"], x: 718, y: 58 },
  { id: "algorithm-analysis", label: "Algorithm Analysis", subject: "Algorithms", aliases: ["algorithm analysis", "big o", "time complexity", "complexity analysis"], x: 488, y: 198 },
  { id: "sql-basics", label: "SQL Basics", subject: "DBMS", aliases: ["sql basics", "sql", "database basics"], x: 38, y: 340 },
  { id: "joins", label: "SQL Joins", subject: "DBMS", aliases: ["sql joins", "joins", "join"], x: 258, y: 340 },
  { id: "normalization", label: "Normalization", subject: "DBMS", aliases: ["normalization", "database normalization"], x: 488, y: 340 },
  { id: "java-basics", label: "Java Basics", subject: "Java Programming", aliases: ["java basics", "java fundamentals", "java"], x: 38, y: 462 },
  { id: "oop", label: "OOP Concepts", subject: "Java Programming", aliases: ["oop concepts", "object oriented programming", "oops", "oop"], x: 258, y: 462 },
  { id: "python-basics", label: "Python Basics", subject: "Python Programming", aliases: ["python basics", "python fundamentals", "python"], x: 488, y: 462 },
  { id: "functions", label: "Functions", subject: "Python Programming", aliases: ["functions", "functions in python", "methods"], x: 718, y: 462 },
  { id: "processes", label: "Processes", subject: "Operating Systems", aliases: ["processes", "process management"], x: 38, y: 584 },
  { id: "scheduling", label: "CPU Scheduling", subject: "Operating Systems", aliases: ["cpu scheduling", "scheduling algorithms", "process scheduling"], x: 258, y: 584 },
  { id: "networking", label: "Networking Basics", subject: "Computer Networks", aliases: ["networking basics", "computer networks", "network basics"], x: 488, y: 584 },
  { id: "tcp-ip", label: "TCP/IP", subject: "Computer Networks", aliases: ["tcp ip", "tcp/ip", "tcp", "ip addressing"], x: 718, y: 584 },
];

const EDGES = [
  { from: "arrays", to: "linked-lists" },
  { from: "arrays", to: "stacks" },
  { from: "arrays", to: "queues" },
  { from: "linked-lists", to: "trees" },
  { from: "trees", to: "graphs" },
  { from: "arrays", to: "algorithm-analysis" },
  { from: "sql-basics", to: "joins" },
  { from: "sql-basics", to: "normalization" },
  { from: "java-basics", to: "oop" },
  { from: "python-basics", to: "functions" },
  { from: "processes", to: "scheduling" },
  { from: "networking", to: "tcp-ip" },
];

const SUBJECTS = [
  "All subjects", "Data Structures", "Algorithms", "DBMS",
  "Java Programming", "Python Programming", "Operating Systems", "Computer Networks",
];

const normalize = (value) =>
  String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

function scoreFor(node, concepts) {
  const aliases = node.aliases.map(normalize);
  const match = concepts.find((item) =>
    aliases.includes(normalize(item.name)) &&
    (!item.subject || normalize(item.subject) === normalize(node.subject))
  );
  if (!match || match.score == null || !Number.isFinite(Number(match.score))) return null;
  return Math.max(0, Math.min(100, Number(match.score)));
}

function statusFor(score) {
  if (score == null) return "Not assessed";
  if (score >= 80) return "Strong";
  if (score >= 60) return "Developing";
  return "Needs attention";
}

function colorsFor(score) {
  if (score == null) return { fill: "#f7f7fc", stroke: "#d9d8e8" };
  if (score >= 80) return { fill: "#e7f9f0", stroke: "#71cda7" };
  if (score >= 60) return { fill: "#fff6df", stroke: "#e8c46d" };
  return { fill: "#fff0ee", stroke: "#f0a39a" };
}

export default function KnowledgeRadar() {
  const navigate = useNavigate();
  const [concepts, setConcepts] = useState([]);
  const [loadState, setLoadState] = useState("loading");
  const [filter, setFilter] = useState("All subjects");
  const [selectedId, setSelectedId] = useState("arrays");

  useEffect(() => {
    let active = true;
    const token = localStorage.getItem("authToken");

    if (!token) {
      setLoadState("signed-out");
      return () => { active = false; };
    }

    axios.get(API + "/analysis/knowledge-gaps", {
      headers: { Authorization: "Bearer " + token },
    })
      .then((response) => {
        if (!active) return;
        setConcepts(Array.isArray(response.data) ? response.data : []);
        setLoadState("loaded");
      })
      .catch((error) => {
        if (!active) return;
        setLoadState(error.response && error.response.status === 401 ? "unauthorized" : "unavailable");
      });

    return () => { active = false; };
  }, []);

  const visibleNodes = useMemo(
    () => NODES.filter((node) => filter === "All subjects" || node.subject === filter),
    [filter]
  );
  const visibleIds = useMemo(() => new Set(visibleNodes.map((node) => node.id)), [visibleNodes]);
  const visibleEdges = useMemo(
    () => EDGES.filter((edge) => visibleIds.has(edge.from) && visibleIds.has(edge.to)),
    [visibleIds]
  );

  const selectedNode = visibleNodes.find((node) => node.id === selectedId) || visibleNodes[0] || null;
  const prerequisiteNodes = selectedNode
    ? EDGES.filter((edge) => edge.to === selectedNode.id).map((edge) => NODES.find((node) => node.id === edge.from)).filter(Boolean)
    : [];
  const unlockedNodes = selectedNode
    ? EDGES.filter((edge) => edge.from === selectedNode.id).map((edge) => NODES.find((node) => node.id === edge.to)).filter(Boolean)
    : [];
  const selectedScore = selectedNode ? scoreFor(selectedNode, concepts) : null;
  const prerequisiteScores = prerequisiteNodes.map((node) => ({ node, score: scoreFor(node, concepts) }));
  const recommendation = !selectedNode
    ? "Choose a concept to explore its connections."
    : prerequisiteNodes.length === 0
    ? "This is a foundation concept. Assess it first, then continue to connected topics."
    : prerequisiteScores.some((item) => item.score == null)
    ? "Try assessing the prerequisite concepts so your learning plan can be more accurate."
    : prerequisiteScores.every((item) => item.score >= 60)
    ? "Your prerequisite scores look ready. Move on to this concept and check your understanding."
    : "Review the prerequisite concepts with lower scores before moving ahead.";
  const assessedCount = visibleNodes.filter((node) => scoreFor(node, concepts) != null).length;

  const chooseRelated = (node) => {
    if (filter !== "All subjects" && filter !== node.subject) setFilter("All subjects");
    setSelectedId(node.id);
  };

  return (
    <div className="radar-page">
      <style>{styles}</style>
      <header className="radar-header">
        <button className="radar-brand" onClick={() => navigate("/dashboard")} aria-label="Back to LearnTrace dashboard">
          <span className="radar-brand-mark">LT</span>
          <span><strong>LearnTrace</strong><small>KNOWLEDGE DEPENDENCY RADAR</small></span>
        </button>
        <div className="radar-header-actions">
          <button className="radar-back" onClick={() => navigate("/dashboard")}>← Dashboard</button>
          <button className="radar-profile" onClick={() => navigate("/profile")}>My Profile</button>
        </div>
      </header>

      <main className="radar-main">
        <section className="radar-hero">
          <div>
            <span className="radar-eyebrow">YOUR CONCEPT CONNECTIONS</span>
            <h1>See how knowledge connects.</h1>
            <p>Explore which ideas support the next ones. Select a node to see prerequisites, related topics, and available assessment scores.</p>
          </div>
          <div className="radar-hero-symbol" aria-hidden="true">✧</div>
        </section>

        {loadState === "signed-out" && <div className="radar-notice">Sign in to load your assessment scores. The concept map is still available.<button onClick={() => navigate("/login")}>Sign in</button></div>}
        {loadState === "unauthorized" && <div className="radar-notice">Your session has expired. Sign in again to view your scores.<button onClick={() => navigate("/login")}>Sign in</button></div>}
        {loadState === "unavailable" && <div className="radar-notice">The concept map is available, but assessment scores could not be loaded right now.</div>}

        <section className="radar-toolbar">
          <div><strong>Dependency map</strong><span>Arrows point from a prerequisite toward the concept it supports.</span></div>
          <label><span>Filter subject</span><select value={filter} onChange={(event) => { setFilter(event.target.value); setSelectedId(""); }}>
            {SUBJECTS.map((item) => <option key={item} value={item}>{item}</option>)}
          </select></label>
        </section>

        <div className="radar-legend">
          <span><i className="legend-dot strong" /> Strong (80–100%)</span>
          <span><i className="legend-dot developing" /> Developing (60–79%)</span>
          <span><i className="legend-dot attention" /> Needs attention (0–59%)</span>
          <span><i className="legend-dot unknown" /> Not assessed</span>
        </div>

        <section className="radar-map-card">
          <div className="radar-map-scroll">
            <svg className="radar-map" viewBox="0 0 920 680" role="img" aria-label="Interactive concept dependency map">
              <defs><marker id="radar-arrowhead" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#b6addd" /></marker></defs>
              <text className="map-group-title" x="38" y="24">DATA STRUCTURES &amp; ALGORITHMS</text>
              <text className="map-group-title" x="38" y="320">DATABASES</text>
              <text className="map-group-title" x="38" y="442">PROGRAMMING</text>
              <text className="map-group-title" x="38" y="564">SYSTEMS &amp; NETWORKS</text>

              {visibleEdges.map((edge) => {
                const from = visibleNodes.find((node) => node.id === edge.from);
                const to = visibleNodes.find((node) => node.id === edge.to);
                if (!from || !to) return null;
                const x1 = from.x + WIDTH;
                const y1 = from.y + HEIGHT / 2;
                const x2 = to.x;
                const y2 = to.y + HEIGHT / 2;
                const middle = (x1 + x2) / 2;
                return <path key={edge.from + "-" + edge.to} className="radar-edge" d={"M " + x1 + " " + y1 + " C " + middle + " " + y1 + ", " + middle + " " + y2 + ", " + x2 + " " + y2} markerEnd="url(#radar-arrowhead)" />;
              })}

              {visibleNodes.map((node) => {
                const score = scoreFor(node, concepts);
                const colors = colorsFor(score);
                const selected = selectedNode && selectedNode.id === node.id;
                return (
                  <g key={node.id} className={"radar-node" + (selected ? " selected" : "")} role="button" tabIndex={0}
                    aria-label={node.label + ", " + statusFor(score) + (score == null ? "" : ", " + Math.round(score) + " percent")}
                    onClick={() => setSelectedId(node.id)}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setSelectedId(node.id); } }}>
                    <rect x={node.x} y={node.y} width={WIDTH} height={HEIGHT} rx="14" fill={colors.fill} stroke={selected ? "#8064e9" : colors.stroke} strokeWidth={selected ? "2.5" : "1.4"} />
                    <text className="radar-node-label" x={node.x + 12} y={node.y + 25}>{node.label}</text>
                    <text className="radar-node-meta" x={node.x + 12} y={node.y + 45}>{score == null ? node.subject + " · Not assessed" : node.subject + " · " + Math.round(score) + "%"}</text>
                    {selected && <circle cx={node.x + WIDTH - 12} cy={node.y + 12} r="4" fill="#8064e9" />}
                  </g>
                );
              })}
            </svg>
          </div>
          <div className="radar-map-footer"><span>{visibleNodes.length} concepts shown</span><span>{assessedCount} with recorded scores</span><span>Select a concept to inspect its dependencies</span></div>
        </section>

        {selectedNode && (
          <section className="radar-details">
            <div className="radar-detail-main">
              <span className="radar-eyebrow">SELECTED CONCEPT</span>
              <h2>{selectedNode.label}</h2><p>{selectedNode.subject}</p>
              <div className="radar-score-line"><strong>{selectedScore == null ? "—" : Math.round(selectedScore) + "%"}</strong><span>{statusFor(selectedScore)}</span></div>
              <div className="radar-score-track"><span style={{ width: (selectedScore == null ? 0 : selectedScore) + "%" }} /></div>
              <div className="radar-recommendation"><strong>Suggested next step</strong><p>{recommendation}</p></div>
            </div>

            <div className="radar-detail-list">
              <div className="radar-related">
                <h3>Prerequisites</h3><p className="radar-help">Concepts that lead into this one.</p>
                {prerequisiteNodes.length ? prerequisiteNodes.map((node) => {
                  const score = scoreFor(node, concepts);
                  return <button className="radar-related-row" key={node.id} onClick={() => chooseRelated(node)}><span className="radar-related-dot" style={{ background: colorsFor(score).stroke }} /><span>{node.label}</span><b>{score == null ? "—" : Math.round(score) + "%"}</b></button>;
                }) : <div className="radar-empty">No prerequisite is listed for this foundation concept.</div>}
              </div>
              <div className="radar-related">
                <h3>Unlocks next</h3><p className="radar-help">Concepts connected after this one.</p>
                {unlockedNodes.length ? unlockedNodes.map((node) => {
                  const score = scoreFor(node, concepts);
                  return <button className="radar-related-row" key={node.id} onClick={() => chooseRelated(node)}><span className="radar-related-dot" style={{ background: colorsFor(score).stroke }} /><span>{node.label}</span><b>{score == null ? "—" : Math.round(score) + "%"}</b></button>;
                }) : <div className="radar-empty">No later concept is linked yet.</div>}
              </div>
            </div>
          </section>
        )}

        <p className="radar-footnote">This starter map uses predefined concept relationships. Recorded scores are loaded from LearnTrace when available; the relationships are learning guides, not an AI-generated diagnosis.</p>
      </main>
    </div>
  );
}

const styles = "@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&display=swap');*{box-sizing:border-box}.radar-page{min-height:100vh;background:#f8f8fd;color:#282642;font-family:'DM Sans',Arial,sans-serif;padding:0 0 38px}.radar-header{height:82px;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border-bottom:1px solid #efedf7;padding:0 5.5%;position:sticky;top:0;z-index:3}.radar-brand{border:0;background:transparent;display:flex;align-items:center;gap:11px;text-align:left;color:inherit;padding:0}.radar-brand-mark{width:42px;height:42px;border-radius:13px;background:linear-gradient(145deg,#9d85ff,#7151de);color:#fff;font:800 16px Manrope,sans-serif;display:grid;place-items:center;box-shadow:0 8px 18px #8b72e832}.radar-brand>span:last-child{display:flex;flex-direction:column;gap:4px}.radar-brand strong{font:800 17px Manrope,sans-serif}.radar-brand small{font-size:8px;letter-spacing:1.1px;color:#9895b0;font-weight:800}.radar-header-actions{display:flex;align-items:center;gap:9px}.radar-back,.radar-profile{border:1px solid #e3def1;background:#fff;color:#6e55bd;border-radius:10px;padding:10px 13px;font-size:11px;font-weight:800}.radar-profile{background:#8064e9;color:#fff;border-color:#8064e9}.radar-main{max-width:1330px;padding:27px 28px 0;margin:0 auto}.radar-hero{background:linear-gradient(112deg,#7560dc,#9c84f1 72%,#c7b9fb);color:#fff;padding:29px 32px;border-radius:23px;display:flex;align-items:center;justify-content:space-between;gap:20px;overflow:hidden;position:relative;box-shadow:0 13px 32px #7a62df20}.radar-hero>div:first-child{max-width:780px;position:relative;z-index:1}.radar-eyebrow{display:block;font-size:9px;font-weight:800;letter-spacing:1.2px;color:#9a85e9}.radar-hero .radar-eyebrow{color:#efe8ff}.radar-hero h1{font:800 clamp(25px,3vw,36px)/1.18 Manrope,sans-serif;letter-spacing:-1px;margin:12px 0 10px}.radar-hero p{font-size:12px;line-height:1.8;color:#f3eeff;max-width:690px;margin:0}.radar-hero-symbol{font-size:84px;color:#fff8;line-height:1;padding:0 16px}.radar-notice{margin-top:16px;border:1px solid #e8dcff;background:#fbf8ff;color:#654d9e;padding:12px 15px;border-radius:12px;font-size:12px;display:flex;align-items:center;justify-content:space-between;gap:12px}.radar-notice button{border:0;background:#8064e9;color:#fff;border-radius:8px;padding:8px 12px;font-size:11px;font-weight:800}.radar-toolbar{margin-top:21px;display:flex;align-items:center;justify-content:space-between;gap:15px}.radar-toolbar>div{display:flex;flex-direction:column;gap:5px}.radar-toolbar strong{font:800 16px Manrope,sans-serif}.radar-toolbar>div>span{font-size:11px;color:#9291aa}.radar-toolbar label{display:flex;align-items:center;gap:9px;font-size:10px;color:#85839f;font-weight:700}.radar-toolbar select{border:1px solid #e4e0f0;background:#fff;padding:10px 12px;border-radius:10px;color:#484260;font:600 11px 'DM Sans',Arial,sans-serif;max-width:190px}.radar-legend{display:flex;flex-wrap:wrap;gap:15px;margin:15px 0 12px;color:#7f7d96;font-size:10px}.radar-legend span{display:flex;align-items:center;gap:6px}.legend-dot{width:9px;height:9px;border-radius:50%;display:inline-block}.legend-dot.strong{background:#45b986}.legend-dot.developing{background:#e0b347}.legend-dot.attention{background:#e47d72}.legend-dot.unknown{background:#bdbbd0}.radar-map-card{background:#fff;border:1px solid #edebf6;border-radius:19px;box-shadow:0 5px 18px #3d2b7508;overflow:hidden}.radar-map-scroll{overflow-x:auto;padding:16px 14px 6px}.radar-map{width:100%;min-width:810px;height:auto;display:block}.map-group-title{font-family:'DM Sans',Arial,sans-serif;font-size:10px;letter-spacing:1px;font-weight:800;fill:#9a95b4}.radar-edge{fill:none;stroke:#b6addd;stroke-width:1.8;opacity:.9}.radar-node{cursor:pointer;outline:none}.radar-node rect{transition:stroke .15s,filter .15s,transform .15s}.radar-node:hover rect,.radar-node:focus rect{filter:drop-shadow(0 4px 6px #8064e922);stroke:#8064e9}.radar-node-label{font-family:'DM Sans',Arial,sans-serif;font-size:11px;font-weight:800;fill:#3e3b5c;pointer-events:none}.radar-node-meta{font-family:'DM Sans',Arial,sans-serif;font-size:8px;fill:#77758f;pointer-events:none}.radar-map-footer{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 17px;border-top:1px solid #f0eef8;font-size:10px;color:#9997af;background:#fdfcff}.radar-details{display:grid;grid-template-columns:minmax(260px,.85fr) minmax(0,1.3fr);gap:16px;margin-top:17px}.radar-detail-main,.radar-detail-list{background:#fff;border:1px solid #edebf6;border-radius:18px;padding:22px;box-shadow:0 5px 18px #3d2b7507;min-width:0}.radar-detail-main h2{font:800 23px Manrope,sans-serif;letter-spacing:-.5px;margin:9px 0 4px}.radar-detail-main>p{font-size:11px;color:#9290aa;margin:0}.radar-score-line{display:flex;align-items:center;gap:10px;margin-top:18px}.radar-score-line strong{font:800 31px Manrope,sans-serif;color:#6f55d8}.radar-score-line span{background:#f4f0ff;color:#8064e9;padding:6px 9px;border-radius:20px;font-size:9px;font-weight:800}.radar-score-track{height:7px;background:#f0edf9;border-radius:10px;overflow:hidden;margin-top:9px}.radar-score-track span{display:block;height:100%;background:linear-gradient(90deg,#9e82f6,#55c8a0);border-radius:10px;transition:width .25s}.radar-recommendation{margin-top:20px;background:#fbf9ff;border:1px solid #eee8ff;padding:14px;border-radius:12px}.radar-recommendation strong{font-size:11px;color:#6e56bf}.radar-recommendation p{font-size:11px;line-height:1.7;color:#77758f;margin:7px 0 0}.radar-detail-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:17px}.radar-related h3{font:800 13px Manrope,sans-serif;margin:1px 0 5px}.radar-help{font-size:10px;color:#9b99b0;margin:0 0 12px}.radar-related-row{width:100%;display:flex;align-items:center;gap:8px;text-align:left;border:1px solid #f0edf8;background:#fff;border-radius:10px;padding:10px;margin-bottom:7px;color:#4a4768;font-size:10px}.radar-related-row>span:nth-child(2){flex:1;min-width:0}.radar-related-row b{font-size:10px;color:#7661ce}.radar-related-dot{width:8px;height:8px;border-radius:50%;flex:0 0 8px}.radar-empty{font-size:10px;line-height:1.65;color:#9795ad;background:#fbfaff;border-radius:10px;padding:12px}.radar-footnote{margin:15px 2px 0;font-size:9px;line-height:1.7;color:#a2a0b5}@media(max-width:850px){.radar-main{padding:18px 14px 0}.radar-header{padding:0 14px;height:72px}.radar-brand-mark{width:36px;height:36px}.radar-brand strong{font-size:14px}.radar-brand small{font-size:7px}.radar-details{grid-template-columns:1fr}.radar-detail-list{grid-template-columns:repeat(2,minmax(0,1fr))}.radar-hero{padding:24px}.radar-hero-symbol{font-size:60px}.radar-toolbar{align-items:flex-start;flex-direction:column}.radar-map-footer{font-size:9px}}@media(max-width:520px){.radar-back,.radar-profile{padding:8px 9px;font-size:10px}.radar-header-actions{gap:6px}.radar-brand{gap:7px}.radar-brand small{max-width:110px}.radar-hero{padding:22px 18px}.radar-hero-symbol{display:none}.radar-hero h1{font-size:26px}.radar-hero p{font-size:11px}.radar-detail-main,.radar-detail-list{padding:16px}.radar-detail-list{grid-template-columns:1fr}.radar-toolbar select{max-width:100%}.radar-legend{gap:10px}}";

