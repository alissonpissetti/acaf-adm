export function AppLoading({ label = 'Carregando…', compact = false }) {
  return (
    <div className={compact ? 'app-loading app-loading-compact' : 'app-loading'} role="status">
      <span className="app-loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function AppLoadingPanel({ label = 'Carregando…' }) {
  return (
    <section className="panel">
      <div className="panel-body">
        <AppLoading label={label} />
      </div>
    </section>
  );
}
