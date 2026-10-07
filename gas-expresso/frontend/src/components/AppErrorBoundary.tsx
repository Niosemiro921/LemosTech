import { Component, ErrorInfo, ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface Props { children: ReactNode }
interface State { hasError: boolean }

export class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Gás Expresso UI error', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    return (
      <div className="page app-error-page">
        <div className="app-error-card">
          <span className="section-kicker">Falha inesperada</span>
          <h1>Não foi possível abrir esta área.</h1>
          <p>A interface encontrou um erro inesperado. Recarregue a aplicação ou volte ao início para continuar.</p>
          <div className="app-error-actions">
            <button className="primary-btn" onClick={() => window.location.reload()}>Recarregar</button>
            <Link className="secondary-btn" to="/">Voltar ao início</Link>
          </div>
        </div>
      </div>
    );
  }
}
