import { useEffect, useMemo, useState } from 'react';
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Send, Share2, ThumbsUp } from 'lucide-react';
import { allowedRedes, buildCaption, truncate } from '../../lib/socialPostRules.js';
import { arteImageSrc, isArteVideo } from '../../lib/socialPostMedia.js';

const CAPTION_LIMIT = { instagram: 125, facebook: 220, linkedin: 260 };
const HANDLLES = { instagram: 'sejamovly', facebook: 'Movly', linkedin: 'Movly' };

const TAB_META = [
  { id: 'instagram', label: 'Instagram', short: 'IG' },
  { id: 'facebook', label: 'Facebook', short: 'FB' },
  { id: 'linkedin', label: 'LinkedIn', short: 'IN' },
];

export function SocialPostPreviewTabs({ post }) {
  const redesOk = allowedRedes(post.envio);
  const tabs = TAB_META.filter((t) => redesOk.includes(t.id));
  const defaultTab = tabs.find((t) => post.redes?.includes(t.id))?.id ?? tabs[0]?.id ?? 'instagram';
  const [tab, setTab] = useState(defaultTab);

  useEffect(() => {
    if (!tabs.some((t) => t.id === tab)) setTab(defaultTab);
  }, [defaultTab, tab, tabs]);

  const captionFull = useMemo(
    () => buildCaption(post.legenda, post.hashtags) || post.captionPreview || '',
    [post.legenda, post.hashtags, post.captionPreview],
  );
  const artes = post.artes ?? [];
  const redeAtiva = (post.redes ?? []).includes(tab);
  const envio = post.envio;

  return (
    <div className="sc-preview">
      <p className="sc-preview-label">Prévia por rede</p>
      <div className="sc-preview-tabs" role="tablist" aria-label="Prévia por rede social">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            className={`sc-preview-tab sc-preview-tab--${t.id}${tab === t.id ? ' is-active' : ''}${
              !post.redes?.includes(t.id) ? ' is-off' : ''
            }`}
            onClick={() => setTab(t.id)}
          >
            <span className="sc-preview-tab-dot" aria-hidden />
            {t.label}
          </button>
        ))}
      </div>
      {!redeAtiva ? (
        <p className="sc-preview-warn">Marcado como &quot;não incluir&quot; nesta rede — prévia só ilustrativa.</p>
      ) : null}
      <div
        key={`${tab}-${envio}-${artes.map((a) => a.id).join('-')}`}
        className={`sc-preview-body sc-preview-body--${tab} sc-preview-body--${envio}${!redeAtiva ? ' is-muted' : ''}`}
      >
        <PlatformPreview tab={tab} envio={envio} artes={artes} caption={captionFull} post={post} />
      </div>
    </div>
  );
}

function PlatformPreview({ tab, envio, artes, caption, post }) {
  if (envio === 'stories') {
    return <StoryPreview tab={tab} artes={artes} />;
  }
  if (envio === 'reels') {
    return <ReelPreview artes={artes} caption={truncate(caption, CAPTION_LIMIT.instagram)} />;
  }
  if (tab === 'instagram') {
    return (
      <InstagramFeedPreview
        handle={HANDLLES.instagram}
        caption={truncate(caption, CAPTION_LIMIT.instagram)}
        artes={artes}
      />
    );
  }
  if (tab === 'facebook') {
    return (
      <FacebookFeedPreview
        name={HANDLLES.facebook}
        caption={truncate(caption, CAPTION_LIMIT.facebook)}
        artes={artes}
      />
    );
  }
  return (
    <LinkedInFeedPreview
      name={HANDLLES.linkedin}
      caption={truncate(caption, CAPTION_LIMIT.linkedin)}
      artes={artes}
      link={post.link}
    />
  );
}

