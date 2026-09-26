const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

const ROSTER_CHANNEL_ID = '1534579701421445242';
const EMBED_COLOR = '#D4AF37';
const FOOTER_TEXT = 'HeLoRiA • #RiseSoarConquer';
const FIELD_VALUE_LIMIT = 1024;

const STORE_DIR = path.join(__dirname, '../data');
const STORE_PATH = path.join(STORE_DIR, 'roster_objective.json');

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

const ROSTER_POLES = [
    { name: `${EMOJIS.CROWN} PÔLE CEO`, roles: [{ name: 'CEO', id: '1532015045800628244' }] },
    { name: `${EMOJIS.GOLD_STAR} PÔLE DIRECTION`, roles: [{ name: 'Directeur(trice) général', id: '1532015039806963763' }] },
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
    { name: `${EMOJIS.TEST} PÔLE TEST MODÉRATEUR`, roles: [{ name: 'Test modérateur', id: '1532014992407269386' }] },
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
    { name: `${EMOJIS.TROPHY} PÔLE E-SPORT`, roles: [{ name: 'E-sport', id: '1532014940569735299' }] },
    { name: `${EMOJIS.GRADUATION} PÔLE ACADÉMIQUE`, roles: [{ name: 'Académique', id: '1532014932630044873' }] },
    { name: `${EMOJIS.BOOK} PÔLE FORMATION`, roles: [{ name: 'Centre de formation', id: '1532014926623674573' }] },
    { name: `${EMOJIS.SPARKLES} PÔLE ESPOIR`, roles: [{ name: 'Espoir', id: '1532014920361574594' }] }
];

const RELEVANT_ROLE_IDS = new Set(ROSTER_POLES.flatMap(pole => pole.roles.map(role => role.id)));

// --- Stockage ---

function ensureStore() {
    try {
        if (!fs.existsSync(STORE_DIR)) fs.mkdirSync(STORE_DIR, { recursive: true });
    } catch (error) {
        console.error('[ROSTER] Erreur lors de la création du dossier :', error.message);
    }
}

function loadStore() {
    ensureStore();
    try {
        if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    } catch (error) {
        console.error('[ROSTER] Erreur de lecture du fichier de configuration :', error.message);
    }
    return {};
}

function saveStore(data) {
    ensureStore();
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf8');
    } catch (error) {
        console.error('[ROSTER] Erreur d\'écriture du registre :', error.message);
    }
}

// --- Formatage ---

function getRoleMembers(guild, roleId) {
    const role = guild.roles.cache.get(roleId);
    if (!role) {
        console.warn(`[ROSTER] Rôle introuvable sur le serveur (ID: ${roleId})`);
        return [];
    }
    return [...role.members.values()].sort((a, b) => a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }));
}

function formatMembers(members) {
    if (members.length === 0) return '*Aucun membre actuellement*';
    return members.map(m => `${EMOJIS.DOT} <@${m.id}>`).join('\n');
}

function truncateFieldValue(value, limit = FIELD_VALUE_LIMIT) {
    if (value.length <= limit) return value;
    return `${value.slice(0, limit - 24).trimEnd()}\n*(liste tronquée…)*`;
}

// --- Construction de l'embed ---

