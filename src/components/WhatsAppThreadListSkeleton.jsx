const ROW_COUNT = 9;

function SkeletonRow({ index }) {
  const wide = index % 3 === 0;
  const previewW = index % 4 === 1 ? '72%' : index % 4 === 2 ? '58%' : '84%';
  return (
    <li className="whatsapp-wa-chat-skeleton-row" aria-hidden="true">
      <span className="whatsapp-wa-skeleton whatsapp-wa-skeleton--avatar" />
      <span className="whatsapp-wa-chat-skeleton-row__body">
        <span className="whatsapp-wa-chat-skeleton-row__top">
          <span
            className="whatsapp-wa-skeleton whatsapp-wa-skeleton--line"
            style={{ width: wide ? '62%' : '48%' }}
          />
          <span className="whatsapp-wa-skeleton whatsapp-wa-skeleton--time" />
        </span>
        <span className="whatsapp-wa-skeleton whatsapp-wa-skeleton--line whatsapp-wa-skeleton--meta" />
        <span
          className="whatsapp-wa-skeleton whatsapp-wa-skeleton--line whatsapp-wa-skeleton--preview"
          style={{ width: previewW }}
        />
      </span>
    </li>
  );
}

export function WhatsAppThreadListSkeleton() {
  return (
    <ul className="whatsapp-wa-chats whatsapp-wa-chat-skeleton" aria-label="Carregando conversas" aria-busy="true">
      {Array.from({ length: ROW_COUNT }, (_, i) => (
        <SkeletonRow key={i} index={i} />
      ))}
    </ul>
  );
}
