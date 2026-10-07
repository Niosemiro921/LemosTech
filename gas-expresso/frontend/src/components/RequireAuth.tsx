import { useEffect } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
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

interface RequireAuthProps { children: React.ReactElement; roles?: AccountRole[]; allowPendingProfessional?: boolean; }

export function RequireAuth({ children, roles, allowPendingProfessional = false }: RequireAuthProps) {
  const location = useLocation();
  const authenticated = isAuthenticated();
  const localUser = getCurrentUser();
  const hasToken = Boolean(getSession()?.accessToken);
  const { data, isError, isFetching } = useQuery({
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
    clearSession();
    return <Navigate to="/login" replace state={{ from }} />;
  }
  if (!user) return <Navigate to="/login" replace state={{ from }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={rolePath(user.role)} replace />;
  if (!allowPendingProfessional && (user.role === 'DRIVER' || user.role === 'SUPPLIER') && user.status !== 'ACTIVE') {
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
