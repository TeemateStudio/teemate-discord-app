import { Router } from 'express';
import { requireGuildAdmin } from './middleware.js';
import GuildConfig from '../models/GuildConfig.js';
import Embed from '../models/Embed.js';
import { DiscordRequest } from '../bot/utils.js';

const router = Router();

/**
 * GET /api/guilds - List user's guilds (filtered: admin + bot present)
 */
router.get('/', async (req, res) => {
  try {
    // Filter guilds where user has admin or owner
    const adminGuilds = req.session.guilds.filter((g) => {
      const perms = BigInt(g.permissions);
      return g.owner || (perms & 0x8n) === 0x8n;
    });

    // Check which guilds the bot is in
    const botGuilds = [];
    for (const guild of adminGuilds) {
      try {
        await DiscordRequest(`guilds/${guild.id}`, { method: 'GET' });
        botGuilds.push({
          id: guild.id,
          name: guild.name,
          icon: guild.icon,
          owner: guild.owner,
        });
      } catch {
        // Bot not in this guild, skip
      }
    }

    res.json(botGuilds);
  } catch (err) {
    console.error('Error fetching guilds:', err);
    res.status(500).json({ error: 'Failed to fetch guilds' });
  }
});

/**
 * GET /api/guilds/:id - Guild details (channels, roles)
 */
router.get('/:id', requireGuildAdmin, async (req, res) => {
  try {
    const [channelsRes, rolesRes] = await Promise.all([
      DiscordRequest(`guilds/${req.params.id}/channels`, { method: 'GET' }),
      DiscordRequest(`guilds/${req.params.id}/roles`, { method: 'GET' }),
    ]);

    const channels = await channelsRes.json();
    const roles = await rolesRes.json();

    // Filter to text channels only (type 0) and sort by position
    const textChannels = channels
      .filter((c) => c.type === 0)
      .sort((a, b) => a.position - b.position)
      .map((c) => ({ id: c.id, name: c.name, position: c.position }));

    const sortedRoles = roles
      .filter((r) => r.id !== req.params.id) // Exclude @everyone
      .sort((a, b) => b.position - a.position)
      .map((r) => ({ id: r.id, name: r.name, color: r.color, position: r.position }));

    res.json({
      id: req.guild.id,
      name: req.guild.name,
      icon: req.guild.icon,
      channels: textChannels,
      roles: sortedRoles,
    });
  } catch (err) {
    console.error('Error fetching guild details:', err);
    res.status(500).json({ error: 'Failed to fetch guild details' });
  }
});

/**
 * GET /api/guilds/:id/config - Get guild config
 */
router.get('/:id/config', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config);
  } catch (err) {
    console.error('Error fetching config:', err);
    res.status(500).json({ error: 'Failed to fetch config' });
  }
});

/**
 * PATCH /api/guilds/:id/config - Update guild config
 */
router.patch('/:id/config', requireGuildAdmin, async (req, res) => {
  try {
    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { ...req.body, updatedBy: req.session.userId, guildName: req.guild.name },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config);
  } catch (err) {
    console.error('Error updating config:', err);
    res.status(500).json({ error: 'Failed to update config' });
  }
});

/**
 * GET /api/guilds/:id/welcome - Get welcome config
 */
router.get('/:id/welcome', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config.welcome);
  } catch (err) {
    console.error('Error fetching welcome config:', err);
    res.status(500).json({ error: 'Failed to fetch welcome config' });
  }
});

/**
 * PATCH /api/guilds/:id/welcome - Update welcome config
 */
router.patch('/:id/welcome', requireGuildAdmin, async (req, res) => {
  try {
    const update = {};
    for (const [key, value] of Object.entries(req.body)) {
      update[`welcome.${key}`] = value;
    }
    update.updatedBy = req.session.userId;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config.welcome);
  } catch (err) {
    console.error('Error updating welcome config:', err);
    res.status(500).json({ error: 'Failed to update welcome config' });
  }
});

/**
 * GET /api/guilds/:id/logs - Get logs config
 */
router.get('/:id/logs', requireGuildAdmin, async (req, res) => {
  try {
    let config = await GuildConfig.findOne({ guildId: req.params.id });
    if (!config) {
      config = await GuildConfig.create({
        guildId: req.params.id,
        guildName: req.guild.name,
      });
    }
    res.json(config.logs);
  } catch (err) {
    console.error('Error fetching logs config:', err);
    res.status(500).json({ error: 'Failed to fetch logs config' });
  }
});

/**
 * PATCH /api/guilds/:id/logs - Update logs config
 */
