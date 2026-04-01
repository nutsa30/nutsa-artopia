import React, { useState } from "react";
import styles from "./loginPage.module.css";
import { useNavigate } from "react-router-dom";
import logo from "../../assets/IMG_4970.JPG";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";

const LoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/auth/admin-login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: form.username.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Login failed");
      }

      const token = data?.token;

      if (!token) {
        throw new Error("Token არ დაბრუნდა");
      }

      // ✅ შეინახე token
      localStorage.setItem("ADMIN_TOKEN", token);

      // 👉 redirect admin panel-ზე
      navigate("/menu");
    } catch (err) {
      console.error("Login error:", err);
      setError("შეიყვანეთ სწორი მონაცემები");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <img className={styles.logo} src={logo} alt="" />
      <h2>Manager Portal</h2>

      <form onSubmit={handleSubmit} className={styles.loginForm}>
        <input
          name="username"
          value={form.username}
          onChange={handleChange}
          placeholder="Email"
          className={styles.input}
          required
        />

        <div className={styles.passwordWrapper}>
          <input
            name="password"
            type={showPassword ? "text" : "password"}
            value={form.password}
            onChange={handleChange}
            placeholder="Password"
            className={styles.input}
            required
          />

          <button
            type="button"
            onClick={() => setShowPassword((p) => !p)}
            className={styles.togglePassword}
          >
            {showPassword ? "🙈" : "👀"}
          </button>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <button
          type="submit"
          className={styles.logInButton}
          disabled={loading}
        >
          {loading ? "⏳..." : "🔐 Log in"}
        </button>
      </form>
    </div>
  );
};

export default LoginPage;