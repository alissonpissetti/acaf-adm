import { Plus, Star, X } from 'lucide-react';

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

function phoneFromLead(lead) {
  if (!lead) return '';
  const fromField = lead.phone ? normalizePhoneInput(lead.phone) : '';
  if (fromField.length >= 10) return fromField;

  const key = String(lead.whatsappContactKey ?? '').trim();
  if (key && !key.startsWith('lid:') && !key.startsWith('group:')) {
    const fromKey = normalizePhoneInput(key);
    if (fromKey.length >= 10) return fromKey;
  }

  return '';
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

function withLeadPhoneOnPrimary(rows, leadPhone) {
  if (!rows.length || !leadPhone) return rows;
  const primaryIndex = rows.findIndex((contact) => contact.isPrimary);
  const index = primaryIndex >= 0 ? primaryIndex : 0;
  if (phoneDigits(rows[index].phone)) return rows;
  return rows.map((contact, contactIndex) =>
    contactIndex === index ? { ...contact, phone: leadPhone } : contact,
  );
}

export function resolveLeadContactsForForm(lead) {
  const leadPhone = phoneFromLead(lead);

  if (lead?.contacts?.length) {
    return withLeadPhoneOnPrimary(
      lead.contacts.map((contact) => ({
        id: contact.id,
        clientKey: contact.id,
        name: contact.name ?? '',
        role: contact.role ?? '',
        phone: contact.phone ? normalizePhoneInput(contact.phone) : '',
        email: contact.email ?? '',
        isPrimary: Boolean(contact.isPrimary),
      })),
      leadPhone,
    );
  }

  if (lead?.contactName || leadPhone || lead?.email) {
    return [
      {
        clientKey: 'legacy',
        name: lead.contactName ?? '',
        role: '',
        phone: leadPhone,
        email: lead.email ?? '',
        isPrimary: true,
      },
    ];
  }

  return [];
}

export function getLeadContacts(lead) {
  if (lead?.contacts?.length) {
    const leadPhone = phoneFromLead(lead);
    return withLeadPhoneOnPrimary(
      lead.contacts.map((contact) => ({
        id: contact.id,
        name: contact.name,
        role: contact.role || null,
        phone: contact.phone ? normalizePhoneInput(contact.phone) : null,
        email: contact.email || null,
        isPrimary: contact.isPrimary,
      })),
      leadPhone,
    ).map((contact) => ({
      ...contact,
      phone: contact.phone || null,
    }));
  }
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
        <div className="commercial-lead-contacts-rows" role="group" aria-label="Contatos do lead">
          <div className="commercial-lead-contact-row commercial-lead-contact-row--head" aria-hidden="true">
            <span className="commercial-lead-contact-row__mark" />
            <span>Nome</span>
            <span>Função</span>
            <span>Telefone</span>
            <span>E-mail</span>
            <span className="commercial-lead-contact-row__actions" />
          </div>
          {contacts.map((contact, index) => (
            <div
              key={contact.clientKey || contact.id || index}
              className={`commercial-lead-contact-row${contact.isPrimary ? ' commercial-lead-contact-row--primary' : ''}`}
            >
              <div className="commercial-lead-contact-row__mark">
                <button
                  type="button"
                  className={`commercial-lead-contact-primary${contact.isPrimary ? ' is-active' : ''}`}
                  onClick={() => setPrimary(index)}
                  disabled={disabled || contact.isPrimary}
                  title={contact.isPrimary ? 'Contato principal' : 'Definir como principal'}
                  aria-pressed={contact.isPrimary}
                >
                  <Star size={14} aria-hidden="true" />
                  <span className="sr-only">
                    {contact.isPrimary ? 'Principal' : 'Tornar principal'}
                  </span>
                </button>
              </div>
              <input
                type="text"
                className="input"
                value={contact.name}
                onChange={(ev) => updateContact(index, { name: ev.target.value })}
                disabled={disabled}
                placeholder="Nome"
                aria-label={`Nome do contato ${index + 1}`}
                required={Boolean(contact.phone || contact.email || contact.role)}
              />
              <input
                type="text"
                className="input"
                value={contact.role}
                onChange={(ev) => updateContact(index, { role: ev.target.value })}
                disabled={disabled}
                placeholder="Função"
                aria-label={`Função do contato ${index + 1}`}
              />
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
                aria-label={`Telefone do contato ${index + 1}`}
              />
              <input
                type="email"
                className="input"
                value={contact.email}
                onChange={(ev) => updateContact(index, { email: ev.target.value })}
                disabled={disabled}
                placeholder="E-mail"
                aria-label={`E-mail do contato ${index + 1}`}
              />
              <div className="commercial-lead-contact-row__actions">
                {!disabled ? (
                  <button
                    type="button"
                    className="commercial-lead-contact-action commercial-lead-contact-action--danger"
                    onClick={() => removeContact(index)}
                    aria-label={`Remover contato ${index + 1}`}
                  >
                    <X size={14} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>
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
