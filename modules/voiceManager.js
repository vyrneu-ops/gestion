const {
    ChannelType,
    PermissionsBitField,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    UserSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    StringSelectMenuBuilder
} = require("discord.js");
const fs = require("fs");
const path = require("path");

const config = require("../data/voiceConfig");

// Charte graphique & Couleurs HeLoRiA
const COLOR_GOLD = "#D4AF37";
const COLOR_BLACK = "#000001";

// Emojis du système vocal (Personnalisés HeLoRiA)
const EMOJIS = {
    VOICE: "<:68052micanimation:1537582247278813204>",
    CROWN: "<a:darkbluecrown:1533535362566324245>",
    GEAR: "<:65264telescope:1537586517453832222>",
    LOCK: "<a:lockicon:1533535370787033198>",
    UNLOCK: "<:5647premiumicon:1533535330538360942>",
    HIDE: "<:580437rules:1537583160345366578>",
    USER: "<:75828briefcase:1537579702812807248>",
    GAME: "<:hlrwin:1537584105536094248>",
    BITRATE: "<:20336certified:1537579306690281544>",
    SAVE: "<:6880quill:1537585310794391563>",
    ADD_USER: "<:600404handshake:1537578056447828058>",
    REMOVE_USER: "<:9299blurpleban:1533535325996056807>",
    MUTE: "<:94919trialmod:1537582836318609521>",
    TRANSFER: "<:3446blurplecertifiedmoderator:1533535324309815367>",
    CHECK: "<:20336certified:1537579306690281544>",
    WARN: "<:warningd:1533535400176386068>",
    STATS: "<:63043moneyspread:1537577805829636117>",
    CLOCK: "<a:loadingicon:1533535386951749683>",
    CHAT: "💬"
};

// Registres en mémoire RAM
const tempChannels = new Map();
const creationQueue = new Set();
let voiceEventsRegistered = false;

// Stockage sécurisé JSON
const DB_PATH = path.join(__dirname, "../data/voice_database.json");

if (!fs.existsSync(path.dirname(DB_PATH))) {
    fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
    console.log(`[VOCAL LOG] Dossier de base de données créé : ${path.dirname(DB_PATH)}`);
}

if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, JSON.stringify({ savedConfigs: {}, whitelists: {} }, null, 4));
    console.log(`[VOCAL LOG] Fichier DB initialisé : ${DB_PATH}`);
}

function readDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            const rawData = fs.readFileSync(DB_PATH, "utf-8");
            return JSON.parse(rawData);
        }
    } catch (err) {
        console.error("[VOCAL LOG] Erreur lors de la lecture DB :", err.message);
    }
    return { savedConfigs: {}, whitelists: {} };
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf-8");
        console.log("[VOCAL LOG] Base de données sauvegardée avec succès.");
    } catch (err) {
        console.error("[VOCAL LOG] Échec d'écriture dans la base de données :", err.message);
    }
}

