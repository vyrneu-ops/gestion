const { EmbedBuilder, Events } = require('discord.js');
const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================

const ROSTER_CHANNEL_ID = '1534579701421445242';
const EMBED_COLOR = '#D4AF37';
const FOOTER_TEXT = 'HeLoRiA • #RiseSoarConquer';

const STORE_DIR = path.join(__dirname, '../data');
const STORE_PATH = path.join(STORE_DIR, 'roster_objective.json');

// =====================================================
// RÔLES DU ROSTER
// =====================================================

const ROSTER_POLES = [
    {
        name: 'PÔLE CEO',
        roles: [
            { name: 'CEO', id: '1532015045800628244' }
        ]
    },

    {
        name: 'PÔLE DIRECTION',
        roles: [
            { name: 'Directeur(trice) général', id: '1532015039806963763' }
        ]
    },

    {
        name: 'PÔLE ADMINISTRATION',
        roles: [
            { name: 'Responsable administration', id: '1532015034572738721' },
            { name: 'Administrateur', id: '1532015029480853625' }
        ]
    },

    {
        name: 'PÔLE MODÉRATION',
        roles: [
            { name: 'Responsable modération', id: '1532015000426905633' },
            { name: 'Modérateur', id: '1532014997842952202' }
        ]
    },

    {
        name: 'PÔLE TEST MODÉRATEUR',
        roles: [
            { name: 'Test modérateur', id: '1532014992407269386' }
        ]
    },

    {
        name: 'PÔLE FORTNITE',
        roles: [
            { name: 'Directeur(trice) Fortnite', id: '1532014983305498684' },
            { name: 'Manager Esports', id: '1532014980063428730' },
            { name: 'Coach', id: '1532014976687145104' }
        ]
    },

    {
        name: 'PÔLE AUDIOVISUEL',
        roles: [
            { name: 'Monteur', id: '1532014970210881607' },
            { name: 'Graphiste', id: '1532014967728115813' },
            { name: 'Mapper', id: '1532014964909277338' },
            { name: 'Caster', id: '1532014954717380798' },
            { name: 'Mini-maker', id: '1532014962179051590' }
        ]
    },

    {
        name: 'PÔLE WEB TV',
        roles: [
            { name: 'Régisseur(euse)', id: '1532014951709802566' },
            { name: 'Créateur de contenu', id: '1532014948870393887' },
            { name: 'Animateur(trice)', id: '1532014946219458630' }
        ]
    },

    {
        name: 'PÔLE E-SPORT',
        roles: [
            { name: 'E-sport', id: '1532014940569735299' }
        ]
    },

    {
        name: 'PÔLE ACADÉMIQUE',
        roles: [
            { name: 'Académique', id: '1532014932630044873' }
        ]
    },

    {
        name: 'PÔLE FORMATION',
        roles: [
            { name: 'Centre de formation', id: '1532014926623674573' }
        ]
    },

    {
        name: 'PÔLE ESPOIR',
        roles: [
            { name: 'Espoir', id: '1532014920361574594' }
        ]
    }
];

// =====================================================
// GRINDERS — EXCLUS DE L'OBJECTIF
// =====================================================

const GRINDER_ROLE_IDS = [];

// =====================================================
// STOCKAGE
// =====================================================

function ensureStore() {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, { recursive: true });
    }
}

function loadStore() {
    ensureStore();

    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
        }
    } catch (error) {
        console.error('[ROSTER] Erreur de lecture :', error);
    }

    return {};
}

function saveStore(data) {
    ensureStore();

    try {
        fs.writeFileSync(
            STORE_PATH,
            JSON.stringify(data, null, 4),
            'utf8'
        );
    } catch (error) {
        console.error('[ROSTER] Erreur de sauvegarde :', error);
    }
}

// =====================================================
// MEMBRES
// =====================================================

function getRoleMembers(guild, roleId) {
    const role = guild.roles.cache.get(roleId);

    if (!role) return [];

    return [...role.members.values()]
        .sort((a, b) =>
            a.displayName.localeCompare(
                b.displayName,
                'fr',
                { sensitivity: 'base' }
            )
        );
}

