import { useEffect, useState } from 'react';
import { Mail, Link2 } from 'lucide-react';
import {
  createCompanyManagerOnboardingInvite,
  sendCompanyManagerOnboardingInviteEmail,
} from '../../api/admin.js';
import { SuccessFlashEffect } from '../flash/FlashMessageProvider.jsx';

function formatExpiry(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR');
  } catch {
    return iso;
  }
}

export function CompanyManagerOnboardingPanel({
  companyId,
  companyEmail,
  managerCount,
  inviteMeta,
  disabled = false,
  onChanged,
}) {
  const [inviteUrl, setInviteUrl] = useState(inviteMeta?.inviteUrl ?? '');
  const [expiresAt, setExpiresAt] = useState(inviteMeta?.expiresAt ?? '');
  const [busyLink, setBusyLink] = useState(false);
  const [busyEmail, setBusyEmail] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (inviteMeta?.inviteUrl && !inviteMeta.used && !inviteMeta.expired) {
      setInviteUrl(inviteMeta.inviteUrl);
      setExpiresAt(inviteMeta.expiresAt ?? '');
    }
  }, [inviteMeta]);

  if (managerCount > 0) {
    return (
      <div className="company-onboarding-panel muted">
        <p style={{ margin: 0 }}>
          Esta empresa já possui gestor vinculado. Use a aba <strong>Gestores</strong> para convidar
          outras pessoas.
        </p>
      </div>
    );
  }

  const copyLink = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setMessage('Link copiado.');
    } catch {
      setError('Não foi possível copiar. Selecione o campo manualmente.');
    }
  };

  const generateLink = async () => {
    setBusyLink(true);
    setError('');
    setMessage('');
    try {
      const res = await createCompanyManagerOnboardingInvite(companyId);
      setInviteUrl(res.inviteUrl ?? '');
      setExpiresAt(res.expiresAt ?? '');
      setMessage(
        res.reused
          ? 'Link de onboarding já existente — exibido abaixo.'
          : 'Link gerado (válido 14 dias). Envie ao gestor de RH.',
      );
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyLink(false);
    }
  };

  const sendEmail = async () => {
    setBusyEmail(true);
    setError('');
    setMessage('');
    try {
      const res = await sendCompanyManagerOnboardingInviteEmail(companyId, {
        to: companyEmail || undefined,
      });
      setInviteUrl(res.inviteUrl ?? inviteUrl);
      setExpiresAt(res.expiresAt ?? expiresAt);
      setMessage(`E-mail enviado para ${res.recipientEmail}.`);
      onChanged?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyEmail(false);
    }
  };

  const inviteUsed = inviteMeta?.used;
  const inviteExpired = inviteMeta?.expired;

  return (
    <section className="company-onboarding-panel">
      <header className="company-onboarding-panel-head">
        <h3>Primeiro acesso do gestor (RH)</h3>
        <p className="muted">
          Gere o link em <strong>empresa.sejamovly.com/onboarding/…</strong> para o responsável criar
          login e senha. O cadastro mínimo da empresa já está feito pela equipe Movly.
        </p>
      </header>

      <SuccessFlashEffect message={message} />
      {error ? <div className="alert-banner alert-banner-error">{error}</div> : null}

      {inviteUsed ? (
        <div className="alert-banner alert-banner-success">
          Convite já utilizado — gestor vinculado.
        </div>
      ) : inviteExpired && inviteUrl ? (
        <p className="alert-banner alert-banner-warning">O link anterior expirou. Gere um novo convite.</p>
      ) : null}

      <div className="company-onboarding-actions">
        <button type="button" className="btn-primary" disabled={disabled || busyLink} onClick={generateLink}>
          {busyLink ? 'Gerando…' : inviteUrl ? 'Atualizar link' : 'Gerar link de onboarding'}
        </button>
        <button
          type="button"
          className="btn-ghost"
          disabled={disabled || busyEmail || !companyEmail}
          title={companyEmail ? undefined : 'Informe o e-mail da empresa no cadastro'}
          onClick={sendEmail}
        >
          <Mail size={16} aria-hidden="true" />
          {busyEmail ? 'Enviando…' : 'Enviar por e-mail'}
        </button>
      </div>

      {inviteUrl ? (
        <label className="company-onboarding-link-field">
          <span className="sr-only">Link de onboarding</span>
          <div className="company-onboarding-link-row">
            <Link2 size={16} aria-hidden="true" />
            <input type="text" readOnly value={inviteUrl} className="company-onboarding-link-input" />
            <button type="button" className="btn-ghost btn-sm" onClick={copyLink}>
              Copiar
            </button>
          </div>
          {expiresAt ? (
            <small className="muted">Válido até {formatExpiry(expiresAt)}</small>
          ) : null}
        </label>
      ) : null}
    </section>
  );
}