function StoryPreview({ tab, artes }) {
  const [idx, setIdx] = useState(0);
  const list = artes.length ? artes : [null];
  const arte = list[idx] ?? list[0];
  const img = arte ? arteImageSrc(arte) : null;
  const label = tab === 'facebook' ? 'Movly' : 'sejamovly';

  return (
    <div className={`sc-mock sc-mock-story sc-mock-story--${tab}`}>
      <div className="sc-story-device" role="presentation">
        <div className="sc-story-notch" aria-hidden />
        <div className="sc-story-frame">
          <div className="sc-story-media">
            {img ? <img src={img} alt="" className="sc-story-img" /> : <div className="sc-story-placeholder" />}
          </div>
          <div className="sc-story-chrome">
            <SetupStoryBars total={list.length} active={idx} />
            <header className="sc-story-head">
              <span className="sc-story-avatar" />
              <span className="sc-story-user">{label}</span>
              <span className="sc-story-time">Agora</span>
            </header>
          </div>
          {arte?.interacao === 'link' ? (
            <div className="sc-story-sticker">🔗 QUERO A MOVLY</div>
          ) : null}
          {arte?.interacao === 'manual' ? (
            <p className="sc-story-hint">Figurinha interativa no app</p>
          ) : null}
          {list.length > 1 ? (
            <StoryNav
              idx={idx}
              total={list.length}
              onPrev={() => setIdx((i) => Math.max(0, i - 1))}
              onNext={() => setIdx((i) => Math.min(list.length - 1, i + 1))}
            />
          ) : null}
        </div>
      </div>
      <p className="sc-mock-caption-hint muted">Stories · formato 9:16 · {tab === 'facebook' ? 'Facebook' : 'Instagram'}</p>
    </div>
  );
}

function ReelPreview({ artes, caption }) {
  const arte = artes[0];
  const src = arte ? arteImageSrc(arte) : null;
  const isVideo = arte && isArteVideo(arte);

  return (
    <div className="sc-mock sc-mock-reel">
      <div className="sc-story-device">
        <div className="sc-story-notch" aria-hidden />
        <div className="sc-reel-frame">
          {src && isVideo ? (
            <video
              src={src}
              className="sc-reel-img sc-reel-video"
              controls
              playsInline
              muted
              loop
              preload="metadata"
            />
          ) : src ? (
            <img src={src} alt="" className="sc-reel-img" />
          ) : (
            <div className="sc-reel-placeholder">
              <span>Anexe o vídeo MP4 (9:16)</span>
            </div>
          )}
          <motionReelSidebar />
          <footer className="sc-reel-footer">
            <strong>sejamovly</strong>
            <p>{caption || 'Legenda do Reels…'}</p>
          </footer>
        </div>
      </div>
      <p className="sc-mock-caption-hint muted">Reels · formato 9:16</p>
    </div>
  );
}

function motionReelSidebar() {
  return (
    <div className="sc-reel-rail" aria-hidden>
      <Heart size={18} />
      <MessageCircle size={18} />
      <Send size={18} />
    </div>
  );
}

function InstagramFeedPreview({ handle, caption, artes }) {
  const [idx, setIdx] = useState(0);
  const list = artes.length ? artes : [null];
  const current = list[idx] ?? list[0];
  const img = current ? arteImageSrc(current) : null;

  return (
    <div className="sc-mock sc-mock-ig">
      <header className="sc-ig-head">
        <span className="sc-ig-avatar" />
        <div className="sc-ig-ident">
          <strong>{handle}</strong>
          <span className="sc-ig-loc muted">Brasil</span>
        </div>
        <MoreHorizontal size={16} className="sc-ig-more" />
      </header>
      <div className="sc-ig-media">
        {img ? <img src={img} alt="" className="sc-ig-img" /> : <MediaPlaceholder label="Arte do post" ratio="1" />}
        {list.length > 1 ? (
          <CarouselDots idx={idx} total={list.length} />
        ) : null}
      </div>
      {list.length > 1 ? (
        <CarouselNav idx={idx} total={list.length} onPrev={() => setIdx((i) => Math.max(0, i - 1))} onNext={() => setIdx((i) => Math.min(list.length - 1, i + 1))} />
      ) : null}
      <div className="sc-ig-actions">
        <span>
          <Heart size={16} /> <MessageCircle size={16} /> <Send size={16} />
        </span>
        <Bookmark size={16} />
      </div>
      <p className="sc-ig-likes muted">Curtido por movly.oficial e outros</p>
      <p className="sc-ig-caption">
        <strong>{handle}</strong> {caption || <span className="muted">Legenda e hashtags…</span>}
      </p>
    </div>
  );
}

