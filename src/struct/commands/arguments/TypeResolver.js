const { ArgumentTypes } = require('../../../util/Constants');
const { Collection, GuildChannel, resolveColor } = require('discord.js');
const { URL } = require('url');

/**
 * Type resolver for command arguments.
 * The types are documented under ArgumentType.
 * @param {CommandHandler} handler - The command handler.
 */
class TypeResolver {
    constructor(handler) {
        /**
         * The Akairo client.
         * @type {AkairoClient}
         */
        this.client = handler.client;

        /**
         * The command handler.
         * @type {CommandHandler}
         */
        this.commandHandler = handler;

        /**
         * The inhibitor handler.
         * @type {InhibitorHandler}
         */
        this.inhibitorHandler = null;

        /**
         * The listener handler.
         * @type {ListenerHandler}
         */
        this.listenerHandler = null;

        /**
         * Collection of types.
         * @type {Collection<string, ArgumentTypeCaster>}
         */
        this.types = new Collection();

        this.addBuiltInTypes();
    }

    /**
     * Adds built-in types.
     * @returns {void}
     */
    addBuiltInTypes() {
        const builtins = {
            [ArgumentTypes.STRING]: (message, phrase) => {
                return phrase || null;
            },

            [ArgumentTypes.LOWERCASE]: (message, phrase) => {
                return phrase ? phrase.toLowerCase() : null;
            },

            [ArgumentTypes.UPPERCASE]: (message, phrase) => {
                return phrase ? phrase.toUpperCase() : null;
            },

            [ArgumentTypes.CHAR_CODES]: (message, phrase) => {
                if (!phrase) return null;
                return [...phrase].map(c => c.charCodeAt(0));
            },

            [ArgumentTypes.NUMBER]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return parseFloat(phrase);
            },

            [ArgumentTypes.INTEGER]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return parseInt(phrase);
            },

            [ArgumentTypes.BIGINT]: (message, phrase) => {
                if (!phrase || isNaN(phrase)) return null;
                return BigInt(phrase); // eslint-disable-line no-undef, new-cap
            },

            [ArgumentTypes.EMOJINT]: (message, phrase) => {
                if (!phrase) return null;
                const emojis = '0⃣ 1⃣ 2⃣ 3⃣ 4⃣ 5⃣ 6⃣ 7⃣ 8⃣ 9⃣ 🔟'.split(' ');
                const regex = new RegExp(emojis.join('|'), 'g');
                const num = phrase.replace(regex, m => emojis.indexOf(m));
                return isNaN(num) ? null : parseInt(num);
            },

            [ArgumentTypes.URL]: (message, phrase) => {
                if (!phrase) return null;
                if (/^<.+>$/.test(phrase)) phrase = phrase.slice(1, -1);

                try {
                    return new URL(phrase);
                } catch (err) {
                    return null;
                }
            },

            [ArgumentTypes.DATE]: (message, phrase) => {
                if (!phrase) return null;
                const timestamp = Date.parse(phrase);
                return isNaN(timestamp) ? null : new Date(timestamp);
            },

            [ArgumentTypes.COLOR]: (message, phrase) => {
                if (!phrase) return null;

                try {
                    const color = resolveColor(typeof phrase === 'string' ? phrase.toUpperCase() : phrase);
                    return isNaN(color) ? null : color;
                } catch {}

                return null;
            },

