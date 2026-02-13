const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (res.status === 401) {
    window.location.href = '/dashboard';
    return null;
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(err.error || 'Request failed');
  }

  return res.json();
}

export const api = {
  // Auth
  getMe: () => request('/auth/me'),
  logout: () => request('/auth/logout', { method: 'POST' }),

  // Guilds
  getGuilds: () => request('/guilds'),
  getGuild: (id) => request(`/guilds/${id}`),
  getConfig: (id) => request(`/guilds/${id}/config`),
  updateConfig: (id, data) => request(`/guilds/${id}/config`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Welcome
  getWelcome: (id) => request(`/guilds/${id}/welcome`),
  updateWelcome: (id, data) => request(`/guilds/${id}/welcome`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Logs
  getLogs: (id) => request(`/guilds/${id}/logs`),
  updateLogs: (id, data) => request(`/guilds/${id}/logs`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Onboarding
  getOnboarding: (id) => request(`/guilds/${id}/onboarding`),
  updateOnboarding: (id, data) => request(`/guilds/${id}/onboarding`, { method: 'PATCH', body: JSON.stringify(data) }),
  testOnboarding: (id) => request(`/guilds/${id}/onboarding/test`, { method: 'POST' }),

  // Embeds
  getEmbeds: (id) => request(`/guilds/${id}/embeds`),
  createEmbed: (id, data) => request(`/guilds/${id}/embeds`, { method: 'POST', body: JSON.stringify(data) }),
  updateEmbed: (id, embedId, data) => request(`/guilds/${id}/embeds/${embedId}`, { method: 'PATCH', body: JSON.stringify(data) }),
  deleteEmbed: (id, embedId) => request(`/guilds/${id}/embeds/${embedId}`, { method: 'DELETE' }),
  sendEmbed: (id, embedId, channelId) => request(`/guilds/${id}/embeds/${embedId}/send`, { method: 'POST', body: JSON.stringify({ channelId }) }),
};
