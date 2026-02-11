import { Router } from 'express';
import { requireGuildAdmin } from './middleware.js';
import GuildConfig from '../models/GuildConfig.js';
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

export default router;
