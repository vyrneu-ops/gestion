const { EmbedBuilder } = require('discord.js');

// Listes des IDs des salons concernés
const INFO_CHANNEL_IDS = {
    MAILLOT: '1531797076751552532',
    MAP_1V1: '1531793927311589506',
    CODE_CREATEUR: '1531793931468013718',
    LOI_1901: '1531793913789157448'
};

const LOADING_EMOJI = '<a:loadingicon:1533535386951749683>';

// 1. Embed Maillot
const getMaillotEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Maillot Officiel')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer'
    });

// 2. Embed Map 1v1
const getMapEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Map 1v1')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer'
    });

// 3. Embed Code Créateur
const getCreatorCodeEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Code Créateur')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer'
    });

// 4. Embed Loi 1901
const getLoi1901Embed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Statut Juridique & Structure')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer'
    });

// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM
const updateSingleChannelEmbed = async (client, channelId, embedSupplier) => {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return console.error(`[INFO EMBEDS] Salon introuvable : ${channelId}`);

        const embed = embedSupplier();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
            await existingMessage.edit({ embeds: [embed] });
            console.log(`✅ Message mis à jour dans <#${channelId}>`);
        } else {
            await channel.send({ embeds: [embed] });
            console.log(`✅ Message créé dans <#${channelId}>`);
        }
    } catch (error) {
        console.error(`❌ Erreur sur le salon ${channelId} :`, error);
    }
};

const deployOrUpdateInfoEmbeds = async (client) => {
    await updateSingleChannelEmbed(client, INFO_CHANNEL_IDS.MAILLOT, getMaillotEmbed);
    await updateSingleChannelEmbed(client, INFO_CHANNEL_IDS.MAP_1V1, getMapEmbed);
    await updateSingleChannelEmbed(client, INFO_CHANNEL_IDS.CODE_CREATEUR, getCreatorCodeEmbed);
    await updateSingleChannelEmbed(client, INFO_CHANNEL_IDS.LOI_1901, getLoi1901Embed);
};

module.exports = {
    INFO_CHANNEL_IDS,
    getMaillotEmbed,
    getMapEmbed,
    getCreatorCodeEmbed,
    getLoi1901Embed,
    deployOrUpdateInfoEmbeds
};