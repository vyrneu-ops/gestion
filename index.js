const { Client, GatewayIntentBits, Partials, ActivityType } = require('discord.js');
const express = require('express');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Message, Partials.Channel, Partials.GuildMember]
});

// Import des modules
const voiceManager = require('./modules/voiceManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');
const welcomeManager = require('./modules/welcomeManager'); // Si présent

const voiceInfo = require('./modules/voiceInfo');
const infoPack = require('./modules/infoPack');
const soutenir = require('./modules/soutenir');
const partenaire = require('./modules/partenaire');
const reglement = require('./modules/reglement');
const presentation = require('./modules/presentation');
const critereEsport = require('./modules/critereEsport');

// =====================================================
// GESTION DU STOCKAGE DES IDs DE MESSAGES
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
        console.error('⚠️ [EMBED STORE] Erreur de lecture :', err);
    }
    return {};
}

function saveEmbedStore(data) {
    try {
        fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 4), 'utf-8');
    } catch (err) {
        console.error('⚠️ [EMBED STORE] Erreur d\'écriture :', err);
    }
}

// =====================================================
// GESTION DES ERREURS GLOBALES
// =====================================================
client.on('error', (error) => console.error('⚠️ [DISCORD API ERROR]', error));
process.on('unhandledRejection', (reason) => console.error('⚠️ [UNHANDLED REJECTION]', reason));
process.on('uncaughtException', (error) => console.error('⚠️ [UNCAUGHT EXCEPTION]', error));

// =====================================================
// FONCTION DE DÉPLOIEMENT/MISE À JOUR DES EMBEDS
// =====================================================
async function sendOrUpdateEmbeds() {
    console.log('\n📥 [EMBEDS] Démarrage du contrôle des messages d\'information...');
    const store = loadEmbedStore();

    const deployEmbed = async (channelId, embedData, key) => {
        try {
            if (!channelId || channelId.includes('ID_SALON') || channelId.includes('TON_ID')) return;

            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) return;

            const embedsToSend = Array.isArray(embedData) ? embedData : [embedData];
            const existingMsgId = store[key];

            if (existingMsgId) {
                const existingMsg = await channel.messages.fetch(existingMsgId).catch(() => null);
                if (existingMsg) {
                    await existingMsg.edit({ embeds: embedsToSend });
                    return;
                }
            }

            const newMsg = await channel.send({ embeds: embedsToSend });
            store[key] = newMsg.id;
            saveEmbedStore(store);

        } catch (err) {
            console.error(`❌ [EMBEDS ERROR] ${key} :`, err.message);
        }
    };

    if (voiceInfo && voiceInfo.VOICE_CHANNEL_IDS) {
        for (let i = 0; i < voiceInfo.VOICE_CHANNEL_IDS.length; i++) {
            await deployEmbed(voiceInfo.VOICE_CHANNEL_IDS[i], voiceInfo.createVoiceEmbed(), `Voice_Info_${i}`);
        }
    }

    if (infoPack && infoPack.INFO_CHANNEL_IDS) {
        await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAILLOT, infoPack.getMaillotEmbed(), 'InfoPack_Maillot');
        await deployEmbed(infoPack.INFO_CHANNEL_IDS.MAP_1V1, infoPack.getMapEmbed(), 'InfoPack_Map1v1');
        await deployEmbed(infoPack.INFO_CHANNEL_IDS.CODE_CREATEUR, infoPack.getCreatorCodeEmbed(), 'InfoPack_CodeCreateur');
        await deployEmbed(infoPack.INFO_CHANNEL_IDS.LOI_1901, infoPack.getLoi1901Embed(), 'InfoPack_Loi1901');
    }

    if (soutenir) await deployEmbed(soutenir.SOUTENIR_CHANNEL_ID, soutenir.createSoutenirEmbed(), 'Soutenir');
    if (partenaire) await deployEmbed(partenaire.PARTENAIRE_CHANNEL_ID, partenaire.createPartenaireEmbed(), 'Partenaire');
    if (reglement) await deployEmbed(reglement.REGLEMENT_CHANNEL_ID, reglement.createReglementEmbeds(), 'Reglement');
    if (presentation) await deployEmbed(presentation.PRESENTATION_CHANNEL_ID, presentation.createPresentationEmbeds(), 'Presentation');
    if (critereEsport) await deployEmbed(critereEsport.CRITERE_CHANNEL_ID, critereEsport.createCritereEmbeds(), 'CritereEsport');

    console.log('✨ [EMBEDS] Vérification et mise à jour terminées.\n');
}

// =====================================================
// INITIALISATION DU BOT
// =====================================================
client.once('ready', async (c) => {
    console.log(`\n==========================================`);
    console.log(`✅ [SYSTEM] Connecté en tant que : ${c.user.tag}`);
    console.log(`==========================================\n`);

    try {
        if (typeof voiceManager === 'function') voiceManager(client);
        if (typeof welcomeManager === 'function') welcomeManager(client);
        if (typeof roleManager === 'function') roleManager(client);
        if (typeof ticketSystem === 'function') ticketSystem(client);
    } catch (err) {
        console.error('❌ [MODULE ERROR] Erreur au chargement des modules :', err);
    }

    await sendOrUpdateEmbeds();

    // Boucle de statut dynamique
    let statusIndex = 0;
    setInterval(async () => {
        const totalMembers = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
        const activities = [
            { name: "CustomStatus", state: `${totalMembers} membres sur le serveur`, type: ActivityType.Custom },
            { name: "CustomStatus", state: `Dev By Logs`, type: ActivityType.Custom }
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
app.get('/', (req, res) => res.send('🚨 Bot Gestion - Actif'));
app.listen(PORT, () => console.log(`🌐 [Bot Gestion] Actif sur le port ${PORT}`));

client.login(process.env.DISCORD_TOKEN);