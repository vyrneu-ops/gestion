const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField,
    ChannelType,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    AttachmentBuilder
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const config = require("../data/ticket_database");

// SALONS SYSTÈMES (À adapter si besoin dans un fichier de config global, ou laissés ici)
const LOGS_CHANNEL = "1535306876164640920";
const ARCHIVE_CHANNEL = "1541230358526304256";
const AVIS_CHANNEL = "1541544133171347710"; 

// BASE DE DONNÉES LOCALE
const DB_PATH = path.join(__dirname, "../data/ticket_database.json");

if (!fs.existsSync(path.dirname(DB_PATH))) fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
if (!fs.existsSync(DB_PATH)) fs.writeFileSync(DB_PATH, JSON.stringify({ tickets: {}, blacklist: [], stats: {} }, null, 4));

function readDB() {
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
        if (!data.blacklist) data.blacklist = [];
        if (!data.tickets) data.tickets = {};
        if (!data.stats) data.stats = {};
        return data;
    } catch {
        return { tickets: {}, blacklist: [], stats: {} };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf-8");
    } catch (err) {
        console.error("[TICKET DB ERROR] Erreur d'écriture :", err);
    }
}

// =====================================================
// FONCTION DE SÉLECTION INTELLIGENTE DE CATÉGORIE
// =====================================================
async function getCategoryForType(guild, type) {
    // Si c'est un ticket joueur, on utilise le pool dédié avec vérification de charge (< 50 salons)
    if (type === "joueur" && config.JOUEUR_CATEGORIES_POOL && config.JOUEUR_CATEGORIES_POOL.length > 0) {
        for (const catId of config.JOUEUR_CATEGORIES_POOL) {
            const category = await guild.channels.fetch(catId).catch(() => null);
            if (category && category.type === ChannelType.GuildCategory) {
                const childrenCount = guild.channels.cache.filter(c => c.parentId === category.id).size;
                if (childrenCount < 50) return category.id;
            }
        }
        return config.JOUEUR_CATEGORIES_POOL[0] || null;
    }

    // Pour les autres types, on récupère depuis l'objet CATEGORIES de la config
    const catId = config.CATEGORIES?.[type];
    if (catId) {
        const category = await guild.channels.fetch(catId).catch(() => null);
        if (category && category.type === ChannelType.GuildCategory) {
            const childrenCount = guild.channels.cache.filter(c => c.parentId === category.id).size;
            if (childrenCount < 50) return category.id;
        }
    }

    return null;
}

const globalCooldowns = new Set();

