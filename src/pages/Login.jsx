import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

function Login() {
    const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const handleLogin = async () => {
  try {
    const response = await axios.post(
      "http://localhost:8080/auth/login",
      {
        email: email,
        password: password,
      }
    );

   const studentName = response.data.split(" for ")[1];

alert(response.data);

navigate("/dashboard", {
  state: {
    name: studentName,
    email: email,
  },
});
} catch (error) {
  console.log(error);
  alert(error.response?.data || error.message);
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
          style={styles.input}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button style={styles.button} onClick={handleLogin}>
          Login
        </button>

        <p style={styles.signup}>
  Don't have an account?{" "}
  <span
    onClick={() => navigate("/register")}
    style={{ color: "#4f46e5", cursor: "pointer", fontWeight: "bold" }}
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
};

export default Login;