function FacebookFeedPreview({ name, caption, artes }) {
  const arte = artes[0];
  const img = arte ? arteImageSrc(arte) : null;

  return (
    <div className="sc-mock sc-mock-fb">
      <header className="sc-fb-head">
        <span className="sc-fb-avatar" />
        <div>
          <strong>{name}</strong>
          <span className="sc-fb-meta muted">Agora · 🌐</span>
        </div>
        <MoreHorizontal size={16} />
      </header>
      <p className="sc-fb-text">{caption || <span className="muted">Texto do post…</span>}</p>
      {img ? <img src={img} alt="" className="sc-fb-img" /> : <MediaPlaceholder label="Imagem" ratio="landscape" />}
      <motionFbStats />
      <div className="sc-fb-actions">
        <span>
          <ThumbsUp size={14} /> Curtir
        </span>
        <span>Comentar</span>
        <span>
          <Share2 size={14} /> Compartilhar
        </span>
      </div>
    </div>
  );
}

function LinkedInFeedPreview({ name, caption, artes, link }) {
  const arte = artes[0];
  const img = arte ? arteImageSrc(arte) : null;

  return (
    <div className="sc-mock sc-mock-li">
      <header className="sc-li-head">
        <span className="sc-li-avatar" />
        <div>
          <strong>{name}</strong>
          <span className="sc-li-meta muted">academia · 1.234 seguidores</span>
          <span className="sc-li-meta muted">Agora · 🌐</span>
        </div>
        <MoreHorizontal size={16} />
      </header>
      <p className="sc-li-text">{caption || <span className="muted">Texto do post…</span>}</p>
      {img ? <img src={img} alt="" className="sc-li-img" /> : <MediaPlaceholder label="Imagem" ratio="landscape" />}
      {link ? <p className="sc-li-link muted">{link}</p> : null}
      <div className="sc-li-stats muted">42 · 8 comentários</div>
      <div className="sc-li-actions">
        <span>
          <ThumbsUp size={14} /> Gostei
        </span>
        <span>Comentar</span>
        <span>Compartilhar</span>
        <span>
          <Send size={14} /> Enviar
        </span>
      </div>
    </div>
  );
}

function motionFbStats() {
  return (
    <div className="sc-fb-stats muted">
      <span>👍 12</span>
      <span>3 comentários</span>
    </div>
  );
}

function SetupStoryBars({ total, active }) {
  return (
    <div className="sc-story-bars" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i <= active ? 'is-on' : ''} />
      ))}
    </div>
  );
}

function StoryNav({ idx, total, onPrev, onNext }) {
  return (
    <div className="sc-story-nav">
      <button type="button" onClick={onPrev} disabled={idx === 0} aria-label="Arte anterior">
        ‹
      </button>
      <span>
        {idx + 1}/{total}
      </span>
      <button type="button" onClick={onNext} disabled={idx >= total - 1} aria-label="Próxima arte">
        ›
      </button>
    </div>
  );
}

function CarouselNav({ idx, total, onPrev, onNext }) {
  return (
    <div className="sc-carousel-controls">
      <button type="button" onClick={onPrev} disabled={idx === 0} aria-label="Anterior">
        ‹
      </button>
      <span>
        {idx + 1}/{total}
      </span>
      <button type="button" onClick={onNext} disabled={idx >= total - 1} aria-label="Próxima">
        ›
      </button>
    </div>
  );
}

function CarouselDots({ idx, total }) {
  return (
    <div className="sc-carousel-dots" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={i === idx ? 'is-on' : ''} />
      ))}
    </div>
  );
}

function MediaPlaceholder({ label, ratio }) {
  return (
    <div className={`sc-media-ph sc-media-ph--${ratio}`}>
      <span>{label}</span>
    </div>
  );
}