module.exports = async (client) => {
    console.log("[TICKET SYSTEM] Chargement du système de support Team HeLoRiA...");

    // =====================================================
    // 1. PANNEAU PRINCIPAL
    // =====================================================
    const panelChannel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
    if (panelChannel) {
        const cachedMessages = await panelChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (cachedMessages) {
            const botMessages = cachedMessages.filter(m => m.author.id === client.user.id);
            for (const msg of botMessages.values()) await msg.delete().catch(() => {});
        }

        const panelEmbed = new EmbedBuilder()
            .setColor("#FFFFFF")
            .setTitle("Team HeLoRiA — Centre d'Assistance")
            .setDescription(
                "Besoin d'aide ou envie de tenter votre chance pour rejoindre la Team HeLoRiA ?\n" +
                "Notre équipe vous répondra dans les plus brefs délais.\n\n" +
                "Merci de préciser toutes les informations nécessaires lors de l'ouverture du ticket.\n\n" +
                "Les tickets inutiles ou abusifs seront sanctionnés.\n" +
                "Vous disposerez de 24 heures maximum pour répondre, sous peine de fermeture du ticket.\n\n" +
                "Les règles du serveur s'appliquent également dans ces salons privés. Merci de rester respectueux et courtois avec l'ensemble du Staff.\n\n" +
                "───\n\n" +
                "Need assistance or want to join Team HeLoRiA?\n" +
                "Our team will get back to you shortly.\n\n" +
                "Please provide all relevant information once your ticket is opened.\n\n" +
                "Useless or abusive tickets will be sanctioned.\n" +
                "You will have a maximum of 24 hours to reply, otherwise your ticket will be closed."
            )
            .setFooter({ text: "Team HeLoRiA • Sélectionnez une option ci-dessous" });

        const menuSelection = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Sélectionnez votre catégorie...")
            .addOptions([
                { label: "Recrutement Staff", value: "staff" },
                { label: "Recrutement Joueur", value: "joueur" },
                { label: "Recrutement Audiovisuel", value: "audiovisuel" },
                { label: "Assistance Générale", value: "aide" },
                { label: "Demande de Partenariat", value: "partenariat" }
            ]);

        await panelChannel.send({
            embeds: [panelEmbed],
            components: [new ActionRowBuilder().addComponents(menuSelection)]
        }).catch(() => {});
    }

    // =====================================================
    // 2. SUIVI D'ACTIVITÉ & MODÉRATEUR EN TEST
    // =====================================================
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;

        const db = readDB();
        if (db.tickets[message.channel.id]) {
            db.tickets[message.channel.id].lastActivity = Date.now();
            db.tickets[message.channel.id].messageCount = (db.tickets[message.channel.id].messageCount || 0) + 1;
            writeDB(db);
        }

        if (message.content.startsWith("+test modérateur")) {
            const allowedRoles = config.ROLES.staff || [];
            const isStaff = message.member.roles.cache.some(r => allowedRoles.includes(r.id)) || message.member.permissions.has(PermissionsBitField.Flags.ManageChannels);
            if (!isStaff) return message.reply("Action réservée à la direction.");

            const targetUser = message.mentions.members.first();
            if (!targetUser) return message.reply("Veuillez mentionner le modérateur en test.");

            await targetUser.roles.add(config.TEST_MODO_ROLE).catch(() => {});
            await message.channel.permissionOverwrites.edit(targetUser.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }).catch(() => {});

            return message.reply({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("ÉVALUATION STAFF").setDescription(`Bienvenue ${targetUser} dans votre salon de test.`)] });
        }
    });

    // =====================================================
    // 3. GESTION DES INTERACTIONS
    // =====================================================
    client.on("interactionCreate", async (i) => {
        // GESTION DES AVIS EN MESSAGE PRIVÉ (DM)
        if (!i.guild) {
            const db = readDB();

            if (i.isButton() && i.customId.startsWith("rate_")) {
                const [, stars, staffId] = i.customId.split("_");
                const modal = new ModalBuilder()
                    .setCustomId(`submit_review_${stars}_${staffId}`)
                    .setTitle("Votre avis sur Team HeLoRiA");
                
                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("comment").setLabel("Votre commentaire de satisfaction").setStyle(TextInputStyle.Paragraph).setRequired(true)
                ));
                return i.showModal(modal);
            }

            if (i.isModalSubmit() && i.customId.startsWith("submit_review_")) {
                await i.deferReply().catch(() => {});
                const [, , starsStr, staffId] = i.customId.split("_");
                const stars = parseInt(starsStr);
                const comment = i.fields.getTextInputValue("comment");

                const reviewEmbed = new EmbedBuilder()
                    .setColor("#FFFFFF")
                    .setTitle("Nouvel Avis Support — Team HeLoRiA")
                    .addFields(
                        { name: "Staff Évalué", value: `<@${staffId}> (\`${staffId}\`)`, inline: true },
                        { name: "Note globale", value: `${stars}/5`, inline: true },
                        { name: "Auteur", value: `${i.user} (\`${i.user.id}\`)`, inline: false },
                        { name: "Commentaire", value: comment }
                    )
                    .setTimestamp();

                if (!db.stats[staffId]) db.stats[staffId] = { closedTickets: 0, reviews: [] };
                db.stats[staffId].reviews.push(stars);
                writeDB(db);

                const guildInstance = client.guilds.cache.first();
                if (guildInstance) {
                    const reviewLogs = await guildInstance.channels.fetch(AVIS_CHANNEL).catch(() => null);
                    if (reviewLogs) await reviewLogs.send({ embeds: [reviewEmbed] });
                }

                return i.editReply({ content: "Merci ! Votre évaluation a été transmise à l'équipe Team HeLoRiA." });
            }
            return;
        }

        // ANTI-SPAM DE BOUTONS / MENUS
        if (i.isButton() || i.isStringSelectMenu()) {
            const cooldownKey = `${i.user.id}-${i.customId}`;
            if (globalCooldowns.has(cooldownKey)) {
                if (!i.deferred && !i.replied) return i.reply({ content: "Action trop rapide, veuillez patienter.", ephemeral: true }).catch(() => {});
                return;
            }
            globalCooldowns.add(cooldownKey);
            setTimeout(() => globalCooldowns.delete(cooldownKey), 1200);
        }

        // OUVERTURE DE TICKET VIA LE MENU DÉROULANT
        if (i.isStringSelectMenu() && i.customId === "ticket_select") {
            await i.deferReply({ ephemeral: true }).catch(() => {});

            const db = readDB();
            const type = i.values[0];

            if (db.blacklist.includes(i.user.id)) {
                return i.editReply({ content: "Vous êtes banni du système de support." });
            }

            try {
                const categoryId = await getCategoryForType(i.guild, type);

                const basePermissions = [
                    { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                ];

                (config.ROLES[type] || []).forEach(rId => {
                    basePermissions.push({ 
                        id: rId, 
                        allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] 
                    });
                });

                const ticketChannel = await i.guild.channels.create({
                    name: `${type}-${i.user.username}`.toLowerCase().replace(/[^a-z0-9-_]/g, ''),
                    type: ChannelType.GuildText,
                    parent: categoryId || null,
                    permissionOverwrites: basePermissions
                });

                db.tickets[ticketChannel.id] = {
                    userId: i.user.id,
                    username: i.user.username,
                    type: type,
                    createdAt: Date.now(),
                    lastActivity: Date.now(),
                    messageCount: 0,
                    status: "open",
                    claimedBy: null
                };
                writeDB(db);

                const actionButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("close").setLabel("Fermer").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("delete").setLabel("Supprimer").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("blacklist_user").setLabel("Blacklist").setStyle(ButtonStyle.Danger)
                );

                const utilityButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("ticket_add_user").setLabel("Ajouter").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("ticket_remove_user").setLabel("Retirer").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("ticket_create_voice").setLabel("Salon Vocal").setStyle(ButtonStyle.Success)
                );

                const formEmbed = getFormEmbed(type);

                await ticketChannel.send({ 
                    content: `Bonjour ${i.user} | @here Un nouveau dossier vient d'être ouvert.`, 
                    embeds: [formEmbed], 
                    components: [actionButtons, utilityButtons] 
                });

                return i.editReply({ content: `Votre salon privé a été initialisé : ${ticketChannel}` });

            } catch (err) {
                console.error("❌ Erreur lors de la création du ticket :", err);
                return i.editReply({ content: "Une erreur est survenue lors de la création de votre salon privé." });
            }
        }

        const db = readDB();
        const context = db.tickets[i.channel.id];

        const isStaffUser = context 
            ? (config.ROLES[context.type] || []).some(rId => i.member.roles.cache.has(rId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels) 
            : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        // GESTION DES BOUTONS UTILES DU TICKET
        if (i.isButton() && ["ticket_add_user", "ticket_remove_user", "ticket_create_voice"].includes(i.customId)) {
            if (!isStaffUser) return i.reply({ content: "Action réservée aux modérateurs.", ephemeral: true });

            if (i.customId === "ticket_add_user" || i.customId === "ticket_remove_user") {
                const modal = new ModalBuilder().setCustomId(`modal_user_${i.customId}`).setTitle("Gestion des permissions");
                modal.addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("user_id").setLabel("ID Unique du membre").setStyle(TextInputStyle.Short).setRequired(true)));
                return i.showModal(modal);
            }

            if (i.customId === "ticket_create_voice") {
                await i.deferReply();
                const voiceChannel = await i.guild.channels.create({ 
                    name: `Entretien-${i.channel.name}`, 
                    type: ChannelType.GuildVoice, 
                    parent: i.channel.parentId, 
                    permissionOverwrites: i.channel.permissionOverwrites.cache.map(p => p) 
                });
                return i.editReply({ content: `Salon d'entretien vocal éphémère créé : ${voiceChannel}` });
            }
        }

        // SOUMISSION DES MODALS UTILISATEURS (Ajout/Retrait)
        if (i.isModalSubmit() && i.customId.startsWith("modal_user_")) {
            await i.deferReply({ ephemeral: true });
            const actionType = i.customId.includes("add") ? "add" : "remove";
            const targetId = i.fields.getTextInputValue("user_id");
            const targetMember = await i.guild.members.fetch(targetId).catch(() => null);

            if (!targetMember) return i.editReply({ content: "Cet identifiant n'appartient pas à ce serveur." });

            if (actionType === "add") {
                await i.channel.permissionOverwrites.edit(targetMember.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
                await i.channel.send({ content: `${targetMember} a été ajouté à cet espace privé.` });
            } else {
                await i.channel.permissionOverwrites.delete(targetMember.id);
                await i.channel.send({ content: `${targetMember} a été retiré de cet espace.` });
            }
            return i.editReply({ content: "Permissions mises à jour." });
        }

        // ACTIONS PRINCIPALES SUR LES TICKETS (Claim, Close, Delete, Blacklist)
        if (i.isButton() && ["claim", "close", "delete", "force_close_confirm", "cancel_close", "blacklist_user"].includes(i.customId)) {
            if (!isStaffUser && i.customId !== "cancel_close") {
                return i.reply({ content: "Action refusée. Droits de modération requis.", ephemeral: true });
            }

            if (i.customId === "blacklist_user") {
                if (!context) return i.reply({ content: "Impossible de cibler l'auteur.", ephemeral: true });
                await i.reply({ content: "Application de la blacklist..." });

                db.blacklist.push(context.userId);
                delete db.tickets[i.channel.id];
                writeDB(db);

                const logChannel = await i.guild.channels.fetch(LOGS_CHANNEL).catch(() => null);
                if (logChannel) {
                    logChannel.send({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("BLACKLIST SUPPORT").setDescription(`L'ID \`${context.userId}\` a été banni du système de support par ${i.user}.`)] });
                }

                return setTimeout(() => i.channel.delete().catch(() => {}), 2000);
            }

            if (i.customId === "claim") {
                await i.deferUpdate();
                db.tickets[i.channel.id].claimedBy = i.user.id; 
                writeDB(db);

                await i.channel.setName(`claim-${i.channel.name}`.slice(0, 100)).catch(() => {});
                
                const updatedRow = ActionRowBuilder.from(i.message.components[0]);
                updatedRow.components[0] = new ButtonBuilder()
                    .setCustomId("claimed")
                    .setLabel(`Pris en charge par ${i.user.username}`)
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true);

                await i.message.edit({ components: [updatedRow, i.message.components[1]] }).catch(() => {});
                return i.channel.send({ embeds: [new EmbedBuilder().setColor("#FFFFFF").setDescription(`**${i.user.username}** a pris en charge votre demande.`)] });
            }

            if (i.customId === "close") {
                await i.deferUpdate();
                const confirmEmbed = new EmbedBuilder().setColor("#FFFFFF").setDescription("Voulez-vous fermer ce ticket définitivement ? Un transcript sera généré.");
                const confirmRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("force_close_confirm").setLabel("Confirmer la fermeture").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("cancel_close").setLabel("Annuler").setStyle(ButtonStyle.Secondary)
                );
                return i.channel.send({ embeds: [confirmEmbed], components: [confirmRow] });
            }

            if (i.customId === "cancel_close") {
                await i.deferUpdate();
                await i.message.delete().catch(() => {});
                return i.channel.send("Fermeture annulée.");
            }

            if (i.customId === "force_close_confirm" || i.customId === "delete") {
                await i.reply("Génération du transcript en cours...");
                return await generateSystemClose(i.channel, client, context, i.user);
            }
        }
    });
};

