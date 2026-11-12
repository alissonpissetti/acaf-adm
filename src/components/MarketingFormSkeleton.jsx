import { buildPageBackgroundStyle } from '../utils/marketingFormBuilder.js';
import '../styles/marketing.css';

export function MarketingFormSkeleton() {
  return (
    <div className="marketing-public-page" style={buildPageBackgroundStyle()}>
      <div className="marketing-public-card marketing-form-skeleton" aria-busy="true" aria-label="Carregando formulário">
        <div className="marketing-form-skeleton-cover" />
        <div className="marketing-form-skeleton-body">
          <div className="marketing-form-skeleton-line marketing-form-skeleton-line-lg" />
          <div className="marketing-form-skeleton-line marketing-form-skeleton-line-md" />
          <div className="marketing-form-skeleton-line" />
          <div className="marketing-form-skeleton-line" />
          <div className="marketing-form-skeleton-line marketing-form-skeleton-button" />
        </div>
      </div>
    </div>
  );
}
