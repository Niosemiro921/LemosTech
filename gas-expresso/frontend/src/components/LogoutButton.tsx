import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { extractMessage, logout } from '../services/auth';

interface LogoutButtonProps {
  className?: string;
  label?: string;
}

export function LogoutButton({ className = 'secondary-btn full', label = 'Terminar sessão' }: LogoutButtonProps) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleLogout() {
    setBusy(true);
    setError('');
    try {
      await logout();
      navigate('/login', { replace: true });
    } catch (cause) {
      setError(extractMessage(cause, 'Não foi possível terminar a sessão.'));
      setBusy(false);
    }
  }

  return (
    <div className="logout-control">
      {error && <span className="logout-error" role="alert">{error}</span>}
      <button className={className} type="button" onClick={() => void handleLogout()} disabled={busy}>
        {busy ? 'A terminar…' : label}
      </button>
    </div>
  );
}
