const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================

const ROSTER_CHANNEL_ID = '1534579701421445242';
const EMBED_COLOR = '#D4AF37'; // Or prestige HeLoRiA
const FOOTER_TEXT = 'HeLoRiA • #RiseSoarConquer';

const STORE_DIR = path.join(__dirname, '../data');
const STORE_PATH = path.join(STORE_DIR, 'roster_objective.json');

// Emojis d'organisation et de pôles
const EMOJIS = {
    GOLD_STAR: '⭐',
    CROWN: '👑',
    SHIELD: '🛡️',
    MOD: '🔨',
    TEST: '🧪',
    GAME: '🎮',
    MEDIA: '🎬',
    TV: '📺',
    TROPHY: '🏆',
    GRADUATION: '🎓',
    BOOK: '📚',
    SPARKLES: '✨',
    DOT: '▪️'
};

// =====================================================
// RÔLES DU ROSTER
// =====================================================

const ROSTER_POLES = [
    {
        name: `${EMOJIS.CROWN} PÔLE CEO`,
        roles: [
            { name: 'CEO', id: '1532015045800628244' }
        ]
    },
    {
        name: `${EMOJIS.GOLD_STAR} PÔLE DIRECTION`,
        roles: [
            { name: 'Directeur(trice) général', id: '1532015039806963763' }
        ]
    },
    {
        name: `${EMOJIS.SHIELD} PÔLE ADMINISTRATION`,
        roles: [
            { name: 'Responsable administration', id: '1532015034572738721' },
            { name: 'Administrateur', id: '1532015029480853625' }
        ]
    },
    {
        name: `${EMOJIS.MOD} PÔLE MODÉRATION`,
        roles: [
            { name: 'Responsable modération', id: '1532015000426905633' },
            { name: 'Modérateur', id: '1532014997842952202' }
        ]
    },
    {
        name: `${EMOJIS.TEST} PÔLE TEST MODÉRATEUR`,
        roles: [
            { name: 'Test modérateur', id: '1532014992407269386' }
        ]
    },
    {
        name: `${EMOJIS.GAME} PÔLE FORTNITE`,
        roles: [
            { name: 'Directeur(trice) Fortnite', id: '1532014983305498684' },
            { name: 'Manager Esports', id: '1532014980063428730' },
            { name: 'Coach', id: '1532014976687145104' }
        ]
    },
    {
        name: `${EMOJIS.MEDIA} PÔLE AUDIOVISUEL`,
        roles: [
            { name: 'Monteur', id: '1532014970210881607' },
            { name: 'Graphiste', id: '1532014967728115813' },
            { name: 'Mapper', id: '1532014964909277338' },
            { name: 'Caster', id: '1532014954717380798' },
            { name: 'Mini-maker', id: '1532014962179051590' }
        ]
    },
    {
        name: `${EMOJIS.TV} PÔLE WEB TV`,
        roles: [
            { name: 'Régisseur(euse)', id: '1532014951709802566' },
            { name: 'Créateur de contenu', id: '1532014948870393887' },
            { name: 'Animateur(trice)', id: '1532014946219458630' }
        ]
    },
    {
        name: `${EMOJIS.TROPHY} PÔLE E-SPORT`,
        roles: [
            { name: 'E-sport', id: '1532014940569735299' }
        ]
    },
    {
        name: `${EMOJIS.GRADUATION} PÔLE ACADÉMIQUE`,
        roles: [
            { name: 'Académique', id: '1532014932630044873' }
        ]
    },
    {
        name: `${EMOJIS.BOOK} PÔLE FORMATION`,
        roles: [
            { name: 'Centre de formation', id: '1532014926623674573' }
        ]
    },
    {
        name: `${EMOJIS.SPARKLES} PÔLE ESPOIR`,
        roles: [
            { name: 'Espoir', id: '1532014920361574594' }
        ]
    }
];

// =====================================================
// STOCKAGE FONDATION
// =====================================================

function ensureStore() {
    try {
        if (!fs.existsSync(STORE_DIR)) {
            fs.mkdirSync(STORE_DIR, { recursive: true });
            console.log(`[ROSTER LOG] Dossier de stockage créé : ${STORE_DIR}`);
        }
    } catch (error) {
        console.error("[ROSTER LOG] Erreur lors de la création du dossier :", error.message);
    }
}