function getFormEmbed(type) {
    const embed = new EmbedBuilder().setColor("#FFFFFF").setTimestamp();

    if (type === "joueur") {
        return embed.setTitle("Recrutement Joueur — Team HeLoRiA")
            .setDescription("> Merci de répondre précisément aux questions ci-dessous.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Informations générales\n・Pseudo Epic Games :\n・Âge :\n・Plateforme :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Parcours compétitif\n・Power Ranking (PR) :\n・Anciennes structures :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Motivation\n・Vos ambitions :\n・Pourquoi rejoindre la Team HeLoRiA ?\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Merci pour votre candidature.");
    } else if (type === "staff") {
        return embed.setTitle("Recrutement Staff — Team HeLoRiA")
            .setDescription("> Merci de répondre précisément aux questions ci-dessous.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Informations générales\n・Pseudo Discord :\n・Âge :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Expérience & Motivation\n・Vos anciennes expériences :\n・Pourquoi la Team HeLoRiA ?\n・Vos compétences en modération :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Merci pour votre candidature.");
    } else if (type === "audiovisuel") {
        return embed.setTitle("Recrutement Audiovisuel — Team HeLoRiA")
            .setDescription("> Merci de répondre précisément aux questions ci-dessous.\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Informations générales\n・Pseudo Discord :\n・Domaine (Graphisme, Montage, etc.) :\n・Portfolio / Exemples de réalisations :\n\n" +
                "━━━━━━━━━━━━━━━━━━━━━━\n\n" +
                "Merci pour votre candidature.");
    } else if (type === "aide") {
        return embed.setTitle("Assistance Générale — Team HeLoRiA")
            .setDescription("> Décrivez votre demande ci-dessous afin qu'un membre du Staff prenne en charge votre ticket.");
    } else {
        return embed.setTitle("Demande de Partenariat — Team HeLoRiA")
            .setDescription("> Merci de présenter votre structure et votre projet de partenariat.");
    }
}

