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
    TextInputStyle
} = require("discord.js");

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const discordTranscripts = require("discord-html-transcripts");
const config = require("../data/ticket_database");

// Emojis custom du serveur. Les IDs sont spécifiques à la guild HeLoRiA,
// il faudra les remplacer si le bot tourne ailleurs.
const EMOJIS = {
    warning: "<:warningd:1533535400176386068>",
    loading: "<a:loadingicon:1533535386951749683>",
    update: "<:update:1533535384674369777>",
    lock: "<a:lockicon:1533535370787033198>",
    premium: "<:5647premiumicon:1533535330538360942>",
    money: "<:63043moneyspread:1537577805829636117>",
    handshake: "<:600404handshake:1537578056447828058>",
    paypal: "<:1716_PAYPAL:1537578291593093240>",
    certified: "<:20336certified:1537579306690281544>",
    briefcase: "<:75828briefcase:1537579702812807248>",
    ticket: "<:29909ticket:1537580036159316108>",
    ban: "<:9299blurpleban:1533535325996056807>",
    mod: "<:3446blurplecertifiedmoderator:1533535324309815367>",
    mic: "<:68052micanimation:1537582247278813204>",
    trialmod: "<:94919trialmod:1537582836318609521>",
    rules: "<:580437rules:1537583160345366578>"
};

const LOGS_CHANNEL = "1535306876164640920";
const ARCHIVE_CHANNEL = "1541230358526304256";
const AVIS_CHANNEL = "1541544133171347710";
const DB_PATH = path.join(__dirname, "../data/ticket_database.json");

// NB: le fichier de config "../data/ticket_database.js" et la base JSON
// "../data/ticket_database.json" portent le même nom de base. Ça fonctionne
// (Node résout le .js en priorité) mais un renommage éviterait toute confusion
// future, notamment si quelqu'un modifie un require à la main.

// Association pôle -> rôle spécifique + rôle "parent" du pôle
const ROLE_MAPPING = {
    grinder1: { roleId: config.ROLES_POLES?.grinder1, mainPoleId: config.ROLES_POLES?.main_grinder },
    grinder2: { roleId: config.ROLES_POLES?.grinder2, mainPoleId: config.ROLES_POLES?.main_grinder },
    grinder3: { roleId: config.ROLES_POLES?.grinder3, mainPoleId: config.ROLES_POLES?.main_grinder },
    grinder4: { roleId: config.ROLES_POLES?.grinder4, mainPoleId: config.ROLES_POLES?.main_grinder },
    grinder5: { roleId: config.ROLES_POLES?.grinder5, mainPoleId: config.ROLES_POLES?.main_grinder },
    espoir: { roleId: config.ROLES_POLES?.espoir, mainPoleId: config.ROLES_POLES?.main_espoir },
    formation: { roleId: config.ROLES_POLES?.formation, mainPoleId: config.ROLES_POLES?.main_formation },
    academique: { roleId: config.ROLES_POLES?.academique, mainPoleId: config.ROLES_POLES?.main_academique },
    esport: { roleId: config.ROLES_POLES?.esport, mainPoleId: config.ROLES_POLES?.main_esport }
};

// Identifiants gérés par ce module, pour ignorer rapidement toute interaction
// qui appartient à un autre fichier (évite de lire la DB pour rien et
// d'interférer avec les autres listeners du bot).
const TICKET_BUTTON_IDS = new Set([
    "create_voice_channel",
    "force_delete_ticket",
    "assign_pole_menu",
    "trigger_check_pr",
    "claim",
    "create_staff_thread",
    "ticket_ping_user",
    "close_with_review",
    "blacklist_user"
]);
const TICKET_SELECT_IDS = new Set(["ticket_select", "select_pole_to_assign"]);

// --- Base de données locale (JSON) ---

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
        console.error("[TICKET DB ERROR]", err);
    }
}

// --- Utilitaires ---

function cleanPRInput(input) {
    if (!input) return 0;
    const str = input.toLowerCase().trim().replace(/\s+/g, "").replace(",", ".");
    if (str.endsWith("k")) {
        const val = parseFloat(str.replace("k", ""));
        return isNaN(val) ? 0 : Math.round(val * 1000);
    }
    const cleanStr = str.replace(/[^0-9]/g, "");
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
}

