export function formatMetricNumber(value) {
  return new Intl.NumberFormat('pt-BR').format(Number(value ?? 0));
}

export function formatMetricPercent(value) {
  return `${new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 }).format(Number(value ?? 0))}%`;
}

export function formatMetricDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

export function formatMetricDayLabel(value) {
  if (!value) return '—';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' }).format(date);
}

export function buildMetricsQuery({ period, from, to }) {
  const params = new URLSearchParams();
  if (period && period !== 'custom') params.set('period', period);
  if (period === 'custom' && from) params.set('from', from);
  if (period === 'custom' && to) params.set('to', to);
  const query = params.toString();
  return query ? `?${query}` : '';
}

export function exportResponsesDocx(pageName, responses) {
  const rows = responses
    .map((response) => {
      const entries = Object.entries(response.data ?? {});
      const fields = entries
        .map(
          ([label, value]) =>
            `<tr><td style="padding:8px;border:1px solid #ddd;font-weight:600;">${escapeHtml(label)}</td><td style="padding:8px;border:1px solid #ddd;">${escapeHtml(String(value ?? ''))}</td></tr>`,
        )
        .join('');
      return `
        <h3 style="margin:24px 0 8px;">${escapeHtml(formatMetricDate(response.createdAt))}</h3>
        <table style="width:100%;border-collapse:collapse;">${fields}</table>
      `;
    })
    .join('');

  const html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
      <head><meta charset="utf-8"><title>${escapeHtml(pageName)}</title></head>
      <body>
        <h1>${escapeHtml(pageName)}</h1>
        <p>Respostas exportadas em ${escapeHtml(formatMetricDate(new Date().toISOString()))}</p>
        ${rows || '<p>Nenhuma resposta no período.</p>'}
      </body>
    </html>
  `;

  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${slugifyFileName(pageName)}-respostas.doc`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function slugifyFileName(value) {
  return String(value)
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'formulario';
}