module.exports = (client) => {

    const isStaff = (member) => {
        if (!member) return false;
        if (member.id === config.OWNER_ID || member.guild.ownerId === member.id) return true;
        if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return true;
        return config.STAFF_ROLES?.some(roleId => member.roles.cache.has(roleId)) || false;
    };

    // Générateur d'Embed du Tableau de Bord dynamique
    const createDashboardEmbed = (member, channel, data) => {
        let statusText = `${EMOJIS.UNLOCK} **Public**`;
        if (data.isLocked) statusText = `${EMOJIS.LOCK} **Verrouillé**`;
        if (data.isPrivate) statusText = `${EMOJIS.HIDE} **Masqué & Privé**`;

        const limitText = data.userLimit === 0 ? "👥 **Illimitée**" : `👥 **${data.userLimit} places**`;
        const gameText = data.detectedGame ? `${EMOJIS.GAME} **${data.detectedGame}**` : `${EMOJIS.GAME} **Aucun jeu détecté**`;
        const chatText = data.chatEnabled ? `${EMOJIS.CHAT} **Autorisé**` : `${EMOJIS.LOCK} **Restreint (Art. 3.04)**`;

        return new EmbedBuilder()
            .setColor(COLOR_GOLD)
            .setTitle(`${EMOJIS.GEAR} PANNEAU DE CONTRÔLE VOCAL`)
            .setDescription(
                `${EMOJIS.CROWN} **Propriétaire :** ${member}\n` +
                `${EMOJIS.VOICE} **Salon :** \`${channel.name}\`\n\n` +
                `─── **ÉTAT EN TEMPS RÉEL** ───\n\n` +
                `• **Statut du Salon :** ${statusText}\n` +
                `• **Capacité d'accueil :** ${limitText}\n` +
                `• **Activité Détectée :** ${gameText}\n` +
                `• **Chat Textuel :** ${chatText}\n\n` +
                `> Gérez l'accès, la confidentialité et les membres de votre salon via les boutons et menus ci-dessous.`
            )
            .setFooter({ text: "HeLoRiA • Interface Éphémère" })
            .setTimestamp();
    };

    // Mise à jour du Tableau de Bord
    const updateDashboard = async (channel, member, data) => {
        try {
            if (!data.dashboardMessageId) return;
            const msg = await channel.messages.fetch(data.dashboardMessageId).catch(() => null);
            if (msg) {
                await msg.edit({ embeds: [createDashboardEmbed(member, channel, data)] }).catch((err) => {
                    console.error(`[VOCAL LOG] Impossible d'éditer le dashboard dans ${channel.id} :`, err.message);
                });
            }
        } catch (err) {
            console.error("[VOCAL LOG] Erreur lors de la mise à jour du Tableau de Bord :", err.message);
        }
    };

    // Nettoyage des salons orphelins
    const runGarbageCollector = async (guild) => {
        if (!config?.TEMP_CATEGORY) return 0;
        
        const category = await guild.channels.fetch(config.TEMP_CATEGORY).catch(() => null);
        let deletedCount = 0;

        if (category?.type === ChannelType.GuildCategory) {
            const children = await guild.channels.fetch().catch(() => new Map());
            for (const [_, channel] of children) {
                if (!channel || channel.parentId !== config.TEMP_CATEGORY) continue;
                if (channel.id === config.TRIGGER_CHANNEL) continue;
                if (channel.type === ChannelType.GuildVoice && channel.members.size === 0) {
                    tempChannels.delete(channel.id);
                    await channel.delete().catch(() => {});
                    deletedCount++;
                }
            }
        }
        if (deletedCount > 0) {
            console.log(`[VOCAL LOG] Garbage Collector : ${deletedCount} salon(s) orphelin(s) supprimé(s) sur "${guild.name}".`);
        }
        return deletedCount;
    };

    client.once("ready", async () => {
        console.log("[SYSTÈME VOCAL] Initialisation de l'infrastructure vocale HeLoRiA...");
        for (const [_, guild] of client.guilds.cache) {
            await runGarbageCollector(guild);
        }
        console.log("[VOCAL LOG] Infrastructure prête et synchronisée.");
    });

    if (voiceEventsRegistered) return;
    voiceEventsRegistered = true;

    // Commandes administration & modération textuelle
    client.on("messageCreate", async (msg) => {
        if (!msg.guild || msg.author.bot) return;

        const prefix = "+";
        if (msg.content.startsWith(prefix)) {
            const args = msg.content.slice(prefix.length).trim().split(/ +/);
            const command = args.shift().toLowerCase();

            if (command === "voice-status" && isStaff(msg.member)) {
                const db = readDB();
                const statusEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.STATS} INFRASTRUCTURE VOCALE — STATUT`)
                    .setDescription(
                        `• **Salons Actifs :** \`${tempChannels.size}\`\n` +
                        `• **Configurations Sauvegardées :** \`${Object.keys(db.savedConfigs || {}).length}\`\n` +
                        `• **Whitelists Enregistrées :** \`${Object.keys(db.whitelists || {}).length}\``
                    )
                    .setFooter({ text: "HeLoRiA • Administration Vocale" });
                return msg.channel.send({ embeds: [statusEmbed] });
            }

            if (command === "voice-purge" && isStaff(msg.member)) {
                const deleted = await runGarbageCollector(msg.guild);
                return msg.reply(`${EMOJIS.CHECK} **${deleted}** salon(s) vocal(aux) vide(s) purgé(s) avec succès.`);
            }
        }

        // Modération automatique du chat textuel des salons éphémères
        if (tempChannels.has(msg.channel.id)) {
            const data = tempChannels.get(msg.channel.id);
            if (!data.chatEnabled && !isStaff(msg.member) && msg.author.id !== data.owner) {
                await msg.delete().catch(() => {});
                const warnMsg = await msg.channel.send({
                    content: `${msg.author},${EMOJIS.WARN} Conformément à l'**Article 3.04 du règlement**, le chat textuel de ce salon est verrouillé par le propriétaire.`
                }).catch(() => null);
                if (warnMsg) setTimeout(() => warnMsg.delete().catch(() => {}), 5000);
            }
        }
    });

    // Gestion de la création et destruction des salons vocaux
    client.on("voiceStateUpdate", async (oldState, newState) => {
        try {
            const member = newState.member;
            if (!member || member.user.bot) return;

            // Déclenchement de la création
            if (newState.channelId === config.TRIGGER_CHANNEL) {
                const guild = member.guild;

                if (creationQueue.has(member.id)) {
                    return member.voice.disconnect().catch(() => {});
                }

                // Vérification si le membre possède déjà un salon actif
                for (const [chanId, data] of tempChannels.entries()) {
                    if (data.owner === member.id) {
                        const existingChan = await guild.channels.fetch(chanId).catch(() => null);
                        if (existingChan) {
                            await member.voice.setChannel(existingChan).catch(() => {});
                            return;
                        }
                    }
                }

                creationQueue.add(member.id);

                const db = readDB();
                const userTemplate = db.savedConfigs?.[member.id];
                const userWhitelist = db.whitelists?.[member.id] || [];

                let detectedGame = null;
                const activity = member.presence?.activities?.find(a => a.type === 0);
                if (activity) detectedGame = activity.name;

                let channelName = userTemplate?.name || (detectedGame ? `🎮 ${detectedGame}` : `🎙️ Salon de ${member.user.username}`);

                let contextPermissions = [
                    {
                        id: guild.id,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect],
                        deny: [PermissionsBitField.Flags.SendMessages]
                    },
                    {
                        id: client.user.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.EmbedLinks,
                            PermissionsBitField.Flags.ManageChannels,
                            PermissionsBitField.Flags.ManageMessages
                        ]
                    },
                    {
                        id: member.id,
                        allow: [
                            PermissionsBitField.Flags.ViewChannel,
                            PermissionsBitField.Flags.Connect,
                            PermissionsBitField.Flags.Speak,
                            PermissionsBitField.Flags.SendMessages,
                            PermissionsBitField.Flags.MuteMembers
                        ]
                    }
                ];

                userWhitelist.forEach(targetId => {
                    contextPermissions.push({
                        id: targetId,
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect]
                    });
                });

                if (userTemplate?.isLocked) {
                    contextPermissions[0].deny.push(PermissionsBitField.Flags.Connect);
                }
                if (userTemplate?.isPrivate) {
                    contextPermissions[0].deny.push(PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.Connect);
                }

                const targetChannel = await guild.channels.create({
                    name: channelName,
                    type: ChannelType.GuildVoice,
                    parent: config.TEMP_CATEGORY,
                    permissionOverwrites: contextPermissions,
                    userLimit: userTemplate?.userLimit || 0
                }).catch((err) => {
                    console.error(`[VOCAL LOG] Échec création salon pour ${member.user.tag} :`, err.message);
                    return null;
                });

                if (!targetChannel) {
                    creationQueue.delete(member.id);
                    return;
                }

                const runtimeData = {
                    owner: member.id,
                    createdAt: Date.now(),
                    isLocked: userTemplate?.isLocked || false,
                    isPrivate: userTemplate?.isPrivate || false,
                    chatEnabled: false,
                    userLimit: userTemplate?.userLimit || 0,
                    detectedGame: detectedGame,
                    dashboardMessageId: null,
                    uniqueMembers: new Set([member.id])
                };

                tempChannels.set(targetChannel.id, runtimeData);

                await member.voice.setChannel(targetChannel).catch(() => {});
                creationQueue.delete(member.id);

                // Boutons d'interaction
                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("vc_open").setLabel("Ouvrir").setEmoji(EMOJIS.UNLOCK).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_lock").setLabel("Verrouiller").setEmoji(EMOJIS.LOCK).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_private").setLabel("Masquer").setEmoji(EMOJIS.HIDE).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_toggle_chat").setLabel("Chat Textuel").setEmoji(EMOJIS.CHAT).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_claim").setLabel("Réclamer").setEmoji(EMOJIS.CROWN).setStyle(ButtonStyle.Secondary)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("vc_permit").setLabel("Autoriser").setEmoji(EMOJIS.ADD_USER).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_reject").setLabel("Exclure").setEmoji(EMOJIS.REMOVE_USER).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_mute_member").setLabel("Mute").setEmoji(EMOJIS.MUTE).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_transfer").setLabel("Transférer").setEmoji(EMOJIS.TRANSFER).setStyle(ButtonStyle.Secondary)
                );

                const row3 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("vc_rename").setLabel("Renommer").setEmoji(EMOJIS.SAVE).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_bitrate").setLabel("Qualité").setEmoji(EMOJIS.BITRATE).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_save").setLabel("Sauvegarder").setEmoji(EMOJIS.SAVE).setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("vc_save_whitelist").setLabel("Whitelist").setEmoji(EMOJIS.CROWN).setStyle(ButtonStyle.Secondary)
                );

                const rowLimits = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("vc_limit_select")
                        .setPlaceholder("👥 Ajuster la limite de places...")
                        .addOptions([
                            { label: "Illimité", value: "0", emoji: "🌐" },
                            { label: "Duo (2 Joueurs)", value: "2", emoji: "👥" },
                            { label: "Trio (3 Joueurs)", value: "3", emoji: "👥" },
                            { label: "Squad (4 Joueurs)", value: "4", emoji: "👥" },
                            { label: "5 Joueurs", value: "5", emoji: "👥" }
                        ])
                );

                const dashboardMsg = await targetChannel.send({
                    content: `Bienvenue dans ton salon ${member} !`,
                    embeds: [createDashboardEmbed(member, targetChannel, runtimeData)],
                    components: [row1, row2, row3, rowLimits]
                }).catch(() => null);

                if (dashboardMsg) {
                    runtimeData.dashboardMessageId = dashboardMsg.id;
                    tempChannels.set(targetChannel.id, runtimeData);
                }
            }

            // Suivi des membres uniques
            const currentVoice = newState.channel;
            if (currentVoice && tempChannels.has(currentVoice.id)) {
                const data = tempChannels.get(currentVoice.id);
                data.uniqueMembers.add(member.id);
            }

            // Nettoyage lors du départ
            const expiredChannel = oldState.channel;
            if (expiredChannel && tempChannels.has(expiredChannel.id)) {
                setTimeout(async () => {
                    const instance = await expiredChannel.fetch().catch(() => null);
                    if (!instance || instance.members.size === 0) {
                        const data = tempChannels.get(expiredChannel.id);
                        const durationMinutes = Math.max(1, Math.round((Date.now() - (data?.createdAt || Date.now())) / 60000));

                        const logChan = await expiredChannel.guild.channels.fetch(config.LOGS_CHANNEL).catch(() => null);
                        
                        if (logChan && data) {
                            const statsEmbed = new EmbedBuilder()
                                .setColor(COLOR_BLACK)
                                .setTitle(`${EMOJIS.CLOCK} SESSION VOCALE TERMINÉE`)
                                .setDescription(
                                    `• **Salon :** \`${expiredChannel.name}\`\n` +
                                    `• **Durée totale :** \`${durationMinutes} minute(s)\`\n` +
                                    `• **Membres uniques :** \`${data.uniqueMembers.size}\``
                                )
                                .setFooter({ text: "HeLoRiA • Registre Vocal" });
                            await logChan.send({ embeds: [statsEmbed] }).catch(() => {});
                        }

                        tempChannels.delete(expiredChannel.id);
                        await instance?.delete().catch(() => {});
                    }
                }, 2000);
            }

        } catch (error) {
            console.error("[VOCAL LOG] Erreur critique lors de la mise à jour de l'état vocal :", error);
        }
    });

    // Interactions avec les boutons, modales et menus
    client.on("interactionCreate", async (interaction) => {
        try {
            const activeVoice = interaction.channel;
            if (!activeVoice || !tempChannels.has(activeVoice.id)) return;

            const runtimeData = tempChannels.get(activeVoice.id);

            // Bouton Réclamer la propriété
            if (interaction.isButton() && interaction.customId === "vc_claim") {
                await interaction.deferReply({ ephemeral: true });
                const currentOwner = activeVoice.members.get(runtimeData.owner);

                if (currentOwner) {
                    return interaction.editReply({ content: `${EMOJIS.WARN} Le propriétaire actuel se trouve toujours dans le salon vocal.` });
                }

                runtimeData.owner = interaction.user.id;
                tempChannels.set(activeVoice.id, runtimeData);
                await updateDashboard(activeVoice, interaction.member, runtimeData);

                return interaction.editReply({ content: `${EMOJIS.CROWN} Vous êtes désormais le nouveau propriétaire du salon !` });
            }

            // Vérification des droits
            if (interaction.isButton() || interaction.isUserSelectMenu() || interaction.isModalSubmit() || interaction.isStringSelectMenu()) {
                if (runtimeData.owner !== interaction.user.id && !isStaff(interaction.member)) {
                    return interaction.reply({ content: `${EMOJIS.WARN} Seul le propriétaire du salon vocal peut exécuter ces commandes.`, ephemeral: true });
                }
            }

            // Traitement des boutons principaux
            if (interaction.isButton()) {
                switch (interaction.customId) {
                    case "vc_open":
                        await interaction.deferReply({ ephemeral: true });
                        runtimeData.isLocked = false;
                        runtimeData.isPrivate = false;
                        await activeVoice.permissionOverwrites.edit(interaction.guild.id, { Connect: null, ViewChannel: null }).catch(() => {});
                        await updateDashboard(activeVoice, interaction.member, runtimeData);
                        return interaction.editReply({ content: `${EMOJIS.UNLOCK} Le salon est désormais accessible à tous.` });

                    case "vc_lock":
                        await interaction.deferReply({ ephemeral: true });
                        runtimeData.isLocked = true;
                        await activeVoice.permissionOverwrites.edit(interaction.guild.id, { Connect: false }).catch(() => {});
                        await updateDashboard(activeVoice, interaction.member, runtimeData);
                        return interaction.editReply({ content: `${EMOJIS.LOCK} Le salon est désormais verrouillé.` });

                    case "vc_private":
                        await interaction.deferReply({ ephemeral: true });
                        runtimeData.isPrivate = true;
                        await activeVoice.permissionOverwrites.edit(interaction.guild.id, { ViewChannel: false, Connect: false }).catch(() => {});
                        await activeVoice.permissionOverwrites.edit(interaction.user.id, { ViewChannel: true, Connect: true }).catch(() => {});
                        await updateDashboard(activeVoice, interaction.member, runtimeData);
                        return interaction.editReply({ content: `${EMOJIS.HIDE} Le salon est désormais masqué.` });

                    case "vc_toggle_chat":
                        await interaction.deferReply({ ephemeral: true });
                        runtimeData.chatEnabled = !runtimeData.chatEnabled;
                        await activeVoice.permissionOverwrites.edit(interaction.guild.id, {
                            SendMessages: runtimeData.chatEnabled ? true : false
                        }).catch(() => {});
                        await updateDashboard(activeVoice, interaction.member, runtimeData);
                        return interaction.editReply({ 
                            content: runtimeData.chatEnabled 
                                ? `${EMOJIS.CHAT} Le chat textuel est désormais **autorisé**.` 
                                : `${EMOJIS.LOCK} Le chat textuel a été **verrouillé**.` 
                        });

                    case "vc_permit":
                    case "vc_reject":
                    case "vc_mute_member":
                    case "vc_transfer":
                    case "vc_save_whitelist":
                        const selectMenu = new UserSelectMenuBuilder()
                            .setCustomId(`user_${interaction.customId}`)
                            .setPlaceholder("👤 Sélectionnez un membre...");
                        return interaction.reply({ components: [new ActionRowBuilder().addComponents(selectMenu)], ephemeral: true });

                    case "vc_rename":
                        const modal = new ModalBuilder().setCustomId("vc_modal_rename").setTitle("Renommer le salon");
                        const input = new TextInputBuilder().setCustomId("new_name").setLabel("Nouveau nom du salon").setStyle(TextInputStyle.Short).setRequired(true).setMaxLength(32);
                        return interaction.showModal(modal.addComponents(new ActionRowBuilder().addComponents(input)));

                    case "vc_bitrate":
                        const bitrateMenu = new ActionRowBuilder().addComponents(
                            new StringSelectMenuBuilder()
                                .setCustomId("vc_select_bitrate")
                                .setPlaceholder("🔊 Sélectionner la qualité audio...")
                                .addOptions([
                                    { label: "Basse (64 kbps)", value: "64000", emoji: "📉" },
                                    { label: "Standard (96 kbps)", value: "96000", emoji: "📻" },
                                    { label: "Haute (128 kbps)", value: "128000", emoji: "🎵" },
                                    { label: "Maximale (384 kbps)", value: "384000", emoji: "🎧" }
                                ])
                        );
                        return interaction.reply({ components: [bitrateMenu], ephemeral: true });

                    case "vc_save":
                        await interaction.deferReply({ ephemeral: true });
                        const db = readDB();
                        if (!db.savedConfigs) db.savedConfigs = {};
                        db.savedConfigs[interaction.user.id] = {
                            name: activeVoice.name,
                            isLocked: runtimeData.isLocked,
                            isPrivate: runtimeData.isPrivate,
                            userLimit: runtimeData.userLimit
                        };
                        writeDB(db);
                        return interaction.editReply({ content: `${EMOJIS.SAVE} Votre configuration personnelle a été sauvegardée.` });
                }
            }

            // Traitement des menus de sélection des utilisateurs
            if (interaction.isUserSelectMenu()) {
                await interaction.deferReply({ ephemeral: true });
                const selectedUser = interaction.users.first();
                if (!selectedUser) return interaction.editReply({ content: `${EMOJIS.WARN} Utilisateur introuvable.` });

                if (interaction.customId === "user_vc_permit") {
                    await activeVoice.permissionOverwrites.edit(selectedUser.id, { Connect: true, ViewChannel: true }).catch(() => {});
                    return interaction.editReply({ content: `${EMOJIS.CHECK} ${selectedUser} est désormais autorisé à rejoindre.` });
                }

                if (interaction.customId === "user_vc_reject") {
                    await activeVoice.permissionOverwrites.edit(selectedUser.id, { Connect: false }).catch(() => {});
                    const targetMember = await interaction.guild.members.fetch(selectedUser.id).catch(() => null);
                    if (targetMember?.voice.channelId === activeVoice.id) {
                        await targetMember.voice.setChannel(null).catch(() => {});
                    }
                    return interaction.editReply({ content: `${EMOJIS.CHECK} ${selectedUser} a été exclu du salon.` });
                }

                if (interaction.customId === "user_vc_mute_member") {
                    const targetMember = await interaction.guild.members.fetch(selectedUser.id).catch(() => null);
                    if (targetMember?.voice.channelId === activeVoice.id) {
                        const isMuted = targetMember.voice.serverMute;
                        await targetMember.voice.setMute(!isMuted).catch(() => {});
                        return interaction.editReply({ 
                            content: !isMuted 
                                ? `${EMOJIS.MUTE} ${selectedUser} a été rendu muet.` 
                                : `${EMOJIS.CHECK} Le micro de ${selectedUser} a été réactivé.` 
                        });
                    } else {
                        return interaction.editReply({ content: `${EMOJIS.WARN} Ce membre n'est pas dans votre salon vocal.` });
                    }
                }

                if (interaction.customId === "user_vc_transfer") {
                    runtimeData.owner = selectedUser.id;
                    tempChannels.set(activeVoice.id, runtimeData);
                    await updateDashboard(activeVoice, interaction.member, runtimeData);
                    return interaction.editReply({ content: `${EMOJIS.TRANSFER} Propriété transférée à ${selectedUser}.` });
                }

                if (interaction.customId === "user_vc_save_whitelist") {
                    const db = readDB();
                    if (!db.whitelists) db.whitelists = {};
                    if (!db.whitelists[interaction.user.id]) db.whitelists[interaction.user.id] = [];

                    if (!db.whitelists[interaction.user.id].includes(selectedUser.id)) {
                        db.whitelists[interaction.user.id].push(selectedUser.id);
                        writeDB(db);
                        return interaction.editReply({ content: `${EMOJIS.CHECK} ${selectedUser} a été ajouté à votre Whitelist.` });
                    } else {
                        return interaction.editReply({ content: `${EMOJIS.WARN} Ce membre est déjà dans votre Whitelist.` });
                    }
                }
            }

            // Soumission de la modale (Renommer)
            if (interaction.isModalSubmit() && interaction.customId === "vc_modal_rename") {
                await interaction.deferReply({ ephemeral: true });
                const newName = interaction.fields.getTextInputValue("new_name");
                
                await activeVoice.setName(newName).catch(() => {});
                await updateDashboard(activeVoice, interaction.member, runtimeData);
                return interaction.editReply({ content: `${EMOJIS.CHECK} Le salon a été renommé en **${newName}**.` });
            }

            // Menus déroulants textuels (Bitrate & Limites)
            if (interaction.isStringSelectMenu()) {
                if (interaction.customId === "vc_limit_select") {
                    await interaction.deferReply({ ephemeral: true });
                    const limit = parseInt(interaction.values[0], 10);
                    
                    runtimeData.userLimit = limit;
                    await activeVoice.setUserLimit(limit).catch(() => {});
                    await updateDashboard(activeVoice, interaction.member, runtimeData);

                    return interaction.editReply({ 
                        content: limit === 0 
                            ? `${EMOJIS.CHECK} La limite de places est fixée sur Illimité.` 
                            : `${EMOJIS.CHECK} La limite du salon a été fixée à **${limit}** place(s).` 
                    });
                }

                if (interaction.customId === "vc_select_bitrate") {
                    await interaction.deferReply({ ephemeral: true });
                    const bitrateVal = parseInt(interaction.values[0], 10);

                    await activeVoice.setBitrate(bitrateVal).catch(() => {});
                    return interaction.editReply({ content: `${EMOJIS.BITRATE} La qualité audio a été mise à jour (${bitrateVal / 1000} kbps).` });
                }
            }

        } catch (err) {
            console.error("[VOCAL LOG] Erreur lors du traitement de l'interaction :", err.message);
            if (!interaction.replied && !interaction.deferred) {
                await interaction.reply({ content: `${EMOJIS.WARN} Une erreur est survenue lors de l'exécution.`, ephemeral: true }).catch(() => {});
            }
        }
    });
};