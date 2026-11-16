import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { COLORS, ROUTES } from '../constants';
import Button from '../components/Button';
import { loginUser } from '../services/authService';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await loginUser({ email, password });
    if (result.success) {
      const token = result.data?.token || result.data?.data?.token || result.data?.access_token;

      if (token) {
        localStorage.setItem('token', token);
      } else {
        localStorage.setItem('token', 'true');
      }

      navigate(ROUTES.PAYMENT_REQUESTS);
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div
      style={{
        display: 'flex',
        minHeight: '100vh',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.background,
      }}
    >
      <div
        style={{
          backgroundColor: COLORS.white,
          padding: '40px',
          borderRadius: '8px',
          boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          width: '100%',
          maxWidth: '400px',
        }}
      >
        <h2 style={{ textAlign: 'center', color: COLORS.primary, marginBottom: '30px' }}>
          AiGaido Admin
        </h2>

        <form
          onSubmit={handleLogin}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: COLORS.textDark,
                fontWeight: '500',
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${COLORS.textLight}`,
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div>
            <label
              style={{
                display: 'block',
                marginBottom: '8px',
                color: COLORS.textDark,
                fontWeight: '500',
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: `1px solid ${COLORS.textLight}`,
                boxSizing: 'border-box',
              }}
            />
          </div>

          {error && <p style={{ color: 'red', fontSize: '0.875rem' }}>{error}</p>}

          <Button disabled={loading}>{loading ? 'Logging in...' : 'Login'}</Button>
        </form>
      </div>
    </div>
  );
};

export default Login;
