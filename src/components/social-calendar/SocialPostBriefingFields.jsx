import { useEffect, useState } from 'react';
import { Copy } from 'lucide-react';
import { buildCaption } from '../../lib/socialPostRules.js';

function telasToText(telas) {
  if (!telas?.length) return '';
  return telas.join('\n');
}

function textToTelas(text) {
  const lines = text
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  return lines.length ? lines : null;
}

export function SocialPostBriefingFields({ post, canManage, onPatch }) {
  const [legenda, setLegenda] = useState(post.legenda ?? '');
  const [hashtags, setHashtags] = useState(post.hashtags ?? '');
  const [visual, setVisual] = useState(post.visual ?? '');
  const [telasText, setTelasText] = useState(telasToText(post.telas));
  const [link, setLink] = useState(post.link ?? '');
  const [aviso, setAviso] = useState(post.aviso ?? '');

  useEffect(() => {
    setLegenda(post.legenda ?? '');
    setHashtags(post.hashtags ?? '');
    setVisual(post.visual ?? '');
    setTelasText(telasToText(post.telas));
    setLink(post.link ?? '');
    setAviso(post.aviso ?? '');
  }, [post.id, post.legenda, post.hashtags, post.visual, post.telas, post.link, post.aviso]);

  const copyCaption = () => {
    const text = canManage
      ? buildCaption(legenda, hashtags) || post.captionPreview || ''
      : post.captionPreview ?? '';
    void navigator.clipboard.writeText(text);
  };

  if (!canManage) {
    return (
      <div className="sc-briefing sc-briefing--readonly">
        {post.telas?.length ? (
          <ol className="sc-telas">
            {post.telas.map((t, i) => (
              <li key={i}>{t}</li>
            ))}
          </ol>
        ) : null}
        {post.visual ? (
          <p className="sc-briefing-read">
            <span className="sc-briefing-read-label">Briefing visual</span>
            {post.visual}
          </p>
        ) : null}
        {post.legenda ? <pre className="sc-caption">{post.legenda}</pre> : null}
        {post.hashtags ? <p className="sc-hashtags-read">{post.hashtags}</p> : null}
        {post.legenda || post.hashtags ? (
          <button type="button" className="btn-ghost btn-sm sc-copy-btn" onClick={copyCaption}>
            <Copy size={15} strokeWidth={2} aria-hidden />
            Copiar legenda completa
          </button>
        ) : null}
        {post.link ? (
          <div className="sc-link-row">
            <code>{post.link}</code>
          </div>
        ) : null}
        {post.aviso ? <p className="sc-aviso">Antes de publicar: {post.aviso}</p> : null}
        {!post.legenda && !post.visual ? <p className="muted sc-empty-hint">Sem conteúdo de briefing.</p> : null}
      </div>
    );
  }

  return (
    <div className="sc-briefing sc-briefing--edit">
      <label className="field-label-block">
        Legenda
        <textarea
          className="sc-field-textarea sc-field-textarea--tall"
          rows={8}
          value={legenda}
          onChange={(ev) => setLegenda(ev.target.value)}
          onBlur={() => {
            if (legenda !== (post.legenda ?? '')) void onPatch({ legenda: legenda || null });
          }}
          placeholder="Texto que vai nas redes (quebras de linha são preservadas)."
        />
      </label>

      <label className="field-label-block">
        Hashtags
        <textarea
          className="sc-field-textarea"
          rows={2}
          value={hashtags}
          onChange={(ev) => setHashtags(ev.target.value)}
          onBlur={() => {
            if (hashtags !== (post.hashtags ?? '')) void onPatch({ hashtags: hashtags || null });
          }}
          placeholder="#Movly #BemEstar…"
        />
      </label>

      <div className="sc-copy-row">
        <button type="button" className="btn-ghost btn-sm sc-copy-btn" onClick={copyCaption}>
          <Copy size={15} strokeWidth={2} aria-hidden />
          <span>Copiar legenda + hashtags</span>
        </button>
      </div>

      <label className="field-label-block">
        Briefing visual
        <textarea
          className="sc-field-textarea"
          rows={3}
          value={visual}
          onChange={(ev) => setVisual(ev.target.value)}
          onBlur={() => {
            if (visual !== (post.visual ?? '')) void onPatch({ visual: visual || null });
          }}
          placeholder="Descrição da arte, layout, KV, referências…"
        />
      </label>

      <label className="field-label-block">
        Roteiro (stories, reels, carrossel)
        <span className="sc-field-hint">Uma linha por tela ou trecho</span>
        <textarea
          className="sc-field-textarea"
          rows={4}
          value={telasText}
          onChange={(ev) => setTelasText(ev.target.value)}
          onBlur={() => {
            const next = textToTelas(telasText);
            const prev = post.telas ?? null;
            const same =
              (next === null && prev === null) ||
              (next && prev && next.length === prev.length && next.every((l, i) => l === prev[i]));
            if (!same) void onPatch({ telas: next });
          }}
          placeholder={'Tela 1: …\nTela 2: …'}
        />
      </label>

      <label className="field-label-block">
        Link (bio, CTA)
        <input
          type="url"
          className="sc-field-input"
          value={link}
          onChange={(ev) => setLink(ev.target.value)}
          onBlur={() => {
            const v = link.trim();
            if (v !== (post.link ?? '')) void onPatch({ link: v || null });
          }}
          placeholder="https://…"
        />
      </label>

      <label className="field-label-block">
        Aviso antes de publicar
        <textarea
          className="sc-field-textarea"
          rows={2}
          value={aviso}
          onChange={(ev) => setAviso(ev.target.value)}
          onBlur={() => {
            if (aviso !== (post.aviso ?? '')) void onPatch({ aviso: aviso || null });
          }}
          placeholder="Lembretes para o time no dia da publicação"
        />
      </label>
    </div>
  );
}