            [ArgumentTypes.USER]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveUser(phrase, this.client.users.cache);
            },

            [ArgumentTypes.USERS]: (message, phrase) => {
                if (!phrase) return null;
                const users = this.client.util.resolveUsers(phrase, this.client.users.cache);
                return users.size ? users : null;
            },

            [ArgumentTypes.MEMBER]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveMember(phrase, message.guild.members.cache);
            },

            [ArgumentTypes.MEMBERS]: (message, phrase) => {
                if (!phrase) return null;
                const members = this.client.util.resolveMembers(phrase, message.guild.members.cache);
                return members.size ? members : null;
            },

            [ArgumentTypes.RELEVANT]: (message, phrase) => {
                if (!phrase) return null;

                const person = message.channel.type === 'dm'
                    ? this.client.util.resolveUser(phrase, new Collection([
                        [message.channel.recipient.id, message.channel.recipient],
                        [this.client.user.id, this.client.user]
                    ]))
                    : message.channel instanceof GuildChannel
                        ? this.client.util.resolveMember(phrase, message.guild.members.cache)
                        : this.client.util.resolveUser(phrase, this.client.users.cache);

                return person ? message.channel instanceof GuildChannel ? person.user : person : null;
            },

            [ArgumentTypes.RELEVANTS]: (message, phrase) => {
                if (!phrase) return null;

                const persons = message.channel.type === 'dm'
                    ? this.client.util.resolveUsers(phrase, new Collection([
                        [message.channel.recipient.id, message.channel.recipient],
                        [this.client.user.id, this.client.user]
                    ]))
                    : message.channel instanceof GuildChannel
                        ? this.client.util.resolveMembers(phrase, message.guild.members.cache)
                        : this.client.util.resolveUsers(phrase, this.client.users.cache);

                return persons.size
                    ? message.channel instanceof GuildChannel
                        ? new Collection(persons.map(member => [member.id, member.user]))
                        : persons : null;
            },

            [ArgumentTypes.CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveChannel(phrase, message.guild.channels.cache);
            },

            [ArgumentTypes.CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const channels = this.client.util.resolveChannels(phrase, message.guild.channels.cache);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.TEXT_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                const textChannels = message.guild.channels.cache.filter(c => c.type === 'text');
                const channel = this.client.util.resolveChannel(phrase, textChannels);
                return channel || null;
            },

            [ArgumentTypes.TEXT_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const textChannels = message.guild.channels.cache.filter(c => c.type === 'text');
                const channels = this.client.util.resolveChannels(phrase, textChannels);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.VOICE_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                const voiceChannels = message.guild.channels.cache.filter(c => c.type === 'voice');
                const channel = this.client.util.resolveChannel(phrase, voiceChannels);
                return channel || null;
            },

            [ArgumentTypes.VOICE_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const voiceChannels = message.guild.channels.cache.filter(c => c.type === 'voice');
                const channels = this.client.util.resolveChannels(phrase, voiceChannels);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.CATEGORY_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                const categoryChannels = message.guild.channels.cache.filter(c => c.type === 'category');
                const channel = this.client.util.resolveChannel(phrase, categoryChannels);
                return channel || null;
            },

            [ArgumentTypes.CATEGORY_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const categoryChannels = message.guild.channels.cache.filter(c => c.type === 'category');
                const channels = this.client.util.resolveChannels(phrase, categoryChannels);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.NEWS_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                const newsChannels = message.guild.channels.cache.filter(c => c.type === 'news');
                const channel = this.client.util.resolveChannel(phrase, newsChannels);
                return channel || null;
            },

            [ArgumentTypes.NEWS_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const newsChannels = message.guild.channels.cache.filter(c => c.type === 'news');
                const channels = this.client.util.resolveChannels(phrase, newsChannels);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.STORE_CHANNEL]: (message, phrase) => {
                if (!phrase) return null;
                const storeChannels = message.guild.channels.cache.filter(c => c.type === 'store');
                const channel = this.client.util.resolveChannel(phrase, storeChannels);
                return channel || null;
            },

            [ArgumentTypes.STORE_CHANNELS]: (message, phrase) => {
                if (!phrase) return null;
                const storeChannels = message.guild.channels.cache.filter(c => c.type === 'store');
                const channels = this.client.util.resolveChannels(phrase, storeChannels);
                return channels.size ? channels : null;
            },

            [ArgumentTypes.ROLE]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveRole(phrase, message.guild.roles.cache);
            },

            [ArgumentTypes.ROLES]: (message, phrase) => {
                if (!phrase) return null;
                const roles = this.client.util.resolveRoles(phrase, message.guild.roles.cache);
                return roles.size ? roles : null;
            },

            [ArgumentTypes.EMOJI]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveEmoji(phrase, message.guild.emojis.cache);
            },

            [ArgumentTypes.EMOJIS]: (message, phrase) => {
                if (!phrase) return null;
                const emojis = this.client.util.resolveEmojis(phrase, message.guild.emojis.cache);
                return emojis.size ? emojis : null;
            },

            [ArgumentTypes.GUILD]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.util.resolveGuild(phrase, this.client.guilds.cache);
            },

            [ArgumentTypes.GUILDS]: (message, phrase) => {
                if (!phrase) return null;
                const guilds = this.client.util.resolveGuilds(phrase, this.client.guilds.cache);
                return guilds.size ? guilds : null;
            },

            [ArgumentTypes.MESSAGE]: (message, phrase) => {
                if (!phrase) return null;
                return message.channel.messages.fetch(phrase).catch(() => null);
            },

            [ArgumentTypes.GUILD_MESSAGE]: async (message, phrase) => {
                if (!phrase) return null;

                for (const channel of message.guild.channels.cache.values()) {
                    if (channel.type !== 'text') continue;
                    try {
                        return await channel.messages.fetch(phrase);
                    } catch (err) {
                        if (/^Invalid Form Body/.test(err.message)) break;
                    }
                }

                return null;
            },

            [ArgumentTypes.RELEVANT_MESSAGE]: async (message, phrase) => {
                if (!phrase) return null;

                const hereMsg = await message.channel.messages.fetch(phrase).catch(() => null);
                if (hereMsg) return hereMsg;

                if (message.guild) {
                    for (const channel of message.guild.channels.cache.values()) {
                        if (channel.type !== 'text') continue;
                        try {
                            return await channel.messages.fetch(phrase);
                        } catch (err) {
                            if (/^Invalid Form Body/.test(err.message)) break;
                        }
                    }
                }

                return null;
            },

            [ArgumentTypes.INVITE]: (message, phrase) => {
                if (!phrase) return null;
                return this.client.fetchInvite(phrase).catch(() => null);
            },

            [ArgumentTypes.USER_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const match = phrase.match(/<@!?(?<id>\d{17,19})>/);
                return (match && this.client.users.cache.get(match.groups.id)) || null;
            },

            [ArgumentTypes.MEMBER_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const match = phrase.match(/<@!?(?<id>\d{17,19})>/);
                return (match && message.guild.members.cache.get(match.groups.id)) || null;
            },

            [ArgumentTypes.CHANNEL_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const match = phrase.match(/<#(?<id>\d{17,19})>/);
                return (match && message.guild.channels.cache.get(match.groups.id)) || null;
            },

            [ArgumentTypes.ROLE_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const match = phrase.match(/<@&(?<id>\d{17,19})>/);
                return (match && message.guild.roles.cache.get(match.groups.id)) || null;
            },

            [ArgumentTypes.EMOJI_MENTION]: (message, phrase) => {
                if (!phrase) return null;
                const match = phrase.match(/<a?:\w+:(?<id>\d{17,19})>/);
                return (match && message.guild.emojis.cache.get(match.groups.id)) || null;
            },

            [ArgumentTypes.COMMAND_ALIAS]: (message, phrase) => {
                if (!phrase) return null;
                return this.commandHandler.findCommand(phrase) || null;
            },

            [ArgumentTypes.COMMAND]: (message, phrase) => {
                if (!phrase) return null;
                return this.commandHandler.modules.get(phrase) || null;
            },

            [ArgumentTypes.INHIBITOR]: (message, phrase) => {
                if (!phrase) return null;
                return this.inhibitorHandler.modules.get(phrase) || null;
            },

            [ArgumentTypes.LISTENER]: (message, phrase) => {
                if (!phrase) return null;
                return this.listenerHandler.modules.get(phrase) || null;
            }
        };

        for (const [key, value] of Object.entries(builtins)) {
            this.types.set(key, value);
        }
    }

    /**
     * Gets the resolver function for a type.
     * @param {string} name - Name of type.
     * @returns {ArgumentTypeCaster}
     */
    type(name) {
        return this.types.get(name);
    }

    /**
     * Adds a new type.
     * @param {string} name - Name of the type.
     * @param {ArgumentTypeCaster} fn - Function that casts the type.
     * @returns {TypeResolver}
     */
    addType(name, fn) {
        this.types.set(name, fn);
        return this;
    }

    /**
     * Adds multiple new types.
     * @param {Object} types - Object with keys as the type name and values as the cast function.
     * @returns {TypeResolver}
     */
    addTypes(types) {
        for (const [key, value] of Object.entries(types)) {
            this.addType(key, value);
        }

        return this;
    }
}

module.exports = TypeResolver;
