
import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Register() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      alert("Please fill in all fields.");
      return;
    }

    try {
      const response = await axios.post(
        "https://learntrace-backend-vp2a.onrender.com/auth/register",
        {
          name: name.trim(),
          email: email.trim(),
          password: password,
        }
      );

      alert("Registration successful!");
      navigate("/");
    } catch (error) {
      console.error("Registration error:", error.response?.data || error.message);

      const message = error.response?.data;
      alert(
        typeof message === "string"
          ? message
          : message?.message || "Registration failed. Please try again."
      );
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>LT</div>

        <h1 style={styles.title}>LearnTrace</h1>
        <p style={styles.subtitle}>
          Start your personalized learning journey.
        </p>

        <h2 style={styles.heading}>Create Account</h2>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={styles.input}
        />

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button style={styles.button} onClick={handleRegister}>
          Register
        </button>

        <p style={styles.login}>
          Already have an account?{" "}
          <span
            onClick={() => navigate("/")}
            style={{ cursor: "pointer", color: "#4f46e5" }}
          >
            Login
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
    background: "linear-gradient(135deg, #eef2ff, #f8fafc)",
    fontFamily: "Arial, sans-serif",
  },

  card: {
    width: "380px",
    padding: "40px",
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
    margin: 0,
    fontSize: "32px",
    color: "#1e1b4b",
  },

  subtitle: {
    color: "#64748b",
    fontSize: "14px",
    marginBottom: "30px",
  },

  heading: {
    color: "#1e293b",
  },

  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px",
    marginBottom: "15px",
    border: "1px solid #cbd5e1",
    borderRadius: "10px",
    fontSize: "15px",
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

  login: {
    marginTop: "20px",
    color: "#64748b",
    fontSize: "14px",
  },
};

export default Register;
