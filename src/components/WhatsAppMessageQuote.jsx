export function WhatsAppMessageQuote({ quote, isOutgoing = false }) {
  if (!quote?.body?.trim()) return null;

  const author = String(quote.author ?? '').trim();
  const body = String(quote.body ?? '').trim();

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
