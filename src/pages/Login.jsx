
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      alert("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        "https://learntrace-backend-vp2a.onrender.com/auth/login",
        {
          email: email.trim(),
          password: password,
        }
      );

      const message =
        typeof response.data === "string"
          ? response.data
          : response.data?.message || "Login successful";

      let studentName = "";

      if (typeof response.data === "object" && response.data !== null) {
        studentName =
          response.data.name ||
          response.data.fullName ||
          response.data.username ||
          response.data.studentName ||
          "";
      }

      if (!studentName && typeof response.data === "string") {
        studentName = response.data.split(" for ")[1] || "";
      }

      studentName = studentName.trim();

      const user = {
        name: studentName,
        email: email.trim(),
      };

      localStorage.setItem("user", JSON.stringify(user));

      alert(message);

      navigate("/dashboard", {
        state: {
          name: user.name,
          email: user.email,
        },
      });
    } catch (error) {
      console.error("Login error:", error);

      const errorMessage =
        typeof error.response?.data === "string"
          ? error.response.data
          : error.response?.data?.message ||
            error.response?.data?.error ||
            error.message ||
            "Login failed. Please try again.";

      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>LT</div>

        <h1 style={styles.title}>LearnTrace</h1>

        <p style={styles.subtitle}>
          Understand what you know. Discover what you need to learn.
        </p>

        <h2 style={styles.heading}>Welcome Back 👋</h2>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={styles.input}
          autoComplete="email"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          style={styles.input}
          autoComplete="current-password"
        />

        <button
          style={{
            ...styles.button,
            opacity: loading ? 0.7 : 1,
          }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        <p style={styles.signup}>
          Don't have an account?{" "}
          <span
            onClick={() => navigate("/register")}
            style={styles.register}
          >
            Register
          </span>
        </p>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    boxSizing: "border-box",
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "380px",
    maxWidth: "100%",
    padding: "40px",
    boxSizing: "border-box",
    background: "white",
    borderRadius: "20px",
    boxShadow: "0 15px 40px rgba(0,0,0,0.1)",
    textAlign: "center",
  },

  logo: {
    width: "55px",
    height: "55px",
    margin: "0 auto 15px",
    borderRadius: "15px",
    background: "#4f46e5",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "20px",
    fontWeight: "bold",
  },

  title: {
    margin: "0",
    fontSize: "32px",
    color: "#1e1b4b",
  },

  subtitle: {
    color: "#64748b",
    fontSize: "14px",
    lineHeight: "1.5",
    marginBottom: "30px",
  },

  heading: {
    color: "#1e293b",
    marginBottom: "20px",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginBottom: "15px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "15px",
    outline: "none",
  },

  button: {
    width: "100%",
    padding: "13px",
    border: "none",
    borderRadius: "10px",
    background: "#4f46e5",
    color: "white",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
  },

  signup: {
    marginTop: "20px",
    color: "#64748b",
    fontSize: "14px",
  },

  register: {
    color: "#4f46e5",
    cursor: "pointer",
    fontWeight: "bold",
  },
};

export default Login;