function formatMembers(members) {
    if (members.length === 0) {
        return '*Aucune personne actuellement.*';
    }

    return members
        .map(member => `— <@${member.id}>`)
        .join('\n');
}

// =====================================================
// EMBED
// =====================================================

function buildEmbed(guild) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('ROSTER OBJECTIVE')
        .setFooter({
            text: FOOTER_TEXT
        });

    for (const pole of ROSTER_POLES) {
        const uniqueMembers = new Map();

        for (const role of pole.roles) {
            const members = getRoleMembers(guild, role.id);

            for (const member of members) {
                uniqueMembers.set(member.id, member);
            }
        }

        const count = uniqueMembers.size;
        const label = count === 1 ? 'PERSONNE' : 'PERSONNES';

        let content = '';

        for (const role of pole.roles) {
            const members = getRoleMembers(guild, role.id);

            content += `**${role.name}**\n`;
            content += `${formatMembers(members)}\n\n`;
        }

        embed.addFields({
            name: `${pole.name} — ${count} ${label}`,
            value: content.trim(),
            inline: false
        });
    }

    embed.addFields({
        name: 'OUTSIDE OBJECTIVE',
        value:
            '**Grinder 1 to Grinder 5**\n' +
            '*These roles are tracked separately and are not included in the roster objective.*',
        inline: false
    });

    return embed;
}

// =====================================================
// MISE À JOUR
// =====================================================

let updateTimeout = null;
let updateRunning = false;

async function updateRoster(client, guild) {
    if (updateRunning) return;

    updateRunning = true;

    try {
        const channel = await client.channels
            .fetch(ROSTER_CHANNEL_ID)
            .catch(() => null);

        if (!channel || !channel.isTextBased()) {
            console.error('[ROSTER] Salon introuvable ou invalide.');
            return;
        }

        const store = loadStore();
        let message = null;

        if (store.messageId) {
            message = await channel.messages
                .fetch(store.messageId)
                .catch(() => null);
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
                allowedMentions: {
                    parse: [],
                    users: allowedUsers,
                    roles: [],
                    repliedUser: false
                }
            });
        } else {
            message = await channel.send({
                embeds: [embed],
                allowedMentions: {
                    parse: [],
                    users: allowedUsers,
                    roles: [],
                    repliedUser: false
                }
            });

            saveStore({
                messageId: message.id,
                channelId: channel.id
            });
        }

    } catch (error) {
        console.error('[ROSTER] Erreur :', error);
    } finally {
        updateRunning = false;
    }
}

// =====================================================
// DÉLAI DE MISE À JOUR
// =====================================================

function scheduleUpdate(client, guild) {
    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {
        updateTimeout = null;
        updateRoster(client, guild);
    }, 1000);
}

// =====================================================
// INITIALISATION
// =====================================================

module.exports = async function rosterObjective(client) {

    const channel = await client.channels
        .fetch(ROSTER_CHANNEL_ID)
        .catch(() => null);

    if (!channel || !channel.guild) {
        console.error('[ROSTER] Impossible de trouver le serveur.');
        return;
    }

    const guild = channel.guild;

    // Charge les membres pour avoir les rôles à jour
    await guild.members.fetch();

    // Première génération
    await updateRoster(client, guild);

    console.log(`[ROSTER] Système actif sur ${guild.name}.`);

    // Détection des changements de rôles
    client.on(
        Events.GuildMemberUpdate,
        (oldMember, newMember) => {

            const relevantRoles = new Set(
                ROSTER_POLES.flatMap(pole =>
                    pole.roles.map(role => role.id)
                )
            );

            const oldRoles = new Set(oldMember.roles.cache.keys());
            const newRoles = new Set(newMember.roles.cache.keys());

            const changedRoles = new Set([
                ...oldRoles,
                ...newRoles
            ]);

            const affectsRoster = [...changedRoles].some(
                roleId => relevantRoles.has(roleId)
            );

            if (!affectsRoster) return;

            scheduleUpdate(client, newMember.guild);
        }
    );

    // Vérification de sécurité toutes les 30 secondes
    setInterval(async () => {
        try {
            await guild.members.fetch();
            await updateRoster(client, guild);
        } catch (error) {
            console.error('[ROSTER] Vérification :', error);
        }
    }, 30000);
};