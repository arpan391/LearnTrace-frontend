import { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://learntrace-backend-vp2a.onrender.com";

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

    if (loading) return;

    try {
      setLoading(true);

      const response = await axios.post(`${API_URL}/auth/login`, {
        email: email.trim(),
        password,
      });

      const data = response.data;

      if (data?.id == null || !data?.token) {
        throw new Error(
          "The backend did not return a student ID and session token."
        );
      }

      const user = {
        id: data.id,
        name: data.name || "",
        email: data.email || email.trim(),
      };

      // Store the current student's profile and session token.
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("authToken", data.token);

      navigate("/dashboard", {
        replace: true,
        state: user,
      });
    } catch (error) {
      console.error("Login error:", error);

      const message =
        error.response?.data?.message ||
        error.message ||
        "Login failed. Please try again.";

      alert(message);
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

        <form
          onSubmit={(event) => {
            event.preventDefault();
            handleLogin();
          }}
        >
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            style={styles.input}
            autoComplete="email"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            style={styles.input}
            autoComplete="current-password"
            required
          />

          <button
            type="submit"
            style={{
              ...styles.button,
              opacity: loading ? 0.7 : 1,
              cursor: loading ? "wait" : "pointer",
            }}
            disabled={loading}
          >
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>

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
