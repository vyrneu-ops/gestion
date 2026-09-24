const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// =====================================================
// GESTION GLOBALE DES ERREURS (ANTI-CRASH PRINCIPAL)
// =====================================================

process.on('unhandledRejection', (reason, promise) => {
    console.error('[ANTI-CRASH LOG] Rejet de promesse non géré :', promise, 'Raison :', reason);
});

process.on('uncaughtException', (error, origin) => {
    console.error('[ANTI-CRASH LOG] Exception non capturée :', error, 'Origine :', origin);
});

process.on('uncaughtExceptionMonitor', (error, origin) => {
    console.error('[ANTI-CRASH LOG] Surveillance d\'exception non capturée :', error, 'Origine :', origin);
});

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

client.on('error', (error) => {
    console.error('[DISCORD API LOG] Erreur réseau/API Discord :', error.message || error);
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
// IMPORT DES MODULES D'EMBEDS (RESERVED)
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

const STORE_PATH = path.join(__dirname, './data/embed_messages.json');

function ensureStoreDirectory() {
    try {
        const dir = path.dirname(STORE_PATH);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    } catch (err) {
        console.error('[EMBED STORE LOG] Impossible de créer le dossier de stockage :', err.message);
    }
}

function loadEmbedStore() {
    ensureStoreDirectory();
    try {
        if (fs.existsSync(STORE_PATH)) {
            return JSON.parse(fs.readFileSync(STORE_PATH, 'utf-8'));
        }
    } catch (err) {
        console.error('[EMBED STORE LOG] Erreur lors de la lecture du magasin d\'embeds :', err.message);
    }
    return {};
}

function saveEmbedStore(data) {
    ensureStoreDirectory();
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('[EMBED STORE LOG] Erreur lors de l\'écriture du magasin d\'embeds :', err.message);
    }
}

// =====================================================
// DÉPLOIEMENT / MISE À JOUR DES EMBEDS
// =====================================================

async function sendOrUpdateEmbeds() {
    console.log('[EMBEDS LOG] Envoi des embeds désactivé par configuration.');
    return;
}

// =====================================================
// NO STREAM / INTERDICTION DE PARTAGE D'ÉCRAN
// =====================================================

const NO_STREAM_ROLE_ID = '1542878480482443364';

client.on('voiceStateUpdate', async (oldState, newState) => {
    try {
        if (!newState.member) return;

        const isStreaming = newState.streaming;
        const wasStreaming = oldState.streaming;

        if (isStreaming && !wasStreaming) {
            const hasNoStreamRole = newState.member.roles.cache.has(NO_STREAM_ROLE_ID);
            if (!hasNoStreamRole) return;

            // Déconnexion du salon vocal
            await newState.disconnect().catch(err => 
                console.error(`[NO STREAM LOG] Impossible de déconnecter ${newState.member.user.tag} :`, err.message)
            );

            // Avertissement en MP
            await newState.member.send(
                `Attention : tu possèdes le rôle **no stream**, tu n'es donc pas autorisé à lancer un partage d'écran sur le serveur.`
            ).catch(() => {});

            console.log(`[NO STREAM LOG] Partage d'écran interrompu pour ${newState.member.user.tag}.`);
        }
    } catch (err) {
        console.error('[NO STREAM LOG] Erreur lors du traitement du changement d\'état vocal :', err.message);
    }
});

// =====================================================
// INITIALISATION DU BOT
// =====================================================

client.once('ready', async (c) => {
    console.log('\n==========================================');
    console.log(`[SYSTEM LOG] Bot connecté en tant que : ${c.user.tag}`);
    console.log('==========================================\n');

    // -------------------------------------------------
    // CHARGEMENT STRUCTURÉ DES MODULES
    // -------------------------------------------------

    const modules = [
        { name: 'VoiceManager', fn: voiceManager },
        { name: 'WelcomeManager', fn: welcomeManager },
        { name: 'RoleManager', fn: roleManager },
        { name: 'TicketSystem', fn: ticketSystem },
        { name: 'RosterObjective', fn: rosterObjective },
        { name: 'StatCounter', fn: statCounter }
    ];

    for (const mod of modules) {
        try {
            if (typeof mod.fn === 'function') {
                await mod.fn(client);
                console.log(`[MODULES LOG] Module chargé avec succès : ${mod.name}`);
            } else {
                console.warn(`[MODULES LOG] Le module ${mod.name} n'exporte pas une fonction valide.`);
            }
        } catch (err) {
            console.error(`[MODULES LOG] Erreur lors de l'initialisation du module ${mod.name} :`, err);
        }
    }

    // Déploiement des embeds de présentation si activés
    await sendOrUpdateEmbeds().catch(err => console.error('[EMBEDS LOG] Erreur lors de la mise à jour :', err));

    // -------------------------------------------------
    // STATUT DYNAMIQUE DU BOT
    // -------------------------------------------------

    let statusIndex = 0;

    setInterval(() => {
        try {
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
        } catch (err) {
            console.error('[PRESENCE LOG] Erreur lors de la mise à jour du statut :', err.message);
        }
    }, 15000);
});

// =====================================================
// SERVEUR WEB EXPRESS
// =====================================================

const app = express();
const PORT = process.env.PORT || 3002;

app.get('/', (req, res) => {
    res.send('Bot Gestion HeLoRiA — Operationnel');
});

app.listen(PORT, () => {
    console.log(`[WEB LOG] Serveur d'écoute actif sur le port ${PORT}`);
});

// =====================================================
// CONNEXION DISCORD
// =====================================================

const token = process.env.TOKEN || process.env.DISCORD_TOKEN;

if (!token) {
    console.error('[SYSTEM LOG] ERREUR : Aucun jeton Discord (TOKEN / DISCORD_TOKEN) n\'a été configuré dans l\'environnement.');
    process.exit(1);
}

client.login(token).catch(err => {
    console.error('[SYSTEM LOG] Échec critique lors de la connexion à Discord :', err.message);
});