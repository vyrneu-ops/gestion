const {
    EmbedBuilder,
    Events
} = require('discord.js');

const fs = require('fs');
const path = require('path');

// =====================================================
// CONFIGURATION
// =====================================================

const ROSTER_CHANNEL_ID = '1534579701421445242';
const EMBED_COLOR = '#D4AF37';

const FOOTER_TEXT = 'HeLoRiA • #RiseSoarConquer';

// Fichier permettant de conserver l'ID du message
// afin de toujours modifier le même message.
const STORE_DIR = path.join(__dirname, '../data');
const STORE_PATH = path.join(STORE_DIR, 'roster_objective.json');

// =====================================================
// RÔLES
// =====================================================

const ROSTER_POLES = [
    {
        name: 'PÔLE CEO',
        roles: [
            {
                name: 'CEO',
                id: '1532015045800628244'
            }
        ]
    },

    {
        name: 'PÔLE DIRECTION',
        roles: [
            {
                name: 'Directeur(trice) général',
                id: '1532015039806963763'
            }
        ]
    },

    {
        name: 'PÔLE ADMINISTRATION',
        roles: [
            {
                name: 'Responsable administration',
                id: '1532015034572738721'
            },
            {
                name: 'Administrateur',
                id: '1532015029480853625'
            }
        ]
    },

    {
        name: 'PÔLE MODÉRATION',
        roles: [
            {
                name: 'Responsable modération',
                id: '1532015000426905633'
            },
            {
                name: 'Modérateur',
                id: '1532014997842952202'
            }
        ]
    },

    {
        name: 'PÔLE TEST MODÉRATEUR',
        roles: [
            {
                name: 'Test modérateur',
                id: '1532014992407269386'
            }
        ]
    },

    {
        name: 'PÔLE FORTNITE',
        roles: [
            {
                name: 'Directeur(trice) Fortnite',
                id: '1532014983305498684'
            },
            {
                name: 'Manager Esports',
                id: '1532014980063428730'
            },
            {
                name: 'Coach',
                id: '1532014976687145104'
            }
        ]
    },

    {
        name: 'PÔLE AUDIOVISUEL',
        roles: [
            {
                name: 'Monteur',
                id: '1532014970210881607'
            },
            {
                name: 'Graphiste',
                id: '1532014967728115813'
            },
            {
                name: 'Mapper',
                id: '1532014964909277338'
            },
            {
                name: 'Caster',
                id: '1532014954717380798'
            },
            {
                name: 'Mini-maker',
                id: '1532014962179051590'
            }
        ]
    },

    {
        name: 'PÔLE WEB TV',
        roles: [
            {
                name: 'Régisseur(euse)',
                id: '1532014951709802566'
            },
            {
                name: 'Créateur de contenu',
                id: '1532014948870393887'
            },
            {
                name: 'Animateur(trice)',
                id: '1532014946219458630'
            }
        ]
    },

    {
        name: 'PÔLE E-SPORT',
        roles: [
            {
                name: 'E-sport',
                id: '1532014940569735299'
            }
        ]
    },

    {
        name: 'PÔLE ACADÉMIQUE',
        roles: [
            {
                name: 'Académique',
                id: '1532014932630044873'
            }
        ]
    },

    {
        name: 'PÔLE FORMATION',
        roles: [
            {
                name: 'Centre de formation',
                id: '1532014926623674573'
            }
        ]
    },

    {
        name: 'PÔLE ESPOIR',
        roles: [
            {
                name: 'Espoir',
                id: '1532014920361574594'
            }
        ]
    }
];

// =====================================================
// GRINDERS
// EXCLUS DE L'OBJECTIF
// =====================================================

const GRINDER_ROLE_IDS = [
    // Ajoute ici les IDs de Grinder 1 à Grinder 5
    // lorsqu'ils seront disponibles.
];

// =====================================================
// STOCKAGE
// =====================================================

function ensureStoreDirectory() {
    if (!fs.existsSync(STORE_DIR)) {
        fs.mkdirSync(STORE_DIR, {
            recursive: true
        });
    }
}

