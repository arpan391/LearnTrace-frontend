import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

function Quiz() {
  const location = useLocation();
  const navigate = useNavigate();

  const subject = location.state?.subject || "Data Structures";
  const concept = location.state?.concept || "";

  const assessmentTypes = {
    MCQ: {
      label: "🧠 MCQ Assessment",
      description: "Test your conceptual understanding",
      badge: "KNOWLEDGE CHECK",
    },
    SCENARIO: {
      label: "🎯 Real-World Scenario",
      description: "Test how you apply concepts in real-world situations",
      badge: "APPLICATION CHALLENGE",
    },
    PRACTICAL: {
      label: "💻 Practical / Predict Output",
      description:
        "Test your ability to apply concepts using code, SQL, or practical problem-solving",
      badge: "PRACTICAL CODE CHALLENGE",
    },
  };

  // Practical is available for these 4 subjects
  const practicalSubjects = [
    "Data Structures",
    "DBMS",
    "Java Programming",
    "Python Programming",
  ];

  const isPracticalAvailable = practicalSubjects.includes(subject);

  const [questionType, setQuestionType] = useState("MCQ");
  const [questions, setQuestions] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const availableTypes = isPracticalAvailable
    ? ["MCQ", "SCENARIO", "PRACTICAL"]
    : ["MCQ", "SCENARIO"];

  useEffect(() => {
    if (questionType === "PRACTICAL" && !isPracticalAvailable) {
      setQuestionType("MCQ");
    }
  }, [subject, isPracticalAvailable, questionType]);

  useEffect(() => {
    fetchQuestions();
  }, [subject, concept, questionType]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setQuestions([]);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);

      let url =
        `http://localhost:8080/questions?subject=${encodeURIComponent(
          subject
        )}&questionType=${encodeURIComponent(questionType)}`;

      if (concept) {
        url += `&concept=${encodeURIComponent(concept)}`;
      }

      const response = await axios.get(url);

      setQuestions(response.data || []);
    } catch (error) {
      console.error("Error loading questions:", error);
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAssessmentChange = (type) => {
    if (type === "PRACTICAL" && !isPracticalAvailable) {
      return;
    }

    setQuestionType(type);
  };

  const handleAnswer = (answer) => {
    const currentQuestion = questions[currentIndex];

    if (!currentQuestion) return;

    setAnswers((previous) => ({
      ...previous,
      [currentQuestion.id]: answer,
    }));
  };

  const nextQuestion = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((previous) => previous + 1);
    }
  };

  const previousQuestion = () => {
    if (currentIndex > 0) {
      setCurrentIndex((previous) => previous - 1);
    }
  };

  const submitQuiz = async () => {
    try {
      setSubmitting(true);

      const response = await axios.post(
        `http://localhost:8080/quiz/submit?subject=${encodeURIComponent(
          subject
        )}&concept=${encodeURIComponent(
          concept
        )}&questionType=${encodeURIComponent(questionType)}`,
        answers
      );

      setResult(response.data);
    } catch (error) {
      console.error("Error submitting quiz:", error);

      alert(
        "Unable to submit quiz. Make sure the Spring Boot backend is running."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const currentQuestion = questions[currentIndex];

  const selectedAnswer = currentQuestion
    ? answers[currentQuestion.id]
    : null;

  const progress =
    questions.length > 0
      ? Math.round(((currentIndex + 1) / questions.length) * 100)
      : 0;

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.loadingCard}>
          <div style={styles.loadingIcon}>🧠</div>
          <h2>Preparing Assessment...</h2>
          <p>Loading assessment questions...</p>
        </div>
      </div>
    );
  }

  if (result) {
    return (
      <div style={styles.page}>
        <div style={styles.resultCard}>
          <div style={styles.resultIcon}>🎯</div>

          <div style={styles.resultBadge}>ASSESSMENT COMPLETE</div>

          <h1>Knowledge Analysis Complete</h1>

          <p style={styles.resultSubtitle}>
            {subject}
            {concept ? ` • ${concept}` : ""}
          </p>

          <div style={styles.scoreCircle}>
            <span>{result.score}%</span>
          </div>

          <div style={styles.resultGrid}>
            <div style={styles.resultBox}>
              <span>Total</span>
              <strong>{result.totalQuestions}</strong>
            </div>

            <div style={styles.resultBox}>
              <span>Correct</span>
              <strong>{result.correctAnswers}</strong>
            </div>

            <div style={styles.resultBox}>
              <span>Wrong</span>
              <strong>{result.wrongAnswers}</strong>
            </div>
          </div>

          <div style={styles.resultButtons}>
            <button
              style={styles.primaryButton}
              onClick={() =>
                navigate("/knowledge-twin", {
                  state: {
                    subject,
                    concept,
                  },
                })
              }
            >
              🧠 Open Knowledge Twin
            </button>

            <button
              style={styles.secondaryButton}
              onClick={() => navigate("/dashboard")}
            >
              ← Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyCard}>
          <div style={styles.emptyIcon}>📭</div>

          <h2>No Questions Available</h2>

          <p>
            There are currently no questions for <strong>{subject}</strong>
            {concept ? ` → ${concept}` : ""}.
          </p>

          <button
            style={styles.secondaryButton}
            onClick={() => navigate("/dashboard")}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        {/* HEADER */}
        <div style={styles.header}>
          <button
            style={styles.backButton}
            onClick={() => navigate("/dashboard")}
          >
            ← Dashboard
          </button>

          <div style={styles.headerCenter}>
            <div style={styles.systemLabel}>LEARNTRACE INTELLIGENCE</div>

            <h1>Knowledge Assessment</h1>

            <p>
              {subject}
              {concept ? ` • ${concept}` : ""}
            </p>
          </div>

          <div style={styles.liveStatus}>
            <span style={styles.liveDot}></span>
            LIVE
          </div>
        </div>

        {/* ASSESSMENT TYPE SELECTOR */}
        <div style={styles.typeSection}>
          <div style={styles.sectionTitle}>
            <span>Choose Assessment Layer</span>
            <small>
              Different layers measure different dimensions of knowledge.
            </small>
          </div>

          <div style={styles.typeGrid}>
            {availableTypes.map((type) => {
              const config = assessmentTypes[type];
              const active = questionType === type;

              return (
                <button
                  key={type}
                  onClick={() => handleAssessmentChange(type)}
                  style={{
                    ...styles.typeCard,
                    ...(active ? styles.activeTypeCard : {}),
                  }}
                >
                  <div style={styles.typeIcon}>
                    {type === "MCQ"
                      ? "🧠"
                      : type === "SCENARIO"
                      ? "🎯"
                      : "💻"}
                  </div>

                  <div style={styles.typeContent}>
                    <strong>{config.label}</strong>
                    <span>{config.description}</span>
                  </div>

                  {active && (
                    <div style={styles.selectedIndicator}>✓</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* PRACTICAL INFORMATION */}
        {questionType === "PRACTICAL" && (
          <div style={styles.practicalBanner}>
            <div style={styles.practicalIcon}>💻</div>

            <div>
              <strong>Practical Intelligence Layer</strong>

              <p>
                This assessment checks whether you can actually apply the
                concept using code, SQL, output prediction, or practical
                problem-solving.
              </p>

              <div style={styles.tags}>
                {subject === "Data Structures" && (
                  <>
                    <span>🐍 Python</span>
                    <span>⚙️ Implementation</span>
                    <span>🔍 Output Prediction</span>
                  </>
                )}

                {subject === "DBMS" && (
                  <>
                    <span>🗄️ SQL</span>
                    <span>🐍 Python + SQL</span>
                    <span>🔍 Query Analysis</span>
                  </>
                )}

                {subject === "Java Programming" && (
                  <>
                    <span>☕ Java</span>
                    <span>⚙️ Code</span>
                    <span>🔍 Output Prediction</span>
                  </>
                )}

                {subject === "Python Programming" && (
                  <>
                    <span>🐍 Python</span>
                    <span>⚙️ Code</span>
                    <span>🔍 Output Prediction</span>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QUIZ CARD */}
        <div style={styles.quizCard}>
          <div style={styles.quizTop}>
            <div>
              <span style={styles.questionBadge}>
                {assessmentTypes[questionType].badge}
              </span>

              <div style={styles.questionNumber}>
                Question {currentIndex + 1}{" "}
                <span>/ {questions.length}</span>
              </div>
            </div>

            <div style={styles.progressContainer}>
              <span>{progress}%</span>

              <div style={styles.progressTrack}>
                <div
                  style={{
                    ...styles.progressFill,
                    width: `${progress}%`,
                  }}
                ></div>
              </div>
            </div>
          </div>

          {/* QUESTION */}
          <div style={styles.questionArea}>
            <div style={styles.conceptTag}>
              {currentQuestion.concept}
            </div>

            <h2>{currentQuestion.questionText}</h2>

            <div style={styles.options}>
              {["A", "B", "C", "D"].map((letter) => {
                const optionText =
                  letter === "A"
                    ? currentQuestion.optionA
                    : letter === "B"
                    ? currentQuestion.optionB
                    : letter === "C"
                    ? currentQuestion.optionC
                    : currentQuestion.optionD;

                if (!optionText) return null;

                const selected = selectedAnswer === letter;

                return (
                  <button
                    key={letter}
                    onClick={() => handleAnswer(letter)}
                    style={{
                      ...styles.option,
                      ...(selected ? styles.selectedOption : {}),
                    }}
                  >
                    <div
                      style={{
                        ...styles.optionLetter,
                        ...(selected
                          ? styles.selectedOptionLetter
                          : {}),
                      }}
                    >
                      {letter}
                    </div>

                    <div style={styles.optionText}>{optionText}</div>

                    {selected && (
                      <div style={styles.optionCheck}>✓</div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* FOOTER */}
          <div style={styles.quizFooter}>
            <button
              style={{
                ...styles.secondaryButton,
                opacity: currentIndex === 0 ? 0.4 : 1,
              }}
              disabled={currentIndex === 0}
              onClick={previousQuestion}
            >
              ← Previous
            </button>

            <div style={styles.answeredCount}>
              {Object.keys(answers).length} / {questions.length} answered
            </div>

            {currentIndex < questions.length - 1 ? (
              <button
                style={{
                  ...styles.primaryButton,
                  opacity: selectedAnswer ? 1 : 0.5,
                }}
                disabled={!selectedAnswer}
                onClick={nextQuestion}
              >
                Next Question →
              </button>
            ) : (
              <button
                style={{
                  ...styles.submitButton,
                  opacity: selectedAnswer ? 1 : 0.5,
                }}
                disabled={!selectedAnswer || submitting}
                onClick={submitQuiz}
              >
                {submitting ? "Analyzing..." : "🚀 Submit Assessment"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background:
      "radial-gradient(circle at 15% 10%, rgba(124,58,237,0.14), transparent 28%), radial-gradient(circle at 85% 15%, rgba(6,182,212,0.10), transparent 25%), #030712",
    color: "#e5e7eb",
    padding: "30px 20px 60px",
  },

  container: {
    width: "100%",
    maxWidth: "1100px",
    margin: "0 auto",
  },

  header: {
    display: "grid",
    gridTemplateColumns: "1fr 2fr 1fr",
    alignItems: "center",
    gap: "20px",
    marginBottom: "35px",
  },

  backButton: {
    justifySelf: "start",
    background: "rgba(15,23,42,0.8)",
    border: "1px solid rgba(148,163,184,0.2)",
    color: "#cbd5e1",
    padding: "10px 16px",
    borderRadius: "10px",
    fontSize: "14px",
  },

  headerCenter: {
    textAlign: "center",
  },

  systemLabel: {
    color: "#8b5cf6",
    fontSize: "11px",
    fontWeight: "800",
    letterSpacing: "2px",
    marginBottom: "8px",
  },

  liveStatus: {
    justifySelf: "end",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    fontSize: "11px",
    fontWeight: "800",
    color: "#22c55e",
  },

  liveDot: {
    width: "7px",
    height: "7px",
    borderRadius: "50%",
    background: "#22c55e",
  },

  typeSection: {
    marginBottom: "20px",
  },

  sectionTitle: {
    marginBottom: "14px",
  },

  typeGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
  },

  typeCard: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "13px",
    textAlign: "left",
    padding: "17px",
    borderRadius: "14px",
    border: "1px solid rgba(148,163,184,0.15)",
    background: "rgba(15,23,42,0.65)",
    color: "#e5e7eb",
  },

  activeTypeCard: {
    border: "1px solid rgba(139,92,246,0.7)",
    background: "rgba(76,29,149,0.2)",
  },

  typeIcon: {
    fontSize: "25px",
  },

  typeContent: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },

  selectedIndicator: {
    position: "absolute",
    top: "10px",
    right: "10px",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#7c3aed",
    color: "white",
    fontSize: "12px",
  },

  practicalBanner: {
    display: "flex",
    gap: "15px",
    padding: "18px",
    marginBottom: "20px",
    borderRadius: "14px",
    border: "1px solid rgba(6,182,212,0.25)",
    background: "rgba(6,182,212,0.06)",
  },

  practicalIcon: {
    fontSize: "28px",
  },

  tags: {
    display: "flex",
    flexWrap: "wrap",
    gap: "7px",
  },

  quizCard: {
    borderRadius: "18px",
    border: "1px solid rgba(148,163,184,0.15)",
    background: "rgba(15,23,42,0.72)",
    overflow: "hidden",
  },

  quizTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "20px 24px",
    borderBottom: "1px solid rgba(148,163,184,0.1)",
  },

  questionBadge: {
    display: "inline-block",
    padding: "5px 9px",
    borderRadius: "6px",
    background: "rgba(124,58,237,0.15)",
    color: "#a78bfa",
    fontSize: "9px",
    fontWeight: "900",
  },

  questionNumber: {
    marginTop: "9px",
    fontWeight: "800",
    fontSize: "16px",
  },

  progressContainer: {
    width: "180px",
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },

  progressTrack: {
    flex: 1,
    height: "5px",
    background: "#1e293b",
    borderRadius: "10px",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    background: "#7c3aed",
    borderRadius: "10px",
  },

  questionArea: {
    padding: "35px 30px",
  },

  conceptTag: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "7px",
    background: "rgba(6,182,212,0.08)",
    color: "#67e8f9",
    fontSize: "11px",
    fontWeight: "700",
    marginBottom: "17px",
  },

  options: {
    display: "grid",
    gap: "12px",
  },

  option: {
    width: "100%",
    display: "flex",
    alignItems: "center",
    gap: "15px",
    textAlign: "left",
    padding: "16px",
    borderRadius: "12px",
    border: "1px solid rgba(148,163,184,0.14)",
    background: "rgba(2,6,23,0.45)",
    color: "#cbd5e1",
  },

  selectedOption: {
    border: "1px solid rgba(139,92,246,0.75)",
    background: "rgba(124,58,237,0.13)",
    color: "#f8fafc",
  },

  optionLetter: {
    flexShrink: 0,
    width: "34px",
    height: "34px",
    borderRadius: "9px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#1e293b",
    color: "#94a3b8",
    fontWeight: "800",
  },

  selectedOptionLetter: {
    background: "#7c3aed",
    color: "white",
  },

  optionText: {
    flex: 1,
    fontSize: "14px",
  },

  optionCheck: {
    color: "#a78bfa",
    fontSize: "18px",
  },

  quizFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "15px",
    padding: "18px 24px",
    borderTop: "1px solid rgba(148,163,184,0.1)",
  },

  answeredCount: {
    color: "#64748b",
    fontSize: "12px",
  },

  primaryButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 18px",
    background: "#7c3aed",
    color: "white",
    fontWeight: "800",
  },

  submitButton: {
    border: "none",
    borderRadius: "10px",
    padding: "11px 18px",
    background: "#0891b2",
    color: "white",
    fontWeight: "800",
  },

  secondaryButton: {
    border: "1px solid rgba(148,163,184,0.18)",
    borderRadius: "10px",
    padding: "10px 16px",
    background: "rgba(15,23,42,0.8)",
    color: "#cbd5e1",
    fontWeight: "700",
  },

  loadingCard: {
    width: "min(500px, 90%)",
    margin: "15vh auto",
    textAlign: "center",
    padding: "45px 30px",
    borderRadius: "18px",
    background: "rgba(15,23,42,0.75)",
  },

  loadingIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  emptyCard: {
    width: "min(550px, 90%)",
    margin: "15vh auto",
    textAlign: "center",
    padding: "45px 30px",
    borderRadius: "18px",
    background: "rgba(15,23,42,0.75)",
  },

  emptyIcon: {
    fontSize: "45px",
    marginBottom: "15px",
  },

  resultCard: {
    width: "min(700px, 94%)",
    margin: "5vh auto",
    textAlign: "center",
    padding: "40px 30px",
    borderRadius: "20px",
    background: "rgba(15,23,42,0.8)",
  },

  resultIcon: {
    fontSize: "45px",
  },

  resultBadge: {
    display: "inline-block",
    padding: "6px 10px",
    borderRadius: "6px",
    background: "rgba(34,197,94,0.1)",
    color: "#4ade80",
    fontSize: "9px",
    fontWeight: "900",
  },

  resultSubtitle: {
    color: "#64748b",
  },

  scoreCircle: {
    width: "150px",
    height: "150px",
    borderRadius: "50%",
    margin: "30px auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "7px solid rgba(124,58,237,0.35)",
  },

  resultGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "12px",
    marginBottom: "22px",
  },

  resultBox: {
    padding: "15px",
    borderRadius: "12px",
    background: "rgba(2,6,23,0.5)",
  },

  resultButtons: {
    display: "flex",
    justifyContent: "center",
    gap: "12px",
    flexWrap: "wrap",
  },
};

export default Quiz;