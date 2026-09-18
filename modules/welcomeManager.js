const { EmbedBuilder } = require("discord.js");
const config = require("../data/welcomeConfig");

// Palette de couleurs & Charte HeLoRiA
const COLOR_GOLD = "#D4AF37";
const COLOR_JOIN = "#2ECC71";
const COLOR_LEAVE = "#E74C3C";
const COLOR_INFO = "#3498DB";
const COLOR_WARN = "#E67E22";

// Registre d'emojis personnalisés
const EMOJIS = {
    WELCOME: "<:5647premiumicon:1533535330538360942>",
    CERTIFIED: "<:20336certified:1537579306690281544>",
    STAR: "<a:darkbluecrown:1533535362566324245>",
    MEMBERS: "<:75828briefcase:1537579702812807248>", // Correction de l'ID Discord
    INVITE: "<:600404handshake:1537578056447828058>",
    RULES: "<:580437rules:1537583160345366578>",
    ROLES: "<:hlrwin:1537584105536094248>",
    SUPPORT: "<:94919trialmod:1537582836318609521>",
    GEAR: "<:65264telescope:1537586517453832222>",
    JOIN: "<:5647premiumicon:1533535330538360942>",
    LEAVE: "<:9299blurpleban:1533535325996056807>",
    LINK: "<:3446blurplecertifiedmoderator:1533535324309815367>",
    WARN: "<:warningd:1533535400176386068>"
};

const invitesCache = new Map();

// Utilitaire pour valider les URLs d'images
function validUrl(url) {
    return (typeof url === "string" && url.trim().length > 0 && url.startsWith("http")) ? url : null;
}

