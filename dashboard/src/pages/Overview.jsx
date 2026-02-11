import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';

export default function Overview() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [config, setConfig] = useState(null);
  const [guild, setGuild] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getConfig(guildId),
      api.getGuild(guildId),
    ])
      .then(([cfg, g]) => {
        setConfig(cfg);
        setGuild(g);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Overview</h1>
        <p className="page-description">
          Manage modules for {guild?.name || 'your server'}.
        </p>
      </div>

      {guild && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div className="server-card-icon" style={{ width: 56, height: 56, fontSize: 24 }}>
              {guild.icon ? (
                <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=128`} alt="" />
              ) : (
                guild.name[0]
              )}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700 }}>{guild.name}</h2>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 2 }}>
                {guild.channels?.length || 0} channels &middot; {guild.roles?.length || 0} roles
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="section">
        <div className="section-title">Modules</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div onClick={() => navigate(`/${guildId}/welcome`)} style={{ cursor: 'pointer' }}>
            <ModuleCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              }
              title="Welcome Messages"
              description="Send a custom welcome message when new members join your server."
              enabled={config?.welcome?.enabled || false}
              onToggle={async (e) => {
                e.stopPropagation();
                const updated = { ...config, welcome: { ...config.welcome, enabled: !config.welcome.enabled } };
                setConfig(updated);
                await api.updateWelcome(guildId, { enabled: !config.welcome.enabled });
              }}
            />
          </div>
          <div onClick={() => navigate(`/${guildId}/logs`)} style={{ cursor: 'pointer' }}>
            <ModuleCard
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                </svg>
              }
              title="Moderation Logs"
              description="Track member joins, leaves, message edits/deletes, bans, and more."
              enabled={config?.logs?.enabled || false}
              onToggle={async (e) => {
                e.stopPropagation();
                const updated = { ...config, logs: { ...config.logs, enabled: !config.logs.enabled } };
                setConfig(updated);
                await api.updateLogs(guildId, { enabled: !config.logs.enabled });
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
