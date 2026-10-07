import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function KnowledgeTwin() {
  const [data, setData] = useState([]);
  const [selected, setSelected] = useState(null);
  const [collision, setCollision] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    axios.get("http://localhost:8080/analysis/knowledge-gaps")
      .then(res => setData(res.data))
      .catch(console.error);
  }, []);

  const tested = data.filter(x => x.score != null);

  const avg = tested.length
    ? Math.round(tested.reduce((a, x) => a + Number(x.score), 0) / tested.length)
    : 0;

  const weak = [...tested].sort((a, b) => a.score - b.score)[0];

  const prediction = Math.min(98, Math.max(35, Math.round(avg * 0.75 + 20)));

  const topicPrediction = selected
    ? Math.min(98, Math.max(25, Math.round(Number(selected.score) * 0.8 + 15)))
    : 0;

  const status = score =>
    score >= 80 ? "STRONG" :
    score >= 60 ? "MODERATE" :
    score >= 40 ? "WEAK" : "CRITICAL";

  const color = score =>
    score >= 80 ? "#22c55e" :
    score >= 60 ? "#eab308" :
    score >= 40 ? "#f97316" : "#ef4444";

  const studyTime = score =>
    score >= 80 ? "20–30 min" :
    score >= 60 ? "45–60 min" : "90+ min";

  const findCollision = topic => {
    const related = tested.find(
      x =>
        x.id !== topic.id &&
        (x.name === topic.prerequisite ||
          topic.name === x.prerequisite)
    );

    if (!related) {
      setCollision({
        topic,
        related: null,
        message: `No directly connected assessed topic was found for ${topic.name}.`
      });
      return;
    }

    const gap = Math.abs(Number(topic.score) - Number(related.score));

    setCollision({
      topic,
      related,
      gap,
      message:
        gap >= 30
          ? `Hidden gap detected between ${related.name} and ${topic.name}.`
          : `Your knowledge is reasonably consistent between ${related.name} and ${topic.name}.`
    });
  };

  return (
    <div style={S.page}>

      <button style={S.back} onClick={() => navigate("/dashboard")}>
        ← Command Center
      </button>

      <div style={S.header}>
        <b>🧠 LIVE KNOWLEDGE TWIN</b>
        <span>● ONLINE</span>
      </div>

      <section style={S.hero}>
        <div style={S.orb}>
          🧠
          <small>YOUR<br />TWIN</small>
        </div>

        <div style={S.prediction}>
          <small>NEXT TEST OVERALL PREDICTION</small>
          <h1>{prediction}%</h1>

          <div style={S.bar}>
            <div style={{ ...S.fill, width: `${prediction}%` }} />
          </div>

          <b>
            {prediction >= 85
              ? "TEST READY"
              : prediction >= 65
              ? "TARGETED REVISION"
              : "HIGH RISK"}
          </b>

          <p>Focus on {weak?.name || "weak topics"}.</p>
        </div>
      </section>

      <div style={S.stats}>
        <Box title="Knowledge Health" value={`${avg}%`} />
        <Box title="Concepts Learned" value={tested.length} />
        <Box title="Weakest Topic" value={weak?.name || "--"} />
      </div>

      <section style={S.panel}>
        <h2>🔗 Topic Intelligence</h2>
        <p style={S.muted}>Select a topic to inspect it.</p>

        <div style={S.nodes}>
          {tested.map(x => (
            <button
              key={x.id}
              onClick={() => {
                setSelected(x);
                setCollision(null);
              }}
              style={{
                ...S.node,
                borderColor: color(x.score)
              }}
            >
              <span style={{ color: color(x.score) }}>●</span>
              {x.name}
              <small>{Math.round(x.score)}%</small>
            </button>
          ))}
        </div>
      </section>

      {selected && (
        <>
          <section style={S.analysis}>
            <small>🔬 TOPIC ANALYSIS</small>

            <div style={S.topicHead}>
              <h2>{selected.name}</h2>
              <b style={{ color: color(selected.score) }}>
                {status(selected.score)}
              </b>
            </div>

            <div style={S.topicScore}>
              <Box
                title="Current Mastery"
                value={`${Math.round(selected.score)}%`}
              />
              <Box
                title="Test Prediction"
                value={`${topicPrediction}%`}
              />
            </div>

            <p style={S.muted}>
              Prerequisite: {selected.prerequisite || "None"}
            </p>
          </section>

          <section style={S.collision}>
            <small>🧬 KNOWLEDGE COLLISION ENGINE</small>
            <h2>Find Hidden Knowledge Gaps</h2>

            <p>
              Your twin will compare this topic with its connected
              prerequisite and detect inconsistencies.
            </p>

            <button
              style={S.collisionBtn}
              onClick={() => findCollision(selected)}
            >
              Run Knowledge Collision →
            </button>

            {collision && (
              <div style={S.result}>

                {collision.related ? (
                  <>
                    <h3>
                      {collision.related.name} ↔ {collision.topic.name}
                    </h3>

                    <div style={S.compare}>
                      <span>
                        {collision.related.name}
                        <b>{Math.round(collision.related.score)}%</b>
                      </span>

                      <span>VS</span>

                      <span>
                        {collision.topic.name}
                        <b>{Math.round(collision.topic.score)}%</b>
                      </span>
                    </div>

                    <p>
                      {collision.message}
                    </p>

                    <strong>
                      Score difference: {Math.round(collision.gap)}%
                    </strong>

                    <p style={S.advice}>
                      {collision.gap >= 30
                        ? `⚠️ Strengthen ${collision.related.name} before going deeper into ${collision.topic.name}.`
                        : `🟢 Your ${collision.topic.name} foundation looks consistent.`}
                    </p>
                  </>
                ) : (
                  <p>{collision.message}</p>
                )}

              </div>
            )}
          </section>

          <section style={S.forensics}>
            <h2>🤖 Twin Recommendation</h2>

            <p>
              {selected.score >= 80
                ? `You are strong in ${selected.name}. Keep revision light.`
                : selected.score >= 60
                ? `Target ${selected.name} with focused revision and practice.`
                : `Prioritize ${selected.name} and its prerequisite before the next test.`}
            </p>

            <strong>
              Recommended study: {studyTime(selected.score)}
            </strong>
          </section>
        </>
      )}

    </div>
  );
}

