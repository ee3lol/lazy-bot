import config from '../../../config';
import { client } from '../../../index';
import { PrefixCommand } from '../prefix/PrefixCommand';
import type { ContextMenu } from '../interactions/ContextMenu';
import type { SlashCommand } from '../interactions/SlashCommand';
import {
  type User,
  type Channel,
  type Guild,
  type GuildMember,
  type APIInteractionGuildMember,
  ChannelType,
  type Collection,
  type TextChannel,
} from 'discord.js';

export class CommandValidator {
  static isAllowedCommand(
    command: SlashCommand | ContextMenu | PrefixCommand,
    user: User,
    channel: Channel | null,
    guild: Guild | null,
    member: GuildMember | APIInteractionGuildMember | null,
  ): {
    allowed: boolean;
    reason: keyof typeof config.deniedCommandReplies.specific | string | null;
    cooldown?: { type: string; timeLeft: number; timestamp: number };
  } {
    const requiredConditions = this.checkConditions(command, user, channel, guild, member);
    if (!requiredConditions.allowed) return requiredConditions;

    const optionalConditions = this.checkOptionalConditions(command, user, channel, guild, member);
    if (!optionalConditions.allowed) return optionalConditions;

    const cooldown = this.checkCooldown(command, user, guild);
    if (cooldown.onCooldown) {
      return {
        allowed: false,
        reason: null,
        cooldown: { 
          type: cooldown.type!, 
          timeLeft: cooldown.timeLeft!,
          timestamp: cooldown.timestamp! 
        },
      };
    }

    return { allowed: true, reason: null };
  }

  private static checkConditions(
    command: SlashCommand | ContextMenu | PrefixCommand,
    user: User,
    channel: Channel | null,
    guild: Guild | null,
    member: GuildMember | APIInteractionGuildMember | null,
  ): { allowed: boolean; reason: keyof typeof config.deniedCommandReplies.specific | null } {
    const memberRoles: any = member?.roles;
    const isTextChannel: boolean = channel?.type === ChannelType.GuildText;

    const conditions = {
      allowedUsers: command.allowedUsers?.includes(user.id) ?? true,
      blockedUsers: !(command.blockedUsers?.includes(user.id) ?? false),
      allowedChannels: channel ? (command.allowedChannels?.includes(channel.id) ?? true) : true,
      blockedChannels: channel ? !(command.blockedChannels?.includes(channel.id) ?? false) : true,
      allowedCategories:
        channel && !channel.isDMBased() && channel.parentId
          ? (command.allowedCategories?.includes(channel.parentId) ?? true)
          : true,
      blockedCategories:
        channel && !channel.isDMBased() && channel.parentId
          ? !(command.blockedCategories?.includes(channel.parentId) ?? false)
          : true,
      allowedGuilds: guild ? (command.allowedGuilds?.includes(guild.id) ?? true) : true,
      blockedGuilds: guild ? !(command.blockedGuilds?.includes(guild.id) ?? false) : true,
      allowedRoles: memberRoles
        ? (command.allowedRoles?.some((roleId: string) => memberRoles.cache.has(roleId)) ?? true)
        : true,
      blockedRoles: memberRoles
        ? !(command.blockedRoles?.some((roleId: string) => memberRoles.cache.has(roleId)) ?? false)
        : true,
      restrictedToOwner: command.restrictedToOwner ? user.id === config.ownerId : true,
      restrictedToNSFW: command.restrictedToNSFW ? isTextChannel && (channel as TextChannel).nsfw : true,
      isDisabled: !command.isDisabled,
    };

    for (const [reason, allowed] of Object.entries(conditions)) {
      if (!allowed) {
        return { allowed: false, reason: reason as keyof typeof config.deniedCommandReplies.specific };
      }
    }

    return { allowed: true, reason: null };
  }

  private static checkOptionalConditions(
    command: SlashCommand | ContextMenu | PrefixCommand,
    user: User,
    channel: Channel | null,
    guild: Guild | null,
    member: GuildMember | APIInteractionGuildMember | null,
  ): { allowed: boolean; reason: string | null } {
    const memberRoles: any = member?.roles;

    const optionalConditions: boolean[] = [
      command.optionalAllowedUsers?.includes(user.id),
      channel ? command.optionalAllowedChannels?.includes(channel.id) : undefined,
      channel && !channel.isDMBased() && channel.parentId
        ? command.optionalAllowedCategories?.includes(channel.parentId)
        : undefined,
      guild ? command.optionalAllowedGuilds?.includes(guild.id) : undefined,
      memberRoles ? command.optionalAllowedRoles?.some((roleId: string) => memberRoles.cache.has(roleId)) : undefined,
    ].filter((condition: boolean | undefined) => condition !== undefined);

    if (optionalConditions.length > 0 && !optionalConditions.some(Boolean)) {
      return { allowed: false, reason: config.deniedCommandReplies.general };
    }

    return { allowed: true, reason: null };
  }

  private static checkCooldown(
    command: SlashCommand | ContextMenu | PrefixCommand,
    user: User,
    guild: Guild | null,
  ): { onCooldown: boolean; type?: 'user' | 'guild' | 'global'; timeLeft?: number; timestamp?: number } {
    const now: number = Math.floor(Date.now() / 1000);
    const { commandCooldowns } = client;
    const commandName: string = command instanceof PrefixCommand ? command.name : command.data.name;

    const applyCooldown = (key: string, cooldownMs: number, storage: Collection<string, string>): { timeLeft: number; timestamp: number } | null => {
      const cooldownSeconds = Math.floor(cooldownMs / 1000);
      const expiration: string | undefined = storage.get(key);
      if (expiration && now < parseInt(expiration)) {
        return { 
          timeLeft: parseInt(expiration) - now,
          timestamp: parseInt(expiration)
        };
      }
      // Convert cooldown from milliseconds to seconds before adding to current time
      storage.set(key, (now + cooldownSeconds).toString());
      return null;
    };

    const userCooldown = command.userCooldown
      ? applyCooldown(`${commandName}-${user.id}`, command.userCooldown, commandCooldowns.user)
      : null;

    if (userCooldown) return { 
      onCooldown: true, 
      type: 'user', 
      timeLeft: userCooldown.timeLeft,
      timestamp: userCooldown.timestamp
    };

    const guildCooldown = guild && command.guildCooldown
      ? applyCooldown(`${commandName}-${guild.id}`, command.guildCooldown, commandCooldowns.guild)
      : null;

    if (guildCooldown) return { 
      onCooldown: true, 
      type: 'guild', 
      timeLeft: guildCooldown.timeLeft,
      timestamp: guildCooldown.timestamp
    };

    const globalCooldown = command.globalCooldown
      ? applyCooldown(`${commandName}-global`, command.globalCooldown, commandCooldowns.global)
      : null;

    if (globalCooldown) return { 
      onCooldown: true, 
      type: 'global', 
      timeLeft: globalCooldown.timeLeft,
      timestamp: globalCooldown.timestamp
    };

    return { onCooldown: false };
  }
}
