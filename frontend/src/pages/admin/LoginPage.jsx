import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { login, getToken } from "../../services/auth.js";
import Icon from "../../components/common/Icon.jsx";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // If user is already logged in, redirect immediately to /admin
  useEffect(() => {
    if (getToken()) {
      const from = location.state?.from || "/admin";
      navigate(from, { replace: true });
    }
  }, [navigate, location]);

const handleLogin = async (e) => {
     e.preventDefault();
     setError("");
     setLoading(true);

     try {
       await login(email, password);
       const from = location.state?.from || "/admin";
       navigate(from, { replace: true });
     } catch (err) {
       setError(err.message || "Invalid email or password.");
     } finally {
       setLoading(false);
     }
   };


  return (
    <div className="login-split-container">
      {/* Left Panel — Hero Showcase */}
      <div className="login-hero-panel">
        <div className="login-hero-overlay" />
        <div className="login-hero-content">
          {/* Top Brand Header */}
          <div className="hero-brand">
            <div className="hero-brand-logo">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v8" />
                <path d="M4.93 10.93a10 10 0 1 0 14.14 0" />
                <path d="M12 10 8 4" />
                <path d="M12 10l4-6" />
              </svg>
            </div>
            <div className="hero-brand-titles">
              <h2 className="hero-brand-name">YourBite</h2>
              <span className="hero-brand-tag">RESTAURANT MANAGEMENT SYSTEM</span>
            </div>
          </div>

          {/* Headline */}
          <div className="hero-headline-block">
            <h1 className="hero-title">
              Smarter Dining. <br />
              <span className="hero-title-accent">Simpler Management.</span>
            </h1>
            <p className="hero-description">
              YourBite helps you manage tables, take orders, track payments and grow your food business — all in one place.
            </p>
          </div>

          {/* Feature List */}
          <div className="hero-features-list">
            <div className="hero-feature-item">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="5" height="5" x="3" y="3" rx="1" />
                  <rect width="5" height="5" x="16" y="3" rx="1" />
                  <rect width="5" height="5" x="3" y="16" rx="1" />
                  <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
                  <path d="M21 21v.01" />
                  <path d="M12 7v3a2 2 0 0 1-2 2H7" />
                  <path d="M3 12h.01" />
                  <path d="M12 3h.01" />
                  <path d="M12 16v.01" />
                  <path d="M16 12h1" />
                  <path d="M21 12v.01" />
                  <path d="M12 21v-1" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Table QR Ordering</h3>
                <p>Let customers browse menus & place orders</p>
              </div>
            </div>

            <div className="hero-feature-item">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21v-8a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v8" />
                  <path d="M4 11V7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4" />
                  <path d="M12 3v2" />
                  <path d="M8 21v-4" />
                  <path d="M16 21v-4" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Table Management</h3>
                <p>Assign tables and track real-time orders</p>
              </div>
            </div>

            <div className="hero-feature-item">
              <div className="feature-icon-box">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" x2="18" y1="20" y2="10" />
                  <line x1="12" x2="12" y1="20" y2="4" />
                  <line x1="6" x2="6" y1="20" y2="14" />
                </svg>
              </div>
              <div className="feature-text">
                <h3>Business Insights</h3>
                <p>Understand what's selling and grow faster</p>
              </div>
            </div>
          </div>

          {/* Footer Line */}
          <div className="hero-footer">
            <span className="hero-dash">—</span>
            <span>Built for Restaurants. Made for You.</span>
          </div>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="login-form-panel">
        <div className="login-card-v2">
          {/* Top Logo */}
          <div className="card-brand-header">
            <div className="card-logo-badge">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v8" />
                <path d="M4.93 10.93a10 10 0 1 0 14.14 0" />
                <path d="M12 10 8 4" />
                <path d="M12 10l4-6" />
              </svg>
            </div>
            <h2 className="card-brand-title">YourBite</h2>
            <span className="card-brand-sub">Restaurant Management Console</span>
          </div>

          {/* Welcome Text */}
          <div className="card-welcome-header">
            <h3>Welcome Back</h3>
            <p>Sign in to access your restaurant dashboard.</p>
          </div>

          {/* Form */}
          <form className="login-form-v2" onSubmit={handleLogin}>
            {error && (
              <div className="login-alert-v2">
                <Icon name="alert" size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="field-group-v2">
              <label htmlFor="login-email">Email Address</label>
              <div className="input-wrap-v2">
                <span className="field-icon-v2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="16" x="2" y="4" rx="2" />
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                  </svg>
                </span>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoFocus
                  placeholder="name@restaurant.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                />
              </div>
            </div>

            <div className="field-group-v2">
              <label htmlFor="login-password">Password</label>
              <div className="input-wrap-v2">
                <span className="field-icon-v2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
                <button
                  type="button"
                  className="eye-toggle-btn"
                  onClick={() => setShowPassword((v) => !v)}
                  title={showPassword ? "Hide password" : "Show password"}
                  tabIndex="-1"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                      <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                      <line x1="2" x2="22" y1="2" y2="22" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="submit-btn-v2"
              disabled={loading}
            >
              {loading ? (
                <span>Signing in...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </>
              )}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
}
