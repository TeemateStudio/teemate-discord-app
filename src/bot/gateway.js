import WebSocket from 'ws';
import GuildConfig from '../models/GuildConfig.js';
import { DiscordRequest } from './utils.js';

const DISCORD_GATEWAY = 'wss://gateway.discord.gg/?v=10&encoding=json';

let ws = null;
let heartbeatInterval = null;
let sequence = null;
let sessionId = null;
let resumeGatewayUrl = null;

// Gateway intents: GUILDS | GUILD_MEMBERS | GUILD_MODERATION | GUILD_MESSAGES | MESSAGE_CONTENT
const INTENTS = (1 << 0) | (1 << 1) | (1 << 2) | (1 << 9) | (1 << 15);

function sendPayload(op, d) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ op, d }));
  }
}

function startHeartbeat(intervalMs) {
  clearInterval(heartbeatInterval);
  heartbeatInterval = setInterval(() => {
    sendPayload(1, sequence);
  }, intervalMs);
}

function identify() {
  sendPayload(2, {
    token: process.env.DISCORD_TOKEN,
    intents: INTENTS,
    properties: {
      os: 'linux',
      browser: 'teemate',
      device: 'teemate',
    },
  });
}

function resume() {
  sendPayload(6, {
    token: process.env.DISCORD_TOKEN,
    session_id: sessionId,
    seq: sequence,
  });
}

async function sendChannelMessage(channelId, content, embed) {
  const body = {};
  if (embed) {
    body.embeds = [embed];
    if (content) body.content = content;
  } else {
    body.content = content;
  }

  try {
    await DiscordRequest(`channels/${channelId}/messages`, {
      method: 'POST',
      body,
    });
  } catch (err) {
    console.error(`Failed to send message to ${channelId}:`, err.message);
  }
}

function replaceVars(text, member, guild) {
  return text
    .replace(/\{user\}/g, `<@${member.user.id}>`)
    .replace(/\{username\}/g, member.user.username)
    .replace(/\{server\}/g, guild?.name || 'the server');
}