function getPoleInfo(prFinal) {
    if (prFinal >= 5000) return { name: "Pôle eSport Officiel", roleKey: "esport" };
    if (prFinal >= 700) return { name: "Pôle Académique", roleKey: "academique" };
    if (prFinal >= 350) return { name: "Centre de Formation", roleKey: "formation" };
    if (prFinal >= 100) return { name: "Pôle Espoir", roleKey: "espoir" };
    if (prFinal >= 80) return { name: "Pôle Grinder (Grade 1)", roleKey: "grinder1" };
    if (prFinal >= 60) return { name: "Pôle Grinder (Grade 2)", roleKey: "grinder2" };
    if (prFinal >= 40) return { name: "Pôle Grinder (Grade 3)", roleKey: "grinder3" };
    if (prFinal >= 20) return { name: "Pôle Grinder (Grade 4)", roleKey: "grinder4" };
    return { name: "Pôle Grinder (Grade 5)", roleKey: "grinder5" };
}

async function fetchFortnitePR(epicUsername) {
    const apiKey = process.env.FORTNITE_TRACKER_KEY;
    if (!apiKey) return { error: "CLÉ_API_MANQUANTE" };

    try {
        const url = `https://api.tracker.gg/api/v2/fortnite/standard/profile/kbm/${encodeURIComponent(epicUsername)}`;
        const response = await fetch(url, { headers: { "TRN-Api-Key": apiKey } });

        if (response.status === 404) return { error: "JOUEUR_INTROUVABLE" };
        if (!response.ok) return { error: "API_ERREUR" };

        const json = await response.json();
        const segments = json.data?.segments || [];

        let prEU = 0;
        for (const seg of segments) {
            if (seg.attributes?.region === "EU" || seg.metadata?.name?.includes("Europe")) {
                prEU += seg.stats?.pr?.value || seg.stats?.powerRanking?.value || 0;
            }
        }
        return { prEU };
    } catch {
        return { error: "API_CRASH" };
    }
}

async function getCategoryForType(guild, type) {
    if ((type === "joueur" || type === "upgrade_pr") && config.JOUEUR_CATEGORIES_POOL?.length > 0) {
        for (const catId of config.JOUEUR_CATEGORIES_POOL) {
            const category = await guild.channels.fetch(catId).catch(() => null);
            if (category && category.type === ChannelType.GuildCategory) {
                if (guild.channels.cache.filter(c => c.parentId === category.id).size < 50) return category.id;
            }
        }
        return config.JOUEUR_CATEGORIES_POOL[0] || null;
    }

    const catId = config.CATEGORIES?.[type];
    if (catId) {
        const category = await guild.channels.fetch(catId).catch(() => null);
        if (category && category.type === ChannelType.GuildCategory) {
            if (guild.channels.cache.filter(c => c.parentId === category.id).size < 50) return category.id;
        }
    }
    return null;
}

function buildTicketChannelName(type, username) {
    return `${type}-${username}`
        .toLowerCase()
        .replace(/[^a-z0-9-_]/g, "")
        .slice(0, 100);
}

/**
 * Ferme un ticket : supprime le vocal associé, génère le transcript,
 * l'envoie en logs/archives, demande un avis au propriétaire, met à jour
 * les stats du staff, puis supprime le salon.
 */
