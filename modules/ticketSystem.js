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
const discordTranscripts = require("discord-html-transcripts"); // npm i discord-html-transcripts
const config = require("../data/ticket_database");

const LOGS_CHANNEL = "1535306876164640920";
const ARCHIVE_CHANNEL = "1541230358526304256";
const AVIS_CHANNEL = "1541544133171347710"; 
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

async function getCategoryForType(guild, type) {
    if (type === "joueur" && config.JOUEUR_CATEGORIES_POOL?.length > 0) {
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

const globalCooldowns = new Map();

module.exports = async (client) => {
    console.log("[TICKET SYSTEM] Chargement du système de support avancé...");

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
            .setColor("#2F3136")
            .setTitle("HUB D'ASSISTANCE — TEAM HELORIA")
            .setDescription(
                "Bienvenue sur le centre du support officiel de la **Team HeLoRiA**.\n" +
                "Notre équipe est à votre disposition pour vous accompagner dans vos démarches.\n\n" +
                "**📌 Consignes d'ouverture**\n" +
                "• Merci de remplir attentivement le formulaire lors de la sélection.\n" +
                "• Le respect des règles reste obligatoire au sein des salons privés.\n" +
                "• Vous disposez de 24h pour répondre aux sollicitations du staff.\n\n" +
                "───\n\n" +
                "Select an option below to get assistance or apply to join our team."
            )
            .setFooter({ text: "Team HeLoRiA • Sélectionnez une catégorie ci-dessous" });

        const menuSelection = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Choisissez le motif de votre demande...")
            .addOptions([
                { label: "Recrutement Staff", description: "Rejoindre l'équipe administrative", value: "staff", emoji: "🎓" },
                { label: "Recrutement Joueur", description: "Postuler en tant que joueur eSport", value: "joueur", emoji: "🎮" },
                { label: "Recrutement Audiovisuel", description: "Graphistes, monteurs et créateurs", value: "audiovisuel", emoji: "🎨" },
                { label: "Assistance Générale", description: "Questions et aide technique", value: "aide", emoji: "❓" },
                { label: "Demande de Partenariat", description: "Proposer une collaboration", value: "partenariat", emoji: "🤝" }
            ]);

        await panelChannel.send({
            embeds: [panelEmbed],
            components: [new ActionRowBuilder().addComponents(menuSelection)]
        }).catch(() => {});
    }

    // =====================================================
    // 2. SUIVI DE L'ACTIVITÉ
    // =====================================================
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;
        const db = readDB();
        if (db.tickets[message.channel.id]) {
            db.tickets[message.channel.id].lastActivity = Date.now();
            db.tickets[message.channel.id].messageCount = (db.tickets[message.channel.id].messageCount || 0) + 1;
            writeDB(db);
        }
    });

    // =====================================================
    // 3. GESTION DES INTERACTIONS
    // =====================================================
    client.on("interactionCreate", async (i) => {

        // GESTION DES AVIS EN MP
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
                await i.deferReply().catch(() => {});
                const [, , starsStr, staffId] = i.customId.split("_");
                const stars = parseInt(starsStr);
                const comment = i.fields.getTextInputValue("comment");
                const db = readDB();

                const reviewEmbed = new EmbedBuilder()
                    .setColor("#FFFFFF")
                    .setTitle("Nouvel Avis Support — Team HeLoRiA")
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
                    if (reviewLogs) await reviewLogs.send({ embeds: [reviewEmbed] });
                }

                return i.editReply({ content: "Merci ! Votre évaluation a bien été enregistrée." });
            }
            return;
        }

        // SELECTION DANS LE MENU -> AFFICHAGE DU MODAL D'OUVERTURE
        if (i.isStringSelectMenu() && i.customId === "ticket_select") {
            const db = readDB();
            if (db.blacklist.includes(i.user.id)) return i.reply({ content: "Vous êtes banni du système de support.", ephemeral: true });

            const hasTicket = Object.values(db.tickets).some(t => t.userId === i.user.id && t.status === "open");
            if (hasTicket) return i.reply({ content: "Vous avez déjà un ticket ouvert sur le serveur.", ephemeral: true });

            const type = i.values[0];
            const modal = new ModalBuilder().setCustomId(`create_ticket_modal_${type}`).setTitle("Formulaire de Demande");

            if (type === "joueur") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_1").setLabel("Pseudo Epic / Âge / Plateforme").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_2").setLabel("PR & Anciennes structures").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_3").setLabel("Vos motivations").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else if (type === "staff" || type === "audiovisuel") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_1").setLabel("Âge & Domaine / Rôle visé").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_2").setLabel("Expériences / Portfolio (Lien)").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            } else {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_1").setLabel("Sujet de votre demande").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("field_2").setLabel("Description détaillée").setStyle(TextInputStyle.Paragraph).setRequired(true))
                );
            }

            return i.showModal(modal);
        }

        // CRÉATION EFFECTIVE DU SALON (SOUMISSION DU MODAL)
        if (i.isModalSubmit() && i.customId.startsWith("create_ticket_modal_")) {
            await i.deferReply({ ephemeral: true });
            const type = i.customId.replace("create_ticket_modal_", "");
            const db = readDB();

            try {
                const categoryId = await getCategoryForType(i.guild, type);
                const basePermissions = [
                    { id: i.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: i.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] }
                ];

                (config.ROLES[type] || []).forEach(rId => {
                    basePermissions.push({ id: rId, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages, PermissionsBitField.Flags.ReadMessageHistory] });
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

                // Construction de l'embed de réponse avec les données du modal
                const formEmbed = new EmbedBuilder().setColor("#2F3136").setTitle(`Nouveau Ticket — ${type.toUpperCase()}`).setTimestamp();
                if (type === "joueur") {
                    formEmbed.addFields(
                        { name: "Informations", value: i.fields.getTextInputValue("field_1") },
                        { name: "Expérience / PR", value: i.fields.getTextInputValue("field_2") },
                        { name: "Motivations", value: i.fields.getTextInputValue("field_3") }
                    );
                } else {
                    formEmbed.addFields(
                        { name: "Informations / Sujet", value: i.fields.getTextInputValue("field_1") },
                        { name: "Détails / Motivations", value: i.fields.getTextInputValue("field_2") }
                    );
                }

                const row1 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId("close_with_review").setLabel("Fermer (Avis)").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("close_no_review").setLabel("Fermer (Sans Avis)").setStyle(ButtonStyle.Danger)
                );

                const row2 = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("ticket_ping_user").setLabel("Rappel MP").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId("create_staff_thread").setLabel("Fil Staff").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("blacklist_user").setLabel("Blacklist").setStyle(ButtonStyle.Danger)
                );

                await ticketChannel.send({
                    content: `Bonjour ${i.user} | @here Un modérateur va traiter votre demande.`,
                    embeds: [formEmbed],
                    components: [row1, row2]
                });

                return i.editReply({ content: `Salon créé : ${ticketChannel}` });
            } catch (err) {
                console.error(err);
                return i.editReply({ content: "Erreur lors de la création du salon." });
            }
        }

        // ACTIONS SUR LES BOUTONS DU TICKET
        const db = readDB();
        const context = db.tickets[i.channel.id];
        const isStaffUser = context 
            ? (config.ROLES[context.type] || []).some(rId => i.member.roles.cache.has(rId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
            : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (i.isButton()) {
            if (!isStaffUser) return i.reply({ content: "Action réservée à l'équipe de modération.", ephemeral: true });

            // CRÉATION D'UN THREAD PRIVÉ STAFF
            if (i.customId === "create_staff_thread") {
                await i.deferReply({ ephemeral: true });
                const thread = await i.channel.threads.create({
                    name: `staff-discussion-${i.channel.name}`,
                    autoArchiveDuration: 60,
                    type: ChannelType.PrivateThread,
                    reason: "Espace de discussion privé pour le Staff"
                });

                return i.editReply({ content: `Fil de discussion privé créé : ${thread}` });
            }

            // BOUTON DE RAPPEL / RELANCE EN MP + SALON
            if (i.customId === "ticket_ping_user") {
                await i.deferReply({ ephemeral: true });
                const targetUser = await client.users.fetch(context.userId).catch(() => null);

                if (targetUser) {
                    await targetUser.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#2F3136")
                            .setTitle("Rappel de votre ticket")
                            .setDescription(`Un modérateur attend une réponse de votre part dans le salon ${i.channel}.`)]
                    }).catch(() => {});
                }

                await i.channel.send({ content: `<@${context.userId}>, un rappel vous a été envoyé. Merci de répondre pour éviter la clôture automatique.` });
                return i.editReply({ content: "Relance effectuée dans le salon et en MP." });
            }

            // CLAIM DU TICKET
            if (i.customId === "claim") {
                await i.deferUpdate();
                db.tickets[i.channel.id].claimedBy = i.user.id;
                writeDB(db);

                await i.channel.setName(`claim-${i.channel.name}`.slice(0, 100)).catch(() => {});
                return i.channel.send({ embeds: [new EmbedBuilder().setColor("#2F3136").setDescription(`Pris en charge par **${i.user.username}**.`)] });
            }

            // FERMETURE DU TICKET (AVEC OU SANS AVIS)
            if (i.customId === "close_with_review" || i.customId === "close_no_review") {
                await i.reply("Clôture et génération du transcript en cours...");
                const sendReviewPrompt = (i.customId === "close_with_review");
                return await closeTicketSystem(i.channel, client, context, i.user, sendReviewPrompt);
            }

            // BLACKLIST
            if (i.customId === "blacklist_user") {
                if (!context) return i.reply({ content: "Données introuvables.", ephemeral: true });
                db.blacklist.push(context.userId);
                delete db.tickets[i.channel.id];
                writeDB(db);

                await i.reply("Utilisateur blacklisté. Suppression du salon...");
                setTimeout(() => i.channel.delete().catch(() => {}), 2000);
            }
        }
    });
};

