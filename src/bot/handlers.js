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

  // Handle dropdown interactions (onboarding)
  if (type === InteractionType.MESSAGE_COMPONENT) {
    const customId = req.body.data?.custom_id;
    const values = req.body.data?.values; // for dropdown

    if (customId?.startsWith('onb:')) {
      const parts = customId.split(':');
      const guildId = parts[1];
      const blockId = parts[2];
      const optionValue = parts[3]; // 'select' for dropdown

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
        const currentRolesIds = req.body.member?.roles || [];
        const roleMentions = new Set();

        if (optionValue === 'select' && values?.length) {
          // Dropdown — synchronise roles with all selected values (supports multi-select)
          const selectedValues = new Set(values);

          for (const comp of block.components) {
            for (const opt of comp.options || []) {
              if (!opt?.action?.roleId) continue;

              const hasRole = currentRolesIds.includes(opt.action.roleId);
              const isSelected = selectedValues.has(opt.value);

              // Pour l'affichage final: on garde toutes les options sélectionnées
              if (isSelected) {
                roleMentions.add(`<@&${opt.action.roleId}>`);
              }

              // Ajoute le rôle s'il vient d'être sélectionné
              if (isSelected && !hasRole) {
                await addMemberRole(guildId, userId, opt.action.roleId);
              }

              // Retire le rôle s'il n'est plus sélectionné
              if (!isSelected && hasRole) {
                await removeMemberRole(guildId, userId, opt.action.roleId);
              }
            }
          }
          
          let content = 'Done!';
          const rolesList = Array.from(roleMentions);
          if (rolesList.length === 1) {
            content = `Tu as désormais le rôle: ${rolesList[0]}`;
          } else if (rolesList.length > 1) {
            content = `Tu as désormais les rôles: ${rolesList.join(', ')}`;
          }

          return res.send({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content,
              flags: 64,
            },
          });
        }
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
