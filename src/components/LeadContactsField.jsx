import { Mail, Phone, Plus, Star, X } from 'lucide-react';

function normalizePhoneInput(value) {
  return String(value ?? '').replace(/\D/g, '').slice(0, 11);
}

function formatPhoneDisplay(digits) {
  const value = normalizePhoneInput(digits);
  if (value.length <= 2) return value;
  if (value.length <= 7) return `(${value.slice(0, 2)}) ${value.slice(2)}`;
  return `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7)}`;
}

function phoneDigits(phone) {
  return normalizePhoneInput(phone);
}

function whatsAppUrl(phone) {
  const digits = phoneDigits(phone);
  if (!digits) return null;
  return `https://wa.me/55${digits}`;
}

function createEmptyContact(isPrimary = false) {
  return {
    clientKey: `contact-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    role: '',
    phone: '',
    email: '',
    isPrimary,
  };
}

export function resolveLeadContactsForForm(lead) {
  if (lead?.contacts?.length) {
    return lead.contacts.map((contact) => ({
      id: contact.id,
      clientKey: contact.id,
      name: contact.name ?? '',
      role: contact.role ?? '',
      phone: contact.phone ? normalizePhoneInput(contact.phone) : '',
      email: contact.email ?? '',
      isPrimary: Boolean(contact.isPrimary),
    }));
  }

  if (lead?.contactName || lead?.phone || lead?.email) {
    return [
      {
        clientKey: 'legacy',
        name: lead.contactName ?? '',
        role: '',
        phone: lead.phone ? normalizePhoneInput(lead.phone) : '',
        email: lead.email ?? '',
        isPrimary: true,
      },
    ];
  }

  return [];
}

export function getLeadContacts(lead) {
  if (lead?.contacts?.length) return lead.contacts;
  return resolveLeadContactsForForm(lead).map((contact) => ({
    id: contact.id,
    name: contact.name,
    role: contact.role || null,
    phone: contact.phone || null,
    email: contact.email || null,
    isPrimary: contact.isPrimary,
  }));
}

export function getPrimaryContact(lead) {
  const contacts = getLeadContacts(lead);
  return contacts.find((contact) => contact.isPrimary) ?? contacts[0] ?? null;
}

export function formatContactLabel(contact) {
  if (!contact?.name?.trim()) return null;
  const parts = [contact.name.trim()];
  if (contact.role?.trim()) parts.push(contact.role.trim());
  return parts.join(' · ');
}

export function formatContactsSummary(lead) {
  const contacts = getLeadContacts(lead).filter((contact) => contact.name?.trim());
  if (!contacts.length) return null;

  const primary = contacts.find((contact) => contact.isPrimary) ?? contacts[0];
  const label = formatContactLabel(primary);
  if (!label) return null;
  if (contacts.length <= 1) return label;
  return `${label} (+${contacts.length - 1})`;
}

export function buildContactsPayload(contacts) {
  return (contacts ?? [])
    .map((contact) => ({
      ...(contact.id && contact.id !== 'legacy' ? { id: contact.id } : {}),
      name: contact.name.trim(),
      role: contact.role.trim() || null,
      phone: normalizePhoneInput(contact.phone) || null,
      email: contact.email.trim() || null,
      isPrimary: Boolean(contact.isPrimary),
    }))
    .filter((contact) => contact.name || contact.phone || contact.email);
}

export function LeadContactsField({
  contacts = [],
  disabled = false,
  onChange,
}) {
  const updateContact = (index, patch) => {
    onChange?.(
      contacts.map((contact, contactIndex) =>
        contactIndex === index ? { ...contact, ...patch } : contact,
      ),
    );
  };

  const addContact = () => {
    onChange?.([...contacts, createEmptyContact(contacts.length === 0)]);
  };

  const removeContact = (index) => {
    const next = contacts.filter((_, contactIndex) => contactIndex !== index);
    if (!next.length) {
      onChange?.([]);
      return;
    }
    if (!next.some((contact) => contact.isPrimary)) {
      next[0] = { ...next[0], isPrimary: true };
    }
    onChange?.(next);
  };

  const setPrimary = (index) => {
    onChange?.(
      contacts.map((contact, contactIndex) => ({
        ...contact,
        isPrimary: contactIndex === index,
      })),
    );
  };

  return (
    <div className="commercial-lead-contacts">
      {contacts.length ? (
        <div className="commercial-lead-contacts-list">
          {contacts.map((contact, index) => (
            <article
              key={contact.clientKey || contact.id || index}
              className={`commercial-lead-contact-card${contact.isPrimary ? ' commercial-lead-contact-card--primary' : ''}`}
            >
              <div className="commercial-lead-contact-card-head">
                <div className="commercial-lead-contact-card-title">
                  <strong>{contact.name.trim() || `Contato ${index + 1}`}</strong>
                  {contact.isPrimary ? (
                    <span className="commercial-lead-contact-badge">Principal</span>
                  ) : null}
                </div>
                <div className="commercial-lead-contact-card-actions">
                  {!contact.isPrimary && !disabled ? (
                    <button
                      type="button"
                      className="commercial-lead-contact-action"
                      onClick={() => setPrimary(index)}
                      title="Definir como contato principal"
                    >
                      <Star size={14} aria-hidden="true" />
                      Principal
                    </button>
                  ) : null}
                  {!disabled ? (
                    <button
                      type="button"
                      className="commercial-lead-contact-action commercial-lead-contact-action--danger"
                      onClick={() => removeContact(index)}
                      aria-label={`Remover ${contact.name.trim() || `contato ${index + 1}`}`}
                    >
                      <X size={14} aria-hidden="true" />
                    </button>
                  ) : null}
                </div>
              </div>

              <div className="commercial-lead-modal-fields commercial-lead-modal-fields--grid">
                <label className="field-block">
                  <span className="field-label">Nome</span>
                  <input
                    type="text"
                    className="input"
                    value={contact.name}
                    onChange={(ev) => updateContact(index, { name: ev.target.value })}
                    disabled={disabled}
                    placeholder="Ex.: Maria Silva"
                    required={Boolean(contact.phone || contact.email || contact.role)}
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">Função / identificação</span>
                  <input
                    type="text"
                    className="input"
                    value={contact.role}
                    onChange={(ev) => updateContact(index, { role: ev.target.value })}
                    disabled={disabled}
                    placeholder="Ex.: Gerente comercial"
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">Telefone</span>
                  <input
                    type="text"
                    className="input"
                    inputMode="tel"
                    value={formatPhoneDisplay(contact.phone)}
                    onChange={(ev) =>
                      updateContact(index, { phone: normalizePhoneInput(ev.target.value) })
                    }
                    disabled={disabled}
                    placeholder="(11) 99999-9999"
                  />
                </label>
                <label className="field-block">
                  <span className="field-label">E-mail</span>
                  <input
                    type="email"
                    className="input"
                    value={contact.email}
                    onChange={(ev) => updateContact(index, { email: ev.target.value })}
                    disabled={disabled}
                    placeholder="contato@empresa.com"
                  />
                </label>
              </div>

              {phoneDigits(contact.phone) || contact.email.trim() ? (
                <div className="commercial-lead-modal-contact-actions">
                  {phoneDigits(contact.phone) ? (
                    <>
                      <a
                        className="commercial-action-btn"
                        href={`tel:+55${phoneDigits(contact.phone)}`}
                      >
                        <Phone size={16} aria-hidden="true" />
                        Ligar
                      </a>
                      {whatsAppUrl(contact.phone) ? (
                        <a
                          className="commercial-action-btn commercial-action-btn--whatsapp"
                          href={whatsAppUrl(contact.phone)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          WhatsApp
                        </a>
                      ) : null}
                    </>
                  ) : null}
                  {contact.email.trim() ? (
                    <a className="commercial-action-btn" href={`mailto:${contact.email.trim()}`}>
                      <Mail size={16} aria-hidden="true" />
                      E-mail
                    </a>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      ) : (
        <p className="field-hint">Nenhum contato cadastrado para este lead.</p>
      )}

      {!disabled ? (
        <button type="button" className="commercial-lead-contacts-add" onClick={addContact}>
          <Plus size={16} aria-hidden="true" />
          Adicionar contato
        </button>
      ) : null}
    </div>
  );
}
