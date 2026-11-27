import { Mail, RotateCcw } from 'lucide-react';
import { CrudRowMenu } from '../crud/CrudRowMenu.jsx';

export function NetworkPartnerRowMenu({
  row,
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onDelete,
  onInvite,
  inviteLabel = 'Convite',
  inviteDisabled = false,
}) {
  const extraItems = [];
  if (onInvite) {
    const Icon = inviteLabel.startsWith('Reenviar') ? RotateCcw : Mail;
    extraItems.push({
      key: 'invite',
      label: inviteLabel,
      icon: Icon,
      onClick: onInvite,
      disabled: inviteDisabled,
    });
  }

  return (
    <CrudRowMenu
      isOpen={isOpen}
      onToggle={onToggle}
      onClose={onClose}
      onView={onView}
      onEdit={onEdit}
      onDelete={onDelete}
      extraItems={extraItems}
    />
  );
}