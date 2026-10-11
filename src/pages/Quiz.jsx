
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API = "https://learntrace-backend-vp2a.onrender.com";

function formatCodeQuestion(text) {
  if (!text) return { prompt: "", code: "" };

  const patterns = [
    /\b(?:arr|nums|numbers|list|myList)\s*=\s*(?:\[|\(|\{)/,
    /\b(?:print|len|range|SELECT|INSERT|UPDATE|DELETE|CREATE|System\.out\.print|console\.log)\b/i,
    /\b(?:int|String|double|float|public\s+static|def\s+|for\s*\(|while\s*\(|if\s*\()/,
  ];

  let index = -1;

  patterns.forEach((pattern) => {
    const match = pattern.exec(text);
    if (match && (index === -1 || match.index < index)) {
      index = match.index;
    }
  });

  if (index === -1) return { prompt: text, code: "" };

  const prompt = text.slice(0, index).trim();
  let code = text.slice(index).trim();

  code = code
    .replace(/\s+(?=(?:arr|nums|numbers|myList)\s*=)/g, "\n")
    .replace(/\s+(?=(?:print|System\.out\.print(?:ln)?|console\.log)\s*\()/g, "\n")
    .replace(/\s+(?=(?:SELECT|INSERT|UPDATE|DELETE|CREATE)\s+)/gi, "\n")
    .replace(/\s+(?=(?:int|String|double|float)\s+\w+\s*=)/g, "\n")
    .replace(/\s+(?=(?:for|while|if)\s*\()/g, "\n")
    .replace(/\s+(?=def\s+\w+\s*\()/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();

  return { prompt, code };
}

export default function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  const subject = location.state?.subject || "Data Structures";
  const concept = location.state?.concept || "";
  const codingLab = location.state?.codingLab === true;

  const types = {
    MCQ: {
      label: "🧠 MCQ Assessment",
      description: "Test your conceptual understanding",
      badge: "KNOWLEDGE CHECK",
    },
    SCENARIO: {
      label: "🎯 Real-World Scenario",
      description: "Apply concepts to real-world problems",
      badge: "APPLICATION CHALLENGE",
    },
    PRACTICAL: {
      label: "💻 Practical / Predict Output",
      description: "Code snippets, SQL and output prediction",
      badge: "PRACTICAL CODE CHALLENGE",
    },
  };

  const practicalSubjects = [
    "Data Structures",
    "DBMS",
    "Java Programming",
    "Python Programming",
  ];

  const isPracticalAvailable = practicalSubjects.includes(subject);

  const [questionType, setQuestionType] = useState(
    codingLab && isPracticalAvailable
      ? "PRACTICAL"
      : location.state?.questionType || "MCQ"
  );
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const availableTypes = codingLab
    ? ["PRACTICAL"]
    : isPracticalAvailable
      ? ["MCQ", "SCENARIO", "PRACTICAL"]
      : ["MCQ", "SCENARIO"];

  useEffect(() => {
    let cancelled = false;

    async function fetchQuestions() {
      try {
        setLoading(true);
        setError("");
        setQuestions([]);
        setCurrentIndex(0);
        setAnswers({});
        setResult(null);

        let url =
          `${API}/questions?subject=${encodeURIComponent(subject)}` +
          `&questionType=${encodeURIComponent(questionType)}`;

        if (concept) {
          url += `&concept=${encodeURIComponent(concept)}`;
        }

        const response = await axios.get(url);

        if (!cancelled) {
          setQuestions(Array.isArray(response.data) ? response.data : []);
        }
      } catch (e) {
        console.error("Error loading questions:", e);

        if (!cancelled) {
          setQuestions([]);
          setError(
            "Unable to load questions. Please check your connection and try again."
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchQuestions();

    return () => {
      cancelled = true;
    };
  }, [subject, concept, questionType]);

  const handleAnswer = (answer) => {
    const question = questions[currentIndex];
    if (!question) return;

    setAnswers((previous) => ({
      ...previous,
      [question.id]: answer,
    }));
  };

  const submitQuiz = async () => {
    if (submitting) return;

    const token = localStorage.getItem("authToken");

    if (!token) {
      setError("Your login session is missing. Please log in again.");
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const params = new URLSearchParams({
        subject,
        questionType,
      });

      if (concept.trim()) {
        params.set("concept", concept.trim());
      }

      const response = await axios.post(
        `${API}/quiz/submit?${params.toString()}`,
        answers,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      setResult(response.data);
    } catch (e) {
      console.error("Error submitting quiz:", e);

      if (e.response?.status === 401) {
        localStorage.removeItem("user");
        localStorage.removeItem("authToken");

        setError("Your session has expired. Please log in again.");
        navigate("/login", { replace: true });
      } else {
        setError(
          e.response?.data?.message ||
            "Unable to submit assessment. Please try again."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const question = questions[currentIndex];
  const selectedAnswer = question ? answers[question.id] : null;

  const progress = questions.length
    ? Math.round(((currentIndex + 1) / questions.length) * 100)
    : 0;

  const getOption = (q, letter) =>
    ({
      A: q.optionA,
      B: q.optionB,
      C: q.optionC,
      D: q.optionD,
    })[letter] || "";

  const renderQuestion = (q) => {
    const formatted =
      questionType === "PRACTICAL"
        ? formatCodeQuestion(q.questionText)
        : { prompt: q.questionText || "", code: "" };

    return (
      <>
        {formatted.prompt && (
          <h2 style={S.question}>{formatted.prompt}</h2>
        )}

        {formatted.code && (
          <div style={S.codePanel}>
            <div style={S.codeHeader}>
              <span>🔴 🟡 🟢</span>
              <span>
                {subject === "DBMS"
                  ? "SQL QUERY"
                  : subject === "Java Programming"
                    ? "JAVA CODE"
                    : subject === "Python Programming"
                      ? "PYTHON CODE"
                      : "CODE SNIPPET"}
              </span>
            </div>

            <pre style={S.code}>
              <code>{formatted.code}</code>
            </pre>
          </div>
        )}
      </>
    );
  };

  if (loading) {
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: 48 }}>🧠</div>
          <h2>Preparing your assessment...</h2>
          <p>Loading your questions.</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={S.page}>
        <div style={S.resultCard}>
          <div style={{ fontSize: 55 }}>🎉</div>
          <span style={S.badge}>ASSESSMENT COMPLETE</span>
          <h1>Great work!</h1>
          <p>{subject}{concept ? ` · ${concept}` : ""}</p>

          <div style={S.scoreCircle}>{result.score ?? 0}%</div>

          <div style={S.stats}>
            <div style={S.stat}>
              <span>Total</span>
              <strong>{result.totalQuestions ?? questions.length}</strong>
            </div>
            <div style={S.stat}>
              <span>Correct</span>
              <strong>{result.correctAnswers ?? 0}</strong>
            </div>
            <div style={S.stat}>
              <span>Wrong</span>
              <strong>{result.wrongAnswers ?? 0}</strong>
            </div>
          </div>

          <button
            style={S.primary}
            onClick={() =>
              navigate("/knowledge-twin", { state: { subject, concept } })
            }
          >
            🧠 Open Knowledge Twin
          </button>

          <button
            style={S.secondary}
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!questions.length) {
    return (
      <div style={S.page}>
        <div style={S.centerCard}>
          <div style={{ fontSize: 48 }}>📭</div>
          <h2>No Questions Available</h2>
          <p>
            There are currently no {questionType.toLowerCase()} questions
            for {subject}{concept ? ` → ${concept}` : ""}.
          </p>

          {codingLab && (
            <p style={{ color: "#7c3aed" }}>
              Add questions with question_type = PRACTICAL to your database.
            </p>
          )}

          {error && <p style={{ color: "#dc2626" }}>{error}</p>}

          <button
            style={S.primary}
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={S.page}>
      <main style={S.container}>
        <header style={S.header}>
          <button
            style={S.secondary}
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          <div style={{ textAlign: "center" }}>
            <div style={S.eyebrow}>LEARNTRACE · LEARNING STUDIO</div>
            <h1 style={{ margin: "8px 0" }}>
              {codingLab ? "💻 Coding Lab" : "Knowledge Assessment"}
            </h1>
            <p style={{ margin: 0, color: "#77738f" }}>
              {subject}{concept ? ` · ${concept}` : ""}
            </p>
          </div>

          <span style={S.live}>● READY</span>
        </header>

        {!codingLab && (
          <section style={S.typeGrid}>
            {availableTypes.map((type) => (
              <button
                key={type}
                onClick={() => setQuestionType(type)}
                style={{
                  ...S.typeCard,
                  ...(questionType === type ? S.activeType : {}),
                }}
              >
                <strong>{types[type].label}</strong>
                <span>{types[type].description}</span>
              </button>
            ))}
          </section>
        )}

        {codingLab && (
          <section style={S.hero}>
            <div style={{ fontSize: 30 }}>{"</>"}</div>
            <div>
              <h2 style={{ margin: "0 0 8px" }}>
                Practical Challenge Mode
              </h2>
              <p style={{ margin: 0, lineHeight: 1.7 }}>
                Focus on code snippets, output prediction and practical
                problem-solving. Only practical questions are requested.
              </p>
            </div>
          </section>
        )}

        <section style={S.quizCard}>
          <div style={S.quizTop}>
            <div>
              <span style={S.badge}>{types[questionType].badge}</span>
              <h3 style={{ marginBottom: 0 }}>
                Question {currentIndex + 1} of {questions.length}
              </h3>
            </div>

            <div style={{ minWidth: 100, textAlign: "right" }}>
              <strong>{progress}%</strong>
              <div style={S.progressTrack}>
                <div style={{ ...S.progressFill, width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div style={S.questionArea}>
            <span style={S.concept}>
              {question.concept || subject}
            </span>

            {renderQuestion(question)}

            <div style={{ display: "grid", gap: 12, marginTop: 20 }}>
              {["A", "B", "C", "D"].map((letter) => {
                const value = getOption(question, letter);
                if (!value) return null;

                const selected = selectedAnswer === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswer(letter)}
                    style={{
                      ...S.option,
                      ...(selected ? S.selectedOption : {}),
                    }}
                  >
                    <span
                      style={{
                        ...S.optionLetter,
                        ...(selected ? S.selectedLetter : {}),
                      }}
                    >
                      {letter}
                    </span>

                    <span style={{ flex: 1 }}>{value}</span>
                    {selected && <strong>✓</strong>}
                  </button>
                );
              })}
            </div>
          </div>

          {error && (
            <p role="alert" style={{ color: "#dc2626", padding: "0 24px" }}>
              {error}
            </p>
          )}

          <footer style={S.footer}>
            <button
              style={S.secondary}
              disabled={currentIndex === 0 || submitting}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              ← Previous
            </button>

            <span style={{ color: "#77738f", fontSize: 13 }}>
              {Object.keys(answers).length} / {questions.length} answered
            </span>

            {currentIndex < questions.length - 1 ? (
              <button
                style={S.primary}
                disabled={!selectedAnswer || submitting}
                onClick={() => setCurrentIndex((i) => i + 1)}
              >
                Next Question →
              </button>
            ) : (
              <button
                style={{
                  ...S.primary,
                  opacity: submitting ? 0.7 : 1,
                }}
                disabled={!selectedAnswer || submitting}
                onClick={submitQuiz}
              >
                {submitting ? "Analyzing..." : "🚀 Submit Assessment"}
              </button>
            )}
          </footer>
        </section>
      </main>
    </div>
  );
}

const S = {
  page: {
    minHeight: "100vh",
    padding: "28px 18px 55px",
    boxSizing: "border-box",
    background: "linear-gradient(135deg,#f7f4ff,#effaff,#fff7f1)",
    color: "#292342",
    fontFamily: "Inter,Segoe UI,Arial,sans-serif",
  },
  container: { maxWidth: 1050, margin: "0 auto" },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    flexWrap: "wrap",
    marginBottom: 28,
  },
  eyebrow: {
    color: "#8055d8",
    fontSize: 11,
    fontWeight: 900,
    letterSpacing: 2,
  },
  live: { color: "#059669", fontSize: 11, fontWeight: 900 },
  hero: {
    display: "flex",
    gap: 18,
    alignItems: "center",
    padding: 24,
    marginBottom: 20,
    borderRadius: 20,
    color: "white",
    background: "linear-gradient(115deg,#4c278b,#8055e8,#b17af7)",
    boxShadow: "0 12px 30px #8055e822",
  },
  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
    gap: 12,
    marginBottom: 20,
  },
  typeCard: {
    display: "grid",
    gap: 10,
    textAlign: "left",
    padding: 18,
    borderRadius: 16,
    border: "1px solid #e6e0f5",
    background: "white",
    color: "#292342",
    cursor: "pointer",
  },
  activeType: {
    border: "2px solid #8055e8",
    background: "#f4edff",
    boxShadow: "0 8px 20px #8055e817",
  },
  quizCard: {
    background: "white",
    borderRadius: 22,
    border: "1px solid #e8e4f3",
    boxShadow: "0 15px 45px #33215a0c",
    overflow: "hidden",
  },
  quizTop: {
    padding: "22px 25px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 18,
    borderBottom: "1px solid #efedf6",
  },
  badge: {
    display: "inline-block",
    padding: "7px 10px",
    borderRadius: 8,
    background: "#efe7ff",
    color: "#7140c2",
    fontSize: 10,
    fontWeight: 900,
    letterSpacing: 0.6,
  },
  progressTrack: {
    height: 7,
    background: "#ece8f8",
    borderRadius: 20,
    marginTop: 8,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 20,
    background: "linear-gradient(90deg,#8b5cf6,#06b6d4,#34d399)",
    transition: "width .25s",
  },
  questionArea: { padding: "28px clamp(16px,4vw,32px)" },
  concept: {
    display: "inline-block",
    background: "#e7f8ff",
    color: "#087b9d",
    borderRadius: 7,
    padding: "6px 10px",
    fontSize: 11,
    fontWeight: 800,
    marginBottom: 15,
  },
  question: {
    fontSize: "clamp(18px,2.4vw,24px)",
    lineHeight: 1.65,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  },
  codePanel: {
    borderRadius: 14,
    overflow: "hidden",
    border: "1px solid #25345a",
    margin: "18px 0",
    background: "#11182c",
  },
  codeHeader: {
    display: "flex",
    justifyContent: "space-between",
    padding: "12px 16px",
    background: "#202844",
    color: "#a5f3fc",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1,
  },
  code: {
    margin: 0,
    padding: 22,
    color: "#d9f99d",
    fontSize: 14,
    lineHeight: 1.9,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontFamily: "Consolas,Monaco,monospace",
  },
  option: {
    display: "flex",
    alignItems: "center",
    gap: 14,
    textAlign: "left",
    padding: 14,
    borderRadius: 13,
    border: "1px solid #e7e4f0",
    background: "#fff",
    color: "#30294b",
    cursor: "pointer",
    fontSize: 14,
    lineHeight: 1.6,
  },
  selectedOption: {
    border: "2px solid #8055e8",
    background: "#f4efff",
  },
  optionLetter: {
    width: 34,
    height: 34,
    minWidth: 34,
    borderRadius: 10,
    display: "grid",
    placeItems: "center",
    background: "#f0edf8",
    color: "#6542ac",
    fontWeight: 900,
  },
  selectedLetter: { background: "#8055e8", color: "white" },
  footer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "18px 24px",
    borderTop: "1px solid #efedf6",
  },
  primary: {
    border: 0,
    borderRadius: 11,
    padding: "12px 18px",
    background: "linear-gradient(110deg,#7040d5,#8b5cf6)",
    color: "white",
    fontWeight: 800,
    cursor: "pointer",
  },
  secondary: {
    border: "1px solid #e4def2",
    borderRadius: 11,
    padding: "11px 15px",
    background: "white",
    color: "#6241ac",
    fontWeight: 800,
    cursor: "pointer",
  },
  centerCard: {
    maxWidth: 520,
    margin: "12vh auto",
    textAlign: "center",
    padding: 35,
    background: "white",
    border: "1px solid #e8e4f3",
    borderRadius: 22,
    boxShadow: "0 15px 45px #33215a0c",
  },
  resultCard: {
    maxWidth: 650,
    margin: "5vh auto",
    textAlign: "center",
    padding: "35px 24px",
    background: "white",
    borderRadius: 24,
    boxShadow: "0 15px 45px #33215a0c",
  },
  scoreCircle: {
    width: 145,
    height: 145,
    borderRadius: "50%",
    margin: "25px auto",
    display: "grid",
    placeItems: "center",
    background: "#f0eaff",
    border: "8px solid #a78bfa",
    color: "#6235bb",
    fontSize: 34,
    fontWeight: 900,
  },
  stats: {
    display: "grid",
    gridTemplateColumns: "repeat(3,minmax(0,1fr))",
    gap: 12,
    marginBottom: 25,
  },
  stat: {
    display: "grid",
    gap: 8,
    padding: 16,
    background: "#f7f5fc",
    borderRadius: 13,
  },
};
