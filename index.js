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

// =====================================================
// GESTION DU STOCKAGE DES IDS DE MESSAGES
// =====================================================

const STORE_PATH = path.join(__dirname, './data/embed_messages.json');

if (!fs.existsSync(path.dirname(STORE_PATH))) {
    fs.mkdirSync(path.dirname(STORE_PATH), { recursive: true });
}

function loadEmbedStore() {
    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('[EMBED STORE] Erreur de lecture :', err);
    }
    return {};
}

function saveEmbedStore(data) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('[EMBED STORE] Erreur d\'écriture :', err);
    }
}

// =====================================================
// GESTION DES ERREURS GLOBALES
// =====================================================

client.on('error', (error) => {
    console.error('[DISCORD API ERROR]', error);
});

process.on('unhandledRejection', (reason) => {
    console.error('[UNHANDLED REJECTION]', reason);
});

process.on('uncaughtException', (error) => {
    console.error('[UNCAUGHT EXCEPTION]', error);
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

            // Envoi du message privé (avec sécurité si les MP du membre sont fermés)
            await newState.member.send(
                'Attention : tu possèdes le rôle **no stream**, tu n\'es donc pas autorisé à lancer un partage d\'écran.'
            ).catch(() => console.log(`[NO STREAM] Impossible d'envoyer un MP à ${newState.member.user.tag}.`));

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

    // CHARGEMENT DES MODULES
    try {
        if (typeof voiceManager === 'function') voiceManager(client);
        if (typeof welcomeManager === 'function') welcomeManager(client);
        if (typeof roleManager === 'function') roleManager(client);
        if (typeof ticketSystem === 'function') ticketSystem(client);
        if (typeof rosterObjective === 'function') rosterObjective(client);
    } catch (err) {
        console.error('[MODULE ERROR] Erreur au chargement des modules :', err);
    }

    // EMBEDS
    await sendOrUpdateEmbeds();

    // STATUT DYNAMIQUE
    let statusIndex = 0;

    setInterval(() => {
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

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