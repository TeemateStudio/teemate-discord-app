import {
  InteractionResponseFlags,
  InteractionResponseType,
  InteractionType,
  MessageComponentTypes,
} from 'discord-interactions';
import { addMemberRole, removeMemberRole } from './utils.js';
import OnboardingConfig from '../models/OnboardingConfig.js';

/**
 * Handle Discord interactions
 */
export async function handleInteraction(req, res) {
  const { type, data } = req.body;

  // Handle verification requests
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG });
  }

  // Handle slash commands
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data;

    if (name === 'ping') {
      return res.send({
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          flags: InteractionResponseFlags.IS_COMPONENTS_V2,
          components: [
            {
              type: MessageComponentTypes.TEXT_DISPLAY,
              content: '\uD83C\uDFD3 Pong!'
            }
          ]
        },
      });
    }

    console.error(`unknown command: ${name}`);
    return res.status(400).json({ error: 'unknown command' });
  }

  // Handle button/dropdown interactions (onboarding)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = req.body.data?.custom_id;
    const values = req.body.data?.values; // for dropdown

    if (customId?.startsWith('onb:')) {
      const parts = customId.split(':');
      const guildId = parts[1];
      const blockId = parts[2];
      const optionValue = parts[3]; // button value or 'select'

      try {
        const onbConfig = await OnboardingConfig.findOne({ guildId });
        const block = onbConfig?.blocks?.find((b) => b.id === blockId);
        if (!block) {
          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: { content: 'This onboarding block no longer exists.', flags: 64 },
          });
        }

        const userId = req.body.member?.user?.id || req.body.user?.id;
        const currentRolesIds = req.body.member?.roles?.map((r) => r.id) || [];
        let roleName = null;

        if (optionValue === 'select' && values?.length) {
          // Dropdown — find matching option by value
          for (const comp of block.components) {
            const opt = comp.options?.find((o) => o.value === values[0]);
            if (opt?.action?.roleId && !currentRolesIds.includes(opt.action.roleId)) {
              await addMemberRole(guildId, userId, opt.action.roleId);
              roleName = opt.label;
              break;
            }
            if (opt?.action?.roleId && currentRolesIds.includes(opt.action.roleId)) {
              await removeMemberRole(guildId, userId, opt.action.roleId);
              roleName = opt.label;
              break;
            }
          }
        } else {
          // Button — find matching option by value
          for (const comp of block.components) {
            const opt = comp.options?.find((o) => o.value === optionValue);
            if (opt?.action?.roleId) {
              await addMemberRole(guildId, userId, opt.action.roleId);
              roleName = opt.label;
              break;
            }
          }
        }

        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: roleName ? `Done! You now have the **${roleName}** role.` : 'Done!',
            flags: 64,
          },
        });
      } catch (err) {
        console.error('Onboarding interaction error:', err);
        return res.send({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: 'Something went wrong. Please try again.', flags: 64 },
        });
      }
    }
  }

  console.error('unknown interaction type', type);
  return res.status(400).json({ error: 'unknown interaction type' });
}