function loadStore() {
    ensureStore();
    try {
        if (fs.existsSync(STORE_PATH)) {
            const raw = fs.readFileSync(STORE_PATH, 'utf8');
            return JSON.parse(raw);
        }
    } catch (error) {
        console.error("[ROSTER LOG] Erreur de lecture du fichier de configuration :", error.message);
    }
    return {};
}

function saveStore(data) {
    ensureStore();
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf8');
        console.log("[ROSTER LOG] Configuration sauvegardée dans le registre.");
    } catch (error) {
        console.error("[ROSTER LOG] Erreur d'écriture du registre :", error.message);
    }
}

// =====================================================
// FONCTIONS DE FORMATAGE
// =====================================================

function getRoleMembers(guild, roleId) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
        console.warn(`[ROSTER LOG] Rôle introuvable sur le serveur (ID: ${roleId})`);
        return [];
    }

    return [...role.members.values()].sort((a, b) =>
        a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' })
    );
}

function formatMembers(members) {
    if (members.length === 0) {
        return `* standard — aucun membre actuellement*`;
    }
    return members.map(m => `${EMOJIS.DOT} <@${m.id}>`).join('\n');
}

// =====================================================
// DÉFINITION DE L'EMBED
// =====================================================

function buildEmbed(guild) {
    let totalRosterMembers = new Set();

    for (const pole of ROSTER_POLES) {
        for (const role of pole.roles) {
            const members = getRoleMembers(guild, role.id);
            for (const m of members) totalRosterMembers.add(m.id);
        }
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('🏆 ORGANIGRAMME & ROSTER OFFICIEL')
        .setDescription(
            `Bienvenue sur l'organigramme officiel de la **Team HeLoRiA**.\n` +
            `Retrouvez l'ensemble de l'équipe d'encadrement, du staff et des pôles compétitifs.\n\n` +
            `📊 **Effectif total du Roster :** \`${totalRosterMembers.size} Membre(s)\`\n` +
            `──────────────────────────────`
        )
        .setFooter({ text: FOOTER_TEXT })
        .setTimestamp();

    for (const pole of ROSTER_POLES) {
        const uniqueMembersPole = new Set();

        for (const role of pole.roles) {
            const members = getRoleMembers(guild, role.id);
            for (const m of members) uniqueMembersPole.add(m.id);
        }

        const count = uniqueMembersPole.size;
        const countLabel = count > 1 ? `${count} membres` : `${count} membre`;

        let poleContent = '';

        for (const role of pole.roles) {
            const members = getRoleMembers(guild, role.id);
            poleContent += `**${role.name.toUpperCase()}**\n${formatMembers(members)}\n\n`;
        }

        embed.addFields({
            name: `${pole.name} \`[ ${countLabel} ]\``,
            value: poleContent.trim() || '*Aucun membre*',
            inline: false
        });
    }

    embed.addFields({
        name: '📌 INFORMATION COMPLÉMENTAIRE',
        value: 
            `**Section Grinders (Division 1 à 5)**\n` +
            `*Ces rôles sont suivis indépendamment sur le serveur et ne figurent pas dans cet organigramme principal.*`,
        inline: false
    });

    return embed;
}

// =====================================================
// GESTION DU RAFRAÎCHISSEMENT
// =====================================================

let updateTimeout = null;
let updateRunning = false;

async function updateRoster(client, guild) {
    if (updateRunning) {
        console.log("[ROSTER LOG] Mise à jour déjà en cours d'exécution. Requête ignorée.");
        return;
    }
    updateRunning = true;
    console.log("[ROSTER LOG] Début du rafraîchissement de l'organigramme...");

    try {
        const channel = await client.channels.fetch(ROSTER_CHANNEL_ID).catch((err) => {
            console.error(`[ROSTER LOG] Impossible d'accéder au salon (${ROSTER_CHANNEL_ID}) :`, err.message);
            return null;
        });

        if (!channel || !channel.isTextBased()) {
            console.error("[ROSTER LOG] Salon introuvable ou type de salon non pris en charge.");
            return;
        }

        const store = loadStore();
        let message = null;

        if (store.messageId) {
            message = await channel.messages.fetch(store.messageId).catch(() => {
                console.warn(`[ROSTER LOG] Message initial (${store.messageId}) non trouvé, création d'un nouveau.`);
                return null;
            });
        }

        const embed = buildEmbed(guild);
        const membersToMention = new Set();

        for (const pole of ROSTER_POLES) {
            for (const role of pole.roles) {
                for (const member of getRoleMembers(guild, role.id)) {
                    membersToMention.add(member.id);
                }
            }
        }

        const allowedUsers = [...membersToMention];

        if (message) {
            await message.edit({
                embeds: [embed],
                allowedMentions: { parse: [], users: allowedUsers, roles: [], repliedUser: false }
            });
            console.log(`[ROSTER LOG] Embed de l'organigramme mis à jour avec succès (ID Message: ${message.id}).`);
        } else {
            message = await channel.send({
                embeds: [embed],
                allowedMentions: { parse: [], users: allowedUsers, roles: [], repliedUser: false }
            });

            saveStore({
                messageId: message.id,
                channelId: channel.id
            });
            console.log(`[ROSTER LOG] Nouveau message d'organigramme généré (ID Message: ${message.id}).`);
        }

    } catch (error) {
        console.error("[ROSTER LOG] Erreur lors du rafraîchissement de l'organigramme :", error);
    } finally {
        updateRunning = false;
    }
}

function scheduleUpdate(client, guild) {
    if (updateTimeout) clearTimeout(updateTimeout);

    console.log("[ROSTER LOG] Mise à jour planifiée (Debounce 1000ms)...");
    updateTimeout = setTimeout(() => {
        updateTimeout = null;
        updateRoster(client, guild);
    }, 1000);
}

// =====================================================
// INITIALISATION DU MODULE
// =====================================================

module.exports = async function rosterObjective(client) {
    console.log("[ROSTER LOG] Initialisation du module Organigramme & Roster...");

    const channel = await client.channels.fetch(ROSTER_CHANNEL_ID).catch((err) => {
        console.error(`[ROSTER LOG] Erreur d'accès au salon de destination (${ROSTER_CHANNEL_ID}) :`, err.message);
        return null;
    });

    if (!channel || !channel.guild) {
        console.error("[ROSTER LOG] Serveur ou salon cible introuvable. Arrêt du module.");
        return;
    }

    const guild = channel.guild;

    try {
        console.log(`[ROSTER LOG] Synchronisation de l'annuaire des membres pour "${guild.name}"...`);
        await guild.members.fetch();
        console.log(`[ROSTER LOG] Synchronisation des membres réussie (${guild.memberCount} membres en cache).`);
    } catch (err) {
        console.error("[ROSTER LOG] Erreur lors de la récupération complète des membres :", err.message);
    }

    await updateRoster(client, guild);
    console.log(`[ROSTER LOG] Module organigramme prêt sur "${guild.name}".`);

    // Surveillance des modifications de rôles
    client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
        const relevantRoles = new Set(
            ROSTER_POLES.flatMap(pole => pole.roles.map(role => role.id))
        );

        const oldRoles = new Set(oldMember.roles.cache.keys());
        const newRoles = new Set(newMember.roles.cache.keys());

        const changedRoles = new Set([...oldRoles, ...newRoles]);
        const affectsRoster = [...changedRoles].some(roleId => relevantRoles.has(roleId));

        if (!affectsRoster) return;

        console.log(`[ROSTER LOG] Changement de rôle impactant le Roster détecté pour ${newMember.user.tag}.`);
        scheduleUpdate(client, newMember.guild);
    });

    // Intervalle de mise à jour périodique (30 secondes)
    setInterval(async () => {
        try {
            console.log("[ROSTER LOG] Synchronisation périodique de fond (30s)...");
            await guild.members.fetch().catch(() => {});
            await updateRoster(client, guild);
        } catch (error) {
            console.error("[ROSTER LOG] Erreur lors de la synchronisation de fond :", error.message);
        }
    }, 30000);
};