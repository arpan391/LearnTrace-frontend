
import { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const API_URL = "https://learntrace-backend-vp2a.onrender.com";

function Profile() {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("user");

    if (!token || !storedUser) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      const parsedUser = JSON.parse(storedUser);

      if (!parsedUser || typeof parsedUser !== "object") {
        throw new Error("Invalid stored profile");
      }

      setUser(parsedUser);
    } catch {
      localStorage.removeItem("user");
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  const handlePasswordChange = async (event) => {
    event.preventDefault();
    setMessage({ type: "", text: "" });

    if (loading) return;

    if (!currentPassword || !newPassword || !confirmPassword) {
      setMessage({
        type: "error",
        text: "Please fill in all three password fields.",
      });
      return;
    }

    const passwordBytes = new TextEncoder().encode(newPassword).length;

    if (newPassword.length < 8 || passwordBytes > 72) {
      setMessage({
        type: "error",
        text: "Your new password must be at least 8 characters and no more than 72 UTF-8 bytes.",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: "New password and confirmation do not match.",
      });
      return;
    }

    if (currentPassword === newPassword) {
      setMessage({
        type: "error",
        text: "Choose a password different from your current one.",
      });
      return;
    }

    const token = localStorage.getItem("authToken");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    try {
      setLoading(true);

      const response = await axios.post(
        `${API_URL}/auth/change-password`,
        {
          currentPassword,
          newPassword,
          confirmPassword,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          timeout: 60000,
        }
      );

      setMessage({
        type: "success",
        text: response.data?.message || "Password changed successfully!",
      });

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      const serverMessage = error.response?.data?.message;

      if (error.response?.status === 401) {
        setMessage({
          type: "error",
          text:
            serverMessage ||
            "Your session expired or your current password is incorrect.",
        });
      } else if (error.response) {
        setMessage({
          type: "error",
          text:
            serverMessage ||
            "Unable to change the password. Please try again.",
        });
      } else {
        setMessage({
          type: "error",
          text:
            "Could not reach the backend. Please wait and try again.",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div style={styles.loading}>Loading your profile...</div>;
  }

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <button
          type="button"
          style={styles.brand}
          onClick={() => navigate("/dashboard")}
        >
          <span style={styles.logo}>LT</span>
          <span>LearnTrace</span>
        </button>

        <button
          type="button"
          style={styles.backButton}
          onClick={() => navigate("/dashboard")}
        >
          ← Back to Dashboard
        </button>
      </header>

      <main style={styles.main}>
        <section style={styles.profileCard}>
          <div style={styles.avatar}>
            {(user.name || "S").charAt(0).toUpperCase()}
          </div>

          <p style={styles.eyebrow}>YOUR ACCOUNT</p>
          <h1 style={styles.title}>My Profile</h1>
          <p style={styles.subtitle}>
            Manage your account and keep it secure.
          </p>

          <div style={styles.infoBox}>
            <span style={styles.label}>Full Name</span>
            <strong style={styles.infoValue}>
              {user.name || "Student"}
            </strong>

            <span style={styles.label}>Email Address</span>
            <strong style={styles.infoValue}>
              {user.email || "Email unavailable"}
            </strong>
          </div>

          <div style={styles.separator} />

          <div style={styles.formHeading}>
            <span style={styles.lockIcon}>🔐</span>
            <div>
              <h2 style={styles.heading}>Change Password</h2>
              <p style={styles.helper}>
                Verify your current password before choosing a new one.
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordChange}>
            <label style={styles.fieldLabel} htmlFor="currentPassword">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              autoComplete="current-password"
              placeholder="Enter current password"
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              style={styles.input}
              required
            />

            <label style={styles.fieldLabel} htmlFor="newPassword">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              style={styles.input}
              minLength={8}
              required
            />

            <label style={styles.fieldLabel} htmlFor="confirmPassword">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              placeholder="Enter the new password again"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              style={styles.input}
              minLength={8}
              required
            />

            {message.text && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  ...styles.message,
                  ...(message.type === "success"
                    ? styles.successMessage
                    : styles.errorMessage),
                }}
              >
                {message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.submitButton,
                opacity: loading ? 0.7 : 1,
                cursor: loading ? "wait" : "pointer",
              }}
            >
              {loading ? "Updating Password..." : "Update Password"}
            </button>
          </form>

          <p style={styles.securityNote}>
            Your current password is verified by the backend.
            Your new password is encoded before it is saved.
          </p>
        </section>
      </main>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #f0f2ff, #f8fafc)",
    fontFamily: "Arial, sans-serif",
    color: "#1e293b",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
    padding: "20px 6%",
    background: "#ffffff",
    borderBottom: "1px solid #e8e9f3",
    flexWrap: "wrap",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    border: 0,
    background: "transparent",
    color: "#22215a",
    fontSize: 21,
    fontWeight: 800,
    cursor: "pointer",
  },
  logo: {
    width: 42,
    height: 42,
    display: "grid",
    placeItems: "center",
    borderRadius: 13,
    background: "#4f46e5",
    color: "#ffffff",
    fontSize: 16,
  },
  backButton: {
    background: "#f3f1ff",
    color: "#5844c2",
    border: "1px solid #e4dfff",
    borderRadius: 10,
    padding: "11px 14px",
    cursor: "pointer",
    fontWeight: 700,
  },
  main: {
    display: "flex",
    justifyContent: "center",
    padding: "36px 16px",
  },
  profileCard: {
    width: 480,
    maxWidth: "100%",
    background: "#ffffff",
    border: "1px solid #e7e8f2",
    borderRadius: 22,
    padding: 30,
    boxSizing: "border-box",
    boxShadow: "0 16px 45px rgba(40, 35, 100, 0.08)",
  },
  avatar: {
    width: 64,
    height: 64,
    display: "grid",
    placeItems: "center",
    borderRadius: 20,
    background: "linear-gradient(135deg, #ded8ff, #fce7f3)",
    color: "#5b45c4",
    fontSize: 27,
    fontWeight: 800,
    marginBottom: 18,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 1.7,
    color: "#7c6bd8",
    fontWeight: 800,
    marginBottom: 8,
  },
  title: {
    fontSize: 29,
    margin: "0 0 9px",
    color: "#25234e",
  },
  subtitle: {
    fontSize: 13,
    color: "#777b93",
    lineHeight: 1.6,
    margin: "0 0 23px",
  },
  infoBox: {
    padding: 17,
    background: "#f8f7ff",
    border: "1px solid #eeeaff",
    borderRadius: 14,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    overflowWrap: "anywhere",
  },
  label: {
    fontSize: 11,
    color: "#898aa1",
    marginTop: 5,
  },
  infoValue: {
    fontSize: 14,
    color: "#353252",
  },
  separator: {
    height: 1,
    background: "#efedf7",
    margin: "25px 0",
  },
  formHeading: {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    marginBottom: 20,
  },
  lockIcon: {
    fontSize: 24,
  },
  heading: {
    fontSize: 18,
    margin: "0 0 6px",
    color: "#29274d",
  },
  helper: {
    fontSize: 12,
    lineHeight: 1.6,
    color: "#85869c",
    margin: 0,
  },
  fieldLabel: {
    display: "block",
    fontSize: 12,
    fontWeight: 700,
    margin: "16px 0 8px",
    color: "#45435f",
  },
  input: {
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    padding: 13,
    border: "1px solid #dcddea",
    borderRadius: 10,
    background: "#ffffff",
    color: "#25243f",
    fontSize: 14,
    outlineColor: "#8170e8",
  },
  message: {
    padding: 12,
    borderRadius: 10,
    fontSize: 12,
    lineHeight: 1.6,
    marginTop: 16,
    overflowWrap: "anywhere",
  },
  successMessage: {
    background: "#eafaf1",
    border: "1px solid #bcebd0",
    color: "#176943",
  },
  errorMessage: {
    background: "#fff0f0",
    border: "1px solid #ffd1d1",
    color: "#a52e38",
  },
  submitButton: {
    width: "100%",
    marginTop: 19,
    border: 0,
    borderRadius: 11,
    padding: 14,
    background: "#5145d8",
    color: "#ffffff",
    fontWeight: 800,
    fontSize: 14,
  },
  securityNote: {
    fontSize: 11,
    lineHeight: 1.7,
    color: "#9293a8",
    textAlign: "center",
    margin: "17px 0 0",
  },
  loading: {
    minHeight: "100vh",
    display: "grid",
    placeItems: "center",
    background: "#f8f8fd",
    color: "#555",
    fontFamily: "Arial, sans-serif",
  },
};

export default Profile;
