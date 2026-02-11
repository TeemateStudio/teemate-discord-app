import { Link } from 'react-router-dom';
import { useAuth } from './ProtectedRoute.jsx';
import { api } from '../api/client.js';

function getAvatarUrl(user) {
  if (!user.avatar) return null;
  return `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64`;
}

export default function Header() {
  const user = useAuth();

  async function handleLogout() {
    await api.logout();
    window.location.href = '/dashboard';
  }

  return (
    <header className="header">
      <Link to="/servers" className="header-logo">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 14s1.5 2 4 2 4-2 4-2" />
          <line x1="9" y1="9" x2="9.01" y2="9" />
          <line x1="15" y1="9" x2="15.01" y2="9" />
        </svg>
        Teemate
      </Link>
      <div className="header-user">
        <span className="header-username">{user.username}</span>
        {getAvatarUrl(user) && (
          <img className="header-avatar" src={getAvatarUrl(user)} alt="" />
        )}
        <button className="btn btn-ghost" onClick={handleLogout} style={{ fontSize: '13px', padding: '6px 12px' }}>
          Logout
        </button>
      </div>
    </header>
  );
}
