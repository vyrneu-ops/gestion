const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// --- Gestion globale des erreurs (anti-crash) ---

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH] Rejet de promesse non géré :', promise, 'Raison :', reason);
});

process.on('uncaughtException', (error, origin) => {
    console.error('[ANTI-CRASH] Exception non capturée :', error, 'Origine :', origin);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[ANTI-CRASH] Surveillance d\'exception non capturée :', error, 'Origine :', origin);
});

// --- Client Discord ---

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildPresences, // nécessaire pour la détection de jeu dans voiceManager
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [
        Partials.Message,
        Partials.Channel,
        Partials.GuildMember
    ]
});

client.on('error', (error) => {
    console.error('[DISCORD API] Erreur réseau/API Discord :', error.message || error);
});

client.on('warn', (info) => {
    console.warn('[DISCORD API]', info);
});

// --- Modules fonctionnels ---
// NB : ces fichiers doivent porter exactement ces noms dans ./modules/

const voiceManager = require('./modules/voiceManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');
const welcomeManager = require('./modules/welcomeManager');
const rosterObjective = require('./modules/rosterObjective');
const statCounter = require('./modules/statCounter');

// --- Modules d'embeds (réservés, non branchés pour l'instant) ---

const voiceInfo = require('./embeds/voiceInfo');
const infoPack = require('./embeds/infoPack');
const soutenir = require('./embeds/soutenir');
const partenaire = require('./embeds/partenaire');
const reglement = require('./embeds/reglement');
const presentation = require('./embeds/presentation');
const critereEsport = require('./embeds/critereEsport');

// --- Stockage des IDs de messages d'embeds ---

const STORE_PATH = path.join(__dirname, './data/embed_messages.json');

function ensureStoreDirectory() {
    try {
        const dir = path.dirname(STORE_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    } catch (err) {
        console.error('[EMBED STORE] Impossible de créer le dossier de stockage :', err.message);
    }
}

function loadEmbedStore() {
    ensureStoreDirectory();
    try {
        if (fs.existsSync(STORE_PATH)) return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
    } catch (err) {
        console.error('[EMBED STORE] Erreur lors de la lecture du magasin d\'embeds :', err.message);
    }
    return {};
}

function saveEmbedStore(data) {
    ensureStoreDirectory();
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('[EMBED STORE] Erreur lors de l\'écriture du magasin d\'embeds :', err.message);
    }
}

// Désactivé pour le moment : les modules d'embeds ci-dessus ne sont pas encore
// branchés ici. À implémenter une fois leur contenu fourni.
async function sendOrUpdateEmbeds() {
    console.log('[EMBEDS] Envoi des embeds désactivé par configuration.');
}

// --- Interdiction de partage d'écran pour certains rôles ---

const NO_STREAM_ROLE_ID = '1542878480482443364';

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (!newState.member) return;

        const isStreaming = newState.streaming;
        const wasStreaming = oldState.streaming;
        if (!isStreaming || wasStreaming) return;

        const hasNoStreamRole = newState.member.roles.cache.has(NO_STREAM_ROLE_ID);
        if (!hasNoStreamRole) return;

        await newState.disconnect().catch(err =>
            console.error(`[NO STREAM] Impossible de déconnecter ${newState.member.user.tag} :`, err.message)
        );

        await newState.member.send(
            `Attention : tu possèdes le rôle **no stream**, tu n'es donc pas autorisé à lancer un partage d'écran sur le serveur.`
        ).catch(() => {});

        console.log(`[NO STREAM] Partage d'écran interrompu pour ${newState.member.user.tag}.`);
    } catch (err) {
        console.error('[NO STREAM] Erreur lors du traitement du changement d\'état vocal :', err.message);
    }
});

// --- Initialisation du bot ---

client.once('ready', async (c) => {
    console.log(`[SYSTEM] Bot connecté en tant que : ${c.user.tag}`);

    const modules = [
        { name: 'VoiceManager', fn: voiceManager },
        { name: 'WelcomeManager', fn: welcomeManager },
        { name: 'RoleManager', fn: roleManager },
        { name: 'TicketSystem', fn: ticketSystem },
        { name: 'RosterObjective', fn: rosterObjective },
        { name: 'StatCounter', fn: statCounter }
    ];

    // Chargement en parallèle : un module lent à s'initialiser ne bloque plus les autres.
    const results = await Promise.allSettled(modules.map(async (mod) => {
        if (typeof mod.fn !== 'function') {
            console.warn(`[MODULES] Le module ${mod.name} n'exporte pas une fonction valide.`);
            return;
        }
        await mod.fn(client);
        console.log(`[MODULES] Module chargé avec succès : ${mod.name}`);
    }));

    results.forEach((result, i) => {
        if (result.status === 'rejected') {
            console.error(`[MODULES] Erreur lors de l'initialisation du module ${modules[i].name} :`, result.reason);
        }
    });

    await sendOrUpdateEmbeds().catch(err => console.error('[EMBEDS] Erreur lors de la mise à jour :', err));

    // --- Statut dynamique du bot ---

    let statusIndex = 0;

    setInterval(() => {
        try {
            const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);

            const activities = [
                { name: 'CustomStatus', state: `${totalMembers} membres sur le serveur`, type: ActivityType.Custom },
                { name: 'CustomStatus', state: 'Dev By Logs', type: ActivityType.Custom }
            ];

            client.user.setPresence({
                activities: [activities[statusIndex]],
                status: 'online'
            });

            statusIndex = (statusIndex + 1) % activities.length;
        } catch (err) {
            console.error('[PRESENCE] Erreur lors de la mise à jour du statut :', err.message);
        }
    }, 15000);
});

// --- Serveur web Express ---

const app = express();
const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
    res.send('Bot Gestion HeLoRiA — Opérationnel');
});

const server = app.listen(PORT, () => {
    console.log(`[WEB] Serveur d'écoute actif sur le port ${PORT}`);
});

// --- Arrêt propre (redéploiement, Ctrl+C, etc.) ---

let shuttingDown = false;

async function shutdown(signal) {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`[SYSTEM] Signal ${signal} reçu, arrêt en cours...`);

    const forceExit = setTimeout(() => {
        console.warn('[SYSTEM] Arrêt propre trop long, arrêt forcé.');
        process.exit(1);
    }, 5000);
    forceExit.unref();

    try {
        client.destroy();
    } catch (err) {
        console.error('[SYSTEM] Erreur lors de la fermeture du client Discord :', err);
    }

    server.close(() => {
        console.log('[SYSTEM] Serveur web fermé.');
        process.exit(0);
    });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// --- Connexion Discord ---

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[SYSTEM] ERREUR : Aucun jeton Discord (TOKEN / DISCORD_TOKEN) n\'a été configuré dans l\'environnement.');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('[SYSTEM] Échec critique lors de la connexion à Discord :', err.message);
    process.exit(1);
});