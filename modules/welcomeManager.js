const { EmbedBuilder } = require("discord.js");
const config = require("../data/welcomeConfig");

// Palette de couleurs & Charte HeLoRiA
const COLOR_GOLD = "#D4AF37";

// Registre d'emojis personnalisés
const EMOJIS = {
    WELCOME: "<:5647premiumicon:1533535330538360942>",
    MEMBERS: "<:75828briefcase:1537579702812807248>",
    INVITE: "<:600404handshake:1537578056447828058>",
    RULES: "<:580437rules:1537583160345366578>",
    ROLES: "<:hlrwin:1537584105536094248>",
    SUPPORT: "<:94919trialmod:1537582836318609521>"
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
        if (!config?.GUILD_ID) {
            console.warn("[WELCOME LOG] Aucun GUILD_ID configuré dans welcomeConfig.");
            return;
        }
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) {
            console.warn(`[WELCOME LOG] Impossible de trouver le serveur avec l'ID : ${config.GUILD_ID}`);
            return;
        }

        const invites = await guild.invites.fetch().catch((err) => {
            console.error(`[WELCOME LOG] Erreur lors de la récupération des invitations pour ${guild.name} :`, err.message);
            return null;
        });

        if (invites) {
            invitesCache.set(guild.id, new Map(invites.map(i => [i.code, i.uses])));
            console.log(`[WELCOME LOG] Cache d'invitations initialisé pour "${guild.name}" (${invites.size} invitations enregistrées).`);
        }
    };

    if (client.isReady()) {
        initInvites();
    } else {
        client.once("ready", initInvites);
    }

    // Suivi de la création d'invitation pour le cache interne
    client.on("inviteCreate", async (invite) => {
        if (!config?.GUILD_ID || invite.guild.id !== config.GUILD_ID) return;

        const guildInvites = invitesCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, invite.uses);
        invitesCache.set(invite.guild.id, guildInvites);
        console.log(`[WELCOME LOG] Nouvelle invitation créée : ${invite.code} par ${invite.inviter?.tag || "Inconnu"}`);
    });

    // Prise en charge des arrivées de membres
    client.on("guildMemberAdd", async (member) => {
        if (!config?.GUILD_ID || member.guild.id !== config.GUILD_ID) return;

        const guild = member.guild;
        const memberCount = guild.memberCount;

        console.log(`[WELCOME LOG] Nouveau membre détecté : ${member.user.tag} (ID: ${member.id}) sur ${guild.name}. Total : ${memberCount}`);

        // 1. Attribution automatique du rôle par défaut
        if (config.AUTO_ROLE_ID && config.AUTO_ROLE_ID.trim() !== "") {
            try {
                await member.roles.add(config.AUTO_ROLE_ID);
                console.log(`[WELCOME LOG] Rôle automatique (${config.AUTO_ROLE_ID}) attribué à ${member.user.tag}.`);
            } catch (err) {
                console.error(`[WELCOME LOG] Échec de l'attribution du rôle automatique à ${member.user.tag} :`, err.message);
            }
        } else {
            console.log("[WELCOME LOG] Aucun rôle automatique configuré (AUTO_ROLE_ID vide).");
        }

        // 2. Suivi du code d'invitation utilisé (avec gestion de la Vanité URL)
        let inviterUser = null;
        let inviteCodeUsed = null;
        let inviteUses = 0;
        let isVanity = false;

        const oldInvites = invitesCache.get(guild.id);
        const newInvites = await guild.invites.fetch().catch((err) => {
            console.error("[WELCOME LOG] Impossible de rafraîchir les invitations :", err.message);
            return null;
        });

        if (newInvites && oldInvites) {
            for (const [code, invite] of newInvites) {
                const oldUses = oldInvites.get(code) || 0;
                if (invite.uses > oldUses) {
                    inviterUser = invite.inviter;
                    inviteCodeUsed = code;
                    inviteUses = invite.uses;
                    console.log(`[WELCOME LOG] ${member.user.tag} a rejoint via l'invitation ${code} de ${inviterUser?.tag || "Inconnu"} (${inviteUses} utilisations).`);
                    break;
                }
            }
        }

        // Traitement URL Personnalisée (Vanity) si aucun code classique n'a augmenté
        if (!inviteCodeUsed && guild.features.includes("VANITY_URL")) {
            const vanityData = await guild.fetchVanityData().catch((err) => {
                console.error("[WELCOME LOG] Erreur lors de la récupération de la Vanity URL :", err.message);
                return null;
            });
            if (vanityData) {
                inviteCodeUsed = vanityData.code;
                isVanity = true;
                console.log(`[WELCOME LOG] ${member.user.tag} a rejoint via la Vanity URL (discord.gg/${inviteCodeUsed}).`);
            }
        }

        if (!inviteCodeUsed && !isVanity) {
            console.log(`[WELCOME LOG] Origine de l'invitation indéterminée pour ${member.user.tag}.`);
        }

        if (newInvites) {
            invitesCache.set(guild.id, new Map(newInvites.map(i => [i.code, i.uses])));
        }

        // 3. Message public de bienvenue
        if (config.CHANNELS?.WELCOME) {
            const welcomeChannel = await guild.channels.fetch(config.CHANNELS.WELCOME).catch((err) => {
                console.error(`[WELCOME LOG] Impossible d'accéder au salon de bienvenue (${config.CHANNELS.WELCOME}) :`, err.message);
                return null;
            });

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

                try {
                    await welcomeChannel.send({ content: `👋 Bienvenue ${member} !`, embeds: [welcomeEmbed] });
                    console.log(`[WELCOME LOG] Message de bienvenue envoyé dans le salon #${welcomeChannel.name} pour ${member.user.tag}.`);
                } catch (err) {
                    console.error(`[WELCOME LOG] Échec de l'envoi du message de bienvenue dans #${welcomeChannel.name} :`, err.message);
                }
            }
        } else {
            console.log("[WELCOME LOG] Aucun salon de bienvenue n'est configuré (CHANNELS.WELCOME vide).");
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

            await member.send({ embeds: [dmEmbed] });
            console.log(`[WELCOME LOG] Message privé d'accueil envoyé avec succès à ${member.user.tag}.`);
        } catch (err) {
            console.log(`[WELCOME LOG] Impossible d'envoyer un MP à ${member.user.tag} (MP fermés ou utilisateur bloqué).`);
        }
    });
};