import { Avatar } from '../Avatar.jsx';

export function CronogramaOwnerAvatars({ entries }) {
  if (!entries?.length) {
    return <span className="cronograma-owners cronograma-owners--empty muted" aria-hidden="true">—</span>;
  }

  const title = entries.map((e) => e.label).join(', ');

  return (
    <div className="cronograma-owners" title={title} aria-label={`Responsáveis: ${title}`}>
      {entries.map((entry, index) => (
        <Avatar
          key={`${entry.label}-${index}`}
          name={entry.label}
          src={entry.user?.avatarUrl}
          color={entry.user?.avatarColor}
          size="xs"
          className="cronograma-owners__avatar"
          title={entry.label}
        />
      ))}
    </div>
  );
}