import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import ModuleCard from '../components/ModuleCard.jsx';
import ChannelSelect from '../components/ChannelSelect.jsx';
import SaveBar from '../components/SaveBar.jsx';

const EVENT_LABELS = {
  memberJoin: 'Member Join',
  memberLeave: 'Member Leave',
  messageDelete: 'Message Delete',
  messageEdit: 'Message Edit',
  roleChange: 'Role Change',
  channelChange: 'Channel Change',
  ban: 'Ban',
  kick: 'Kick',
};

export default function Logs() {
  const { guildId } = useParams();
  const [config, setConfig] = useState(null);
  const [original, setOriginal] = useState(null);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.getLogs(guildId),
      api.getGuild(guildId),
    ])
      .then(([logs, guild]) => {
        setConfig(logs);
        setOriginal(JSON.stringify(logs));
        setChannels(guild.channels || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

  const hasChanges = config && JSON.stringify(config) !== original;

  function updateField(field, value) {
    setConfig((prev) => ({ ...prev, [field]: value }));
  }

  function toggleEvent(event) {
    setConfig((prev) => ({
      ...prev,
      events: { ...prev.events, [event]: !prev.events[event] },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const result = await api.updateLogs(guildId, config);
      setConfig(result);
      setOriginal(JSON.stringify(result));
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig(JSON.parse(original));
  }

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
        <h1 className="page-title">Moderation Logs</h1>
        <p className="page-description">
          Track server events and send them to a log channel.
        </p>
      </div>

      <ModuleCard
        icon={
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        }
        title="Logs Module"
        description="Enable or disable moderation logs for this server."
        enabled={config?.enabled || false}
        onToggle={() => updateField('enabled', !config.enabled)}
      />

      {config?.enabled && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Log Channel</div>
            </div>
            <ChannelSelect
              channels={channels}
              value={config.channelId}
              onChange={(v) => updateField('channelId', v)}
              placeholder="Select a log channel"
            />
          </div>

          <div className="card" style={{ marginTop: 16 }}>
            <div className="card-header">
              <div className="card-title">Events</div>
              <div className="card-description">Choose which events to log.</div>
            </div>
            <div className="event-grid">
              {Object.entries(EVENT_LABELS).map(([key, label]) => (
                <label key={key} className="event-item">
                  <input
                    type="checkbox"
                    checked={config.events?.[key] ?? true}
                    onChange={() => toggleEvent(key)}
                  />
                  <span className="event-item-label">{label}</span>
                </label>
              ))}
            </div>
          </div>
        </>
      )}

      <SaveBar
        show={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
      />
    </div>
  );
}
