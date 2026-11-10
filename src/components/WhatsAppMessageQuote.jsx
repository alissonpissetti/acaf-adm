const MEDIA_LABELS = {
  image: '[imagem]',
  video: '[vídeo]',
  audio: '[áudio]',
  document: '[documento]',
  sticker: '[figurinha]',
};

export function WhatsAppMessageQuote({ quote, isOutgoing = false }) {
  if (!quote) return null;

  const author = String(quote.author ?? '').trim();
  const mediaKind = String(quote.mediaKind ?? '').trim();
  const rawBody = String(quote.body ?? '').trim();
  const body = rawBody || (mediaKind ? MEDIA_LABELS[mediaKind] ?? '[mídia]' : '');
  if (!body) return null;

  return (
    <blockquote
      className={`whatsapp-wa-quote${isOutgoing ? ' whatsapp-wa-quote--out' : ' whatsapp-wa-quote--in'}`}
    >
      {author ? <span className="whatsapp-wa-quote__author">{author}</span> : null}
      <span className="whatsapp-wa-quote__body" title={body}>
        {body}
      </span>
    </blockquote>
  );
}
