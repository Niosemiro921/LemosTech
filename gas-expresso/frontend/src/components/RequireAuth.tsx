import { useEffect } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  clearSession,
  fetchMe,
  getCurrentUser,
  getSession,
  isAuthenticated,
  rolePath,
  type AccountRole,
} from '../services/auth';
import { ApiError } from '../lib/api';

interface RequireAuthProps { children: React.ReactElement; roles?: AccountRole[]; allowPendingProfessional?: boolean; }

export function RequireAuth({ children, roles, allowPendingProfessional = false }: RequireAuthProps) {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const localUser = getCurrentUser();
  const hasToken = Boolean(getSession()?.accessToken);
  const { data, error, isError, isFetching, refetch } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchMe,
    enabled: authenticated && hasToken,
    staleTime: 30_000,
    retry: (count, error) => {
      const status = (error as { status?: number })?.status;
      if (status === 401 || status === 403) return false;
      return count < 1;
    },
  });

  const user = data ?? localUser;
  const from = `${location.pathname}${location.search}${location.hash}`;

  if (!authenticated || !hasToken) {
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (isFetching && !user) {
    return <div className="page auth-page"><div className="auth-card loading-panel" role="status">A validar sessão…</div></div>;
  }
  if (isError) {
    // Só terminamos a sessão quando o servidor recusa as credenciais.
    // Um 500 ou falha de rede não pode desligar o utilizador: mostramos o problema com opção de repetir.
    const status = error instanceof ApiError ? error.status : undefined;
    if (status === 401 || status === 403) {
      clearSession();
      return <Navigate to="/login" replace state={{ from }} />;
    }
    return (
      <div className="page auth-page">
        <div className="status-page-card" role="alert">
          <div className="status-hero-icon status-warning">!</div>
          <span className="section-kicker">Sessão por confirmar</span>
          <h1>Não foi possível confirmar a sua sessão.</h1>
          <p>O servidor não respondeu como esperado. A sua sessão continua guardada neste dispositivo — pode tentar novamente.</p>
          <div className="status-actions">
            <button className="primary-btn" disabled={isFetching} onClick={() => void refetch()}>{isFetching ? 'A tentar…' : 'Tentar novamente'}</button>
            <Link to="/acesso" className="secondary-btn">Voltar às áreas</Link>
          </div>
        </div>
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace state={{ from }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={rolePath(user.role)} replace />;
  if (!allowPendingProfessional && (user.role === 'DRIVER' || user.role === 'PRESTADOR' || user.role === 'SUPPLIER') && user.status !== 'ACTIVE') {
    return <Navigate to="/estado-candidatura" replace />;
  }
  return children;
}

export function useRequireAuthenticatedUser() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (!isAuthenticated()) navigate('/login', { replace: true, state: { from: `${location.pathname}${location.search}${location.hash}` } });
  }, [location.hash, location.pathname, location.search, navigate]);
}