async function handleGuildMemberAdd(data) {
  const { guild_id: guildId, user } = data;
  const config = await GuildConfig.findOne({ guildId });
  if (!config?.welcome?.enabled || !config.welcome.channelId) return;

  // Fetch guild name for variables
  let guildName = config.guildName;
  if (!guildName) {
    try {
      const res = await DiscordRequest(`guilds/${guildId}`, { method: 'GET' });
      const guild = await res.json();
      guildName = guild.name;
    } catch { guildName = 'the server'; }
  }

  const guildInfo = { name: guildName };
  const member = { user };

  const messageText = config.welcome.message
    ? replaceVars(config.welcome.message, member, guildInfo)
    : null;

  let embed = null;
  if (config.welcome.embedEnabled) {
    embed = {
      color: parseInt((config.welcome.embedColor || '#5865F2').replace('#', ''), 16),
      title: config.welcome.embedTitle
        ? replaceVars(config.welcome.embedTitle, member, guildInfo)
        : undefined,
      description: config.welcome.embedDescription
        ? replaceVars(config.welcome.embedDescription, member, guildInfo)
        : undefined,
      thumbnail: user.avatar
        ? { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128` }
        : undefined,
    };
  }

  await sendChannelMessage(config.welcome.channelId, messageText, embed);
}

async function handleGuildMemberRemove(data) {
  const { guild_id: guildId, user } = data;
  await logEvent(guildId, 'memberLeave', {
    color: 0xED4245,
    title: 'Member Left',
    description: `**${user.username}** left the server.`,
    thumbnail: user.avatar
      ? { url: `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=64` }
      : undefined,
    timestamp: new Date().toISOString(),
  });
}

async function handleMessageDelete(data) {
  const { guild_id: guildId, channel_id: channelId, id } = data;
  if (!guildId) return;
  await logEvent(guildId, 'messageDelete', {
    color: 0xED4245,
    title: 'Message Deleted',
    description: `A message was deleted in <#${channelId}>.`,
    fields: [{ name: 'Message ID', value: id, inline: true }],
    timestamp: new Date().toISOString(),
  });
}

async function handleMessageUpdate(data) {
  const { guild_id: guildId, channel_id: channelId, author, content } = data;
  if (!guildId || !author) return;
  await logEvent(guildId, 'messageEdit', {
    color: 0xFEE75C,
    title: 'Message Edited',
    description: `A message by **${author.username}** was edited in <#${channelId}>.`,
    fields: content ? [{ name: 'New Content', value: content.substring(0, 1024) }] : [],
    timestamp: new Date().toISOString(),
  });
}

async function handleGuildBanAdd(data) {
  const { guild_id: guildId, user } = data;
  await logEvent(guildId, 'ban', {
    color: 0xED4245,
    title: 'Member Banned',
    description: `**${user.username}** was banned.`,
    timestamp: new Date().toISOString(),
  });
}

async function handleGuildBanRemove(data) {
  const { guild_id: guildId, user } = data;
  await logEvent(guildId, 'ban', {
    color: 0x57F287,
    title: 'Member Unbanned',
    description: `**${user.username}** was unbanned.`,
    timestamp: new Date().toISOString(),
  });
}

async function handleChannelUpdate(data) {
  const { guild_id: guildId, name } = data;
  if (!guildId) return;
  await logEvent(guildId, 'channelChange', {
    color: 0x5865F2,
    title: 'Channel Updated',
    description: `Channel **#${name}** was updated.`,
    timestamp: new Date().toISOString(),
  });
}

async function handleGuildRoleUpdate(data) {
  const { guild_id: guildId, role } = data;
  await logEvent(guildId, 'roleChange', {
    color: 0x5865F2,
    title: 'Role Updated',
    description: `Role **${role.name}** was updated.`,
    timestamp: new Date().toISOString(),
  });
}

async function logEvent(guildId, eventType, embed) {
  try {
    const config = await GuildConfig.findOne({ guildId });
    if (!config?.logs?.enabled || !config.logs.channelId) return;
    if (!config.logs.events?.[eventType]) return;

    await sendChannelMessage(config.logs.channelId, null, embed);
  } catch (err) {
    console.error(`Log event error (${eventType}):`, err.message);
  }
}

const EVENT_HANDLERS = {
  GUILD_MEMBER_ADD: handleGuildMemberAdd,
  GUILD_MEMBER_REMOVE: handleGuildMemberRemove,
  MESSAGE_DELETE: handleMessageDelete,
  MESSAGE_UPDATE: handleMessageUpdate,
  GUILD_BAN_ADD: handleGuildBanAdd,
  GUILD_BAN_REMOVE: handleGuildBanRemove,
  CHANNEL_UPDATE: handleChannelUpdate,
  GUILD_ROLE_UPDATE: handleGuildRoleUpdate,
};

function connect(url) {
  ws = new WebSocket(url || DISCORD_GATEWAY);

  ws.on('open', () => {
    console.log('Gateway connected');
  });

  ws.on('message', (raw) => {
    const payload = JSON.parse(raw);
    const { op, t, s, d } = payload;

    if (s) sequence = s;

    switch (op) {
      case 10: // Hello
        startHeartbeat(d.heartbeat_interval);
        if (sessionId && sequence) {
          resume();
        } else {
          identify();
        }
        break;

      case 11: // Heartbeat ACK
        break;

      case 7: // Reconnect
        ws.close();
        break;

      case 9: // Invalid Session
        sessionId = null;
        sequence = null;
        setTimeout(identify, 2000);
        break;

      case 0: // Dispatch
        if (t === 'READY') {
          sessionId = d.session_id;
          resumeGatewayUrl = d.resume_gateway_url;
          console.log(`Gateway ready as ${d.user.username}`);
        }

        if (EVENT_HANDLERS[t]) {
          EVENT_HANDLERS[t](d).catch((err) => {
            console.error(`Event handler error (${t}):`, err.message);
          });
        }
        break;
    }
  });

  ws.on('close', (code) => {
    clearInterval(heartbeatInterval);
    console.log(`Gateway closed (${code}), reconnecting...`);

    // Reconnect after a delay
    const reconnectUrl = resumeGatewayUrl ? `${resumeGatewayUrl}/?v=10&encoding=json` : DISCORD_GATEWAY;
    setTimeout(() => connect(reconnectUrl), 3000);
  });

  ws.on('error', (err) => {
    console.error('Gateway error:', err.message);
  });
}

export function startGateway() {
  console.log('Starting Discord Gateway...');
  connect();
}
