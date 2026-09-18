const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =====================================================
// CLIENT DISCORD
// =====================================================

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],

    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});

// =====================================================
// IMPORT DES MODULES FONCTIONNELS
// =====================================================

const voiceManager = require('./modules/voiceManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');
const welcomeManager = require('./modules/welcomeManager');
const rosterObjective = require('./modules/rosterObjective');
const statCounter = require('./modules/statCounter');

// =====================================================
// IMPORT DES MODULES D'EMBEDS
// =====================================================

const voiceInfo = require('./embeds/voiceInfo');
const infoPack = require('./embeds/infoPack');
const soutenir = require('./embeds/soutenir');
const partenaire = require('./embeds/partenaire');
const reglement = require('./embeds/reglement');
const presentation = require('./embeds/presentation');
const critereEsport = require('./embeds/critereEsport');

// =====================================================
// GESTION DU STOCKAGE DES IDS DE MESSAGES
// =====================================================

const STORE_PATH = path.join(
    __dirname,
    './data/embed_messages.json'
);

if (!fs.existsSync(path.dirname(STORE_PATH))) {
    fs.mkdirSync(
        path.dirname(STORE_PATH),
        { recursive: true }
    );
}

function loadEmbedStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(
                fs.readFileSync(STORE_PATH, 'utf-8')
            );
        }
    } catch (err) {
        console.error('[EMBED STORE] Erreur de lecture :', err);
    }
    return {};
}

function saveEmbedStore(data) {
    try {
        fs.writeFileSync(
            STORE_PATH,
            JSON.stringify(data, null, 4),
            'utf-8'
        );
    } catch (err) {
        console.error('[EMBED STORE] Erreur d\'écriture :', err);
    }
}

// =====================================================
// GESTION DES ERREURS GLOBALES (ANTI-CRASH)
// =====================================================

client.on('error', (error) => {
    console.error('[DISCORD API ERROR]', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception:', error, 'origin:', origin);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[ANTI-CRASH] Uncaught Exception Monitor:', error, 'origin:', origin);
});

// =====================================================
// FONCTION DE DÉPLOIEMENT / MISE À JOUR DES EMBEDS
// =====================================================

async function sendOrUpdateEmbeds() {
    console.log('\n[EMBEDS] Envoi des embeds désactivé par configuration.');
    return;
}

// =====================================================
// NO STREAM / INTERDICTION DE PARTAGE D'ÉCRAN
// =====================================================

const NO_STREAM_ROLE_ID = '1542878480482443364';

client.on('voiceStateUpdate', async (oldState, newState) => {
    if (!newState.member) return;

    const isStreaming = newState.streaming;
    const wasStreaming = oldState.streaming;

    // Détection uniquement au lancement du partage d'écran
    if (isStreaming && !wasStreaming) {
        const hasNoStreamRole = newState.member.roles.cache.has(NO_STREAM_ROLE_ID);

        if (!hasNoStreamRole) return;

        try {
            // Déconnexion immédiate du salon vocal
            await newState.disconnect();

            // Envoi du MP
            await newState.member.send(
                `Attention : tu possèdes le rôle **no stream**, tu n'es donc pas autorisé à lancer un partage d'écran.`
            ).catch(() => null);

        } catch (err) {
            console.error(`[NO STREAM] Erreur pour ${newState.member.user.tag} :`, err.message);
        }
    }
});

// =====================================================
// INITIALISATION DU BOT
// =====================================================

client.once('ready', async (c) => {

    console.log('\n==========================================');
    console.log(`[SYSTEM] Connecté en tant que : ${c.user.tag}`);
    console.log('==========================================\n');

    // -------------------------------------------------
    // CHARGEMENT DES MODULES
    // -------------------------------------------------

    try {
        if (typeof voiceManager === 'function') {
            voiceManager(client);
            console.log('[MODULES] VoiceManager chargé.');
        }

        if (typeof welcomeManager === 'function') {
            welcomeManager(client);
            console.log('[MODULES] WelcomeManager chargé.');
        }

        if (typeof roleManager === 'function') {
            roleManager(client);
            console.log('[MODULES] RoleManager chargé.');
        }

        if (typeof ticketSystem === 'function') {
            ticketSystem(client);
            console.log('[MODULES] TicketSystem chargé.');
        }

        if (typeof rosterObjective === 'function') {
            rosterObjective(client);
            console.log('[MODULES] RosterObjective chargé.');
        }

        if (typeof statCounter === 'function') {
            statCounter(client);
            console.log('[MODULES] StatCounter chargé.');
        }

    } catch (err) {
        console.error('[MODULE ERROR] Erreur au chargement des modules :', err);
    }

    // -------------------------------------------------
    // EMBEDS
    // -------------------------------------------------

    await sendOrUpdateEmbeds();

    // -------------------------------------------------
    // STATUT DYNAMIQUE
    // -------------------------------------------------

    let statusIndex = 0;

    setInterval(() => {
        const totalMembers = client.guilds.cache.reduce(
            (acc, guild) => acc + guild.memberCount,
            0
        );

        const activities = [
            {
                name: 'CustomStatus',
                state: `${totalMembers} membres sur le serveur`,
                type: ActivityType.Custom
            },
            {
                name: 'CustomStatus',
                state: 'Dev By Logs',
                type: ActivityType.Custom
            }
        ];

        client.user.setPresence({
            activities: [activities[statusIndex]],
            status: 'idle'
        });

        statusIndex = (statusIndex + 1) % activities.length;

    }, 15000);

});

// =====================================================
// SERVEUR WEB EXPRESS
// =====================================================

const app = express();
const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
    res.send('Bot Gestion HeLoRiA — Actif');
});

app.listen(PORT, () => {
    console.log(`[WEB] Bot Gestion actif sur le port ${PORT}`);
});

// =====================================================
// CONNEXION DISCORD
// =====================================================

client.login(process.env.TOKEN || process.env.DISCORD_TOKEN);