router.patch('/:id/logs', requireGuildAdmin, async (req, res) => {
  try {
    const update = {};
    for (const [key, value] of Object.entries(req.body)) {
      if (key === 'events' && typeof value === 'object') {
        for (const [event, enabled] of Object.entries(value)) {
          update[`logs.events.${event}`] = enabled;
        }
      } else {
        update[`logs.${key}`] = value;
      }
    }
    update.updatedBy = req.session.userId;

    const config = await GuildConfig.findOneAndUpdate(
      { guildId: req.params.id },
      { $set: update },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(config.logs);
  } catch (err) {
    console.error('Error updating logs config:', err);
    res.status(500).json({ error: 'Failed to update logs config' });
  }
});

// ── Embeds CRUD ──

function validateEmbedData(data) {
  const errors = [];
  let totalChars = 0;

  if (data.title) totalChars += data.title.length;
  if (data.description) totalChars += data.description.length;
  if (data.author?.name) totalChars += data.author.name.length;
  if (data.footer?.text) totalChars += data.footer.text.length;
  if (data.fields) {
    if (data.fields.length > 25) errors.push('Maximum 25 fields allowed');
    for (const f of data.fields) {
      totalChars += (f.name || '').length + (f.value || '').length;
    }
  }
  if (totalChars > 6000) errors.push(`Total characters (${totalChars}) exceeds 6000 limit`);

  return errors;
}

/**
 * GET /api/guilds/:id/embeds - List embeds for a guild
 */
router.get('/:id/embeds', requireGuildAdmin, async (req, res) => {
  try {
    const embeds = await Embed.find({ guildId: req.params.id }).sort({ updatedAt: -1 });
    res.json(embeds);
  } catch (err) {
    console.error('Error fetching embeds:', err);
    res.status(500).json({ error: 'Failed to fetch embeds' });
  }
});

/**
 * POST /api/guilds/:id/embeds - Create an embed
 */
router.post('/:id/embeds', requireGuildAdmin, async (req, res) => {
  try {
    const { name, data, channelId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Embed name is required' });
    }

    if (data) {
      const errors = validateEmbedData(data);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const embed = await Embed.create({
      guildId: req.params.id,
      name: name.trim(),
      data: data || {},
      channelId: channelId || null,
      createdBy: req.session.userId,
      updatedBy: req.session.userId,
    });
    res.status(201).json(embed);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An embed with this name already exists' });
    }
    console.error('Error creating embed:', err);
    res.status(500).json({ error: 'Failed to create embed' });
  }
});

/**
 * PATCH /api/guilds/:id/embeds/:embedId - Update an embed
 */
router.patch('/:id/embeds/:embedId', requireGuildAdmin, async (req, res) => {
  try {
    const { name, data, channelId } = req.body;

    if (data) {
      const errors = validateEmbedData(data);
      if (errors.length) return res.status(400).json({ error: errors.join(', ') });
    }

    const update = { updatedBy: req.session.userId };
    if (name !== undefined) update.name = name.trim();
    if (data !== undefined) update.data = data;
    if (channelId !== undefined) update.channelId = channelId;

    const embed = await Embed.findOneAndUpdate(
      { _id: req.params.embedId, guildId: req.params.id },
      update,
      { new: true, runValidators: true }
    );

    if (!embed) return res.status(404).json({ error: 'Embed not found' });
    res.json(embed);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'An embed with this name already exists' });
    }
    console.error('Error updating embed:', err);
    res.status(500).json({ error: 'Failed to update embed' });
  }
});

/**
 * DELETE /api/guilds/:id/embeds/:embedId - Delete an embed
 */
router.delete('/:id/embeds/:embedId', requireGuildAdmin, async (req, res) => {
  try {
    const embed = await Embed.findOneAndDelete({
      _id: req.params.embedId,
      guildId: req.params.id,
    });
    if (!embed) return res.status(404).json({ error: 'Embed not found' });
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting embed:', err);
    res.status(500).json({ error: 'Failed to delete embed' });
  }
});

/**
 * POST /api/guilds/:id/embeds/:embedId/send - Send embed to a channel
 */
router.post('/:id/embeds/:embedId/send', requireGuildAdmin, async (req, res) => {
  try {
    const embed = await Embed.findOne({
      _id: req.params.embedId,
      guildId: req.params.id,
    });
    if (!embed) return res.status(404).json({ error: 'Embed not found' });

    const channelId = req.body.channelId || embed.channelId;
    if (!channelId) return res.status(400).json({ error: 'No channel specified' });

    // Build clean Discord embed object
    const discordEmbed = {};
    if (embed.data.title) discordEmbed.title = embed.data.title;
    if (embed.data.description) discordEmbed.description = embed.data.description;
    if (embed.data.url) discordEmbed.url = embed.data.url;
    if (embed.data.color != null) discordEmbed.color = embed.data.color;
    if (embed.data.timestamp) discordEmbed.timestamp = new Date().toISOString();
    if (embed.data.author?.name) {
      discordEmbed.author = { name: embed.data.author.name };
      if (embed.data.author.url) discordEmbed.author.url = embed.data.author.url;
      if (embed.data.author.icon_url) discordEmbed.author.icon_url = embed.data.author.icon_url;
    }
    if (embed.data.footer?.text) {
      discordEmbed.footer = { text: embed.data.footer.text };
      if (embed.data.footer.icon_url) discordEmbed.footer.icon_url = embed.data.footer.icon_url;
    }
    if (embed.data.thumbnail?.url) discordEmbed.thumbnail = { url: embed.data.thumbnail.url };
    if (embed.data.image?.url) discordEmbed.image = { url: embed.data.image.url };
    if (embed.data.fields?.length) discordEmbed.fields = embed.data.fields.map(f => ({
      name: f.name,
      value: f.value,
      inline: f.inline || false,
    }));

    await DiscordRequest(`channels/${channelId}/messages`, {
      method: 'POST',
      body: { embeds: [discordEmbed] },
    });

    res.json({ success: true });
  } catch (err) {
    console.error('Error sending embed:', err);
    res.status(500).json({ error: 'Failed to send embed' });
  }
});

export default router;
