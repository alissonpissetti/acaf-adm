import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { appConfirm } from '../components/confirm/appConfirm.js';
import {
  BUILTIN_LEGAL_DOCUMENT_TYPES,
  createLegalDocumentType,
  DOCUMENT_TEMPLATE_VARIABLES,
  DOCUMENTS_ADMIN_ROUTE,
  DOCUMENTS_MANAGE_PERMISSION,
  DOCUMENTS_VIEW_PERMISSION,
  getLegalDocumentTypes,
  getPartnerLegalTermsCurrent,
  getPartnerLegalTermsVersions,
  PARTNER_LEGAL_SLUG_ONBOARDING,
  previewPartnerLegalTermsRender,
  publishPartnerLegalTerms,
} from '../api/admin.js';
import { AppLoadingPanel } from '../components/crud/AppLoading.jsx';
import { CrudAlerts } from '../components/crud/CrudAlerts.jsx';
import { CrudFormActions } from '../components/crud/CrudFormActions.jsx';
import { CrudListShell } from '../components/crud/CrudListShell.jsx';
import { PageHeader } from '../components/PageHeader.jsx';
import { PermissionGate } from '../components/PermissionGate.jsx';
import { useAuth } from '../auth/AuthContext.jsx';
import { useCrudList } from '../crud/useCrudList.js';
import '../styles/documents.css';

const CREATE_SLUG = 'novo';
const CUSTOM_TYPES_STORAGE_KEY = 'operacao.documentos.custom-types';

function loadStoredCustomTypes() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_TYPES_STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((row) => row?.slug) : [];
  } catch {
    return [];
  }
}

function storeCustomType(entry) {
  const current = loadStoredCustomTypes().filter((row) => row.slug !== entry.slug);
  localStorage.setItem(CUSTOM_TYPES_STORAGE_KEY, JSON.stringify([entry, ...current]));
}

async function enrichTypeWithPublished(type) {
  try {
    const current = await getPartnerLegalTermsCurrent(type.slug);
    if (!current) return { ...type, version: type.version ?? null, publishedAt: type.publishedAt ?? null };
    return {
      ...type,
      title: current.title ?? type.title ?? null,
      version: current.version ?? null,
      publishedAt: current.publishedAt ?? null,
      active: true,
    };
  } catch {
    return { ...type, version: type.version ?? null, publishedAt: type.publishedAt ?? null, active: false };
  }
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('pt-BR');
}

function applyMovlyProductName(value) {
  return String(value ?? '').replace(/Movly Connect/gi, 'Movly');
}

