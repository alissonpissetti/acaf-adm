import {
  allowedRedes,
  bufferLinksByRede,
  bufferOnlyLinks,
  bufferRedeAggregateStatus,
  bufferStatusLabel,
  formatBufferDue,
  MANUAL_CANAL_STATUS_OPTS,
  manualLinkForRede,
  REDE_LABELS,
  redeLinksForDisplay,
} from '../../lib/socialPostRules.js';

export function SocialPostBufferPanel({
  post,
  canPublish,
  canManage,
  onRedesChange,
  onBufferAction,
  onManualCanal,
  busy,
}) {
  const redesOpts = allowedRedes(post.envio);
  const bufferBlocked = post.manualPostingRequired || post.bufferAllowed === false;
  const fullManualArtes = post.interactionClass === 'full_manual' || bufferBlocked;
  const mixed = !bufferBlocked && post.interactionClass === 'mixed';
  const byRede = bufferLinksByRede(post.bufferLinks);
  const selectedRedes = (post.redes ?? []).filter((r) => redesOpts.includes(r));
  const selectedForPush = selectedRedes.length ? selectedRedes : [];
  const canTrackManual = canPublish || canManage;

  const firstDisplayLink = (rede) => {
    const shown = redeLinksForDisplay(byRede[rede] ?? []);
    return shown.find((l) => l.externalLink) ?? shown[0];
  };

  return (
    <section className="sc-buffer-panel sc-buffer-panel--nested">
      <p className="sc-buffer-summary muted">
        Resumo: <strong>{bufferStatusLabel(post)}</strong>
      </p>
      <p className="sc-buffer-manual-intro muted">
        {bufferBlocked ? (
          <>
            Este post tem <strong>link, enquete, pergunta ou outra interação</strong> que só o app / Meta
            Business Suite faz — o <strong>Buffer não está disponível</strong>. Marque o status em{' '}
            <strong>Publicação manual</strong> por canal.
          </>
        ) : (
          <>
            Dá para publicar pelo Buffer ou manualmente no Meta Business Suite / app (stories, feed, reels).
            Use <strong>Publicação manual</strong> por canal para registrar status sem enviar pelo Buffer.
          </>
        )}
      </p>

      {bufferBlocked ? (
        <p className="sc-buffer-warn sc-buffer-warn--blocked" role="alert">
          Buffer desabilitado para este post. Publique no app e atualize o status manual em cada rede.
        </p>
      ) : null}
      {mixed ? (
        <p className="sc-buffer-warn">{post.interactionLabel}</p>
      ) : null}
      {post.envio === 'reels' ? (
        <p className="sc-buffer-warn sc-buffer-warn--reels">
          {post.artes?.length
            ? 'Reels no Instagram — priorize regularidade para alcance e descoberta do perfil.'
            : 'Anexe o vídeo MP4/MOV (9:16) em Artes antes de programar no Buffer.'}
        </p>
      ) : null}

      <div className="sc-buffer-table-wrap">
        <table
          className={`sc-buffer-table sc-buffer-table--wide${bufferBlocked ? ' sc-buffer-table--manual-only' : ''}`}
        >
          <thead>
            <tr>
              <th scope="col">Canal</th>
              <th scope="col">Incluir</th>
              <th scope="col">Status</th>
              <th scope="col">Agendado</th>
              <th scope="col">Link</th>
              {canTrackManual ? <th scope="col">Manual (Meta / app)</th> : null}
              {canPublish && !bufferBlocked ? <th scope="col">Buffer</th> : null}
            </tr>
          </thead>
          <tbody>
            {redesOpts.map((rede) => {
              const allLinks = byRede[rede] ?? [];
              const agg = bufferRedeAggregateStatus(allLinks);
              const manualLink = manualLinkForRede(allLinks);
              const displayLink = firstDisplayLink(rede);
              const due = redeLinksForDisplay(allLinks).map((l) => l.dueAt).find(Boolean);
              const included = post.redes?.includes(rede);
              const hasBuffer = bufferOnlyLinks(allLinks).length > 0;
              const manualBlocksBuffer = manualLink?.status === 'sent';

              return (
                <tr key={rede} className={included ? undefined : 'sc-buffer-row--off'}>
                  <td className="sc-buffer-rede">{REDE_LABELS[rede] ?? rede}</td>
                  <td>
                    <label className="sc-buffer-include">
                      <input
                        type="checkbox"
                        checked={included}
                        disabled={!canPublish && !canManage}
                        onChange={(ev) => {
                          const next = new Set(post.redes ?? []);
                          if (ev.target.checked) next.add(rede);
                          else next.delete(rede);
                          onRedesChange([...next]);
                        }}
                      />
                      <span className="sc-buffer-include-label">{included ? 'Sim' : 'Não'}</span>
                    </label>
                  </td>
                  <td>
                    <span
                      className={`sc-buffer-status-badge sc-buffer-status-badge--${agg.status ?? 'none'}${
                        agg.manual ? ' sc-buffer-status-badge--manual' : ''
                      }`}
                    >
                      {agg.label}
                    </span>
                    {agg.erro ? <span className="sc-buffer-err sc-buffer-err-inline">{agg.erro}</span> : null}
                  </td>
                  <td className="sc-buffer-due">{formatBufferDue(due) ?? '—'}</td>
                  <td>
                    {displayLink?.externalLink ? (
                      <a
                        href={displayLink.externalLink}
                        target="_blank"
                        rel="noreferrer"
                        className="sc-buffer-ext-link"
                      >
                        Abrir
                      </a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  {canTrackManual ? (
                    <td>
                      <ManualCanalCell
                        rede={rede}
                        manualLink={manualLink}
                        disabled={!included || !canTrackManual}
                        busy={busy}
                        onManualCanal={onManualCanal}
                      />
                    </td>
                  ) : null}
                  {canPublish && !bufferBlocked ? (
                    <td>
                      <RedeBufferActions
                        rede={rede}
                        busy={busy}
                        disabled={!included}
                        hasBuffer={hasBuffer}
                        manualBlocksBuffer={manualBlocksBuffer}
                        isSent={agg.status === 'sent'}
                        onAction={onBufferAction}
                      />
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {post.envio === 'stories' ? <p className="sc-buffer-foot muted">LinkedIn não tem stories.</p> : null}
      </div>

      {canPublish && !bufferBlocked ? (
        <div className="sc-buffer-bulk">
          <p className="sc-buffer-bulk-hint sc-buffer-bulk-hint--buffer">
            <strong>Buffer</strong> — ações nos canais marcados com Incluir
            {selectedForPush.length
              ? `: ${selectedForPush.map((r) => REDE_LABELS[r] ?? r).join(', ')}`
              : ' — marque ao menos um canal.'}
          </p>
          <div className="sc-buffer-actions">
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={busy || !selectedForPush.length}
              onClick={() => onBufferAction('draft', { redes: selectedForPush })}
            >
              Enviar como rascunho
            </button>
            <button
              type="button"
              className="btn-primary btn-sm"
              disabled={busy || !selectedForPush.length}
              onClick={() => onBufferAction('schedule', { redes: selectedForPush })}
            >
              Programar
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={busy || !selectedForPush.length}
              onClick={() => onBufferAction('publishNow', { redes: selectedForPush })}
            >
              Publicar agora
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm"
              disabled={busy}
              onClick={() => onBufferAction('sync')}
            >
              Atualizar Buffer
            </button>
            <button
              type="button"
              className="btn-ghost btn-sm btn-danger"
              disabled={busy || !bufferOnlyLinks(post.bufferLinks ?? []).length}
              onClick={() => onBufferAction('remove')}
            >
              Remover do Buffer
            </button>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ManualCanalCell({ rede, manualLink, disabled, busy, onManualCanal }) {
  if (disabled) {
    return <span className="muted sc-buffer-na">Canal desmarcado</span>;
  }

  const selectValue = manualLink?.status ?? 'clear';

  return (
    <div className="sc-buffer-manual">
      <select
        className="sc-buffer-manual-select"
        value={selectValue}
        disabled={busy}
        onChange={(ev) => {
          const v = ev.target.value;
          if (v === 'clear') {
            void onManualCanal(rede, { status: 'clear' });
            return;
          }
          void onManualCanal(rede, {
            status: v,
            externalLink: manualLink?.externalLink ?? null,
            dueAt: manualLink?.dueAt ?? null,
          });
        }}
      >
        {MANUAL_CANAL_STATUS_OPTS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {manualLink ? (
        <input
          key={`${rede}-${manualLink.status}-${manualLink.externalLink ?? ''}`}
          type="url"
          className="sc-buffer-manual-link"
          placeholder="URL da publicação"
          defaultValue={manualLink.externalLink ?? ''}
          disabled={busy}
          onBlur={(ev) => {
            const url = ev.target.value.trim() || null;
            if (url === (manualLink.externalLink ?? null)) return;
            void onManualCanal(rede, {
              status: manualLink.status,
              externalLink: url,
              dueAt: manualLink.dueAt ?? null,
            });
          }}
        />
      ) : null}
    </div>
  );
}

function RedeBufferActions({ rede, busy, disabled, hasBuffer, manualBlocksBuffer, isSent, onAction }) {
  if (disabled) {
    return <span className="muted sc-buffer-na">—</span>;
  }
  if (manualBlocksBuffer) {
    return <span className="muted sc-buffer-na">Buffer bloqueado (manual)</span>;
  }

  return (
    <div className="sc-buffer-row-actions">
      <button
        type="button"
        className="btn-ghost btn-sm"
        disabled={busy || !hasBuffer}
        onClick={() => onAction('sync', { rede })}
        title="Buscar status no Buffer"
      >
        Sync
      </button>
      {hasBuffer ? (
        <button
          type="button"
          className="btn-ghost btn-sm btn-danger"
          disabled={busy}
          onClick={() => onAction('remove', { rede })}
        >
          Remover
        </button>
      ) : null}
      {!isSent ? (
        <button
          type="button"
          className="btn-ghost btn-sm"
          disabled={busy}
          onClick={() => onAction('draft', { redes: [rede] })}
        >
          Enviar
        </button>
      ) : (
        <span className="sc-buffer-sent-tag">OK</span>
      )}
    </div>
  );
}