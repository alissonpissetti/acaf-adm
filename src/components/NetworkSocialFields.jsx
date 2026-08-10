const SOCIAL_FIELDS = [
  { key: 'website', label: 'Site', placeholder: 'https://academia.com.br' },
  { key: 'instagram', label: 'Instagram', placeholder: '@academia ou URL' },
  { key: 'facebook', label: 'Facebook', placeholder: 'facebook.com/academia' },
  { key: 'whatsapp', label: 'WhatsApp', placeholder: '(41) 99999-9999' },
  { key: 'tiktok', label: 'TikTok', placeholder: '@academia' },
  { key: 'youtube', label: 'YouTube', placeholder: 'youtube.com/@academia' },
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'linkedin.com/company/academia' },
];

export function NetworkSocialFields({ value, onChange, disabled = false }) {
  const setField = (key, next) => {
    onChange({ ...value, [key]: next });
  };

  return (
    <div className="social-fields">
      <h3 className="address-fields-title">Redes sociais e contatos</h3>
      <div className="form-grid">
        {SOCIAL_FIELDS.map((field) => (
          <label key={field.key} className={field.key === 'website' ? 'field-span-2' : undefined}>
            <span>{field.label}</span>
            <input
              value={value[field.key] ?? ''}
              onChange={(e) => setField(field.key, e.target.value)}
              placeholder={field.placeholder}
              disabled={disabled}
            />
          </label>
        ))}
      </div>
    </div>
  );
}
