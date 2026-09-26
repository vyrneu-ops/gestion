const {
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require("discord.js");
const config = require("../data/rolesConfig");

const COLOR_GOLD = "#D4AF37";
const COLOR_DARK = "#0F0F0F";
const COLOR_ERROR = "#2F0000";

const EMOJIS = {
    HLR_WIN: "<:hlrwin:1537584105536094248>",
    PREMIUM: "<:5647premiumicon:1533535330538360942>",
    CERTIFIED: "<:20336certified:1537579306690281544>",
    TRIAL_MOD: "<:94919trialmod:1537582836318609521>",
    RULES: "<:580437rules:1537583160345366578>",
    MIC_ANIM: "<:68052micanimation:1537582247278813204>"
};

// Confirmations de changement de rôle en attente. On ne stocke plus les
// données dans le customId du bouton (ça cassait dès qu'une valeur comme
// "NON_PRECISE" ou "DIV_1" contenait un underscore), mais dans cette Map,
// avec un jeton opaque et une expiration pour éviter toute fuite mémoire.
const pendingRoleConfirmations = new Map();
let confirmationCounter = 0;

function createConfirmationToken(data) {
    const token = `${Date.now().toString(36)}${(confirmationCounter++).toString(36)}`;
    pendingRoleConfirmations.set(token, data);
    setTimeout(() => pendingRoleConfirmations.delete(token), 5 * 60 * 1000);
    return token;
}

module.exports = (client) => {
    console.log("[ROLE SYSTEM] Module d'auto-rôle HeLoRiA prêt.");

    // --- Déploiement du panneau de rôles (+setup-roles) ---
    client.on("messageCreate", async (msg) => {
        if (!msg.guild || msg.author.bot || msg.content !== "+setup-roles") return;

        try {
            if (!msg.member?.permissions.has(PermissionsBitField.Flags.Administrator)) {
                return await msg.reply("❌ **Seuls les administrateurs peuvent exécuter cette commande.**").catch(() => {});
            }

            await msg.delete().catch(() => {});

            const channelMessages = await msg.channel.messages.fetch({ limit: 25 }).catch(() => null);
            if (channelMessages) {
                const oldBotMessages = channelMessages.filter(m => m.author.id === client.user.id);
                for (const oldMsg of oldBotMessages.values()) await oldMsg.delete().catch(() => {});
            }

            const headerEmbed = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.HLR_WIN}   HELORIA — CONFIGURATION DU PROFIL`)
                .setDescription(
                    `Bienvenue dans l'espace officiel de personnalisation de votre profil **HeLoRiA**.\n` +
                    `Sélectionnez vos options via les menus déroulants ci-dessous pour personnaliser vos rôles et accès.\n\n` +
                    `──────────────────────────────\n` +
                    `> ${EMOJIS.PREMIUM} **Fonctionnement du système :**\n` +
                    `> • Sélectionnez une option dans un menu pour obtenir le rôle associé.\n` +
                    `> • En cas de remplacement d'un rôle existant, une confirmation vous sera demandée.\n` +
                    `> • Vos modifications sont sauvegardées et appliquées instantanément.`
                )
                .setFooter({ text: "HeLoRiA • #RiseSoarConquer" });

            const embedGenre = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.CERTIFIED}   Ⅰ. IDENTITÉ & GENRE`)
                .setDescription("Définissez le genre associé à votre profil membre au sein de la communauté.");

            const menuGenre = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("role_select_genre")
                    .setPlaceholder("Choisissez votre genre...")
                    .addOptions([
                        { label: "Homme", value: "HOMME", description: "Définir l'identité : Homme", emoji: "👨" },
                        { label: "Femme", value: "FEMME", description: "Définir l'identité : Femme", emoji: "👩" },
                        { label: "Non précisé", value: "NON_PRECISE", description: "Ne pas afficher de genre sur votre profil", emoji: "⚙️" }
                    ])
            );

            const embedPlateforme = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.MIC_ANIM}   Ⅱ. SUPPORT & PLATEFORME DE JEU`)
                .setDescription("Sélectionnez votre plateforme principale de jeu.");

            const menuPlateforme = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("role_select_plateforme")
                    .setPlaceholder("Choisissez votre plateforme...")
                    .addOptions([
                        { label: "PC", value: "PC", description: "Plateforme : PC (Windows / Mac / Linux)", emoji: "💻" },
                        { label: "PlayStation", value: "PLAYSTATION", description: "Plateforme : Console PlayStation", emoji: "🎮" },
                        { label: "Xbox", value: "XBOX", description: "Plateforme : Console Xbox", emoji: "🎮" },
                        { label: "Nintendo Switch", value: "SWITCH", description: "Plateforme : Nintendo Switch", emoji: "🕹️" }
                    ])
            );

            const embedNotifs = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.RULES}   Ⅲ. PRÉFÉRENCES DE NOTIFICATIONS`)
                .setDescription("Choisissez les actualités et alertes que vous souhaitez recevoir sur le serveur.");

            const menuNotifs = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("role_select_notifs")
                    .setPlaceholder("Sélectionnez vos alertes (Choix multiples)...")
                    .setMinValues(0)
                    .setMaxValues(6)
                    .addOptions([
                        { label: "Annonces Officielles", value: "ANNONCES", description: "Alertes sur les décisions et nouveautés", emoji: "📢" },
                        { label: "Animations & Events", value: "ANIMATIONS", description: "Alertes événements, tournois et animations", emoji: "🎉" },
                        { label: "Sondages", value: "SONDAGES", description: "Alertes consultations et votes communautaires", emoji: "📊" },
                        { label: "Web TV & Streams", value: "WEBTV", description: "Alertes direct et diffusions de la structure", emoji: "📺" },
                        { label: "Actualités Réseaux", value: "RESEAUX", description: "Nouveautés publiées sur nos réseaux sociaux", emoji: "📱" },
                        { label: "Partenariats", value: "PARTENAIRES", description: "Offres et annonces de nos partenaires", emoji: "🤝" }
                    ])
            );

            const embedDivision = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.TRIAL_MOD}   Ⅳ. NIVEAU COMPÉTITIF — FORTNITE`)
                .setDescription(
                    `Affichez votre niveau compétitif actuel.\n\n` +
                    `> ⚠️ **Note :** L'accès à la **Division 1** nécessite impérativement une vérification de vos preuves de rang auprès du Staff.`
                )
                .setFooter({ text: "HeLoRiA • #RiseSoarConquer" });

            const menuDivision = new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("role_select_division")
                    .setPlaceholder("Choisissez votre division...")
                    .addOptions([
                        { label: "Division 1 (Vérification Staff)", value: "DIV_1", description: "Niveau Élite • Validation Staff requise", emoji: "🏆" },
                        { label: "Division 2", value: "DIV_2", description: "Niveau Avancé", emoji: "🥇" },
                        { label: "Division 3", value: "DIV_3", description: "Niveau Intermédiaire", emoji: "🥈" },
                        { label: "Division 4", value: "DIV_4", description: "Niveau Challenger", emoji: "🥉" },
                        { label: "Division 5", value: "DIV_5", description: "Niveau Débutant / Casual", emoji: "🎯" }
                    ])
            );

            await msg.channel.send({ embeds: [headerEmbed] });
            await msg.channel.send({ embeds: [embedGenre], components: [menuGenre] });
            await msg.channel.send({ embeds: [embedPlateforme], components: [menuPlateforme] });
            await msg.channel.send({ embeds: [embedNotifs], components: [menuNotifs] });
            await msg.channel.send({ embeds: [embedDivision], components: [menuDivision] });
        } catch (error) {
            console.error("[ROLE SYSTEM] Erreur lors de la création du panneau de rôles :", error);
        }
    });

    // --- Gestion des sélections et boutons de confirmation ---
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.guild) return;

        // A. Boutons de confirmation (remplacement d'un rôle existant)
        if (interaction.isButton() && interaction.customId.startsWith("cf_role_")) {
            try {
                await interaction.deferUpdate().catch(() => {});

                const isYes = interaction.customId.startsWith("cf_role_y_");
                const token = interaction.customId.slice(isYes ? "cf_role_y_".length : "cf_role_n_".length);
                const data = pendingRoleConfirmations.get(token);
                pendingRoleConfirmations.delete(token);

                const member = interaction.member;
                if (!member) return;

                if (!data) {
                    return await interaction.editReply({
                        embeds: [new EmbedBuilder().setColor(COLOR_ERROR).setTitle("⚠️   Confirmation expirée").setDescription("Cette demande de confirmation n'est plus valide, veuillez recommencer.")],
                        components: []
                    }).catch(() => {});
                }

                if (data.userId !== interaction.user.id) {
                    return await interaction.followUp({ content: "⚠️ Cette confirmation ne vous appartient pas.", ephemeral: true }).catch(() => {});
                }

                if (!isYes) {
                    const cancelEmbed = new EmbedBuilder()
                        .setColor(COLOR_DARK)
                        .setTitle("⚠️   Modification Annulée")
                        .setDescription("Votre rôle actuel a été conservé sans modification.")
                        .setFooter({ text: "HeLoRiA • Système de Profil" });
                    return await interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
                }

                let categoryConfig;
                if (data.category === "gnr") categoryConfig = config.ROLES_GENRE;
                else if (data.category === "plt") categoryConfig = config.ROLES_PLATEFORME;
                else if (data.category === "div") categoryConfig = config.ROLES_DIVISION;

                if (categoryConfig) {
                    for (const key in categoryConfig) {
                        const id = categoryConfig[key];
                        if (id && member.roles.cache.has(id)) {
                            await member.roles.remove(id).catch(err =>
                                console.error(`[ROLE SYSTEM] Retrait du rôle ${id} pour ${member.user.tag} :`, err.message)
                            );
                        }
                    }
                }

                if (data.targetRoleId && data.targetRoleId !== "none") {
                    await member.roles.add(data.targetRoleId).catch(err =>
                        console.error(`[ROLE SYSTEM] Ajout du rôle ${data.targetRoleId} pour ${member.user.tag} :`, err.message)
                    );
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.CERTIFIED}   Profil Mis à Jour`)
                    .setDescription("Votre changement de rôle a bien été effectué et enregistré.")
                    .setFooter({ text: "HeLoRiA • Système de Profil" });

                return await interaction.editReply({ embeds: [successEmbed], components: [] }).catch(() => {});
            } catch (err) {
                console.error("[ROLE SYSTEM] Erreur lors du clic sur bouton de confirmation :", err);
            }
            return;
        }

        // B. Menus déroulants de sélection de rôle
        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("role_select_")) return;

        try {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});

            const member = interaction.member;
            const selectedValue = interaction.values[0];
            if (!member) return;

            const sendResponseEmbed = async (title, statusText, isSuccess = true) => {
                const responseEmbed = new EmbedBuilder()
                    .setColor(isSuccess ? COLOR_GOLD : COLOR_ERROR)
                    .setTitle(`${isSuccess ? EMOJIS.CERTIFIED : "⚠️"}   ${title}`)
                    .setDescription(statusText)
                    .setFooter({ text: "HeLoRiA • Système de Profil" });
                return await interaction.editReply({ embeds: [responseEmbed], components: [] }).catch(() => {});
            };

            const askConfirmation = async (category, currentRoleName, targetRoleId) => {
                const token = createConfirmationToken({
                    userId: member.id,
                    category,
                    targetRoleId: targetRoleId || "none"
                });

                const confirmEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.PREMIUM}   Modification de Rôle`)
                    .setDescription(
                        `Vous possédez déjà un rôle dans cette catégorie (**${currentRoleName}**).\n\n` +
                        `**Voulez-vous vraiment remplacer votre rôle actuel par ce nouveau choix ?**`
                    )
                    .setFooter({ text: "HeLoRiA • Confirmation Requise" });

                const confirmButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`cf_role_y_${token}`).setLabel("Oui, confirmer").setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`cf_role_n_${token}`).setLabel("Non, annuler").setStyle(ButtonStyle.Danger)
                );

                return await interaction.editReply({ embeds: [confirmEmbed], components: [confirmButtons] }).catch(() => {});
            };

            const findExistingRole = (categoryConfig) => {
                for (const key in categoryConfig) {
                    const id = categoryConfig[key];
                    if (id && member.roles.cache.has(id)) return member.roles.cache.get(id);
                }
                return null;
            };

            // 1. Genre
            if (interaction.customId === "role_select_genre") {
                if (!config.ROLES_GENRE) {
                    return sendResponseEmbed("Configuration Manquante", "La configuration des rôles de genre est introuvable.", false);
                }

                const roleId = config.ROLES_GENRE[selectedValue];
                const existingRole = findExistingRole(config.ROLES_GENRE);

                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("gnr", existingRole.name, roleId);
                }

                for (const key in config.ROLES_GENRE) {
                    const id = config.ROLES_GENRE[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                if (selectedValue !== "NON_PRECISE" && roleId) {
                    await member.roles.add(roleId).catch(err =>
                        console.error(`[ROLE SYSTEM] Ajout rôle genre (${roleId}) pour ${member.user.tag} :`, err.message)
                    );
                }

                return sendResponseEmbed("Profil Mis à Jour", "Votre genre a été enregistré avec succès.", true);
            }

            // 2. Plateforme
            if (interaction.customId === "role_select_plateforme") {
                if (!config.ROLES_PLATEFORME) {
                    return sendResponseEmbed("Configuration Manquante", "La configuration des plateformes est introuvable.", false);
                }

                const roleId = config.ROLES_PLATEFORME[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'est pas encore configuré dans les fichiers du bot.", false);
                }

                const existingRole = findExistingRole(config.ROLES_PLATEFORME);
                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("plt", existingRole.name, roleId);
                }

                for (const key in config.ROLES_PLATEFORME) {
                    const id = config.ROLES_PLATEFORME[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(err =>
                    console.error(`[ROLE SYSTEM] Ajout plateforme (${roleId}) pour ${member.user.tag} :`, err.message)
                );

                return sendResponseEmbed("Profil Mis à Jour", "Votre plateforme de jeu principale a été mise à jour.", true);
            }

            // 3. Notifications (choix multiples, pas de confirmation nécessaire)
            if (interaction.customId === "role_select_notifs") {
                if (!config.ROLES_NOTIFS) {
                    return sendResponseEmbed("Configuration Manquante", "La configuration des notifications est introuvable.", false);
                }

                const selectedValues = interaction.values;

                for (const key in config.ROLES_NOTIFS) {
                    const roleId = config.ROLES_NOTIFS[key];
                    if (!roleId || roleId.startsWith("ID_")) continue;

                    const shouldHaveRole = selectedValues.includes(key);
                    const hasRole = member.roles.cache.has(roleId);

                    if (shouldHaveRole && !hasRole) await member.roles.add(roleId).catch(() => {});
                    else if (!shouldHaveRole && hasRole) await member.roles.remove(roleId).catch(() => {});
                }

                return sendResponseEmbed("Préférences Mises à Jour", "Vos abonnements aux notifications ont été ajustés selon vos choix.", true);
            }

            // 4. Division Fortnite
            if (interaction.customId === "role_select_division") {
                if (!config.ROLES_DIVISION) {
                    return sendResponseEmbed("Configuration Manquante", "La configuration des divisions est introuvable.", false);
                }

                if (selectedValue === "DIV_1") {
                    return sendResponseEmbed(
                        "Vérification Requise — Division 1",
                        "L'accès au rôle **Division 1** nécessite une validation manuelle par le Staff.\n\nVeuillez ouvrir un ticket support pour fournir vos preuves de niveau.",
                        false
                    );
                }

                const roleId = config.ROLES_DIVISION[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'est pas encore configuré dans les fichiers du bot.", false);
                }

                const existingRole = findExistingRole(config.ROLES_DIVISION);
                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("div", existingRole.name, roleId);
                }

                for (const key in config.ROLES_DIVISION) {
                    const id = config.ROLES_DIVISION[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(err =>
                    console.error(`[ROLE SYSTEM] Ajout division (${roleId}) pour ${member.user.tag} :`, err.message)
                );

                return sendResponseEmbed("Profil Mis à Jour", "Votre division compétitive a été enregistrée.", true);
            }
        } catch (error) {
            console.error("[ROLE SYSTEM] Erreur lors du traitement de l'interaction de rôles :", error);
        }
    });
};