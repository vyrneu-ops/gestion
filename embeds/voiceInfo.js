const { EmbedBuilder } = require('discord.js');

// Liste des IDs des salons d'accompagnement vocal
const VOICE_CHANNEL_IDS = [
    '1536344274638209084',
    '1536344319877849108',
    '1536344337359577178',
    '1536344371027517469',
    '1533586742668689519'
];

// Emojis personnalisés
const EMOJIS = {
    WARNING: '<:warningd:1533535400176386068>',
    UPDATE: '<:update:1533535384674369777>',
    LOCK: '<a:lockicon:1533535370787033198>'
};

const createVoiceEmbed = () => {
    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.LOCK} Fermeture de ce salon textuel`)
        .setDescription(
            `> **Ce salon est actuellement verrouillé à l'écriture.**\n\n` +

            `L'équipe de modération concentre ses interventions sur les salons textuels principaux afin de garantir un espace d'échange fluide et sécurisé. Ne pouvant assurer une surveillance continuous sur l'ensemble des salons d'accompagnement vocal, la rédaction y a été temporairement suspendue.\n\n` +

            `**${EMOJIS.WARNING} Pourquoi cette mesure ?**\n` +
            `› *Prévention des débordements :* Cet espace faisait trop souvent l'objet de messages inappropriés, de propos haineux ou de règlements de comptes hors cadre.\n` +
            `› *Partage d'identifiants :* L'envoi répétitif de pseudos en jeu encombrait inutilement ce canal.\n\n` +

            `**${EMOJIS.UPDATE} Comment procéder désormais ?**\n` +
            `› Pour partager vos pseudos (Epic Games, Discord, etc.), privilégiez le salon de discussion général ou utilisez le partage d'écran directement dans votre salon vocal.\n` +
            `› Si l'équipe de direction décide de rouvrir cet accès à l'avenir, une annonce sera publiée pour vous en informer.\n\n` +

            `*Nous vous remercions pour votre compréhension et votre collaboration.*`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });
};

<<<<<<< HEAD
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR MULTI-SALONS SANS SPAM
=======
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR MULTI-SALONS (UPSERT)
>>>>>>> temporary-branch
const deployOrUpdateVoiceEmbeds = async (client) => {
    for (const channelId of VOICE_CHANNEL_IDS) {
        try {
            const channel = await client.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                console.error(`[VOICE EMBED] Salon introuvable : ${channelId}`);
                continue;
            }

            const embed = createVoiceEmbed();
            const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
            const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

            if (existingMessage) {
<<<<<<< HEAD
=======
                const oldEmbed = existingMessage.embeds[0];
                
                // Vérification si le contenu a changé avant d'éditer
                if (oldEmbed && oldEmbed.title === embed.data.title && oldEmbed.description === embed.data.description) {
                    console.log(`ℹ️ Aucun changement détecté pour le salon <#${channelId}>. Message conservé.`);
                    continue;
                }

>>>>>>> temporary-branch
                await existingMessage.edit({ embeds: [embed] });
                console.log(`✅ Message mis à jour dans le salon vocal <#${channelId}>`);
            } else {
                await channel.send({ embeds: [embed] });
                console.log(`✅ Nouveau message envoyé dans le salon vocal <#${channelId}>`);
            }
        } catch (error) {
            console.error(`❌ Erreur lors de la mise à jour sur le salon vocal ${channelId} :`, error);
        }
    }
};

module.exports = { 
    createVoiceEmbed,
    deployOrUpdateVoiceEmbeds,
    VOICE_CHANNEL_IDS 
};