async function closeTicketSystem(channel, client, ticketContext, closedByUser, sendReview = true) {
    try {
        const guild = channel.guild;
        const db = readDB();
        const ticketData = ticketContext || db.tickets[channel.id];
        const staffId = ticketData?.claimedBy || closedByUser?.id || client.user.id;

        if (ticketData?.voiceChannelId) {
            const vc = await guild.channels.fetch(ticketData.voiceChannelId).catch(() => null);
            if (vc) await vc.delete().catch(() => {});
        }

        let transcriptAttachment = null;
        try {
            transcriptAttachment = await discordTranscripts.createTranscript(channel, {
                limit: -1,
                returnName: `transcript-${channel.name}.html`,
                poweredBy: false
            });
        } catch (err) {
            console.error("[TRANSCRIPT ERROR]", err);
        }

        const logChannel = await guild.channels.fetch(LOGS_CHANNEL).catch(() => null);
        const archiveChannel = await guild.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);

        const summaryEmbed = new EmbedBuilder()
            .setColor("#2F3136")
            .setTitle(`${EMOJIS.lock} TICKET FERMÉ — ${channel.name}`)
            .addFields(
                { name: "Propriétaire", value: ticketData ? `<@${ticketData.userId}> (\`${ticketData.userId}\`)` : "Inconnu", inline: true },
                { name: "Fermé par", value: closedByUser ? `${closedByUser} (\`${closedByUser.id}\`)` : "Système", inline: true },
                { name: "Pris en charge par", value: ticketData?.claimedBy ? `<@${ticketData.claimedBy}>` : "Non pris en charge", inline: true }
            )
            .setTimestamp();

        if (logChannel?.send) {
            await logChannel.send({ embeds: [summaryEmbed], files: transcriptAttachment ? [transcriptAttachment] : [] }).catch(console.error);
        }
        if (archiveChannel?.send) {
            await archiveChannel.send({ embeds: [summaryEmbed], files: transcriptAttachment ? [transcriptAttachment] : [] }).catch(console.error);
        }

        if (sendReview && ticketData?.userId) {
            const targetUser = await client.users.fetch(ticketData.userId).catch(() => null);
            if (targetUser) {
                const reviewEmbed = new EmbedBuilder()
                    .setColor("#2F3136")
                    .setTitle(`${EMOJIS.ticket} ÉVALUATION DE VOTRE SUPPORT`)
                    .setDescription(`Votre ticket **${channel.name}** a été fermé.\nMerci de prendre un instant pour évaluer la prise en charge de votre demande par l'équipe.`);

                const ratingRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_1_${staffId}`).setLabel("1 ⭐").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`rate_2_${staffId}`).setLabel("2 ⭐").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_3_${staffId}`).setLabel("3 ⭐").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_4_${staffId}`).setLabel("4 ⭐").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rate_5_${staffId}`).setLabel("5 ⭐").setStyle(ButtonStyle.Success)
                );

                await targetUser.send({ embeds: [reviewEmbed], components: [ratingRow] }).catch(() => {});
            }
        }

        // Stats + suppression de l'entrée ticket, en une seule écriture
        if (!db.stats[staffId]) db.stats[staffId] = { closedTickets: 0, reviews: [] };
        db.stats[staffId].closedTickets += 1;
        if (db.tickets[channel.id]) delete db.tickets[channel.id];
        writeDB(db);

        setTimeout(() => channel.delete().catch(() => {}), 1500);
    } catch (err) {
        console.error("[CLOSE TICKET ERROR]", err);
    }
}