function buildEmbed(guild) {
    // On ne récupère chaque rôle qu'une seule fois, puis on réutilise le résultat
    // pour le total, le compteur par pôle et le contenu détaillé.
    const membersByRole = new Map();
    for (const pole of ROSTER_POLES) {
        for (const role of pole.roles) {
            if (!membersByRole.has(role.id)) membersByRole.set(role.id, getRoleMembers(guild, role.id));
        }
    }

    const totalRosterMembers = new Set();
    for (const members of membersByRole.values()) {
        for (const m of members) totalRosterMembers.add(m.id);
    }

    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setAuthor({ name: guild.name, iconURL: guild.iconURL({ size: 128 }) || undefined })
        .setTitle(`${EMOJIS.TROPHY} ORGANIGRAMME & ROSTER OFFICIEL`)
        .setDescription(
            `Bienvenue sur l'organigramme officiel de la **Team HeLoRiA**.\n` +
            `Retrouvez l'ensemble de l'équipe d'encadrement, du staff et des pôles compétitifs.\n\n` +
            `📊 **Effectif total du Roster :** \`${totalRosterMembers.size} membre${totalRosterMembers.size > 1 ? 's' : ''}\`\n` +
            `━━━━━━━━━━━━━━━━━━━━━━`
        )
        .setThumbnail(guild.iconURL({ size: 256 }) || null)
        .setFooter({ text: FOOTER_TEXT, iconURL: guild.iconURL({ size: 64 }) || undefined })
        .setTimestamp();

    for (const pole of ROSTER_POLES) {
        const uniqueMembersPole = new Set();
        let poleContent = '';

        for (const role of pole.roles) {
            const members = membersByRole.get(role.id);
            for (const m of members) uniqueMembersPole.add(m.id);
            poleContent += `**${role.name.toUpperCase()}**\n${formatMembers(members)}\n\n`;
        }

        const count = uniqueMembersPole.size;
        const countLabel = `${count} membre${count > 1 ? 's' : ''}`;

        embed.addFields({
            name: `${pole.name}  \`[ ${countLabel} ]\``,
            value: truncateFieldValue(poleContent.trim()) || '*Aucun membre*',
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

// --- Rafraîchissement ---

let updateTimeout = null;
let updateRunning = false;

async function updateRoster(client, guild) {
    if (updateRunning) return;
    updateRunning = true;

    try {
        const channel = await client.channels.fetch(ROSTER_CHANNEL_ID).catch((err) => {
            console.error(`[ROSTER] Impossible d'accéder au salon (${ROSTER_CHANNEL_ID}) :`, err.message);
            return null;
        });

        if (!channel || !channel.isTextBased()) {
            console.error('[ROSTER] Salon introuvable ou type de salon non pris en charge.');
            return;
        }

        const store = loadStore();
        let message = store.messageId ? await channel.messages.fetch(store.messageId).catch(() => null) : null;

        const embed = buildEmbed(guild);
        // Les mentions dans un embed ne notifient jamais personne côté Discord,
        // donc pas besoin (et surtout pas la peine de risquer la limite de 100
        // entrées) de lister les utilisateurs à mentionner ici.
        const safeMentions = { parse: [] };

        if (message) {
            await message.edit({ embeds: [embed], allowedMentions: safeMentions });
            console.log(`[ROSTER] Organigramme mis à jour (message ${message.id}).`);
        } else {
            message = await channel.send({ embeds: [embed], allowedMentions: safeMentions });
            saveStore({ messageId: message.id, channelId: channel.id });
            console.log(`[ROSTER] Nouveau message d'organigramme créé (${message.id}).`);
        }
    } catch (error) {
        console.error('[ROSTER] Erreur lors du rafraîchissement de l\'organigramme :', error);
    } finally {
        updateRunning = false;
    }
}

function scheduleUpdate(client, guild) {
    if (updateTimeout) clearTimeout(updateTimeout);
    updateTimeout = setTimeout(() => {
        updateTimeout = null;
        updateRoster(client, guild);
    }, 1000);
}

/** Renvoie les IDs de pôle qui ont réellement changé entre avant et après (pas l'union). */
function getChangedRelevantRoles(oldMember, newMember) {
    const oldRoles = oldMember.roles.cache;
    const newRoles = newMember.roles.cache;
    const changed = [];

    for (const roleId of RELEVANT_ROLE_IDS) {
        if (oldRoles.has(roleId) !== newRoles.has(roleId)) changed.push(roleId);
    }
    return changed;
}

// --- Initialisation ---

let rosterModuleInitialized = false;

module.exports = async function rosterObjective(client) {
    if (rosterModuleInitialized) return;
    rosterModuleInitialized = true;

    console.log('[ROSTER] Initialisation du module Organigramme & Roster...');

    const channel = await client.channels.fetch(ROSTER_CHANNEL_ID).catch((err) => {
        console.error(`[ROSTER] Erreur d'accès au salon de destination (${ROSTER_CHANNEL_ID}) :`, err.message);
        return null;
    });

    if (!channel || !channel.guild) {
        console.error('[ROSTER] Serveur ou salon cible introuvable. Arrêt du module.');
        return;
    }

    const guild = channel.guild;

    try {
        await guild.members.fetch();
        console.log(`[ROSTER] Annuaire synchronisé (${guild.memberCount} membres en cache).`);
    } catch (err) {
        console.error('[ROSTER] Erreur lors de la récupération complète des membres :', err.message);
    }

    await updateRoster(client, guild);
    console.log(`[ROSTER] Module organigramme prêt sur "${guild.name}".`);

    client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
        const changedRoles = getChangedRelevantRoles(oldMember, newMember);
        if (changedRoles.length === 0) return;

        console.log(`[ROSTER] Changement de rôle impactant le Roster détecté pour ${newMember.user.tag}.`);
        scheduleUpdate(client, newMember.guild);
    });

    // Filet de sécurité en cas d'événement manqué, sans matraquer l'API.
    setInterval(async () => {
        try {
            await guild.members.fetch().catch(() => {});
            await updateRoster(client, guild);
        } catch (error) {
            console.error('[ROSTER] Erreur lors de la synchronisation de fond :', error.message);
        }
    }, 5 * 60 * 1000);
};