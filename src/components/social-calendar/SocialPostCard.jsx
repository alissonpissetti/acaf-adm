import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Download, ExternalLink } from 'lucide-react';
import {
  agendadoParaFromDatetimeLocal,
  formatPostDateTime,
  toDatetimeLocalInput,
} from '../../lib/socialPostWeeks.js';
import {
  arteDownloadFilename,
  arteImageSrc,
  downloadArteImage,
  isArteVideo,
} from '../../lib/socialPostMedia.js';
import {
  bufferStatusLabel,
  postKindLabel,
  publishedRedesForPost,
  REDE_LABELS,
} from '../../lib/socialPostRules.js';
import { SocialPostPreviewTabs } from './SocialPostPreviewTabs.jsx';
import { SocialPostBufferPanel } from './SocialPostBufferPanel.jsx';
import { SocialPostBriefingFields } from './SocialPostBriefingFields.jsx';
import { SocialPostResponsavelField } from './SocialPostResponsavelField.jsx';
import { ScBlock } from './ScBlock.jsx';

function shortMeta(text, max = 40) {
  if (!text) return '—';
  const t = String(text).trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function briefingMeta(post, canManage) {
  if (!post.legenda?.trim() && !post.hashtags?.trim()) return canManage ? 'Vazio' : '—';
  return canManage ? 'Editável' : 'Preenchido';
}

function aprovacaoMetaTone(aprovacao) {
  if (aprovacao === 'aprovado') return 'ok';
  if (aprovacao === 'ajustar') return 'warn';
  return 'muted';
}

const APROVACAO_OPTS = [
  { value: 'pendente', label: 'Aguardando' },
  { value: 'aprovado', label: 'Aprovado' },
  { value: 'ajustar', label: 'Ajustar' },
];

const ETAPA_OPTS = [
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'programado', label: 'Programado' },
  { value: 'publicado', label: 'Publicado' },
];

const EXPAND_STORAGE_KEY = 'movly-sc-post-expanded';

