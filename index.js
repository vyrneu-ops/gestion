const { Client, GatewayIntentBits, Partials, ActivityType, PermissionFlagsBits } = require('discord.js');
const express = require('express');
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

// Import des modules de gestion
const voiceManager = require('./modules/voiceManager');
const roleManager = require('./modules/roleManager');
const ticketSystem = require('./modules/ticketSystem');
const { handleModMail, handleStaffCommands } = require('./modules/modMail');

client.once('ready', (c) => {
    console.log(`\n🚨 [BOT GESTION] Mode Maintenance Activé sous : ${c.user.tag}`);

    // Statut permanent SERVEUR EN PANNE
    client.user.setPresence({
        status: 'dnd',
        activities: [{
            name: '🚨 SERVEUR EN PANNE | Gestion Indisponible',
            type: ActivityType.Custom
        }]
    });
});

// Blocage des vocaux
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (newState.channelId) {
        const member = newState.member;
        if (member.user.bot || member.permissions.has(PermissionFlagsBits.Administrator)) return;

        await newState.disconnect().catch(() => {});
        await member.send("🚨 **MAINTENANCE EN COURS** : Les salons vocaux sont temporairement fermés.").catch(() => {});
    }
});

// Blocage des tickets / boutons
client.on('interactionCreate', async (interaction) => {
    if (interaction.isButton() || interaction.isStringSelectMenu()) {
        return interaction.reply({
            content: "🚨 **SERVEUR EN PANNE** : Les tickets et fonctionnalités de gestion sont indisponibles durant la maintenance.",
            ephemeral: true
        });
    }
});

// Blocage du ModMail / Messages privés
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    if (!message.guild) {
        return message.reply("🚨 **SERVEUR EN PANNE** : Le support par ModMail est désactivé durant la maintenance.");
    }
});

// Serveur Web Express
const app = express();
const PORT = process.env.PORT || 3002;
app.get('/', (req, res) => res.send('🚨 Bot Gestion - Maintenance'));
app.listen(PORT, () => console.log(`🌐 [Bot Gestion] Actif sur le port ${PORT}`));

process.on('unhandledRejection', err => console.error('⚠️ Rejet non géré :', err));
process.on('uncaughtException', err => console.error('⚠️ Exception non capturée :', err));

client.login(process.env.DISCORD_TOKEN);
