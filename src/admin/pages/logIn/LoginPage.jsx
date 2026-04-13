import React, { useState } from "react";
import styles from "./loginPage.module.css";
import { useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, Loader2 } from "lucide-react";
import logo from "../../assets/IMG_4970.JPG";

const API_BASE = "https://artopia-backend-2024-54872c79acdd.herokuapp.com";
const ADMIN_SECRET = "ARTOPIA_SUPERADMIN_2024";

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
          "X-Admin-Token": ADMIN_SECRET,
        },
        body: JSON.stringify({
          email: form.username.trim().toLowerCase(),
          password: form.password,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "ავტორიზაცია ვერ მოხერხდა");
      }

      const token = data?.token;
      if (!token) throw new Error("სერვერმა ტოკენი არ დააბრუნა");

      // ინახება ერთიანი სახელით სისტემის ყველა გვერდისთვის
      localStorage.setItem("ADMIN_TOKEN", token);
      navigate("/menu");
    } catch (err) {
      setError(err.message || "შეყვანილი მონაცემები არასწორია");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.pageWrapper}>
      <div className={styles.container}>
        <div className={styles.header}>
          <img className={styles.logo} src={logo} alt="Artopia Logo" />
          <h2>Artopia Manager</h2>
          <p>მართვის პანელში შესასვლელად გაიარეთ ავტორიზაცია</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.loginForm}>
          <div className={styles.inputGroup}>
            <Mail className={styles.fieldIcon} size={18} />
            <input
              name="username"
              type="email"
              value={form.username}
              onChange={handleChange}
              placeholder="Email მისამართი"
              className={styles.input}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <Lock className={styles.fieldIcon} size={18} />
            <input
              name="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={handleChange}
              placeholder="პაროლი"
              className={styles.input}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className={styles.togglePassword}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>

          {error && <div className={styles.errorMessage}>{error}</div>}

          <button
            type="submit"
            className={styles.logInButton}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className={styles.spinner} size={20} />
            ) : (
              "სისტემაში შესვლა"
            )}
          </button>
        </form>
        
        <div className={styles.footer}>
          © 2026 Artopia Official Management Portal
        </div>
      </div>
    </div>
  );
};

export default LoginPage;