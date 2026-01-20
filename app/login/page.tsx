'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

// Verification code expires after 60 seconds
const VERIFICATION_EXPIRY_SECONDS = 60;

export default function LoginPage() {
  const [yoonetId, setYoonetId] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Verification code state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');
  const [pendingLoginData, setPendingLoginData] = useState<{ token: string; user: any } | null>(null);
  const [userEmail, setUserEmail] = useState('');
  const [verificationCountdown, setVerificationCountdown] = useState(VERIFICATION_EXPIRY_SECONDS);
  const [isCodeExpired, setIsCodeExpired] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [codeTimestamp, setCodeTimestamp] = useState(0); // Track when code was sent to restart countdown

  // PIN verification state
  const [showPinVerification, setShowPinVerification] = useState(false);
  const [enteredPin, setEnteredPin] = useState('');

  // Countdown timer effect for verification code
  useEffect(() => {
    if (!showVerification) return;

    // Reset expired state when countdown restarts
    setIsCodeExpired(false);

    const interval = setInterval(() => {
      setVerificationCountdown(prev => {
        if (prev <= 1) {
          setIsCodeExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [showVerification, codeTimestamp]); // Also restart when codeTimestamp changes (resend)

  // Resend cooldown timer effect
  useEffect(() => {
    if (resendCooldown <= 0) return;

    const interval = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [resendCooldown]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ yoonetId, password }),
      });

      const data = await response.json();

      if (data.success) {
        // Check if user is privileged (super-admin/admin/manager) with PIN
        if (data.isPrivilegedUser && data.hasPin) {
          // Show PIN verification
          setPendingLoginData({ token: data.token, user: data.user });
          setShowPinVerification(true);
        } else if (data.isPrivilegedUser && !data.hasPin) {
          // Privileged user without PIN - complete login directly
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          router.push('/dashboard');
        } else if (data.user.email) {
          // Regular member with email - require verification code
          const codeResponse = await fetch('/api/auth/send-code', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              email: data.user.email,
              userId: data.user.id,
              userName: data.user.name,
              department: data.user.department,
            }),
          });

          const codeData = await codeResponse.json();

          if (codeData.success) {
            setVerificationCode(codeData.code);
            setPendingLoginData({ token: data.token, user: data.user });
            setUserEmail(data.user.email);
            setVerificationCountdown(VERIFICATION_EXPIRY_SECONDS);
            setIsCodeExpired(false);
            setResendCooldown(30); // 30 second cooldown before resend
            setCodeTimestamp(Date.now()); // Track when code was sent
            setShowVerification(true);
          } else {
            setError('Failed to send verification code');
          }
        } else {
          // Regular member without email - complete login directly
          localStorage.setItem('token', data.token);
          localStorage.setItem('user', JSON.stringify(data.user));
          router.push('/dashboard');
        }
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) {
      setError('An error occurred during login');
      console.error('Login error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = () => {
    // Check if code has expired
    if (isCodeExpired || verificationCountdown <= 0) {
      setError('Verification code has expired. Please request a new code.');
      return;
    }

    if (enteredCode === verificationCode) {
      if (pendingLoginData) {
        localStorage.setItem('token', pendingLoginData.token);
        localStorage.setItem('user', JSON.stringify(pendingLoginData.user));
        router.push('/dashboard');
      }
    } else {
      setError('Invalid verification code');
    }
  };

  const handleResendCode = async () => {
    if (!pendingLoginData) return;

    setLoading(true);
    setError('');
    try {
      const codeResponse = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: userEmail,
          userId: pendingLoginData.user.id,
          userName: pendingLoginData.user.name,
          department: pendingLoginData.user.department,
        }),
      });

      const codeData = await codeResponse.json();

      if (codeData.success) {
        setVerificationCode(codeData.code);
        setVerificationCountdown(VERIFICATION_EXPIRY_SECONDS);
        setIsCodeExpired(false);
        setResendCooldown(30); // 30 second cooldown before next resend
        setCodeTimestamp(Date.now()); // Restart countdown timer
        setEnteredCode('');
        setError('');
      } else {
        setError('Failed to resend code');
      }
    } catch (err) {
      setError('Failed to resend code');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToLogin = () => {
    setShowVerification(false);
    setShowPinVerification(false);
    setEnteredCode('');
    setEnteredPin('');
    setVerificationCode('');
    setPendingLoginData(null);
    setUserEmail('');
    setError('');
    setVerificationCountdown(VERIFICATION_EXPIRY_SECONDS);
    setIsCodeExpired(false);
    setResendCooldown(0);
    setCodeTimestamp(0);
  };

  const handleVerifyPin = async () => {
    if (!pendingLoginData) return;

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/verify-pin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: pendingLoginData.user.id,
          pin: enteredPin,
        }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('token', pendingLoginData.token);
        localStorage.setItem('user', JSON.stringify(pendingLoginData.user));
        router.push('/dashboard');
      } else {
        setError(data.message || 'Invalid PIN');
      }
    } catch (err) {
      setError('Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      {/* Animated background shapes */}
      <motion.div
        style={styles.bgShape1}
        animate={{
          y: [0, -20, 0],
          rotate: [0, 5, 0],
        }}
        transition={{
          duration: 6,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        style={styles.bgShape2}
        animate={{
          y: [0, 20, 0],
          rotate: [0, -5, 0],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />
      <motion.div
        style={styles.bgShape3}
        animate={{
          scale: [1, 1.1, 1],
          opacity: [0.1, 0.2, 0.1],
        }}
        transition={{
          duration: 5,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
      />

      <motion.div
        style={styles.loginBox}
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      >
        <motion.h1
          style={styles.title}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          YooSprint
        </motion.h1>
        <motion.h2
          style={styles.subtitle}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.5 }}
        >
          {showPinVerification ? 'Enter your PIN' : showVerification ? 'Enter verification code' : 'Welcome, log in to your account'}
        </motion.h2>

        <AnimatePresence mode="wait">
          {error && (
            <motion.div
              style={styles.error}
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 20 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3 }}
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>

        {showPinVerification ? (
          <div style={styles.form}>
            <motion.p
              style={styles.verificationInfo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Please enter your <strong>4-digit PIN</strong> to continue.
            </motion.p>

            <motion.div
              style={styles.formGroup}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <label htmlFor="pin" style={styles.label}>
                PIN
              </label>
              <motion.input
                type="password"
                id="pin"
                value={enteredPin}
                onChange={(e) => setEnteredPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                style={styles.input}
                placeholder="Enter 4-digit PIN"
                maxLength={4}
                whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)' }}
                transition={{ duration: 0.2 }}
              />
            </motion.div>

            <motion.button
              type="button"
              onClick={handleVerifyPin}
              disabled={loading || enteredPin.length < 4}
              style={{
                ...styles.button,
                opacity: loading || enteredPin.length < 4 ? 0.6 : 1,
                cursor: loading || enteredPin.length < 4 ? 'not-allowed' : 'pointer',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)' }}
              whileTap={loading ? {} : { scale: 0.98 }}
            >
              {loading ? 'Verifying...' : 'Verify & Login'}
            </motion.button>

            <div style={styles.verificationActions}>
              <button
                type="button"
                onClick={handleBackToLogin}
                style={styles.linkButton}
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : showVerification ? (
          <div style={styles.form}>
            <motion.p
              style={styles.verificationInfo}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              Please ask your <strong>manager or admin</strong> for your verification code.
            </motion.p>

            <motion.div
              style={styles.formGroup}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <label htmlFor="code" style={styles.label}>
                Verification Code
              </label>
              <motion.input
                type="text"
                id="code"
                value={enteredCode}
                onChange={(e) => setEnteredCode(e.target.value)}
                style={{
                  ...styles.input,
                  opacity: isCodeExpired ? 0.5 : 1,
                }}
                placeholder="Enter 6-digit code"
                maxLength={6}
                disabled={isCodeExpired}
                whileFocus={isCodeExpired ? {} : { scale: 1.01, boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)' }}
                transition={{ duration: 0.2 }}
              />
              <span style={{
                ...styles.countdownText,
                color: isCodeExpired ? '#dc2626' : verificationCountdown <= 15 ? '#d97706' : '#718096',
              }}>
                {isCodeExpired ? (
                  'Code expired! Please request a new one.'
                ) : (
                  <>Time remaining: <strong>{verificationCountdown}s</strong></>
                )}
              </span>
            </motion.div>

            <motion.button
              type="button"
              onClick={handleVerifyCode}
              disabled={loading || enteredCode.length < 6 || isCodeExpired}
              style={{
                ...styles.button,
                opacity: loading || enteredCode.length < 6 || isCodeExpired ? 0.6 : 1,
                cursor: loading || enteredCode.length < 6 || isCodeExpired ? 'not-allowed' : 'pointer',
                background: isCodeExpired ? '#9ca3af' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
              whileHover={loading || isCodeExpired ? {} : { scale: 1.02, boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)' }}
              whileTap={loading || isCodeExpired ? {} : { scale: 0.98 }}
            >
              {isCodeExpired ? 'Code Expired' : 'Verify & Login'}
            </motion.button>

            <div style={styles.verificationActions}>
              <button
                type="button"
                onClick={handleResendCode}
                disabled={loading || resendCooldown > 0}
                style={{
                  ...styles.linkButton,
                  fontWeight: isCodeExpired ? '600' : '500',
                  color: resendCooldown > 0 ? '#9ca3af' : isCodeExpired ? '#667eea' : undefined,
                  cursor: resendCooldown > 0 ? 'not-allowed' : 'pointer',
                  textDecoration: resendCooldown > 0 ? 'none' : 'underline',
                }}
              >
                {resendCooldown > 0
                  ? `Resend in ${resendCooldown}s`
                  : isCodeExpired
                    ? 'Request New Code'
                    : 'Resend Code'}
              </button>
              <button
                type="button"
                onClick={handleBackToLogin}
                style={styles.linkButton}
              >
                Back to Login
              </button>
            </div>
          </div>
        ) : (
        <form onSubmit={handleSubmit} style={styles.form}>
          <motion.div
            style={styles.formGroup}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <label htmlFor="yoonetId" style={styles.label}>
              Yoonet ID *
            </label>
            <motion.input
              type="text"
              id="yoonetId"
              value={yoonetId}
              onChange={(e) => setYoonetId(e.target.value.toUpperCase())}
              required
              style={styles.input}
              placeholder="Enter your Yoonet ID"
              whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)' }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>

          <motion.div
            style={styles.formGroup}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.45, duration: 0.4 }}
          >
            <label htmlFor="username" style={styles.label}>
              Username
            </label>
            <motion.input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={styles.input}
              placeholder="Enter your username"
              whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)' }}
              transition={{ duration: 0.2 }}
            />
          </motion.div>

          <motion.div
            style={styles.formGroup}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <label htmlFor="password" style={styles.label}>
              Password *
            </label>
            <div style={styles.passwordWrapper}>
              <motion.input
                type={showPassword ? 'text' : 'password'}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                style={styles.passwordInput}
                placeholder="Enter your password"
                whileFocus={{ scale: 1.01, boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.3)' }}
                transition={{ duration: 0.2 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.eyeButton}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </motion.div>

          <motion.button
            type="submit"
            disabled={loading}
            style={{
              ...styles.button,
              opacity: loading ? 0.6 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
            whileHover={loading ? {} : { scale: 1.02, boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)' }}
            whileTap={loading ? {} : { scale: 0.98 }}
          >
            {loading ? (
              <motion.span
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
              >
                <motion.span
                  style={styles.spinner}
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                />
                Logging in...
              </motion.span>
            ) : (
              'Login'
            )}
          </motion.button>
        </form>
        )}

        <motion.p
          style={styles.footer}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.5 }}
        >
          Yoonet
        </motion.p>
      </motion.div>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden',
  },
  bgShape1: {
    position: 'absolute',
    width: '400px',
    height: '400px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.1)',
    top: '-100px',
    right: '-100px',
  },
  bgShape2: {
    position: 'absolute',
    width: '300px',
    height: '300px',
    borderRadius: '50%',
    background: 'rgba(255, 255, 255, 0.08)',
    bottom: '-50px',
    left: '-50px',
  },
  bgShape3: {
    position: 'absolute',
    width: '200px',
    height: '200px',
    borderRadius: '30%',
    background: 'rgba(255, 255, 255, 0.05)',
    top: '50%',
    left: '10%',
  },
  loginBox: {
    background: 'white',
    borderRadius: '16px',
    padding: '40px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
    width: '100%',
    maxWidth: '400px',
    position: 'relative',
    zIndex: 1,
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    color: '#333',
    marginBottom: '10px',
    textAlign: 'center',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    backgroundClip: 'text',
  },
  subtitle: {
    fontSize: '18px',
    color: '#666',
    marginBottom: '30px',
    marginTop: '0',
    textAlign: 'center',
  },
  error: {
    background: '#fee',
    color: '#c33',
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #fcc',
    overflow: 'hidden',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#333',
    marginBottom: '8px',
  },
  input: {
    padding: '14px 16px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    background: '#f8fafc',
  },
  passwordWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  passwordInput: {
    padding: '14px 16px',
    paddingRight: '48px',
    fontSize: '16px',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    outline: 'none',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
    background: '#f8fafc',
    width: '100%',
  },
  eyeButton: {
    position: 'absolute',
    right: '12px',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    padding: '16px',
    fontSize: '16px',
    fontWeight: '600',
    color: 'white',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    border: 'none',
    borderRadius: '10px',
    marginTop: '10px',
    transition: 'all 0.3s',
    fontFamily: 'inherit',
  },
  spinner: {
    width: '18px',
    height: '18px',
    border: '2px solid rgba(255,255,255,0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    display: 'inline-block',
  },
  footer: {
    marginTop: '30px',
    textAlign: 'center',
    fontSize: '12px',
    color: '#999',
  },
  verificationInfo: {
    fontSize: '14px',
    color: '#666',
    textAlign: 'center',
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  verificationActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '16px',
  },
  linkButton: {
    background: 'none',
    border: 'none',
    color: '#667eea',
    fontSize: '14px',
    cursor: 'pointer',
    textDecoration: 'underline',
    padding: '4px',
  },
  countdownText: {
    fontSize: '12px',
    fontWeight: '500',
    marginTop: '8px',
    display: 'block',
  },
};
