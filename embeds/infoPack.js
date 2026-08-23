const { EmbedBuilder } = require('discord.js');

// Liste des IDs des salons concernés
const INFO_CHANNEL_IDS = {
    MAILLOT: '1531797076751552532',
    MAP_1V1: '1531793927311589506',
    CODE_CREATEUR: '1531793931468013718',
    LOI_1901: '1531793913789157448'
};

const LOADING_EMOJI = '<a:loadingicon:1533535386951749683>';
const LOGO_URL = 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320';

// 1. Embed Maillot
const getMaillotEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Maillot Officiel')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer',
        iconURL: LOGO_URL
    });

// 2. Embed Map 1v1
const getMapEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Map 1v1')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer',
        iconURL: LOGO_URL
    });

// 3. Embed Code Créateur
const getCreatorCodeEmbed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Code Créateur')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer',
        iconURL: LOGO_URL
    });

// 4. Embed Loi 1901
const getLoi1901Embed = () => new EmbedBuilder()
    .setColor('#D4AF37')
    .setTitle('Statut Juridique & Structure')
    .setDescription(`# ${LOADING_EMOJI} Projet en préparation...\n\n> Ce projet est actuellement en cours de développement.`)
    .setFooter({
        text: 'HeLoRiA • #RiseSoarConquer',
        iconURL: LOGO_URL
    });

<<<<<<< HEAD
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM
=======
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM (UPSERT)
>>>>>>> temporary-branch
const updateSingleChannelEmbed = async (client, channelId, embedSupplier) => {
    try {
        const channel = await client.channels.fetch(channelId).catch(() => null);
        if (!channel) return console.error(`[INFO EMBEDS] Salon introuvable : ${channelId}`);

        const embed = embedSupplier();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
<<<<<<< HEAD
=======
            const oldEmbed = existingMessage.embeds[0];

            // Annulation de la mise à jour si le contenu est déjà identique
            if (oldEmbed && oldEmbed.title === embed.data.title && oldEmbed.description === embed.data.description) {
                console.log(`ℹ️ Aucun changement détecté pour <#${channelId}>. Message conservé.`);
                return;
            }

>>>>>>> temporary-branch
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