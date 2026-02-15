// src/components/Login.js
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { login, signup } = useAuth();
  const [isSignup, setIsSignup] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignup) {
        await signup(email, password, displayName || email);
      } else {
        await login(email, password);
      }
    } catch (err) {
      setError(
        err.code === 'auth/user-not-found' ? 'No account found with this email.' :
        err.code === 'auth/wrong-password' ? 'Incorrect password.' :
        err.code === 'auth/email-already-in-use' ? 'An account already exists with this email.' :
        err.code === 'auth/weak-password' ? 'Password must be at least 6 characters.' :
        err.message
      );
    }
    setLoading(false);
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.logoArea}>
          <span style={{ fontSize: 40 }}>🎆</span>
          <h1 style={styles.title}>PyroPlanner</h1>
          <p style={styles.subtitle}>Firework Show Planning</p>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          {isSignup && (
            <label style={styles.label}>
              Display Name
              <input style={styles.input} type="text" value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name" />
            </label>
          )}
          <label style={styles.label}>
            Email
            <input style={styles.input} type="email" value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com" required />
          </label>
          <label style={styles.label}>
            Password
            <input style={styles.input} type="password" value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••" required minLength={6} />
          </label>
          <button style={styles.btn} type="submit" disabled={loading}>
            {loading ? 'Please wait...' : (isSignup ? 'Create Account' : 'Sign In')}
          </button>
        </form>

        <p style={styles.toggle}>
          {isSignup ? 'Already have an account?' : "Don't have an account?"}{' '}
          <button style={styles.toggleBtn} onClick={() => { setIsSignup(!isSignup); setError(''); }}>
            {isSignup ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #0a0e1a 0%, #0f1729 50%, #131b30 100%)',
    fontFamily: "'JetBrains Mono', monospace",
    padding: 20,
  },
  card: {
    background: '#131b30',
    border: '1px solid #1e2a45',
    borderRadius: 16,
    padding: 40,
    width: '100%',
    maxWidth: 400,
  },
  logoArea: {
    textAlign: 'center',
    marginBottom: 32,
  },
  title: {
    margin: '8px 0 4px',
    fontSize: 28,
    fontWeight: 700,
    background: 'linear-gradient(90deg, #ff6b35, #e63946, #a855f7)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
  },
  subtitle: {
    margin: 0,
    color: '#6b7fa3',
    fontSize: 13,
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 16,
  },
  label: {
    display: 'flex',
    flexDirection: 'column',
    gap: 4,
    color: '#6b7fa3',
    fontSize: 12,
    fontWeight: 500,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    padding: '10px 12px',
    background: '#0d1220',
    border: '1px solid #2a3555',
    borderRadius: 8,
    color: '#e4e9f2',
    fontSize: 14,
    fontFamily: 'inherit',
    outline: 'none',
  },
  btn: {
    padding: '12px 16px',
    background: 'linear-gradient(135deg, #e63946, #ff6b35)',
    border: 'none',
    borderRadius: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  },
  error: {
    background: '#e6394620',
    border: '1px solid #e6394644',
    borderRadius: 8,
    padding: '10px 14px',
    color: '#e63946',
    fontSize: 13,
    marginBottom: 16,
  },
  toggle: {
    textAlign: 'center',
    color: '#6b7fa3',
    fontSize: 13,
    marginTop: 20,
  },
  toggleBtn: {
    background: 'none',
    border: 'none',
    color: '#ff6b35',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 13,
    fontWeight: 600,
    textDecoration: 'underline',
  },
};
