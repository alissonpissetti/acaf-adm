import { BrandLogo, BrandMark } from '../components/BrandLogo.jsx';
import { PasswordInput } from '../components/PasswordInput.jsx';
import { MOVLY_WORDMARK } from '../brand/displayName.js';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext.jsx';
import './LoginPage.css';

const MODES = {
  CREDENTIALS: 'credentials',
  TOKEN: 'token',
  FORGOT: 'forgot',
};

function normalizePhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDisplay(digits) {
  const value = normalizePhoneInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

export function LoginPage() {
  const { isAuthenticated, login, loginWithOtp, requestOtp, resetPasswordWithOtp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mode, setMode] = useState(MODES.CREDENTIALS);
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mobilePhone, setMobilePhone] = useState('');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [info, setInfo] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const from = location.state?.from ?? '/m/operacao/dashboard';

  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const resetMessages = () => {
    setError('');
    setInfo('');
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setStep(1);
    setCode('');
    setNewPassword('');
    setConfirmPassword('');
    resetMessages();
  };

  const onSubmitCredentials = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    resetMessages();
    try {
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onRequestOtp = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    resetMessages();
    try {
      const purpose = mode === MODES.FORGOT ? 'password_reset' : 'login';
      const result = await requestOtp(mobilePhone, purpose);
      setInfo(result.message ?? 'Código enviado para o celular.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmitTokenLogin = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    resetMessages();
    try {
      await loginWithOtp(mobilePhone, code);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onSubmitResetPassword = async (ev) => {
    ev.preventDefault();
    resetMessages();

    if (newPassword.length < 6) {
      setError('Informe uma senha com ao menos 6 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('As senhas não conferem.');
      return;
    }

    setBusy(true);
    try {
      const result = await resetPasswordWithOtp(mobilePhone, code, newPassword);
      setInfo(result.message ?? 'Senha alterada com sucesso.');
      switchMode(MODES.CREDENTIALS);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    [MODES.CREDENTIALS]: {
      title: 'Entrar',
      subtitle: 'Use suas credenciais para acessar a área logada.',
    },
    [MODES.TOKEN]: {
      title: step === 1 ? 'Entrar com código' : 'Validar código',
      subtitle:
        step === 1
          ? 'Informe seu celular cadastrado para receber um código de acesso.'
          : 'Digite o código de 6 dígitos enviado para o seu celular.',
    },
    [MODES.FORGOT]: {
      title: step === 1 ? 'Recuperar senha' : 'Nova senha',
      subtitle:
        step === 1
          ? 'Informe seu celular cadastrado para receber um código de acesso.'
          : 'Informe o código recebido e escolha uma nova senha.',
    },
  };

  const copy = titles[mode];

  return (
    <div className="login-page movly-grain">
      <section className="login-hero" aria-hidden="true">
        <BrandLogo variant="gradient" height={120} className="login-hero-logo" />
        <p className="login-hero-tagline">
          nosso movimento
          <br />
          de bem-estar
        </p>
      </section>

      <div className="login-card">
        <div className="login-brand">
          <BrandMark size={44} bg="#8254e4" fg="#cbf74f" />
          <div>
            <strong>{MOVLY_WORDMARK} Admin</strong>
            <span>Console administrativo</span>
          </div>
        </div>

        <h1>{copy.title}</h1>
        <p className="login-subtitle">{copy.subtitle}</p>

        {mode === MODES.CREDENTIALS ? (
          <form className="login-form" onSubmit={onSubmitCredentials}>
            <label>
              <span>E-mail</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com.br"
                autoComplete="username"
                required
              />
            </label>

            <label>
              <span>Senha</span>
              <PasswordInput
                value={password}
                onChange={setPassword}
                autoComplete="current-password"
                required
              />
            </label>

            <div className="login-links">
              <button type="button" className="login-link" onClick={() => switchMode(MODES.FORGOT)}>
                Esqueci minha senha
              </button>
              <button type="button" className="login-link" onClick={() => switchMode(MODES.TOKEN)}>
                Entrar com código no celular
              </button>
            </div>

            {error ? <div className="form-error">{error}</div> : null}
            {info ? <div className="form-info">{info}</div> : null}

            <button type="submit" className="btn-primary login-submit" disabled={busy}>
              {busy ? 'Entrando…' : 'Entrar'}
            </button>
          </form>
        ) : null}

        {mode === MODES.TOKEN ? (
          step === 1 ? (
            <form className="login-form" onSubmit={onRequestOtp}>
              <label>
                <span>Celular</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneDisplay(mobilePhone)}
                  onChange={(e) => setMobilePhone(normalizePhoneInput(e.target.value))}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  required
                />
              </label>

              {error ? <div className="form-error">{error}</div> : null}
              {info ? <div className="form-info">{info}</div> : null}

              <button type="submit" className="btn-primary login-submit" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar código'}
              </button>

              <button
                type="button"
                className="login-back-link"
                onClick={() => switchMode(MODES.CREDENTIALS)}
              >
                Voltar ao login
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={onSubmitTokenLogin}>
              <label>
                <span>Código no celular</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </label>

              {error ? <div className="form-error">{error}</div> : null}
              {info ? <div className="form-info">{info}</div> : null}

              <button type="submit" className="btn-primary login-submit" disabled={busy}>
                {busy ? 'Validando…' : 'Entrar'}
              </button>

              <button
                type="button"
                className="login-back-link"
                onClick={() => {
                  setStep(1);
                  setCode('');
                  resetMessages();
                }}
              >
                Reenviar código
              </button>
            </form>
          )
        ) : null}

        {mode === MODES.FORGOT ? (
          step === 1 ? (
            <form className="login-form" onSubmit={onRequestOtp}>
              <label>
                <span>Celular</span>
                <input
                  type="tel"
                  inputMode="numeric"
                  value={formatPhoneDisplay(mobilePhone)}
                  onChange={(e) => setMobilePhone(normalizePhoneInput(e.target.value))}
                  placeholder="(11) 99999-9999"
                  autoComplete="tel"
                  required
                />
              </label>

              {error ? <div className="form-error">{error}</div> : null}
              {info ? <div className="form-info">{info}</div> : null}

              <button type="submit" className="btn-primary login-submit" disabled={busy}>
                {busy ? 'Enviando…' : 'Enviar código'}
              </button>

              <button
                type="button"
                className="login-back-link"
                onClick={() => switchMode(MODES.CREDENTIALS)}
              >
                Voltar ao login
              </button>
            </form>
          ) : (
            <form className="login-form" onSubmit={onSubmitResetPassword}>
              <label>
                <span>Código no celular</span>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="\d{6}"
                  maxLength={6}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  autoComplete="one-time-code"
                  required
                />
              </label>

              <label>
                <span>Nova senha</span>
                <PasswordInput
                  value={newPassword}
                  onChange={setNewPassword}
                  autoComplete="new-password"
                  required
                />
              </label>

              <label>
                <span>Confirmar senha</span>
                <PasswordInput
                  value={confirmPassword}
                  onChange={setConfirmPassword}
                  autoComplete="new-password"
                  required
                />
              </label>

              {error ? <div className="form-error">{error}</div> : null}
              {info ? <div className="form-info">{info}</div> : null}

              <button type="submit" className="btn-primary login-submit" disabled={busy}>
                {busy ? 'Salvando…' : 'Redefinir senha'}
              </button>

              <button
                type="button"
                className="login-back-link"
                onClick={() => {
                  setStep(1);
                  setCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                  resetMessages();
                }}
              >
                Reenviar código
              </button>
            </form>
          )
        ) : null}
      </div>
    </div>
  );
}
