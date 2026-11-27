import { Link2 } from 'lucide-react';
import { CrudRowMenu } from '../crud/CrudRowMenu.jsx';

export function CompanyRowMenu({
  isOpen,
  onToggle,
  onClose,
  onView,
  onEdit,
  onDelete,
  onCopyOnboarding,
  onboardingLabel = 'Copiar link de onboarding',
  onboardingDisabled = false,
}) {
  const extraItems = [];
  if (onCopyOnboarding) {
    extraItems.push({
      key: 'onboarding',
      label: onboardingLabel,
      icon: Link2,
      onClick: onCopyOnboarding,
      disabled: onboardingDisabled,
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