module.exports = (client) => {
    console.log("[SYSTÈME] Initialisation du module Welcome Manager HeLoRiA...");

    // Chargement de l'état des invitations au démarrage
    const initInvites = async () => {
        if (!config?.GUILD_ID) return;
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) return;

        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) {
            invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
        }
    };

    if (client.isReady()) {
        initInvites();
    } else {
        client.once("ready", initInvites);
    }

    // Log à la création d'une nouvelle invitation
    client.on("inviteCreate", async (invite) => {
        if (!config?.GUILD_ID || invite.guild.id !== config.GUILD_ID) return;

        const guildInvites = invitesCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        invitesCache.set(invite.guild.id, guildInvites);

        const creator = invite.inviter ? `**${invite.inviter.username}** (\`${invite.inviter.id}\`)` : "Inconnu / Système";

        const logInviteEmbed = new EmbedBuilder()
            .setColor(COLOR_GOLD)
            .setTitle(`${EMOJIS.LINK} NOUVELLE INVITATION CRÉÉE`)
            .addFields(
                { name: `${EMOJIS.GEAR} Code`, value: `\`${invite.code}\``, inline: true },
                { name: `${EMOJIS.STAR} Créateur`, value: creator, inline: true },
                { name: `${EMOJIS.WELCOME} Salon ciblé`, value: `${invite.channel}`, inline: true }
            )
            .setFooter({ text: "HeLoRiA • Traçabilité des Liens" })
            .setTimestamp();

        if (config.CHANNELS?.LOGS_INVITES) {
            const logChannel = await client.channels.fetch(config.CHANNELS.LOGS_INVITES).catch(() => null);
            if (logChannel) logChannel.send({ embeds: [logInviteEmbed] }).catch(() => {});
        }
    });

    // Prise en charge des arrivées de membres
    client.on("guildMemberAdd", async (member) => {
        if (!config?.GUILD_ID || member.guild.id !== config.GUILD_ID) return;

        const guild = member.guild;
        const memberCount = guild.memberCount;

        // 1. Attribution automatique du rôle par défaut
        if (config.AUTO_ROLE_ID && config.AUTO_ROLE_ID.trim() !== "") {
            await member.roles.add(config.AUTO_ROLE_ID).catch(() => {});
        }

        // 2. Suivi du code d'invitation utilisé (avec gestion de la Vanité URL)
        let inviterUser = null;
        let inviteCodeUsed = null;
        let inviteUses = 0;
        let isVanity = false;

        const oldInvites = invitesCache.get(guild.id);
        const newInvites = await guild.invites.fetch().catch(() => null);

        if (newInvites && oldInvites) {
            for (const [code, invite] of newInvites) {
                const oldUses = oldInvites.get(code) || 0;
                if (invite.uses > oldUses) {
                    inviterUser = invite.inviter;
                    inviteCodeUsed = code;
                    inviteUses = invite.uses;
                    break;
                }
            }
        }

        // Traitement URL Personnalisée (Vanity) si aucun code classique n'a augmenté
        if (!inviteCodeUsed && guild.features.includes("VANITY_URL")) {
            const vanityData = await guild.fetchVanityData().catch(() => null);
            if (vanityData) {
                inviteCodeUsed = vanityData.code;
                isVanity = true;
            }
        }

        if (newInvites) {
            invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
        }

        // 3. Message public de bienvenue
        if (config.CHANNELS?.WELCOME) {
            const welcomeChannel = await guild.channels.fetch(config.CHANNELS.WELCOME).catch(() => null);
            if (welcomeChannel) {
                let inviterText = "Lien Officiel / Discord";
                let scoreText = "";

                if (inviterUser) {
                    inviterText = `**${inviterUser.username}**`;
                    scoreText = `(\`${inviteUses}\` invitations)`;
                } else if (isVanity) {
                    inviterText = `Lien Personnalisé (\`discord.gg/${inviteCodeUsed}\`)`;
                }

                const logoUrl = validUrl(config.LOGO_URL);
                const bannerUrl = validUrl(config.BANNER_URL);

                const welcomeEmbed = new EmbedBuilder()
                    .setColor(COLOR_GOLD)
                    .setTitle(`${EMOJIS.WELCOME} BIENVENUE CHEZ HELORIA`)
                    .setDescription(
                        `Ravi de t'accueillir parmi nous, ${member} !\n` +
                        `Tu viens de rejoindre la communauté officielle d'**HeLoRiA**.\n\n` +
                        `─── **INFORMATIONS D'ARRIVÉE** ───\n\n` +
                        `• ${EMOJIS.MEMBERS} **Effectif :** Tu es notre **${memberCount}e** membre !\n` +
                        `• ${EMOJIS.INVITE} **Invitation :** Rejoint grâce à ${inviterText}${scoreText}\n\n` +
                        `─── **GUIDE DE DÉMARRAGE** ───\n\n` +
                        `• ${EMOJIS.RULES} **Règlement :** Consulte le salon des règles pour naviguer sereinement.\n` +
                        `• ${EMOJIS.ROLES} **Rôles :** Prends tes accès et consoles dans le salon des rôles.\n` +
                        `• ${EMOJIS.SUPPORT} **Besoin d'aide ?** L'équipe Staff reste à ta disposition via les tickets.`
                    )
                    .setThumbnail(member.user.displayAvatarURL({ forceStatic: false, size: 512 }))
                    .setTimestamp();

                if (bannerUrl) welcomeEmbed.setImage(bannerUrl);

                const footerData = { text: `HeLoRiA • Effectif global : ${memberCount} membres` };
                if (logoUrl) footerData.iconURL = logoUrl;
                welcomeEmbed.setFooter(footerData);

                welcomeChannel.send({ content: `👋 Bienvenue ${member} !`, embeds: [welcomeEmbed] }).catch(() => {});
            }
        }

        // 4. Message Privé (DM) d'accueil de courtoisie
        try {
            const dmEmbed = new EmbedBuilder()
                .setColor(COLOR_GOLD)
                .setTitle(`${EMOJIS.WELCOME} BIENVENUE SUR HELORIA !`)
                .setDescription(
                    `Bonjour ${member.user.username},\n\n` +
                    `Merci d'avoir rejoint le serveur **HeLoRiA** ! Nous sommes ravis de te compter parmi nous.\n\n` +
                    `N'hésite pas à prendre tes rôles et à passer dire bonjour dans le salon général.`
                )
                .setFooter({ text: "HeLoRiA • Message Automatique" })
                .setTimestamp();

            await member.send({ embeds: [dmEmbed] }).catch(() => {});
        } catch (err) {
            // Ignorer l'erreur si les MP du membre sont fermés
        }

        // 5. Logs Interne Staff (Arrivée Membre & Anti-Raid)
        if (config.CHANNELS?.LOGS_MEMBRES) {
            const logMembreChannel = await client.channels.fetch(config.CHANNELS.LOGS_MEMBRES).catch(() => null);
            if (logMembreChannel) {
                const createdTimestamp = Math.floor(member.user.createdTimestamp / 1000);
                const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24));
                const isRecentAccount = accountAgeDays < 7;

                const joinEmbed = new EmbedBuilder()
                    .setColor(isRecentAccount ? COLOR_WARN : COLOR_JOIN)
                    .setTitle(`${EMOJIS.JOIN} NOUVEAU MEMBRE REJOINT`)
                    .addFields(
                        { name: "Utilisateur", value: `${member.user.tag}`, inline: true },
                        { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                        { name: "Création du compte", value: `<t:${createdTimestamp}:f> (<t:${createdTimestamp}:R>)`, inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
                    .setFooter({ text: "HeLoRiA • Registre des Membres" })
                    .setTimestamp();

                if (isRecentAccount) {
                    joinEmbed.addFields({
                        name: `${EMOJIS.WARN} AVERTISSEMENT SÉCURITÉ`,
                        value: `⚠️ **Compte très récent !** Créé il y a seulement **${accountAgeDays} jour(s)**.`,
                        inline: false
                    });
                }

                logMembreChannel.send({ embeds: [joinEmbed] }).catch(() => {});
            }
        }

        // 6. Logs Détaillés du Tracking d'Invitation
        if (config.CHANNELS?.LOGS_INVITES) {
            const logInviteChannel = await client.channels.fetch(config.CHANNELS.LOGS_INVITES).catch(() => null);
            if (logInviteChannel) {
                const infoInviteEmbed = new EmbedBuilder()
                    .setColor(COLOR_INFO)
                    .setTitle(`${EMOJIS.INVITE} SUIVI D'INVITATION`)
                    .addFields(
                        { name: "Membre rejoint", value: `${member.user.username} (\`${member.id}\`)`, inline: false },
                        { name: "Auteur de l'invitation", value: inviterUser ? `${inviterUser.username} (\`${inviterUser.id}\`)` : (isVanity ? "Lien Personnalisé (Vanity)" : "Inconnu"), inline: true },
                        { name: "Code utilisé", value: inviteCodeUsed ? `\`${inviteCodeUsed}\`` : "N/A", inline: true },
                        { name: "Total d'invitations", value: inviterUser ? `\`${inviteUses}\`` : "N/A", inline: true }
                    )
                    .setFooter({ text: "HeLoRiA • Traçabilité des Invitations" })
                    .setTimestamp();

                logInviteChannel.send({ embeds: [infoInviteEmbed] }).catch(() => {});
            }
        }
    });

    // Prise en charge des départs
    client.on("guildMemberRemove", async (member) => {
        if (!config?.GUILD_ID || member.guild.id !== config.GUILD_ID) return;

        if (config.CHANNELS?.LOGS_MEMBRES) {
            const logMembreChannel = await client.channels.fetch(config.CHANNELS.LOGS_MEMBRES).catch(() => null);
            if (logMembreChannel) {
                const leaveEmbed = new EmbedBuilder()
                    .setColor(COLOR_LEAVE)
                    .setTitle(`${EMOJIS.LEAVE} DÉPART D'UN MEMBRE`)
                    .addFields(
                        { name: "Utilisateur", value: `${member.user.tag}`, inline: true },
                        { name: "Identifiant", value: `\`${member.id}\``, inline: true },
                        { name: "Effectif restant", value: `\`${member.guild.memberCount}\` membres`, inline: false }
                    )
                    .setThumbnail(member.user.displayAvatarURL({ forceStatic: false }))
                    .setFooter({ text: "HeLoRiA • Registre des Membres" })
                    .setTimestamp();

                logMembreChannel.send({ embeds: [leaveEmbed] }).catch(() => {});
            }
        }
    });
};