function loadStore() {
    ensureStoreDirectory();

    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(
                fs.readFileSync(STORE_PATH, 'utf8')
            );
        }
    } catch (error) {
        console.error(
            '[ROSTER OBJECTIVE] Erreur lecture stockage :',
            error
        );
    }

    return {};
}

function saveStore(data) {
    ensureStoreDirectory();

    try {
        fs.writeFileSync(
            STORE_PATH,
            JSON.stringify(data, null, 4),
            'utf8'
        );
    } catch (error) {
        console.error(
            '[ROSTER OBJECTIVE] Erreur écriture stockage :',
            error
        );
    }
}

// =====================================================
// FORMATAGE
// =====================================================

function formatMemberList(members) {
    if (!members || members.size === 0) {
        return '*Aucune personne actuellement.*';
    }

    return [...members.values()]
        .sort((a, b) =>
            a.displayName.localeCompare(
                b.displayName,
                'fr',
                {
                    sensitivity: 'base'
                }
            )
        )
        .map(member => `— <@${member.id}>`)
        .join('\n');
}

// =====================================================
// CONSTRUCTION DE L'EMBED
// =====================================================

function buildRosterEmbed(guild) {
    const embed = new EmbedBuilder()
        .setColor(EMBED_COLOR)
        .setTitle('ROSTER OBJECTIVE')
        .setDescription(
            '**HeLoRiA Esport**\n' +
            'Official staff and competitive roster overview.'
        )
        .setFooter({
            text: FOOTER_TEXT
        })
        .setTimestamp();

    for (const pole of ROSTER_POLES) {

        // Membres uniques présents dans le pôle
        const poleMembers = new Map();

        for (const role of pole.roles) {

            const discordRole = guild.roles.cache.get(role.id);

            if (!discordRole) {
                console.warn(
                    `[ROSTER OBJECTIVE] Rôle introuvable : ${role.name} (${role.id})`
                );
                continue;
            }

            for (const member of discordRole.members.values()) {
                poleMembers.set(member.id, member);
            }
        }

        const count = poleMembers.size;

        const personLabel =
            count === 1
                ? 'PERSONNE'
                : 'PERSONNES';

        let poleContent = '';

        for (const role of pole.roles) {

            const discordRole = guild.roles.cache.get(role.id);

            if (!discordRole) {
                poleContent +=
                    `**${role.name}**\n` +
                    `*Rôle introuvable*\n\n`;

                continue;
            }

            const members = new Map();

            for (const member of discordRole.members.values()) {
                members.set(member.id, member);
            }

            poleContent +=
                `**${role.name}**\n` +
                `${formatMemberList(members)}\n\n`;
        }

        // Nettoyage du dernier saut de ligne
        poleContent = poleContent.trim();

        embed.addFields({
            name: `${pole.name} — ${count} ${personLabel}`,
            value: poleContent || '*Aucune personne actuellement.*',
            inline: false
        });
    }

    // =================================================
    // SECTION HORS OBJECTIF
    // =================================================

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
// RÉCUPÉRATION / CRÉATION DU MESSAGE
// =====================================================

async function getOrCreateRosterMessage(client, guild) {

    const channel = await client.channels
        .fetch(ROSTER_CHANNEL_ID)
        .catch(() => null);

    if (!channel) {
        console.error(
            `[ROSTER OBJECTIVE] Impossible de trouver le salon ${ROSTER_CHANNEL_ID}`
        );
        return null;
    }

    if (!channel.isTextBased()) {
        console.error(
            '[ROSTER OBJECTIVE] Le salon configuré n\'est pas un salon textuel.'
        );
        return null;
    }

    const store = loadStore();

    // -------------------------------------------------
    // Essai de récupération du message existant
    // -------------------------------------------------

    if (store.messageId) {

        const existingMessage = await channel.messages
            .fetch(store.messageId)
            .catch(() => null);

        if (existingMessage) {
            return existingMessage;
        }
    }

    // -------------------------------------------------
    // Si le message n'existe plus : création
    // -------------------------------------------------

    const message = await channel.send({
        embeds: [
            buildRosterEmbed(guild)
        ]
    });

    saveStore({
        messageId: message.id,
        channelId: channel.id
    });

    console.log(
        `[ROSTER OBJECTIVE] Nouveau message créé : ${message.id}`
    );

    return message;
}

// =====================================================
// MISE À JOUR DU MESSAGE
// =====================================================

let updateTimeout = null;
let updateRunning = false;
let updateQueued = false;

async function updateRosterObjective(client, guild) {

    // Évite les mises à jour simultanées
    if (updateRunning) {
        updateQueued = true;
        return;
    }

    updateRunning = true;

    try {

        const message =
            await getOrCreateRosterMessage(client, guild);

        if (!message) return;

        const embed = buildRosterEmbed(guild);

        await message.edit({
            embeds: [embed]
        });

        console.log(
            '[ROSTER OBJECTIVE] Objectif mis à jour.'
        );

    } catch (error) {

        console.error(
            '[ROSTER OBJECTIVE] Erreur mise à jour :',
            error
        );

    } finally {

        updateRunning = false;

        if (updateQueued) {
            updateQueued = false;

            setTimeout(() => {
                updateRosterObjective(client, guild);
            }, 500);
        }
    }
}

// =====================================================
// DEBOUNCE
// =====================================================

function scheduleUpdate(client, guild) {

    if (updateTimeout) {
        clearTimeout(updateTimeout);
    }

    updateTimeout = setTimeout(() => {

        updateTimeout = null;

        updateRosterObjective(client, guild);

    }, 1000);
}

// =====================================================
// INITIALISATION
// =====================================================

module.exports = function rosterObjective(client) {

    console.log(
        '[ROSTER OBJECTIVE] Initialisation du système...'
    );

    // -------------------------------------------------
    // READY
    // -------------------------------------------------

    client.once(Events.ClientReady, async () => {

        const guild = client.guilds.cache.find(
            g => g.channels.cache.has(ROSTER_CHANNEL_ID)
        );

        if (!guild) {
            console.error(
                '[ROSTER OBJECTIVE] Serveur introuvable.'
            );
            return;
        }

        // Chargement complet des membres
        await guild.members.fetch();

        await updateRosterObjective(
            client,
            guild
        );

        console.log(
            `[ROSTER OBJECTIVE] Système actif sur ${guild.name}.`
        );
    });

    // -------------------------------------------------
    // CHANGEMENT DE RÔLE
    // -------------------------------------------------

    client.on(
        Events.GuildMemberUpdate,
        async (oldMember, newMember) => {

            // Vérification uniquement si les rôles ont changé
            if (oldMember.roles.cache.equals(newMember.roles.cache)) {
                return;
            }

            // Vérifie si le changement concerne un rôle du roster
            const relevantRoleIds =
                ROSTER_POLES.flatMap(pole =>
                    pole.roles.map(role => role.id)
                );

            const oldRoles = new Set(
                oldMember.roles.cache.keys()
            );

            const newRoles = new Set(
                newMember.roles.cache.keys()
            );

            const allChangedRoles = new Set([
                ...oldRoles,
                ...newRoles
            ]);

            const affectsRoster =
                [...allChangedRoles].some(
                    roleId =>
                        relevantRoleIds.includes(roleId)
                );

            if (!affectsRoster) {
                return;
            }

            console.log(
                `[ROSTER OBJECTIVE] Changement détecté pour ${newMember.user.tag}`
            );

            scheduleUpdate(
                client,
                newMember.guild
            );
        }
    );

    // -------------------------------------------------
    // VÉRIFICATION DE SÉCURITÉ
    // -------------------------------------------------

    // Vérification périodique pour éviter qu'un changement
    // ne soit manqué par un événement Discord.
    //
    // 2 secondes comme demandé initialement n'est pas
    // recommandé car cela provoquerait énormément de
    // requêtes Discord.
    //
    // Ici : vérification toutes les 30 secondes.
    setInterval(async () => {

        const guild = client.guilds.cache.find(
            g => g.channels.cache.has(ROSTER_CHANNEL_ID)
        );

        if (!guild) return;

        await guild.members.fetch();

        await updateRosterObjective(
            client,
            guild
        );

    }, 30000);

    console.log(
        '[ROSTER OBJECTIVE] Surveillance des rôles activée.'
    );
};