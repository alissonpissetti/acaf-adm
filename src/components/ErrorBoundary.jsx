import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Erro de renderização:', error, info);
  }

  render() {
    const { error } = this.state;
    if (error) {
      return (
        <div className="auth-loading">
          <div style={{ maxWidth: '32rem', padding: '1rem', textAlign: 'center' }}>
            <h1 style={{ fontSize: '1.125rem', marginBottom: '0.5rem' }}>Algo deu errado ao carregar a tela</h1>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1rem' }}>
              {error.message || 'Erro inesperado na interface.'}
            </p>
            <button type="button" className="btn-primary btn-sm" onClick={() => window.location.reload()}>
              Recarregar página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
