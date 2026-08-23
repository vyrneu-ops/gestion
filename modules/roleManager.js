const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField 
} = require("discord.js");
const config = require("../data/rolesConfig");

// Palette de couleurs dorée & prestige
const COLOR_GOLD = "#D4AF37";
const COLOR_BLACK = "#000001";

// Emojis personnalisés HeLoRiA
const EMOJIS = {
    HLR_WIN: "<:hlrwin:1537584105536094248>",
    PREMIUM: "<:5647premiumicon:1533535330538360942>",
    CERTIFIED: "<:20336certified:1537579306690281544>",
    TRIAL_MOD: "<:94919trialmod:1537582836318609521>",
    RULES: "<:580437rules:1537583160345366578>",
    MIC_ANIM: "<:68052micanimation:1537582247278813204>"
};

module.exports = (client) => {
    console.log("[ROLE SYSTEM] Module d'auto-rôle HeLoRiA prêt.");

    client.on("messageCreate", async (msg) => {
        if (!msg.guild || msg.author.bot) return;

        if (msg.content === "+setup-roles") {
            try {
                if (!msg.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
                    return msg.reply("Seuls les administrateurs peuvent exécuter cette commande.").catch(() => {});
                }

                await msg.delete().catch(() => {});

                // Nettoyage automatique des anciens messages
                const channelMessages = await msg.channel.messages.fetch({ limit: 20 }).catch(() => null);
                if (channelMessages) {
                    const oldBotMessages = channelMessages.filter(m => m.author.id === client.user.id);
                    for (const oldMsg of oldBotMessages.values()) {
                        await oldMsg.delete().catch(() => {});
                    }
                }

                // EMBED HEADER
                const headerEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.HLR_WIN} HeLoRiA — CONFIGURATION DU PROFIL`)
                    .setDescription(
                        `Bienvenue dans l'espace officiel de personnalisation de votre profil **HeLoRiA**.\n\n` +
                        `Sélectionnez vos options via les menus déroulants ci-dessous afin de définir vos rôles, votre support de jeu et vos préférences d'affichage.\n\n` +
                        `> ${EMOJIS.PREMIUM} **Fonctionnement du système :**\n` +
                        `> • Choisissez une option dans le menu pour attribuer le rôle.\n` +
                        `> • Si vous possédez déjà un rôle similaire, une confirmation vous sera demandée.\n` +
                        `> • Toute modification est enregistrée instantanément.`
                    );

                // EMBED & MENU : IDENTITÉ
                const embedGenre = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.CERTIFIED} Ⅰ. IDENTITÉ & GENRE`)
                    .setDescription("Définissez le genre associé à votre profil membre au sein de la structure.");

                const menuGenre = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_genre")
                        .setPlaceholder("Sélectionner votre genre...")
                        .addOptions([
                            { label: "Homme", value: "HOMME", description: "Définir le profil : Homme", emoji: "👨" },
                            { label: "Femme", value: "FEMME", description: "Définir le profil : Femme", emoji: "👩" },
                            { label: "Non précisé", value: "NON_PRECISE", description: "Retirer l'affichage du genre", emoji: "⚙️" }
                        ])
                );

                // EMBED & MENU : PLATEFORME
                const embedPlateforme = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.MIC_ANIM} Ⅱ. SUPPORT & PLATEFORME DE JEU`)
                    .setDescription("Indiquez la plateforme principale sur laquelle vous évoluez en jeu.");

                const menuPlateforme = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_plateforme")
                        .setPlaceholder("Sélectionner votre plateforme...")
                        .addOptions([
                            { label: "PC", value: "PC", description: "Joueur PC (Windows / Mac / Linux)", emoji: "💻" },
                            { label: "PlayStation", value: "PLAYSTATION", description: "Joueur Console PlayStation", emoji: "🎮" },
                            { label: "Xbox", value: "XBOX", description: "Joueur Console Xbox", emoji: "🎮" },
                            { label: "Nintendo Switch", value: "SWITCH", description: "Joueur Console Nintendo Switch", emoji: "🕹️" }
                        ])
                );

                // EMBED & MENU : NOTIFICATIONS
                const embedNotifs = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.RULES} Ⅲ. PREFÉRENCES DE NOTIFICATIONS`)
                    .setDescription("Sélectionnez les alertes et annonces que vous souhaitez recevoir sur le serveur.");

                const menuNotifs = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_notifs")
                        .setPlaceholder("Sélectionner vos alertes...")
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

                // EMBED & MENU : COMPETITION
                const embedDivision = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.TRIAL_MOD} Ⅳ. NIVEAU COMPÉTITIF — FORTNITE`)
                    .setDescription(
                        `Affichez votre division compétitive actuelle.\n\n` +
                        `> **Note importante :** L'accès à la **Division 1** nécessite impérativement une vérification de vos preuves de rang auprès du Staff.`
                    )
                    .setFooter({ text: "HeLoRiA • #RiseSoarConquer" });

                const menuDivision = new ActionRowBuilder().addComponents(
                    new StringSelectMenuBuilder()
                        .setCustomId("role_select_division")
                        .setPlaceholder("Sélectionner votre division...")
                        .addOptions([
                            { label: "Division 1 (Vérification Staff)", value: "DIV_1", description: "Niveau Élite • Validation Staff Requise", emoji: "🏆" },
                            { label: "Division 2", value: "DIV_2", description: "Niveau Avancé", emoji: "🥇" },
                            { label: "Division 3", value: "DIV_3", description: "Niveau Intermédiaire", emoji: "🥈" },
                            { label: "Division 4", value: "DIV_4", description: "Niveau Challenger", emoji: "🥉" },
                            { label: "Division 5", value: "DIV_5", description: "Niveau Débutant / Casual", emoji: "🎯" }
                        ])
                );

                await msg.channel.send({ embeds: [headerEmbed] }).catch(() => {});
                await msg.channel.send({ embeds: [embedGenre], components: [menuGenre] }).catch(() => {});
                await msg.channel.send({ embeds: [embedPlateforme], components: [menuPlateforme] }).catch(() => {});
                await msg.channel.send({ embeds: [embedNotifs], components: [menuNotifs] }).catch(() => {});
                await msg.channel.send({ embeds: [embedDivision], components: [menuDivision] }).catch(() => {});

            } catch (error) {
                console.error("Erreur lors de l'initialisation du panneau de rôles :", error);
            }
        }
    });

    // =====================================================
    // GESTION DES INTERACTIONS
    // =====================================================
    client.on("interactionCreate", async (interaction) => {
        if (!interaction.guild) return;

        // BOUTONS DE CONFIRMATION
        if (interaction.isButton() && interaction.customId.startsWith("confirm_role_")) {
            await interaction.deferUpdate().catch(() => {});

            const parts = interaction.customId.split("_");
            const isYes = parts[2] === "yes";
            const type = parts[3];
            const selectedValue = parts[4];
            const targetRoleId = parts[5];
            const member = interaction.member;

            if (isYes) {
                let categoryConfig;
                if (type === "genre") categoryConfig = config.ROLES_GENRE;
                if (type === "plateforme") categoryConfig = config.ROLES_PLATEFORME;
                if (type === "division") categoryConfig = config.ROLES_DIVISION;

                if (categoryConfig) {
                    for (const key in categoryConfig) {
                        const id = categoryConfig[key];
                        if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                    }
                }

                if (selectedValue !== "NON_PRECISE" && targetRoleId && targetRoleId !== "undefined") {
                    await member.roles.add(targetRoleId).catch(() => {});
                }

                const successEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.CERTIFIED} Profil Mis à Jour`)
                    .setDescription("Votre changement de rôle a bien été effectué et enregistré.")
                    .setFooter({ text: "HeLoRiA • Système de Profil" });

                return interaction.editReply({ embeds: [successEmbed], components: [] }).catch(() => {});
            } else {
                const cancelEmbed = new EmbedBuilder()
                    .setColor(COLOR_BLACK)
                    .setTitle("⚠️ Modification Annulée")
                    .setDescription("Votre rôle actuel a été conservé sans modification.")
                    .setFooter({ text: "HeLoRiA • Système de Profil" });

                return interaction.editReply({ embeds: [cancelEmbed], components: [] }).catch(() => {});
            }
        }

        // MENUS DERROULANTS
        if (!interaction.isStringSelectMenu() || !interaction.customId.startsWith("role_select_")) return;

        try {
            await interaction.deferReply({ ephemeral: true }).catch(() => {});

            const member = interaction.member;
            const selectedValue = interaction.values[0];

            const sendResponseEmbed = async (title, statusText, isSuccess = true) => {
                const responseEmbed = new EmbedBuilder()
                    .setColor(isSuccess ? COLOR_GOLD : COLOR_BLACK)
                    .setTitle(`${isSuccess ? EMOJIS.CERTIFIED : "⚠️"} ${title}`)
                    .setDescription(statusText)
                    .setFooter({ text: "HeLoRiA • Système de Profil" });

                return interaction.editReply({ embeds: [responseEmbed], components: [] }).catch(() => {});
            };

            const askConfirmation = async (type, currentRoleName, targetRoleId) => {
                const confirmEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.PREMIUM} Modification de Rôle`)
                    .setDescription(
                        `Vous possédez déjà un rôle attribué dans cette catégorie (**${currentRoleName}**).\n\n` +
                        `**Voulez-vous vraiment remplacer votre rôle actuel par ce nouveau choix ?**`
                    )
                    .setFooter({ text: "HeLoRiA • Confirmation Requise" });

                const confirmButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`confirm_role_yes_${type}_${selectedValue}_${targetRoleId}`)
                        .setLabel("Oui, confirmer")
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId(`confirm_role_no_${type}_${selectedValue}_${targetRoleId}`)
                        .setLabel("Non, annuler")
                        .setStyle(ButtonStyle.Danger)
                );

                return interaction.editReply({ embeds: [confirmEmbed], components: [confirmButtons] }).catch(() => {});
            };

            // 1. GENRE
            if (interaction.customId === "role_select_genre") {
                const roleId = config.ROLES_GENRE[selectedValue];
                
                let existingRole = null;
                for (const key in config.ROLES_GENRE) {
                    const id = config.ROLES_GENRE[key];
                    if (id && member.roles.cache.has(id)) {
                        existingRole = member.roles.cache.get(id);
                        break;
                    }
                }

                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("genre", existingRole.name, roleId);
                }

                for (const key in config.ROLES_GENRE) {
                    const id = config.ROLES_GENRE[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                if (selectedValue !== "NON_PRECISE" && roleId) await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil Mis à Jour", "Votre identité a été enregistrée avec succès.", true);
            }

            // 2. PLATEFORME
            if (interaction.customId === "role_select_plateforme") {
                const roleId = config.ROLES_PLATEFORME[selectedValue];
                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'est pas configuré dans le bot.", false);
                }

                let existingRole = null;
                for (const key in config.ROLES_PLATEFORME) {
                    const id = config.ROLES_PLATEFORME[key];
                    if (id && member.roles.cache.has(id)) {
                        existingRole = member.roles.cache.get(id);
                        break;
                    }
                }

                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("plateforme", existingRole.name, roleId);
                }

                for (const key in config.ROLES_PLATEFORME) {
                    const id = config.ROLES_PLATEFORME[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil Mis à Jour", "Votre plateforme de jeu a été modifiée avec succès.", true);
            }

            // 3. NOTIFICATIONS
            if (interaction.customId === "role_select_notifs") {
                const selectedValues = interaction.values;
                
                for (const key in config.ROLES_NOTIFS) {
                    const roleId = config.ROLES_NOTIFS[key];
                    if (!roleId || roleId.startsWith("ID_")) continue;

                    if (selectedValues.includes(key)) {
                        if (!member.roles.cache.has(roleId)) await member.roles.add(roleId).catch(() => {});
                    } else {
                        if (member.roles.cache.has(roleId)) await member.roles.remove(roleId).catch(() => {});
                    }
                }

                return sendResponseEmbed("Préférences Mises à Jour", "Vos abonnements aux notifications ont été ajustés.", true);
            }

            // 4. DIVISION FORTNITE
            if (interaction.customId === "role_select_division") {
                const roleId = config.ROLES_DIVISION[selectedValue];
                
                if (selectedValue === "DIV_1") {
                    return sendResponseEmbed(
                        "Vérification Requise — Division 1", 
                        "L'accès au rôle **Division 1** nécessite une validation manuelle par le Staff.\n\nVeuillez ouvrir un ticket pour transmettre vos preuves de rang.",
                        false
                    );
                }

                if (!roleId || roleId.startsWith("ID_")) {
                    return sendResponseEmbed("Configuration Incomplète", "Ce rôle n'est pas configuré dans le bot.", false);
                }

                let existingRole = null;
                for (const key in config.ROLES_DIVISION) {
                    const id = config.ROLES_DIVISION[key];
                    if (id && member.roles.cache.has(id)) {
                        existingRole = member.roles.cache.get(id);
                        break;
                    }
                }

                if (existingRole && existingRole.id !== roleId) {
                    return askConfirmation("division", existingRole.name, roleId);
                }

                for (const key in config.ROLES_DIVISION) {
                    const id = config.ROLES_DIVISION[key];
                    if (id && member.roles.cache.has(id)) await member.roles.remove(id).catch(() => {});
                }

                await member.roles.add(roleId).catch(() => {});
                return sendResponseEmbed("Profil Mis à Jour", "Votre division compétitive a été mise à jour.", true);
            }
        } catch (error) {
            console.error("Erreur lors de la gestion des rôles :", error);
        }
    });
};