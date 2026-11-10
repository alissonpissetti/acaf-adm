import { useCallback, useState } from 'react';
import { Copy, Check, Shield } from 'lucide-react';
import { resolveWhatsAppContact, phoneDigitsForCopy } from '../utils/whatsappContactDisplay.js';

export function WhatsAppContactIdentity({
  thread,
  variant = 'thread',
  showInstance = true,
  showBadge = true,
  className = '',
}) {
  const contact = resolveWhatsAppContact(thread);
  const [copied, setCopied] = useState(false);

  const copyPhone = useCallback(() => {
    const digits = phoneDigitsForCopy(contact.phoneLine);
    if (!digits || !navigator.clipboard?.writeText) return;
    void navigator.clipboard.writeText(digits).then(() => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    });
  }, [contact.phoneLine]);

  const isHeader = variant === 'header';
  const TitleTag = isHeader ? 'h2' : 'span';
  const titleClass = isHeader ? 'whatsapp-contact-identity__title--lg' : 'whatsapp-contact-identity__title';

  const instanceName = thread?.instanceName?.trim();
  const metaLine =
    showInstance && contact.subtitle
      ? contact.subtitle
      : !showInstance && contact.phoneLine && contact.nameLine
        ? contact.phoneLine
        : null;

  return (
    <div
      className={`whatsapp-contact-identity whatsapp-contact-identity--${variant}${className ? ` ${className}` : ''}`}
    >
      <div className="whatsapp-contact-identity__head">
        <TitleTag className={titleClass}>{contact.title}</TitleTag>
        {showBadge && contact.badge ? (
          <span className="whatsapp-contact-identity__badge" title={contact.badge}>
            <Shield size={12} aria-hidden="true" />
            {contact.badge}
          </span>
        ) : null}
      </div>

      {isHeader && contact.nameLine && contact.phoneLine ? (
        <p className="whatsapp-contact-identity__phone-row">
          <span className="whatsapp-contact-identity__phone">{contact.phoneLine}</span>
          <button
            type="button"
            className="whatsapp-contact-identity__copy"
            aria-label="Copiar telefone"
            title="Copiar número"
            onClick={copyPhone}
          >
            {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          </button>
        </p>
      ) : null}

      {isHeader && metaLine ? (
        <p className="whatsapp-contact-identity__meta muted">{metaLine}</p>
      ) : null}

      {isHeader && contact.isPrivate ? (
        <p className="whatsapp-contact-identity__hint muted">
          O WhatsApp não expôs o número deste contato. Use o nome na conversa ou sincronize de novo após trocar
          mensagens.
        </p>
      ) : null}
    </div>
  );
}

export function whatsAppContactAvatarLabel(thread) {
  return resolveWhatsAppContact(thread).avatarName;
}