function slugifyDocumentId(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrapPrintableDocument(title, html) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Georgia, 'Times New Roman', serif; color: #111; max-width: 720px; margin: 2rem auto; line-height: 1.55; }
    h1, h2 { font-family: system-ui, sans-serif; }
    h1 { font-size: 1.5rem; }
    h2 { font-size: 1.125rem; margin-top: 1.5rem; }
  </style>
</head>
<body>${html}</body>
</html>`;
}

function printGeneratedDocument(title, html) {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.right = '0';
  frame.style.bottom = '0';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  if (!doc) {
    frame.remove();
    return;
  }
  doc.open();
  doc.write(wrapPrintableDocument(title, html));
  doc.close();
  const win = frame.contentWindow;
  if (win) {
    win.focus();
    win.print();
  }
  window.setTimeout(() => frame.remove(), 1500);
}

function downloadGeneratedDocument(slug, title, html) {
  const blob = new Blob([wrapPrintableDocument(title, html)], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${slugifyDocumentId(slug) || 'documento'}.html`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function DocumentCreateForm({ onCancel, onCreated }) {
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [contentHtml, setContentHtml] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      const payload = {
        slug: slug.trim(),
        title: title.trim(),
        contentHtml: contentHtml.trim() || undefined,
      };
      let created;
      try {
        created = await createLegalDocumentType(payload);
      } catch {
        created = await publishPartnerLegalTerms({
          slug: payload.slug,
          title: payload.title,
          contentHtml: payload.contentHtml || `<h1>{{documentTitle}}</h1><p>{{movlyLegalName}}</p>`,
        });
      }
      storeCustomType({
        slug: created.slug || payload.slug,
        label: created.title || payload.title,
        description: 'Modelo personalizado do gerador de documentos.',
        builtIn: false,
        usedInOnboarding: false,
        title: created.title || payload.title,
        version: created.version ?? 1,
        publishedAt: created.publishedAt ?? null,
        active: true,
      });
      onCreated(created);
    } catch (err) {
      setError(err.message ?? 'Não foi possível criar o tipo de documento.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={[
          { label: 'Operação', to: '/m/operacao/dashboard' },
          { label: 'Documentos', to: DOCUMENTS_ADMIN_ROUTE },
          { label: 'Novo tipo' },
        ]}
        title="Novo tipo de documento"
        subtitle="Cria um modelo no gerador. Use as mesmas variáveis {{…}} dos termos de parceiro."
      />
      <CrudAlerts error={error} />
      <section className="panel">
        <div className="panel-header">
          <h2>Identificação</h2>
        </div>
        <div className="panel-body">
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Nome do tipo</span>
              <input
                className="input"
                value={title}
                onChange={(ev) => {
                  const nextTitle = ev.target.value;
                  setTitle(nextTitle);
                  if (!slugTouched) setSlug(slugifyDocumentId(nextTitle));
                }}
                required
                disabled={busy}
              />
            </label>
            <label>
              <span>Identificador</span>
              <input
                className="input"
                value={slug}
                onChange={(ev) => {
                  setSlugTouched(true);
                  setSlug(slugifyDocumentId(ev.target.value));
                }}
                required
                disabled={busy}
              />
            </label>
            <label className="field-span-2">
              <span>Conteúdo inicial (HTML, opcional)</span>
              <textarea
                className="input"
                rows={10}
                value={contentHtml}
                onChange={(ev) => setContentHtml(ev.target.value)}
                disabled={busy}
                spellCheck={false}
                placeholder="Deixe em branco para começar com um modelo genérico da Movly."
              />
            </label>
            <div className="field-span-full">
              <CrudFormActions
                busy={busy}
                submitLabel="Criar tipo"
                busyLabel="Criando…"
                onCancel={onCancel}
              />
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

function DocumentEditor({ slug, typeMeta, variables, onBack }) {
  const { hasPermission } = useAuth();
  const canManage = hasPermission(DOCUMENTS_MANAGE_PERMISSION);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [versions, setVersions] = useState([]);
  const [title, setTitle] = useState('');
  const [contentHtml, setContentHtml] = useState('');
  const [currentVersion, setCurrentVersion] = useState(null);
  const [busy, setBusy] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [previewBusy, setPreviewBusy] = useState(false);

  const typeLabel = typeMeta?.label || title || slug;
  const usedInOnboarding = Boolean(typeMeta?.usedInOnboarding);

  const breadcrumbs = useMemo(
    () => [
      { label: 'Operação', to: '/m/operacao/dashboard' },
      { label: 'Documentos', to: DOCUMENTS_ADMIN_ROUTE },
      { label: typeLabel },
    ],
    [typeLabel],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [current, history] = await Promise.all([
        getPartnerLegalTermsCurrent(slug),
        getPartnerLegalTermsVersions(slug),
      ]);
      setVersions(history ?? []);
      if (current) {
        setTitle(applyMovlyProductName(current.title ?? ''));
        setContentHtml(applyMovlyProductName(current.contentHtml ?? ''));
        setCurrentVersion(current.version ?? null);
      } else {
        setTitle(typeMeta?.title ?? '');
        setContentHtml('');
        setCurrentVersion(null);
      }
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar o documento.');
    } finally {
      setLoading(false);
    }
  }, [slug, typeMeta?.title]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    let cancelled = false;
    setPreviewBusy(true);
    previewPartnerLegalTermsRender(contentHtml)
      .then((res) => {
        if (!cancelled) setPreviewHtml(applyMovlyProductName(res?.contentHtml ?? contentHtml));
      })
      .catch(() => {
        if (!cancelled) setPreviewHtml(applyMovlyProductName(contentHtml));
      })
      .finally(() => {
        if (!cancelled) setPreviewBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [contentHtml]);

  const onPublish = async (ev) => {
    ev.preventDefault();
    if (!canManage) return;
    const ok = await appConfirm({
      title: 'Publicar nova versão?',
      message: usedInOnboarding
        ? 'Parceiros em onboarding precisarão aceitar esta versão antes de continuar. A versão anterior deixa de ser a vigente.'
        : 'A versão anterior deixa de ser a vigente. Documentos gerados a partir desta minuta usarão o novo texto.',
      confirmLabel: 'Publicar',
    });
    if (!ok) return;

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const published = await publishPartnerLegalTerms({
        slug,
        title: title.trim(),
        contentHtml,
      });
      setMessage(`Versão ${published.version} publicada em ${formatDate(published.publishedAt)}.`);
      await load();
    } catch (err) {
      setError(err.message ?? 'Falha ao publicar.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return <AppLoadingPanel label="Carregando documento…" />;
  }

  const renderedPreview = previewHtml || contentHtml;

  return (
    <div className="page-stack">
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={typeLabel}
        subtitle={
          usedInOnboarding
            ? 'Template da minuta com variáveis {{…}} — renderizado por rede no onboarding do parceiro.'
            : 'Template com variáveis {{…}}. Gere a prévia, publique versões ou imprima o documento.'
        }
        actions={
          <button type="button" className="btn-ghost" onClick={onBack}>
            Voltar aos tipos
          </button>
        }
      />
      <CrudAlerts error={error} message={message} />

      <section className="panel">
        <div className="panel-header">
          <h2>Versão vigente {currentVersion != null ? `(v${currentVersion})` : ''}</h2>
          <div className="documents-type-meta">
            {usedInOnboarding ? <span className="badge badge-success">Onboarding parceiro</span> : null}
            {typeMeta?.builtIn ? <span className="badge badge-muted">Nativo</span> : <span className="badge badge-muted">Personalizado</span>}
          </div>
        </div>
        <div className="panel-body">
          <PermissionGate permission={DOCUMENTS_VIEW_PERMISSION}>
            <form className="form-grid" onSubmit={onPublish}>
              <label className="field-span-2">
                <span>Título</span>
                <input
                  className="input"
                  value={title}
                  onChange={(ev) => setTitle(ev.target.value)}
                  required
                  disabled={!canManage || busy}
                />
              </label>
              <div className="field-span-2 panel panel-nested">
                <div className="panel-header">
                  <h3>Variáveis disponíveis</h3>
                </div>
                <div className="panel-body">
                  <p className="form-hint">
                    Insira no HTML como <code>{'{{nomeDaVariavel}}'}</code>. Na pré-visualização abaixo, valores de
                    exemplo substituem os placeholders.
                  </p>
                  <ul className="documents-var-list">
                    {variables.map((row) => (
                      <li key={row.key}>
                        <code>{`{{${row.key}}}`}</code> — {row.hint}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <label className="field-span-2">
                <span>Conteúdo (HTML)</span>
                <textarea
                  className="input"
                  rows={16}
                  value={contentHtml}
                  onChange={(ev) => setContentHtml(ev.target.value)}
                  required
                  disabled={!canManage || busy}
                  spellCheck={false}
                />
              </label>
              <div className="field-span-2 panel panel-nested">
                <div className="panel-header">
                  <h3>Pré-visualização {previewBusy ? '(atualizando…)' : '(dados de exemplo)'}</h3>
                </div>
                <div
                  className="panel-body documents-preview prose-preview"
                  dangerouslySetInnerHTML={{ __html: renderedPreview }}
                />
              </div>
              <div className="field-span-full form-actions">
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!renderedPreview}
                  onClick={() => printGeneratedDocument(title || typeLabel, renderedPreview)}
                >
                  Imprimir / PDF
                </button>
                <button
                  type="button"
                  className="btn-ghost"
                  disabled={!renderedPreview}
                  onClick={() => downloadGeneratedDocument(slug, title || typeLabel, renderedPreview)}
                >
                  Baixar HTML
                </button>
                {canManage ? (
                  <button type="submit" className="btn-primary" disabled={busy}>
                    {busy ? 'Publicando…' : 'Publicar nova versão'}
                  </button>
                ) : (
                  <p className="form-hint">Você pode visualizar e gerar a prévia; publicação exige permissão de gestão.</p>
                )}
              </div>
            </form>
          </PermissionGate>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <h2>Histórico de versões</h2>
        </div>
        <div className="panel-body table-wrap-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Versão</th>
                <th>Título</th>
                <th>Publicado em</th>
                <th>Vigente</th>
              </tr>
            </thead>
            <tbody>
              {versions.length === 0 ? (
                <tr>
                  <td colSpan={4}>Nenhuma versão cadastrada.</td>
                </tr>
              ) : (
                versions.map((row) => (
                  <tr key={row.id}>
                    <td>v{row.version}</td>
                    <td>{row.title}</td>
                    <td>{formatDate(row.publishedAt)}</td>
                    <td>{row.active ? 'Sim' : '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default function DocumentsPage() {
  const { slug: routeSlug } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const canManage = hasPermission(DOCUMENTS_MANAGE_PERMISSION);

  const [catalog, setCatalog] = useState({ types: [], variables: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const loadTypes = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      try {
        const result = await getLegalDocumentTypes();
        if (Array.isArray(result?.types) && result.types.length > 0) {
          setCatalog({
            types: result.types,
            variables: result.variables?.length ? result.variables : DOCUMENT_TEMPLATE_VARIABLES,
          });
          return;
        }
      } catch {
        /* API sem /catalog: monta a lista com tipos nativos + personalizados locais. */
      }
      const stored = loadStoredCustomTypes();
      const merged = [];
      const seen = new Set();
      for (const type of [...BUILTIN_LEGAL_DOCUMENT_TYPES, ...stored]) {
        if (!type.slug || seen.has(type.slug)) continue;
        seen.add(type.slug);
        merged.push(await enrichTypeWithPublished(type));
      }
      setCatalog({
        types: merged,
        variables: DOCUMENT_TEMPLATE_VARIABLES,
      });
    } catch (err) {
      setError(err.message ?? 'Não foi possível carregar os tipos de documento.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadTypes();
  }, [loadTypes]);

  const list = useCrudList(catalog.types, {
    storageKey: 'operacao.documentos',
    searchKeys: ['label', 'slug', 'title', 'description'],
    defaultSort: { key: 'label', direction: 'asc' },
  });

  const openType = (slug) => navigate(`${DOCUMENTS_ADMIN_ROUTE}/${encodeURIComponent(slug)}`);
  const goToList = () => navigate(DOCUMENTS_ADMIN_ROUTE);

  if (routeSlug === CREATE_SLUG) {
    if (!canManage) {
      return (
        <div className="page-stack">
          <CrudAlerts error="Publicação e criação de tipos exigem permissão de gestão." />
          <button type="button" className="btn-ghost" onClick={goToList}>
            Voltar
          </button>
        </div>
      );
    }
    return (
      <DocumentCreateForm
        onCancel={goToList}
        onCreated={(created) => {
          setMessage(`Tipo “${created.title}” criado.`);
          openType(created.slug);
        }}
      />
    );
  }

  if (routeSlug) {
    if (loading) return <AppLoadingPanel label="Carregando tipos…" />;
    const typeMeta =
      catalog.types.find((row) => row.slug === routeSlug) ??
      BUILTIN_LEGAL_DOCUMENT_TYPES.find((row) => row.slug === routeSlug) ?? {
        slug: routeSlug,
        label: routeSlug,
        builtIn: routeSlug === PARTNER_LEGAL_SLUG_ONBOARDING,
        usedInOnboarding: routeSlug === PARTNER_LEGAL_SLUG_ONBOARDING,
      };
    return (
      <DocumentEditor
        slug={routeSlug}
        typeMeta={typeMeta}
        variables={catalog.variables?.length ? catalog.variables : DOCUMENT_TEMPLATE_VARIABLES}
        onBack={goToList}
      />
    );
  }

  if (loading) {
    return <AppLoadingPanel label="Carregando documentos…" />;
  }

  return (
    <PermissionGate permission={DOCUMENTS_VIEW_PERMISSION}>
      <div className="page-stack">
        <CrudListShell
          title="Documentos"
          subtitle="Gerador de minutas e documentos da operação. Termos de parceiro continua disponível como um dos tipos."
          breadcrumbs={[{ label: 'Operação', to: '/m/operacao/dashboard' }, { label: 'Documentos' }]}
          addLabel="Novo tipo"
          onAdd={canManage ? () => navigate(`${DOCUMENTS_ADMIN_ROUTE}/${CREATE_SLUG}`) : undefined}
          canAdd={canManage}
          loading={loading}
          error={error}
          message={message}
          query={list.query}
          onQueryChange={list.onQueryChange}
          searchPlaceholder="Buscar por nome ou identificador"
          sortKey={list.sortKey}
          sortDirection={list.sortDirection}
          onSortChange={list.setSort}
          sortOptions={[
            { key: 'label', direction: 'asc', label: 'Nome (A–Z)' },
            { key: 'label', direction: 'desc', label: 'Nome (Z–A)' },
            { key: 'slug', direction: 'asc', label: 'Identificador' },
          ]}
          page={list.page}
          pageSize={list.pageSize}
          totalItems={list.totalItems}
          totalPages={list.totalPages}
          onPageChange={list.setPage}
          onPageSizeChange={list.onPageSizeChange}
          emptyMessage="Nenhum tipo de documento cadastrado."
          columns={[
            {
              key: 'label',
              label: 'Tipo',
              render: (row) => (
                <>
                  <strong>{row.label}</strong>
                  {row.description ? <div className="muted">{row.description}</div> : null}
                </>
              ),
            },
            {
              key: 'slug',
              label: 'Identificador',
              render: (row) => <code>{row.slug}</code>,
            },
            {
              key: 'version',
              label: 'Versão',
              render: (row) => (row.version != null ? `v${row.version}` : '—'),
            },
            {
              key: 'usage',
              label: 'Uso',
              render: (row) => (row.usedInOnboarding ? 'Onboarding parceiro' : 'Geração avulsa'),
            },
            {
              key: 'publishedAt',
              label: 'Publicado em',
              render: (row) => formatDate(row.publishedAt),
            },
          ]}
          rows={list.rows}
          rowKey="slug"
          onRowClick={(row) => openType(row.slug)}
          onView={(row) => openType(row.slug)}
          onEdit={canManage ? (row) => openType(row.slug) : undefined}
        />
      </div>
    </PermissionGate>
  );
}
