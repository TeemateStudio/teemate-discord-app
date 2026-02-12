import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client.js';
import EmbedEditor from '../components/EmbedEditor.jsx';

function intToHex(color) {
  if (color == null) return '#5865F2';
  return '#' + color.toString(16).padStart(6, '0');
}

const DEFAULT_DATA = {
  title: '',
  description: '',
  url: '',
  color: 0x5865F2,
  timestamp: false,
  author: { name: '', url: '', icon_url: '' },
  footer: { text: '', icon_url: '' },
  thumbnail: { url: '' },
  image: { url: '' },
  fields: [],
};

export default function Embeds() {
  const { guildId } = useParams();
  const [embeds, setEmbeds] = useState([]);
  const [channels, setChannels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, 'new' | embed object
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);

  // Editor state
  const [name, setName] = useState('');
  const [data, setData] = useState(DEFAULT_DATA);
  const [channelId, setChannelId] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getEmbeds(guildId),
      api.getGuild(guildId),
    ])
      .then(([embs, guild]) => {
        setEmbeds(embs);
        setChannels(guild.channels || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [guildId]);

  function openNew() {
    setEditing('new');
    setName('');
    setData({ ...DEFAULT_DATA, fields: [] });
    setChannelId(null);
    setError(null);
  }

  function openEdit(embed) {
    setEditing(embed);
    setName(embed.name);
    setData(JSON.parse(JSON.stringify(embed.data)));
    setChannelId(embed.channelId);
    setError(null);
  }

  function closeEditor() {
    setEditing(null);
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      if (editing === 'new') {
        const created = await api.createEmbed(guildId, { name, data, channelId });
        setEmbeds((prev) => [created, ...prev]);
        setEditing(created);
      } else {
        const updated = await api.updateEmbed(guildId, editing._id, { name, data, channelId });
        setEmbeds((prev) => prev.map((e) => (e._id === updated._id ? updated : e)));
        setEditing(updated);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(embed) {
    if (!confirm(`Delete embed "${embed.name}"?`)) return;
    try {
      await api.deleteEmbed(guildId, embed._id);
      setEmbeds((prev) => prev.filter((e) => e._id !== embed._id));
      if (editing && editing._id === embed._id) setEditing(null);
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleSend() {
    if (!editing || editing === 'new') return;
    setSending(true);
    setError(null);
    try {
      await api.sendEmbed(guildId, editing._id, channelId);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  // Editor mode
  if (editing) {
    return (
      <div>
        <div className="page-header">
          <h1 className="page-title">
            {editing === 'new' ? 'New Embed' : `Edit: ${editing.name}`}
          </h1>
          <p className="page-description">
            Build a Discord embed and send it to any channel.
          </p>
        </div>

        {error && <div className="ee-error">{error}</div>}

        <EmbedEditor
          name={name}
          data={data}
          channelId={channelId}
          channels={channels}
          onNameChange={setName}
          onDataChange={setData}
          onChannelChange={setChannelId}
          onSave={handleSave}
          onCancel={closeEditor}
          onSend={handleSend}
          saving={saving}
          sending={sending}
          isNew={editing === 'new'}
        />
      </div>
    );
  }

  // List mode
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1 className="page-title">Embeds</h1>
          <p className="page-description">
            Create, save and send rich embeds to any channel.
          </p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>+ New Embed</button>
      </div>

      {error && <div className="ee-error">{error}</div>}

      {embeds.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: 48 }}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 48, height: 48, color: 'var(--text-muted)', margin: '0 auto 16px' }}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <line x1="3" y1="9" x2="21" y2="9" />
            <line x1="9" y1="21" x2="9" y2="9" />
          </svg>
          <p style={{ color: 'var(--text-secondary)', marginBottom: 16 }}>No embeds yet</p>
          <button className="btn btn-primary" onClick={openNew}>Create your first embed</button>
        </div>
      ) : (
        <div className="embeds-grid">
          {embeds.map((embed) => (
            <div key={embed._id} className="embed-card" style={{ '--embed-color': intToHex(embed.data?.color) }}>
              <div className="embed-card-color" />
              <div className="embed-card-body">
                <div className="embed-card-name">{embed.name}</div>
                <div className="embed-card-desc">
                  {embed.data?.description
                    ? (embed.data.description.length > 80
                      ? embed.data.description.slice(0, 80) + '...'
                      : embed.data.description)
                    : embed.data?.title || 'No content'}
                </div>
                <div className="embed-card-meta">
                  {new Date(embed.updatedAt).toLocaleDateString()}
                </div>
              </div>
              <div className="embed-card-actions">
                <button className="btn btn-ghost btn-sm" onClick={() => openEdit(embed)}>Edit</button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleDelete(embed)}>
                  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="var(--danger)" strokeWidth="2"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