module.exports = async (client) => {
    console.log("[TICKET SYSTEM] Initialisation du système de tickets...");

    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;

        const db = readDB();
        const ticket = db.tickets[message.channel.id];
        if (!ticket) return;

        ticket.lastActivity = Date.now();
        ticket.messageCount = (ticket.messageCount || 0) + 1;
        writeDB(db);
    });

    // Panel de support : on nettoie les anciens messages du bot puis on repost
    const panelChannel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
    if (panelChannel) {
        const cachedMessages = await panelChannel.messages.fetch({ limit: 10 }).catch(() => null);
        if (cachedMessages) {
            const botMessages = cachedMessages.filter(m => m.author.id === client.user.id);
            for (const msg of botMessages.values()) await msg.delete().catch(() => {});
        }

        const panelEmbed = new EmbedBuilder()
            .setColor("#2F3136")
            .setTitle(`${EMOJIS.ticket} HUB D'ASSISTANCE — TEAM HELORIA`)
            .setDescription(
                `Bienvenue sur le centre du support officiel de la **Team HeLoRiA**.\n` +
                `Notre équipe est à votre disposition pour vous accompagner dans vos démarches.\n\n` +
                `${EMOJIS.rules} **Consignes d'ouverture**\n` +
                `• Sélectionnez votre catégorie ci-dessous.\n` +
                `• Remplissez attentivement le formulaire qui va s'afficher.\n` +
                `• Un salon privé sera automatiquement généré.\n\n` +
                `───────`
            )
            .setFooter({ text: "Team HeLoRiA • Support Officiel" });

        const menuSelection = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Choisissez le motif de votre demande...")
            .addOptions([
                { label: "Recrutement Staff", description: "Rejoindre l'équipe administrative", value: "staff", emoji: EMOJIS.mod },
                { label: "Recrutement Joueur", description: "Postuler en tant que joueur eSport / Grinder", value: "joueur", emoji: EMOJIS.premium },
                { label: "Augmentation PR / Grade", description: "Mise à jour de votre statut Grinder/Joueur", value: "upgrade_pr", emoji: EMOJIS.update },
                { label: "Recrutement Audiovisuel", description: "Graphistes, monteurs et créateurs", value: "audiovisuel", emoji: EMOJIS.mic },
                { label: "Assistance Générale", description: "Questions et aide technique", value: "aide", emoji: EMOJIS.certified },
                { label: "Demande de Partenariat", description: "Proposer une collaboration", value: "partenariat", emoji: EMOJIS.handshake }
            ]);

        await panelChannel.send({
            embeds: [panelEmbed],
            components: [new ActionRowBuilder().addComponents(menuSelection)]
        }).catch(() => {});
    }

    client.on("interactionCreate", async (i) => {
        try {
            await handleInteraction(i, client);
        } catch (err) {
            console.error("[TICKET INTERACTION ERROR]", err);
            const errorPayload = { content: `${EMOJIS.warning} Une erreur inattendue est survenue.`, ephemeral: true };
            if (i.deferred || i.replied) {
                await i.followUp(errorPayload).catch(() => {});
            } else {
                await i.reply(errorPayload).catch(() => {});
            }
        }
    });

    async function handleInteraction(i, client) {
        // --- Interactions en MP (avis post-ticket) ---
        if (!i.guild) {
            if (i.isButton() && i.customId.startsWith("rate_")) {
                const [, stars, staffId] = i.customId.split("_");
                const modal = new ModalBuilder()
                    .setCustomId(`submit_review_${stars}_${staffId}`)
                    .setTitle("Votre avis sur Team HeLoRiA");

                modal.addComponents(new ActionRowBuilder().addComponents(
                    new TextInputBuilder().setCustomId("comment").setLabel("Votre commentaire").setStyle(TextInputStyle.Paragraph).setRequired(true)
                ));
                return i.showModal(modal);
            }

            if (i.isModalSubmit() && i.customId.startsWith("submit_review_")) {
                await i.deferReply();
                const [, , starsStr, staffId] = i.customId.split("_");
                const stars = parseInt(starsStr, 10);
                const comment = i.fields.getTextInputValue("comment");
                const db = readDB();

                const reviewEmbed = new EmbedBuilder()
                    .setColor("#FFFFFF")
                    .setTitle(`${EMOJIS.certified} Nouvel Avis Support — Team HeLoRiA`)
                    .addFields(
                        { name: "Staff Évalué", value: `<@${staffId}> (\`${staffId}\`)`, inline: true },
                        { name: "Note globale", value: `${stars}/5 ⭐`, inline: true },
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
                    if (reviewLogs?.send) await reviewLogs.send({ embeds: [reviewEmbed] });
                }

                return i.editReply({ content: `${EMOJIS.certified} Merci ! Votre évaluation a bien été enregistrée.` });
            }
            return;
        }

        // Interactions qui n'appartiennent pas à ce module : on ne touche à rien
        const isTicketButton = i.isButton() && TICKET_BUTTON_IDS.has(i.customId);
        const isTicketSelect = i.isStringSelectMenu() && TICKET_SELECT_IDS.has(i.customId);
        const isTicketCreationModal = i.isModalSubmit() && i.customId.startsWith("create_ticket_modal_");
        const isPrCheckModal = i.isModalSubmit() && i.customId === "process_pr_check";

        if (!isTicketButton && !isTicketSelect && !isTicketCreationModal && !isPrCheckModal) return;

        // --- Sélection du motif -> ouverture du formulaire adapté ---
        if (i.isStringSelectMenu() && i.customId === "ticket_select") {
            const db = readDB();
            if (db.blacklist.includes(i.user.id)) {
                return i.reply({ content: `${EMOJIS.warning} Vous êtes banni du système de support.`, ephemeral: true });
            }

            const hasOpenTicket = Object.values(db.tickets).some(t => t.userId === i.user.id && t.status === "open");
            if (hasOpenTicket) {
                return i.reply({ content: `${EMOJIS.warning} Vous avez déjà un ticket ouvert sur le serveur.`, ephemeral: true });
            }

            const type = i.values[0];
            const modal = new ModalBuilder().setCustomId(`create_ticket_modal_${type}`).setTitle("Formulaire de Demande");

            if (type === "joueur") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("epic").setLabel("Pseudo Epic Games Exact").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("pr").setLabel("PR OVERALL (Ex: 1.2k, 450...)").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age_platform").setLabel("Âge & Plateforme (Ex: 16 ans, PC)").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("motivations").setLabel("Vos motivations").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else if (type === "upgrade_pr") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("epic").setLabel("Pseudo Epic Games Exact").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("pr").setLabel("Nouvelle PR OVERALL atteinte").setStyle(TextInputStyle.Short).setRequired(true))
                );
            } else if (type === "staff" || type === "audiovisuel") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age_role").setLabel("Âge & Poste recherché").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("experience").setLabel("Expériences & Portfolio (Lien)").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("subject").setLabel("Sujet / Description de la demande").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            }

            return i.showModal(modal);
        }

        // --- Traitement du formulaire et création du ticket ---
        if (isTicketCreationModal) {
            const type = i.customId.replace("create_ticket_modal_", "");
            await i.deferReply({ ephemeral: true });

            try {
                const categoryId = await getCategoryForType(i.guild, type);
                const basePermissions = [
                    { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory, PermissionsBitField.Flags.AttachFiles] }
                ];

                (config.ROLES[type] || []).forEach(roleId => {
                    basePermissions.push({ id: roleId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
                });

                const ticketChannel = await i.guild.channels.create({
                    name: buildTicketChannelName(type, i.user.username),
                    type: ChannelType.GuildText,
                    parent: categoryId || null,
                    permissionOverwrites: basePermissions
                });

                const db = readDB();
                db.tickets[ticketChannel.id] = {
                    userId: i.user.id,
                    username: i.user.username,
                    type,
                    createdAt: Date.now(),
                    lastActivity: Date.now(),
                    messageCount: 0,
                    status: "open",
                    claimedBy: null,
                    voiceChannelId: null
                };
                writeDB(db);

                const welcomeEmbed = new EmbedBuilder()
                    .setColor("#2F3136")
                    .setTitle(`${EMOJIS.ticket} NOUVEAU TICKET — ${type.toUpperCase()}`)
                    .setTimestamp();

                if (type === "joueur") {
                    welcomeEmbed.addFields(
                        { name: "Pseudo Epic", value: i.fields.getTextInputValue("epic"), inline: true },
                        { name: "PR Déclarée", value: i.fields.getTextInputValue("pr"), inline: true },
                        { name: "Âge & Plateforme", value: i.fields.getTextInputValue("age_platform"), inline: true },
                        { name: "Motivations", value: i.fields.getTextInputValue("motivations") }
                    );
                } else if (type === "upgrade_pr") {
                    welcomeEmbed.addFields(
                        { name: "Pseudo Epic", value: i.fields.getTextInputValue("epic"), inline: true },
                        { name: "Nouvelle PR Déclarée", value: i.fields.getTextInputValue("pr"), inline: true }
                    );
                } else if (type === "staff" || type === "audiovisuel") {
                    welcomeEmbed.addFields(
                        { name: "Âge & Poste", value: i.fields.getTextInputValue("age_role"), inline: true },
                        { name: "Expériences / Portfolio", value: i.fields.getTextInputValue("experience") }
                    );
                } else {
                    welcomeEmbed.addFields({ name: "Description", value: i.fields.getTextInputValue("subject") });
                }

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary).setEmoji(EMOJIS.mod),
                    new ButtonBuilder().setCustomId("close_with_review").setLabel("Fermer").setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.lock),
                    new ButtonBuilder().setCustomId("force_delete_ticket").setLabel("Supprimer").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId("create_voice_channel").setLabel("Créer Vocal").setStyle(ButtonStyle.Success).setEmoji(EMOJIS.mic)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("trigger_check_pr").setLabel("Vérifier PR").setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.certified),
                    new ButtonBuilder().setCustomId("assign_pole_menu").setLabel("Attribuer Pôle").setStyle(ButtonStyle.Success).setEmoji(EMOJIS.briefcase),
                    new ButtonBuilder().setCustomId("create_staff_thread").setLabel("Fil Staff").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("ticket_ping_user").setLabel("Rappel MP").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("blacklist_user").setLabel("Blacklist").setStyle(ButtonStyle.Danger).setEmoji(EMOJIS.ban)
                );

                await ticketChannel.send({
                    content: `Bienvenue ${i.user} | Staff : <@&${(config.ROLES[type] || [])[0] || i.guild.id}>`,
                    embeds: [welcomeEmbed],
                    components: [row1, row2]
                });

                return i.editReply({ content: `${EMOJIS.certified} Votre ticket a été créé avec succès : ${ticketChannel}` });
            } catch (err) {
                console.error("[TICKET CREATE ERROR]", err);
                return i.editReply({ content: `${EMOJIS.warning} Erreur lors de la création du salon.` });
            }
        }

        // --- Vérification de PR (modal, indépendant d'un ticket précis) ---
        if (isPrCheckModal) {
            await i.deferReply();
            const epicPseudo = i.fields.getTextInputValue("epic_pseudo");
            const rawPROverall = i.fields.getTextInputValue("pr_overall");
            const prOverall = cleanPRInput(rawPROverall);

            const apiData = await fetchFortnitePR(epicPseudo);
            const formEmbed = new EmbedBuilder().setTimestamp();

            if (apiData.error) {
                formEmbed.setColor("#ED4245")
                    .setDescription(`${EMOJIS.warning} **Erreur API : ${apiData.error}**\nCalcul basé uniquement sur la PR Déclarée.`)
                    .addFields(
                        { name: "Pseudo Epic", value: epicPseudo, inline: true },
                        { name: "PR OVERALL Saisie", value: `${prOverall} pts`, inline: true }
                    );
            } else {
                const prEU = apiData.prEU;
                const prDiff = prOverall - prEU;
                const prFinal = Math.round((prEU * 0.65) + (prDiff * 0.35));
                const pole = getPoleInfo(prFinal);

                formEmbed.setColor("#57F287")
                    .setTitle(`${EMOJIS.certified} Résultat du Calcul PR`)
                    .addFields(
                        { name: "Pseudo Epic", value: epicPseudo, inline: true },
                        { name: "PR EU (API)", value: `${prEU} pts`, inline: true },
                        { name: "PR OVERALL", value: `${prOverall} pts`, inline: true },
                        { name: `${EMOJIS.premium} PR Finale Calculée`, value: `**${prFinal} pts**`, inline: true },
                        { name: `${EMOJIS.briefcase} Pôle Recommandé`, value: `**${pole.name}**`, inline: true }
                    );
            }

            return i.editReply({ embeds: [formEmbed] });
        }

        // --- À partir d'ici, tout se passe dans le salon d'un ticket ---
        const db = readDB();
        const context = db.tickets[i.channel.id];
        const isStaffUser = context
            ? (config.ROLES[context.type] || []).some(roleId => i.member.roles.cache.has(roleId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
            : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (isTicketButton) {
            if (!isStaffUser && i.customId !== "close_with_review") {
                return i.reply({ content: `${EMOJIS.warning} Action réservée au Staff.`, ephemeral: true });
            }

            if (i.customId === "create_voice_channel") {
                if (context?.voiceChannelId) {
                    return i.reply({ content: `${EMOJIS.warning} Un salon vocal existe déjà pour ce ticket.`, ephemeral: true });
                }

                await i.deferReply({ ephemeral: true });
                try {
                    const voiceChannel = await i.guild.channels.create({
                        name: `🔊-${i.channel.name}`,
                        type: ChannelType.GuildVoice,
                        parent: i.channel.parentId,
                        permissionOverwrites: i.channel.permissionOverwrites.cache.map(p => p)
                    });

                    if (context) {
                        context.voiceChannelId = voiceChannel.id;
                        writeDB(db);
                    }

                    return i.editReply({ content: `${EMOJIS.certified} Salon vocal créé : ${voiceChannel}` });
                } catch (err) {
                    console.error("[VOICE CHANNEL ERROR]", err);
                    return i.editReply({ content: `${EMOJIS.warning} Impossible de créer le salon vocal (permissions manquantes ?).` });
                }
            }

            if (i.customId === "force_delete_ticket") {
                await i.reply({ content: `${EMOJIS.loading} Suppression du ticket et du vocal associé...` });

                if (context?.voiceChannelId) {
                    const vc = await i.guild.channels.fetch(context.voiceChannelId).catch(() => null);
                    if (vc) await vc.delete().catch(() => {});
                }

                if (db.tickets[i.channel.id]) {
                    delete db.tickets[i.channel.id];
                    writeDB(db);
                }

                setTimeout(() => i.channel.delete().catch(() => {}), 1500);
                return;
            }

            if (i.customId === "assign_pole_menu") {
                const poleSelect = new StringSelectMenuBuilder()
                    .setCustomId("select_pole_to_assign")
                    .setPlaceholder("Sélectionnez le pôle à attribuer...")
                    .addOptions([
                        { label: "Pôle eSport Officiel", value: "esport", emoji: EMOJIS.premium },
                        { label: "Pôle Académique", value: "academique", emoji: EMOJIS.certified },
                        { label: "Centre de Formation", value: "formation", emoji: EMOJIS.briefcase },
                        { label: "Pôle Espoir", value: "espoir", emoji: EMOJIS.update },
                        { label: "Pôle Grinder (Grade 1)", value: "grinder1", emoji: EMOJIS.ticket },
                        { label: "Pôle Grinder (Grade 2)", value: "grinder2", emoji: EMOJIS.ticket },
                        { label: "Pôle Grinder (Grade 3)", value: "grinder3", emoji: EMOJIS.ticket },
                        { label: "Pôle Grinder (Grade 4)", value: "grinder4", emoji: EMOJIS.ticket },
                        { label: "Pôle Grinder (Grade 5)", value: "grinder5", emoji: EMOJIS.ticket }
                    ]);

                return i.reply({
                    content: "Choisissez le pôle à attribuer au membre du ticket :",
                    components: [new ActionRowBuilder().addComponents(poleSelect)],
                    ephemeral: true
                });
            }

            if (i.customId === "trigger_check_pr") {
                const modal = new ModalBuilder().setCustomId("process_pr_check").setTitle("Vérification & Calcul PR");
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("epic_pseudo").setLabel("Pseudo Epic Games Exact").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("pr_overall").setLabel("PR OVERALL (Saisie)").setStyle(TextInputStyle.Short).setRequired(true))
                );
                return i.showModal(modal);
            }

            if (i.customId === "claim") {
                await i.deferUpdate();

                if (!context) {
                    // On évite de fabriquer une entrée avec le staff comme "propriétaire" :
                    // ça fausserait les stats et l'attribution de pôle plus tard.
                    return i.followUp({ content: `${EMOJIS.warning} Ce ticket n'a pas d'entrée en base de données, impossible de le prendre en charge automatiquement.`, ephemeral: true });
                }

                context.claimedBy = i.user.id;
                writeDB(db);
                await i.channel.setName(`claim-${i.channel.name}`.slice(0, 100)).catch(() => {});
                return i.channel.send({ embeds: [new EmbedBuilder().setColor("#2F3136").setDescription(`${EMOJIS.mod} Pris en charge par **${i.user.username}**.`)] });
            }

            if (i.customId === "create_staff_thread") {
                await i.deferReply({ ephemeral: true });
                try {
                    const thread = await i.channel.threads.create({
                        name: `staff-${i.channel.name}`.slice(0, 100),
                        autoArchiveDuration: 60,
                        type: ChannelType.PrivateThread,
                        reason: "Discussion privée Staff"
                    });
                    return i.editReply({ content: `${EMOJIS.mic} Fil privé créé : ${thread}` });
                } catch (err) {
                    console.error("[STAFF THREAD ERROR]", err);
                    return i.editReply({ content: `${EMOJIS.warning} Impossible de créer le fil (niveau de boost insuffisant pour un fil privé ?).` });
                }
            }

            if (i.customId === "ticket_ping_user") {
                await i.deferReply({ ephemeral: true });
                if (!context?.userId) return i.editReply({ content: `${EMOJIS.warning} Propriétaire introuvable.` });

                const targetUser = await client.users.fetch(context.userId).catch(() => null);
                const dmSent = targetUser
                    ? await targetUser.send({
                        embeds: [
                            new EmbedBuilder()
                                .setColor("#2F3136")
                                .setTitle(`${EMOJIS.ticket} Rappel de votre ticket — Team HeLoRiA`)
                                .setDescription(`Un modérateur est en attente d'une réponse de votre part dans le salon <#${i.channel.id}>.`)
                        ]
                    }).then(() => true).catch(() => false)
                    : false;

                if (dmSent) {
                    await i.channel.send({ content: `<@${context.userId}>, une relance vous a été envoyée par message privé.` });
                    return i.editReply({ content: `${EMOJIS.certified} Notification MP envoyée.` });
                }

                await i.channel.send({ content: `${EMOJIS.warning} <@${context.userId}>, vos MP sont fermés. Merci de répondre dans le ticket.` });
                return i.editReply({ content: `${EMOJIS.warning} L'utilisateur a ses MP fermés.` });
            }

            if (i.customId === "close_with_review") {
                await i.reply(`${EMOJIS.loading} Clôture et génération du transcript en cours...`);
                return closeTicketSystem(i.channel, client, context, i.user, true);
            }

            if (i.customId === "blacklist_user") {
                if (!context) return i.reply({ content: `${EMOJIS.warning} Données introuvables.`, ephemeral: true });

                if (!db.blacklist.includes(context.userId)) {
                    db.blacklist.push(context.userId);
                    writeDB(db);
                }

                await i.reply(`${EMOJIS.ban} Utilisateur blacklisté. Suppression du ticket...`);
                return closeTicketSystem(i.channel, client, context, i.user, false);
            }
        }

        // --- Attribution du pôle choisi (rôles auto) ---
        if (isTicketSelect && i.customId === "select_pole_to_assign") {
            if (!isStaffUser) {
                return i.reply({ content: `${EMOJIS.warning} Action réservée au Staff.`, ephemeral: true });
            }

            await i.deferReply();
            const poleData = ROLE_MAPPING[i.values[0]];

            if (!context?.userId) return i.editReply({ content: `${EMOJIS.warning} Impossible de trouver le membre associé.` });

            const targetMember = await i.guild.members.fetch(context.userId).catch(() => null);
            if (!targetMember) return i.editReply({ content: `${EMOJIS.warning} Le membre n'est plus sur le serveur.` });

            const rolesToAdd = [poleData?.roleId, poleData?.mainPoleId].filter(Boolean);
            if (rolesToAdd.length > 0) {
                await targetMember.roles.add(rolesToAdd).catch(err => console.error("[ROLE ASSIGN ERROR]", err));
            }

            await i.channel.send({ content: `${EMOJIS.certified} **Félicitations <@${context.userId}> !** Tu as été validé(e) et attribué(e) à ton pôle !` });
            return i.editReply({ content: `${EMOJIS.certified} Rôles attribués avec succès à <@${context.userId}> !` });
        }
    }
};