function Box({ title, value }) {
  return (
    <div style={S.box}>
      <small>{title}</small>
      <h2>{value}</h2>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: "30px 6%",
    background: "#030712",
    color: "#e5e7eb",
    fontFamily: "Inter, Arial"
  },

  back: {
    background: "none",
    border: 0,
    color: "#a78bfa",
    cursor: "pointer",
    marginBottom: 25
  },

  header: {
    display: "flex",
    justifyContent: "space-between",
    color: "#c4b5fd",
    marginBottom: 20
  },

  hero: {
    display: "flex",
    alignItems: "center",
    gap: 40,
    padding: 35,
    borderRadius: 22,
    background: "linear-gradient(135deg,#111827,#1e1b4b)",
    border: "1px solid #4338ca"
  },

  orb: {
    width: 150,
    height: 150,
    borderRadius: "50%",
    display: "grid",
    placeItems: "center",
    background: "#312e81",
    fontSize: 50,
    textAlign: "center"
  },

  prediction: {
    flex: 1
  },

  bar: {
    height: 9,
    background: "#1e293b",
    borderRadius: 10,
    overflow: "hidden",
    margin: "12px 0"
  },

  fill: {
    height: "100%",
    background: "linear-gradient(90deg,#7c3aed,#06b6d4)"
  },

  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3,1fr)",
    gap: 15,
    margin: "20px 0"
  },

  box: {
    padding: 20,
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 15
  },

  panel: {
    padding: 25,
    background: "#0f172a",
    border: "1px solid #1e293b",
    borderRadius: 18
  },

  muted: {
    color: "#64748b"
  },

  nodes: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20
  },

  node: {
    padding: "12px 15px",
    border: "1px solid",
    borderRadius: 10,
    background: "#111827",
    color: "#e5e7eb",
    cursor: "pointer"
  },

  analysis: {
    marginTop: 20,
    padding: 25,
    borderRadius: 18,
    background: "#0f172a",
    border: "1px solid #4338ca"
  },

  topicHead: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  },

  topicScore: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 15,
    margin: "20px 0"
  },

  collision: {
    marginTop: 20,
    padding: 25,
    borderRadius: 18,
    background: "linear-gradient(135deg,#172554,#111827)",
    border: "1px solid #0ea5e9"
  },

  collisionBtn: {
    marginTop: 15,
    padding: "12px 18px",
    border: 0,
    borderRadius: 9,
    background: "#0891b2",
    color: "white",
    cursor: "pointer"
  },

  result: {
    marginTop: 20,
    padding: 20,
    background: "#0f172a",
    borderRadius: 12,
    border: "1px solid #334155"
  },

  compare: {
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
    margin: "20px 0"
  },

  advice: {
    marginTop: 15,
    color: "#facc15"
  },

  forensics: {
    marginTop: 20,
    padding: 25,
    borderRadius: 18,
    background: "linear-gradient(135deg,#111827,#1e1b4b)",
    border: "1px solid #4338ca"
  }
};

export default KnowledgeTwin;