async function generateSystemClose(channel, client, context, staffUser) {
    const filename = `transcript-${channel.id}.txt`;
    const tempPath = path.join(__dirname, filename);

    try {
        const messages = await channel.messages.fetch({ limit: 100 });
        let transcriptText = `TRANSCRIPT TEAM HELORIA — SALON : ${channel.name}\n`;
        transcriptText += `Créé par : ${context ? context.username : "Inconnu"} (ID: ${context ? context.userId : "N/A"})\n`;
        transcriptText += `Clôturé par : ${staffUser ? staffUser.tag : "Système"}\n`;
        transcriptText += `Date : ${new Date().toLocaleString()}\n`;
        transcriptText += `=========================================\n\n`;

        const sorted = Array.from(messages.values()).reverse();
        sorted.forEach(m => {
            transcriptText += `[${m.createdAt.toLocaleString()}] ${m.author.tag}: ${m.content}\n`;
        });

        fs.writeFileSync(tempPath, transcriptText, "utf-8");
        const attachment = new AttachmentBuilder(tempPath, { name: filename });

        const summaryEmbed = new EmbedBuilder()
            .setColor("#FFFFFF")
            .setTitle("Archive de Ticket")
            .setDescription(`• Salon : \`${channel.name}\`\n• Demandeur : <@${context ? context.userId : "Inconnu"}>\n• Fermé par : ${staffUser ? staffUser : "Automatique"}`)
            .setTimestamp();

        const archChan = await client.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);
        if (archChan) await archChan.send({ embeds: [summaryEmbed], files: [attachment] });

        const logChan = await client.channels.fetch(LOGS_CHANNEL).catch(() => null);
        if (logChan) await logChan.send({ embeds: [summaryEmbed] });

        if (context && context.userId) {
            const targetMember = await channel.guild.members.fetch(context.userId).catch(() => null);
            if (targetMember) {
                const claimedStaff = context.claimedBy || client.user.id;
                const reviewRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_5_${claimedStaff}`).setLabel("5 Stars").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rate_4_${claimedStaff}`).setLabel("4 Stars").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rate_3_${claimedStaff}`).setLabel("3 Stars").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_2_${claimedStaff}`).setLabel("2 Stars").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`rate_1_${claimedStaff}`).setLabel("1 Star").setStyle(ButtonStyle.Danger)
                );
                await targetMember.send({
                    embeds: [new EmbedBuilder().setColor("#FFFFFF").setTitle("Évaluation — Team HeLoRiA").setDescription("Votre ticket est désormais fermé. Merci d'évaluer la qualité du support reçu :")],
                    components: [reviewRow]
                }).catch(() => {});
            }
        }

        const db = readDB();
        if (db.tickets[channel.id]) {
            if (context && context.claimedBy) {
                if (!db.stats[context.claimedBy]) db.stats[context.claimedBy] = { closedTickets: 0, reviews: [] };
                db.stats[context.claimedBy].closedTickets = (db.stats[context.claimedBy].closedTickets || 0) + 1;
            }
            delete db.tickets[channel.id];
            writeDB(db);
        }

    } catch (err) {
        console.error("Erreur lors de la fermeture :", err);
    } finally {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }
}