// =====================================================
// FONCTION DE CLÔTURE ET TRANSCRIPT HTML
// =====================================================
async function closeTicketSystem(channel, client, context, staffUser, sendReviewPrompt) {
    try {
        const attachment = await discordTranscripts.createTranscript(channel, {
            limit: -1,
            returnType: 'attachment',
            filename: `transcript-${channel.name}.html`,
            saveImages: true,
            poweredBy: false
        });

        const summaryEmbed = new EmbedBuilder()
            .setColor("#2F3136")
            .setTitle("Archive de Ticket")
            .setDescription(`• Salon : \`${channel.name}\`\n• Demandeur : <@${context ? context.userId : "Inconnu"}>\n• Clôturé par : ${staffUser}`)
            .setTimestamp();

        const archChan = await client.channels.fetch(ARCHIVE_CHANNEL).catch(() => null);
        if (archChan) await archChan.send({ embeds: [summaryEmbed], files: [attachment] });

        const logChan = await client.channels.fetch(LOGS_CHANNEL).catch(() => null);
        if (logChan) await logChan.send({ embeds: [summaryEmbed] });

        if (sendReviewPrompt && context?.userId) {
            const targetMember = await channel.guild.members.fetch(context.userId).catch(() => null);
            if (targetMember) {
                const staffId = context.claimedBy || client.user.id;
                const reviewRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`rate_5_${staffId}`).setLabel("5 ⭐").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`rate_4_${staffId}`).setLabel("4 ⭐").setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId(`rate_3_${staffId}`).setLabel("3 ⭐").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId(`rate_2_${staffId}`).setLabel("2 ⭐").setStyle(ButtonStyle.Danger),
                    new ButtonBuilder().setCustomId(`rate_1_${staffId}`).setLabel("1 ⭐").setStyle(ButtonStyle.Danger)
                );
                await targetMember.send({
                    embeds: [new EmbedBuilder().setColor("#2F3136").setTitle("Évaluation — Team HeLoRiA").setDescription("Votre ticket est désormais clos. Merci de donner votre avis sur l'aide apportée :")],
                    components: [reviewRow]
                }).catch(() => {});
            }
        }

        const db = readDB();
        if (db.tickets[channel.id]) {
            delete db.tickets[channel.id];
            writeDB(db);
        }

    } catch (err) {
        console.error("Erreur clôture :", err);
    } finally {
        setTimeout(() => channel.delete().catch(() => {}), 2000);
    }
}