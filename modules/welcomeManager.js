const { EmbedBuilder } = require("discord.js");
const config = require("../data/welcomeConfig");

const COLOR_GOLD = "#D4AF37";

const EMOJIS = {
    WELCOME: "<:5647premiumicon:1533535330538360942>",
    MEMBERS: "<:75828briefcase:1537579702812807248>",
    INVITE: "<:600404handshake:1537578056447828058>",
    RULES: "<:580437rules:1537583160345366578>",
    ROLES: "<:hlrwin:1537584105536094248>",
    SUPPORT: "<:94919trialmod:1537582836318609521>"
};

// Cache d'invitations par serveur : code -> { uses, maxUses, inviterId, inviterTag }
const invitesCache = new Map();
// File d'attente par serveur pour éviter les conditions de course quand
// plusieurs membres rejoignent en même temps (raid, boost du serveur, etc.)
const inviteResolutionQueue = new Map();

function validUrl(url) {
    return (typeof url === "string" && url.trim().length > 0 && url.startsWith("http")) ? url : null;
}

function snapshotInvites(invites) {
    return new Map(invites.map(i => [i.code, {
        uses: i.uses,
        maxUses: i.maxUses,
        inviterId: i.inviter?.id || null,
        inviterTag: i.inviter?.tag || null
    }]));
}

function queueInviteResolution(guildId, task) {
    const previous = inviteResolutionQueue.get(guildId) || Promise.resolve();
    const next = previous.then(task, task).catch((err) => {
        console.error("[WELCOME] Erreur dans la file de résolution d'invitations :", err);
        return { inviterTag: null, inviteCodeUsed: null, inviteUses: 0, isVanity: false };
    });
    inviteResolutionQueue.set(guildId, next);
    return next;
}

/** Détermine par quelle invitation un membre est arrivé, de façon sérialisée par serveur. */
async function resolveInviteUsage(guild) {
    let inviterTag = null;
    let inviteCodeUsed = null;
    let inviteUses = 0;
    let isVanity = false;

    const oldInvites = invitesCache.get(guild.id);
    const newInvites = await guild.invites.fetch().catch((err) => {
        console.error("[WELCOME] Impossible de rafraîchir les invitations :", err.message);
        return null;
    });

    if (newInvites && oldInvites) {
        for (const [code, invite] of newInvites) {
            const old = oldInvites.get(code);
            const oldUses = old?.uses ?? 0;
            if (invite.uses > oldUses) {
                inviterTag = invite.inviter?.tag || null;
                inviteCodeUsed = code;
                inviteUses = invite.uses;
                break;
            }
        }

        // Cas d'une invitation à usage unique : elle a été consommée et
        // supprimée par Discord avant qu'on ait pu la revoir dans la liste.
        if (!inviteCodeUsed) {
            for (const [code, old] of oldInvites) {
                if (newInvites.has(code)) continue;
                if (old.maxUses && old.uses === old.maxUses - 1) {
                    inviterTag = old.inviterTag;
                    inviteCodeUsed = code;
                    inviteUses = old.maxUses;
                    break;
                }
            }
        }
    }

    if (!inviteCodeUsed && guild.features.includes("VANITY_URL")) {
        const vanityData = await guild.fetchVanityData().catch((err) => {
            console.error("[WELCOME] Erreur lors de la récupération de la Vanity URL :", err.message);
            return null;
        });
        if (vanityData) {
            inviteCodeUsed = vanityData.code;
            isVanity = true;
        }
    }

    if (newInvites) invitesCache.set(guild.id, snapshotInvites(newInvites));

    return { inviterTag, inviteCodeUsed, inviteUses, isVanity };
}

let welcomeModuleInitialized = false;

module.exports = (client) => {
    if (welcomeModuleInitialized) return;
    welcomeModuleInitialized = true;

    console.log("[WELCOME] Initialisation du module Welcome Manager...");

    const initInvites = async () => {
        if (!config?.GUILD_ID) {
            console.warn("[WELCOME] Aucun GUILD_ID configuré dans welcomeConfig.");
            return;
        }
        const guild = client.guilds.cache.get(config.GUILD_ID);
        if (!guild) {
            console.warn(`[WELCOME] Impossible de trouver le serveur avec l'ID : ${config.GUILD_ID}`);
            return;
        }

        const invites = await guild.invites.fetch().catch((err) => {
            console.error(`[WELCOME] Erreur lors de la récupération des invitations pour ${guild.name} :`, err.message);
            return null;
        });

        if (invites) {
            invitesCache.set(guild.id, snapshotInvites(invites));
            console.log(`[WELCOME] Cache d'invitations initialisé pour "${guild.name}" (${invites.size} invitations).`);
        }
    };

    if (client.isReady()) initInvites();
    else client.once("ready", initInvites);

    client.on("inviteCreate", (invite) => {
        if (!config?.GUILD_ID || invite.guild.id !== config.GUILD_ID) return;

        const guildInvites = invitesCache.get(invite.guild.id) || new Map();
        guildInvites.set(invite.code, {
            uses: invite.uses,
            maxUses: invite.maxUses,
            inviterId: invite.inviter?.id || null,
            inviterTag: invite.inviter?.tag || null
        });
        invitesCache.set(invite.guild.id, guildInvites);
    });

    client.on("guildMemberAdd", async (member) => {
        if (!config?.GUILD_ID || member.guild.id !== config.GUILD_ID) return;

        const guild = member.guild;
        const memberCount = guild.memberCount;

        // 1. Rôle automatique
        if (config.AUTO_ROLE_ID?.trim()) {
            try {
                await member.roles.add(config.AUTO_ROLE_ID);
            } catch (err) {
                console.error(`[WELCOME] Échec de l'attribution du rôle automatique à ${member.user.tag} :`, err.message);
            }
        }

        // 2. Détection de l'invitation utilisée (sérialisée par serveur)
        const { inviterTag, inviteCodeUsed, inviteUses, isVanity } = await queueInviteResolution(guild.id, () => resolveInviteUsage(guild));

        console.log(
            inviteCodeUsed
                ? `[WELCOME] ${member.user.tag} a rejoint via ${isVanity ? `la Vanity URL (${inviteCodeUsed})` : `l'invitation ${inviteCodeUsed} de ${inviterTag || "Inconnu"}`}.`
                : `[WELCOME] Origine de l'invitation indéterminée pour ${member.user.tag}.`
        );

        // 3. Message public de bienvenue
        if (config.CHANNELS?.WELCOME) {
            const welcomeChannel = await guild.channels.fetch(config.CHANNELS.WELCOME).catch((err) => {
                console.error(`[WELCOME] Impossible d'accéder au salon de bienvenue (${config.CHANNELS.WELCOME}) :`, err.message);
                return null;
            });

            if (welcomeChannel) {
                let inviterText = "Lien Officiel / Discord";
                let scoreText = "";

                if (inviterTag && !isVanity) {
                    inviterText = `**${inviterTag}**`;
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
                } catch (err) {
                    console.error(`[WELCOME] Échec de l'envoi du message de bienvenue dans #${welcomeChannel.name} :`, err.message);
                }
            }
        }

        // 4. Message privé de courtoisie
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
        } catch {
            console.log(`[WELCOME] Impossible d'envoyer un MP à ${member.user.tag} (MP fermés ou utilisateur bloqué).`);
        }
    });
};