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
const fetch = require("node-fetch"); // npm i node-fetch@2
const discordTranscripts = require("discord-html-transcripts");
const config = require("../data/ticket_database");

// --- LISTE STRICTE DES EMOJIS PERSONNALISÉS ---
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

// Nettoyage de la saisie numérique (ex: "2.5k" -> 2500, "2 500" -> 2500)
function cleanPRInput(input) {
    if (!input) return 0;
    let str = input.toLowerCase().trim().replace(/\s+/g, '').replace(',', '.');
    if (str.endsWith('k')) {
        const val = parseFloat(str.replace('k', ''));
        return isNaN(val) ? 0 : Math.round(val * 1000);
    }
    const cleanStr = str.replace(/[^0-9]/g, '');
    const parsed = parseInt(cleanStr, 10);
    return isNaN(parsed) ? 0 : parsed;
}

// Attribution du pôle selon la PR Finale
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

// Interrogation API Fortnite Tracker via variables d'environnement (.env)
async function fetchFortnitePR(epicUsername) {
    const apiKey = process.env.FORTNITE_TRACKER_KEY;
    if (!apiKey) return { error: "CLÉ_API_MANQUANTE" };

    try {
        const url = `https://api.tracker.gg/api/v2/fortnite/standard/profile/kbm/${encodeURIComponent(epicUsername)}`;
        const response = await fetch(url, {
            headers: { "TRN-Api-Key": apiKey }
        });

        if (response.status === 404) return { error: "JOUEUR_INTROUVABLE" };
        if (!response.ok) return { error: "API_ERREUR" };

        const json = await response.json();
        const segments = json.data?.segments || [];
        
        let prEU = 0;
        for (const seg of segments) {
            if (seg.attributes?.region === "EU" || seg.metadata?.name?.includes("Europe")) {
                const prVal = seg.stats?.pr?.value || seg.stats?.powerRanking?.value || 0;
                prEU += prVal;
            }
        }

        return { prEU };
    } catch (err) {
        console.error("[API ERROR]", err);
        return { error: "API_CRASH" };
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

module.exports = async (client) => {
    console.log("[TICKET SYSTEM] Chargement du système avec emojis personnalisés & API...");

    // 1. GENERATION / RAFRAÎCHISSEMENT DU PANEL PRINCIPAL
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
                `• Sélectionnez votre catégorie dans le menu ci-dessous.\n` +
                `• Cliquez sur le bouton de formulaire une fois le salon créé.\n` +
                `• Vous disposez de 24h pour répondre aux sollicitations du staff.\n\n` +
                `───\n\n` +
                `Sélectionnez une option ci-dessous pour démarrer.`
            )
            .setFooter({ text: "Team HeLoRiA • Support Officiel" });

        const menuSelection = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Choisissez le motif de votre demande...")
            .addOptions([
                { label: "Recrutement Staff", description: "Rejoindre l'équipe administrative", value: "staff", emoji: EMOJIS.mod },
                { label: "Recrutement Joueur", description: "Postuler en tant que joueur eSport", value: "joueur", emoji: EMOJIS.premium },
                { label: "Recrutement Audiovisuel", description: "Graphistes, monteurs et créateurs", value: "audiovisuel", emoji: EMOJIS.mic },
                { label: "Assistance Générale", description: "Questions et aide technique", value: "aide", emoji: EMOJIS.certified },
                { label: "Demande de Partenariat", description: "Proposer une collaboration", value: "partenariat", emoji: EMOJIS.handshake }
            ]);

        await panelChannel.send({
            embeds: [panelEmbed],
            components: [new ActionRowBuilder().addComponents(menuSelection)]
        }).catch(() => {});
    }

    // 2. SUIVI DE L'ACTIVITÉ DANS LES TICKETS
    client.on("messageCreate", async (message) => {
        if (message.author.bot || !message.guild) return;
        const db = readDB();
        if (db.tickets[message.channel.id]) {
            db.tickets[message.channel.id].lastActivity = Date.now();
            db.tickets[message.channel.id].messageCount = (db.tickets[message.channel.id].messageCount || 0) + 1;
            writeDB(db);
        }
    });

    // 3. GESTION DES INTERACTIONS (SELECTION, FORMULAIRES, BOUTONS)
    client.on("interactionCreate", async (i) => {

        // AVIS MP HORS-SERVEUR
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
                    if (reviewLogs) await reviewLogs.send({ embeds: [reviewEmbed] });
                }

                return i.editReply({ content: "Merci ! Votre évaluation a bien été enregistrée." });
            }
            return;
        }

        // ETAPE 1 : SELECTION DE CATEGORIE ET CREATION DIRECTE DU SALON
        if (i.isStringSelectMenu() && i.customId === "ticket_select") {
            const db = readDB();
            if (db.blacklist.includes(i.user.id)) return i.reply({ content: `${EMOJIS.warning} Vous êtes banni du système de support.`, ephemeral: true });

            const hasTicket = Object.values(db.tickets).some(t => t.userId === i.user.id && t.status === "open");
            if (hasTicket) return i.reply({ content: `${EMOJIS.warning} Vous avez déjà un ticket ouvert sur le serveur.`, ephemeral: true });

            const type = i.values[0];
            await i.deferReply({ ephemeral: true });

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

                // ACCUEIL DU TICKET AVEC BOUTON REMPLIR FORMULAIRE
                const welcomeEmbed = new EmbedBuilder()
                    .setColor("#2F3136")
                    .setTitle(`${EMOJIS.ticket} Bienvenue dans votre Ticket`)
                    .setDescription(
                        `Bonjour ${i.user},\n\n` +
                        `Veuillez cliquer sur le bouton ci-dessous **"Remplir le Formulaire"** afin de transmettre vos informations à l'équipe.\n\n` +
                        `*Un modérateur prendra votre demande en charge sous peu.*`
                    )
                    .setTimestamp();

                const rowPlayer = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`open_form_${type}`).setLabel("Remplir le Formulaire").setStyle(ButtonStyle.Success).setEmoji(EMOJIS.update),
                    new ButtonBuilder().setCustomId("claim").setLabel("Prendre en charge").setStyle(ButtonStyle.Primary).setEmoji(EMOJIS.mod),
                    new ButtonBuilder().setCustomId("close_with_review").setLabel("Fermer").setStyle(ButtonStyle.Danger).setEmoji(EMOJIS.lock)
                );

                const rowTools = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId("ticket_ping_user").setLabel("Rappel MP").setStyle(ButtonStyle.Secondary),
                    new ButtonBuilder().setCustomId("create_staff_thread").setLabel("Fil Staff").setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.mic),
                    new ButtonBuilder().setCustomId("blacklist_user").setLabel("Blacklist").setStyle(ButtonStyle.Danger).setEmoji(EMOJIS.ban)
                );

                await ticketChannel.send({
                    content: `Bienvenue ${i.user} | Staff : <@&${(config.ROLES[type] || [])[0] || i.guild.id}>`,
                    embeds: [welcomeEmbed],
                    components: [rowPlayer, rowTools]
                });

                return i.editReply({ content: `${EMOJIS.certified} Votre ticket a été créé : ${ticketChannel}` });
            } catch (err) {
                console.error(err);
                return i.editReply({ content: `${EMOJIS.warning} Erreur lors de la création du salon de ticket.` });
            }
        }

        // ETAPE 2 : CLIC SUR "REMPLIR LE FORMULAIRE" -> OUVERTURE DU MODAL
        if (i.isButton() && i.customId.startsWith("open_form_")) {
            const type = i.customId.replace("open_form_", "");
            const modal = new ModalBuilder().setCustomId(`submit_ticket_modal_${type}`).setTitle("Formulaire de Demande");

            if (type === "joueur") {
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("epic_pseudo").setLabel("Pseudo Epic Games Exact").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("pr_overall").setLabel("PR OVERALL (Saisie)").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("age_platform").setLabel("Âge & Plateforme").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("motivations").setLabel("Vos motivations").setStyle(TextInputStyle.Paragraph).setRequired(true))
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

        // ETAPE 3 : SOUMISSION DU FORMULAIRE ET TRAITEMENT API FORTNITE TRACKER
        if (i.isModalSubmit() && i.customId.startsWith("submit_ticket_modal_")) {
            await i.deferReply();
            const type = i.customId.replace("submit_ticket_modal_", "");
            const db = readDB();

            const formEmbed = new EmbedBuilder().setColor("#2F3136").setTitle(`${EMOJIS.ticket} Données du Formulaire — ${type.toUpperCase()}`).setTimestamp();

            if (type === "joueur") {
                const epicPseudo = i.fields.getTextInputValue("epic_pseudo");
                const rawPROverall = i.fields.getTextInputValue("pr_overall");
                const prOverall = cleanPRInput(rawPROverall);
                const agePlatform = i.fields.getTextInputValue("age_platform");
                const motivations = i.fields.getTextInputValue("motivations");

                // Interrogation API via Clé de l'environnement .env
                const apiData = await fetchFortnitePR(epicPseudo);

                if (apiData.error) {
                    formEmbed.setColor("#ED4245")
                        .setDescription(`${EMOJIS.warning} **Alerte API : Impossible de vérifier automatiquement.**\n**Raison :** ${apiData.error}\n\nVérification manuelle requise par le Staff.`)
                        .addFields(
                            { name: "Pseudo Epic", value: epicPseudo, inline: true },
                            { name: "PR OVERALL (Déclarée)", value: `${prOverall} pts`, inline: true },
                            { name: "Âge & Plateforme", value: agePlatform, inline: true },
                            { name: "Motivations", value: motivations }
                        );
                } else {
                    const prEU = apiData.prEU;
                    const prDiff = prOverall - prEU;
                    const prFinal = Math.round((prEU * 0.65) + (prDiff * 0.35));
                    const pole = getPoleInfo(prFinal);

                    formEmbed.setColor("#57F287")
                        .setDescription(`${EMOJIS.certified} **Vérification API Fortnite Tracker Réussie**`)
                        .addFields(
                            { name: "Pseudo Epic", value: epicPseudo, inline: true },
                            { name: "PR EU (API)", value: `${prEU} pts`, inline: true },
                            { name: "PR OVERALL (Saisie)", value: `${prOverall} pts`, inline: true },
                            { name: "Écart / Différence", value: `${prDiff} pts`, inline: true },
                            { name: `${EMOJIS.premium} PR Finale Calculée`, value: `**${prFinal} pts**`, inline: true },
                            { name: `${EMOJIS.briefcase} Pôle Recommandé`, value: `**${pole.name}**`, inline: true },
                            { name: "Âge & Plateforme", value: agePlatform },
                            { name: "Motivations", value: motivations }
                        );

                    if (db.tickets[i.channel.id]) {
                        db.tickets[i.channel.id].prCalculated = { prFinal, pole: pole.name, roleKey: pole.roleKey, epicPseudo };
                        writeDB(db);
                    }
                }
            } else {
                formEmbed.addFields(
                    { name: "Informations / Sujet", value: i.fields.getTextInputValue("field_1") },
                    { name: "Détails / Motivations", value: i.fields.getTextInputValue("field_2") }
                );
            }

            // Options Staff pour validation / correction
            const staffRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId("validate_player").setLabel("Valider & Attribuer Pôle").setStyle(ButtonStyle.Success).setEmoji(EMOJIS.certified),
                new ButtonBuilder().setCustomId("manual_check").setLabel("Vérification Manuelle").setStyle(ButtonStyle.Secondary).setEmoji(EMOJIS.update)
            );

            return i.editReply({ embeds: [formEmbed], components: (type === "joueur" ? [staffRow] : []) });
        }

        // ACTIONS STAFF VIA BOUTONS
        const db = readDB();
        const context = db.tickets[i.channel.id];
        const isStaffUser = context 
            ? (config.ROLES[context.type] || []).some(rId => i.member.roles.cache.has(rId)) || i.member.permissions.has(PermissionsBitField.Flags.ManageChannels)
            : i.member.permissions.has(PermissionsBitField.Flags.ManageChannels);

        if (i.isButton()) {
            if (!isStaffUser && !i.customId.startsWith("open_form_")) {
                return i.reply({ content: `${EMOJIS.warning} Action réservée au Staff.`, ephemeral: true });
            }

            // VALIDATION DU JOUEUR & ROLE AUTOMATIQUE
            if (i.customId === "validate_player") {
                if (!context || !context.prCalculated) return i.reply({ content: `${EMOJIS.warning} Aucun calcul valide trouvé.`, ephemeral: true });
                
                await i.deferReply();
                const targetMember = await i.guild.members.fetch(context.userId).catch(() => null);
                const roleId = config.ROLES_POLES?.[context.prCalculated.roleKey];

                if (targetMember && roleId) {
                    await targetMember.roles.add(roleId).catch(() => {});
                }

                await i.channel.send({
                    content: `${EMOJIS.certified} Félicitations <@${context.userId}> ! Tu as été validé(e) dans le **${context.prCalculated.pole}** avec une PR Finale retenue de **${context.prCalculated.prFinal} pts** !`
                });

                return i.editReply({ content: `${EMOJIS.certified} Joueur validé et rôle attribué.` });
            }

            // CORRECTION / OVERRIDE MANUEL PAR LE STAFF
            if (i.customId === "manual_check") {
                const modal = new ModalBuilder().setCustomId("manual_override_modal").setTitle("Correction Manuelle PR");
                modal.addComponents(
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("manual_pr_eu").setLabel("PR EU Réelle (API/Preuve)").setStyle(TextInputStyle.Short).setRequired(true)),
                    new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId("manual_pr_overall").setLabel("PR OVERALL Corriger").setStyle(TextInputStyle.Short).setRequired(true))
                );
                return i.showModal(modal);
            }

            // CREATION FIL PRIVE STAFF
            if (i.customId === "create_staff_thread") {
                await i.deferReply({ ephemeral: true });
                const thread = await i.channel.threads.create({
                    name: `staff-discussion-${i.channel.name}`,
                    autoArchiveDuration: 60,
                    type: ChannelType.PrivateThread,
                    reason: "Discussion privée Staff"
                });
                return i.editReply({ content: `${EMOJIS.mic} Fil de discussion privé créé : ${thread}` });
            }

            // RAPPEL MEMBRE MP
            if (i.customId === "ticket_ping_user") {
                await i.deferReply({ ephemeral: true });
                const targetUser = await client.users.fetch(context.userId).catch(() => null);

                if (targetUser) {
                    await targetUser.send({
                        embeds: [new EmbedBuilder()
                            .setColor("#2F3136")
                            .setTitle(`${EMOJIS.ticket} Rappel de votre ticket`)
                            .setDescription(`Un modérateur attend votre réponse dans le salon ${i.channel}.`)]
                    }).catch(() => {});
                }

                await i.channel.send({ content: `<@${context.userId}>, un rappel vous a été envoyé.` });
                return i.editReply({ content: `${EMOJIS.certified} Relance effectuée.` });
            }

            // CLAIM TICKET
            if (i.customId === "claim") {
                await i.deferUpdate();
                db.tickets[i.channel.id].claimedBy = i.user.id;
                writeDB(db);

                await i.channel.setName(`claim-${i.channel.name}`.slice(0, 100)).catch(() => {});
                return i.channel.send({ embeds: [new EmbedBuilder().setColor("#2F3136").setDescription(`${EMOJIS.mod} Pris en charge par **${i.user.username}**.`)] });
            }

            // FERMETURE TICKET
            if (i.customId === "close_with_review" || i.customId === "close_no_review") {
                await i.reply(`${EMOJIS.loading} Clôture et génération du transcript en cours...`);
                const sendReviewPrompt = (i.customId === "close_with_review");
                return await closeTicketSystem(i.channel, client, context, i.user, sendReviewPrompt);
            }

            // BLACKLIST
            if (i.customId === "blacklist_user") {
                if (!context) return i.reply({ content: `${EMOJIS.warning} Données introuvables.`, ephemeral: true });
                db.blacklist.push(context.userId);
                delete db.tickets[i.channel.id];
                writeDB(db);

                await i.reply(`${EMOJIS.ban} Utilisateur blacklisté. Suppression du salon...`);
                setTimeout(() => i.channel.delete().catch(() => {}), 2000);
            }
        }

        // TRAITEMENT OVERRIDE MANUEL MODAL
        if (i.isModalSubmit() && i.customId === "manual_override_modal") {
            await i.deferReply();
            const prEU = cleanPRInput(i.fields.getTextInputValue("manual_pr_eu"));
            const prOverall = cleanPRInput(i.fields.getTextInputValue("manual_pr_overall"));
            
            const prDiff = prOverall - prEU;
            const prFinal = Math.round((prEU * 0.65) + (prDiff * 0.35));
            const pole = getPoleInfo(prFinal);

            if (context) {
                context.prCalculated = { prFinal, pole: pole.name, roleKey: pole.roleKey };
                writeDB(db);
            }

            const overrideEmbed = new EmbedBuilder()
                .setColor("#FEE75C")
                .setTitle(`${EMOJIS.update} Recalcul Manuel Effectué par le Staff`)
                .addFields(
                    { name: "PR EU Corrigée", value: `${prEU} pts`, inline: true },
                    { name: "PR OVERALL Corrigée", value: `${prOverall} pts`, inline: true },
                    { name: `${EMOJIS.premium} PR Finale Calculée`, value: `**${prFinal} pts**`, inline: true },
                    { name: `${EMOJIS.briefcase} Nouveau Pôle`, value: `**${pole.name}**`, inline: true }
                );

            return i.editReply({ embeds: [overrideEmbed] });
        }
    });
};

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
            .setTitle(`${EMOJIS.lock} Archive de Ticket`)
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
                    embeds: [new EmbedBuilder().setColor("#2F3136").setTitle(`${EMOJIS.certified} Évaluation — Team HeLoRiA`).setDescription("Votre ticket est désormais clos. Merci de donner votre avis sur l'aide apportée :")],
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