function readExpandedMap() {
  try {
    return JSON.parse(sessionStorage.getItem(EXPAND_STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function readExpanded(postId) {
  return readExpandedMap()[postId];
}

function writeExpanded(postId, value) {
  try {
    const map = readExpandedMap();
    if (value) map[postId] = true;
    else delete map[postId];
    sessionStorage.setItem(EXPAND_STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

function defaultExpanded(post) {
  const saved = readExpanded(post.id);
  if (saved === true) return true;
  if (saved === false) return false;
  return post.etapa !== 'publicado';
}

function etapaLabel(etapa) {
  return ETAPA_OPTS.find((o) => o.value === etapa)?.label ?? etapa;
}

function aprovacaoLabel(v) {
  return APROVACAO_OPTS.find((o) => o.value === v)?.label ?? v;
}

export function SocialPostCard({
  post,
  focusPostId,
  onClearFocusParam,
  assigneeUsers,
  canManage,
  canApprove,
  canPublish,
  onPatch,
  onAprovacao,
  onArteUpload,
  onArteRemove,
  onBufferAction,
  onFluxoPatch,
  onManualCanal,
}) {
  const [expanded, setExpanded] = useState(() => defaultExpanded(post));
  const [busy, setBusy] = useState(false);
  const { date, time, weekday } = formatPostDateTime(post.agendadoPara);
  const isPublished = post.etapa === 'publicado';
  const publishedRedes = isPublished ? publishedRedesForPost(post) : [];
  const thumb = post.artes?.[0] ? arteImageSrc(post.artes[0]) : null;
  useEffect(() => {
    setExpanded(defaultExpanded(post));
  }, [post.id]);

  useEffect(() => {
    if (focusPostId !== post.id) return;
    setExpanded(true);
    writeExpanded(post.id, true);
    onClearFocusParam?.();
  }, [focusPostId, post.id, onClearFocusParam]);

  const setExpandedPersist = (value) => {
    setExpanded(value);
    writeExpanded(post.id, value);
  };

  const run = async (fn) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  if (!expanded && isPublished) {
    return (
      <article className="sc-card sc-card--collapsed sc-card--publicado">
        <button
          type="button"
          className="sc-card-expand"
          onClick={() => setExpandedPersist(true)}
          aria-expanded="false"
        >
          {thumb ? <img className="sc-card-expand-thumb" src={thumb} alt="" /> : null}
          <span className="sc-card-expand-body">
            <span className="sc-card-expand-icon" aria-hidden>
              <ChevronDown size={18} />
            </span>
            <span className="sc-card-expand-text">
              <span className="sc-card-expand-top">
                <span className="sc-code">{post.codigo}</span>
                <span className="sc-pill sc-pill-publicado">Publicado</span>
                {publishedRedes.length ? (
                  <span className="sc-card-expand-redes" aria-label={`Redes publicadas: ${publishedRedes.map((r) => REDE_LABELS[r]).join(', ')}`}>
                    {publishedRedes.map((rede) => (
                      <span key={rede} className={`sc-pill sc-pill-rede sc-pill-rede--${rede}`}>
                        {REDE_LABELS[rede] ?? rede}
                      </span>
                    ))}
                  </span>
                ) : null}
              </span>
              <strong className="sc-card-expand-title">{post.titulo}</strong>
              <span className="sc-card-expand-meta">
                {date} · {weekday} {time}
              </span>
              <span className="sc-card-kind">{postKindLabel(post)}</span>
            </span>
          </span>
        </button>
      </article>
    );
  }

  return (
    <article className={`sc-card sc-card--${post.etapa}`}>
      <header className="sc-card-top">
        <div className="sc-card-top-main">
          <span className="sc-code">{post.codigo}</span>
          <div className="sc-card-top-when">
            <span className="sc-card-date">{date}</span>
            <span className="sc-card-time">
              {weekday} · {time}
            </span>
            <span className="sc-card-kind">{postKindLabel(post)}</span>
            {post.envio === 'reels' ? (
              <span className="sc-card-reels-hint muted">Reels · alcance e movimento do perfil no Instagram</span>
            ) : null}
          </div>
        </div>
        <div className="sc-badges">
          <span className={`sc-pill sc-pill-${post.etapa}`}>{etapaLabel(post.etapa)}</span>
          <span className="sc-pill sc-pill-muted">{post.numeroExibicao}</span>
        </div>
        {isPublished ? (
          <button
            type="button"
            className="sc-card-collapse"
            onClick={() => setExpandedPersist(false)}
            aria-expanded="true"
          >
            <ChevronUp size={16} aria-hidden="true" />
            Recolher
          </button>
        ) : null}
      </header>

      <h3 className="sc-card-title">{post.titulo}</h3>
      {post.pilar ? (
        <p className="sc-card-meta">
          <strong>{post.pilar}</strong>
        </p>
      ) : null}
      <p className="sc-card-interaction">{post.interactionLabel}</p>
      {post.manualPostingRequired ? (
        <p className="sc-manual-callout" role="note">
          Publicação só no app (Meta): link, enquete, pergunta ou outra interação.{' '}
          <strong>O Buffer não pode ser usado neste post.</strong> Defina um responsável para o lembrete
          15 min antes (SMS/e-mail).
        </p>
      ) : null}

      <div className="sc-card-layout">
        <div
          className={`sc-card-preview-col${
            post.envio === 'stories' || post.envio === 'reels' ? ' sc-card-preview-col--tall' : ''
          }`}
        >
          <SocialPostPreviewTabs post={post} />
        </div>

        <div className="sc-card-main-col">
          <div className="sc-blocks">
          <ScBlock title="Legenda e briefing" meta={briefingMeta(post, canManage)}>
            <SocialPostBriefingFields post={post} canManage={canManage} onPatch={onPatch} />
          </ScBlock>

          <ScBlock
            title="Artes"
            meta={
              post.artes?.length
                ? `${post.artes.length} ${post.artes.length === 1 ? 'arte' : 'artes'}`
                : 'Nenhuma'
            }
          >
            <div className="sc-artes">
              {(post.artes ?? []).map((a) => {
                const src = arteImageSrc(a);
                return (
                  <ArteThumb
                    key={a.id}
                    src={src}
                    isVideo={isArteVideo(a)}
                    nome={a.nome}
                    interacao={a.interacao}
                    canManage={canManage}
                    downloadFilename={arteDownloadFilename(a, post.codigo)}
                    onRemove={() => onArteRemove(a.id)}
                  />
                );
              })}
              {canManage ? (
                <label className="sc-arte-upload sc-arte-upload--tile">
                  <span className="sc-arte-upload-label">
                    {post.envio === 'reels' ? '+ Anexar vídeo' : '+ Anexar'}
                  </span>
                  <input
                    type="file"
                    accept={
                      post.envio === 'reels'
                        ? 'video/mp4,video/quicktime,.mp4,.mov'
                        : 'image/png,image/jpeg,image/webp'
                    }
                    hidden
                    onChange={(ev) => {
                      const file = ev.target.files?.[0];
                      if (file) void onArteUpload(file);
                      ev.target.value = '';
                    }}
                  />
                </label>
              ) : null}
            </div>
          </ScBlock>

          {(canApprove || canManage || canPublish) && (
            <ScBlock
              title="Fluxo editorial"
              meta={
                canApprove
                  ? aprovacaoLabel(post.aprovacao)
                  : etapaLabel(post.etapa)
              }
              metaTone={canApprove ? aprovacaoMetaTone(post.aprovacao) : undefined}
            >
              <div className="sc-segments">
                {canApprove ? (
                  <div className="sc-segment">
                    <span>Aprovação</span>
                    <div className="sc-segment-chips">
                      {APROVACAO_OPTS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          className={`filter-chip${post.aprovacao === value ? ' active' : ''}`}
                          onClick={() => onAprovacao(value)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
                {canManage || canPublish ? (
                  <div className="sc-segment">
                    <span>Etapa</span>
                    <div className="sc-segment-chips">
                      {ETAPA_OPTS.map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          className={`filter-chip${post.etapa === value ? ' active' : ''}`}
                          disabled={busy}
                          onClick={() => run(() => onFluxoPatch({ etapa: value }))}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </ScBlock>
          )}

          <ScBlock title="Publicação" meta={shortMeta(bufferStatusLabel(post), 44)}>
            <SocialPostBufferPanel
              post={post}
              canPublish={canPublish}
              canManage={canManage}
              busy={busy}
              onRedesChange={(redes) => onPatch({ redes })}
              onManualCanal={(rede, body) => run(() => onManualCanal(rede, body))}
              onBufferAction={(action, opts) => run(() => onBufferAction(action, opts))}
            />
          </ScBlock>

          <ScBlock
            title="Agendamento e notas"
            meta={post.agendadoPara ? `${date} · ${time}` : 'Sem data'}
          >
            <PostDetailsFields
              post={post}
              assigneeUsers={assigneeUsers}
              canManage={canManage}
              onPatch={onPatch}
            />
          </ScBlock>
          </div>
        </div>
      </div>
    </article>
  );
}

function ArteThumb({ src, nome, interacao, canManage, downloadFilename, onRemove, isVideo }) {
  const onDownload = () => {
    if (!src) return;
    void downloadArteImage(src, downloadFilename ?? nome ?? 'arte-movly.png');
  };

  return (
    <div className="sc-arte-tile">
      {src ? (
        <a href={src} target="_blank" rel="noreferrer" className="sc-arte-tile-img-wrap">
          {isVideo ? (
            <video src={src} className="sc-arte-tile-video" muted playsInline preload="metadata" />
          ) : (
            <img src={src} alt={nome ?? ''} loading="lazy" />
          )}
          <span className="sc-arte-tile-zoom" aria-hidden>
            <ExternalLink size={14} />
          </span>
        </a>
      ) : (
        <div className="sc-arte-tile-placeholder">{nome ?? '—'}</div>
      )}
      <span className="sc-arte-tile-name">{nome}</span>
      {interacao ? (
        <span className="sc-arte-tag">{interacao === 'link' ? 'Link sticker' : 'Manual · app'}</span>
      ) : null}
      <div className="sc-arte-tile-actions">
        {src ? (
          <button type="button" className="btn-ghost btn-sm sc-arte-download" onClick={onDownload}>
            <Download size={14} aria-hidden />
            Baixar
          </button>
        ) : null}
        {canManage ? (
          <button type="button" className="btn-ghost btn-sm sc-arte-remove" onClick={onRemove}>
            Remover
          </button>
        ) : null}
      </div>
    </div>
  );
}

function PostDetailsFields({ post, assigneeUsers, canManage, onPatch }) {
  const needsResponsavel =
    post.manualPostingRequired && post.agendadoPara && post.etapa !== 'publicado';

  return (
    <div className="sc-details-body">
      {post.manualPostingRequired ? (
        <SocialPostResponsavelField
          users={assigneeUsers}
          value={post.responsavelUserId}
          disabled={!canManage}
          required={Boolean(needsResponsavel)}
          onChange={(responsavelUserId) => onPatch({ responsavelUserId })}
        />
      ) : null}
      {post.manualReminderSentAt ? (
        <p className="muted sc-reminder-sent">Lembrete manual enviado em {formatReminderSent(post.manualReminderSentAt)}.</p>
      ) : null}
      <label className="field-label-block">
        Data e hora
        <input
          type="datetime-local"
          disabled={!canManage}
          value={toDatetimeLocalInput(post.agendadoPara)}
          onChange={(ev) =>
            onPatch({
              agendadoPara: agendadoParaFromDatetimeLocal(ev.target.value),
            })
          }
        />
      </label>
      <label className="field-label-block">
        Nota interna
        <textarea
          rows={3}
          disabled={!canManage}
          defaultValue={post.nota ?? ''}
          onBlur={(ev) => onPatch({ nota: ev.target.value })}
        />
      </label>
    </div>
  );
}

function formatReminderSent(iso) {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}