const SOCIAL_FIELDS = [
  { key: 'website', label: 'Site', placeholder: 'https://academia.com.br', span: 2 },
  { key: 'instagram', label: 'Instagram', placeholder: '@academia ou URL' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/academia' },
  { key: 'whatsapp', label: 'Celular (mensagens)', placeholder: '(41) 99999-9999' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@academia' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@academia' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/academia' },
];

export function NetworkSocialFields({ value, onChange, disabled = false }) {
  const setField = (key, next) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <section className="form-section field-span-full">
      <h3 className="form-section-title">Redes sociais e contatos</h3>
      <div className="form-grid-inner">
        {SOCIAL_FIELDS.map((field) => (
          <label
            key={field.key}
            className={field.span === 2 ? 'field-span-2' : undefined}
          >
            <span>{field.label}</span>
            <input
              className="input"
              value={value[field.key] ?? ''}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
