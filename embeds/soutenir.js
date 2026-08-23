const { EmbedBuilder } = require('discord.js');

// 📌 ID du salon "Nous Soutenir"
const SOUTENIR_CHANNEL_ID = '1531793922030964860';

// Emojis personnalisés
const EMOJIS = {
    DIAMANT: '<:5647premiumicon:1533535330538360942>',
    MONEY: '<:63043moneyspread:1537577805829636117>',
    HANDSHAKE: '<:600404handshake:1537578056447828058>',
    PAYPAL: '<:1716_PAYPAL:1537578291593093240>'
};

const createSoutenirEmbed = () => {
    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('Soutenir l\'ascension de HeLoRiA')
        .setDescription(
            `L'édification d'une structure esport de haut rang exige une rigueur organisationnelle et des ressources conséquentes. Aujourd'hui, **HeLoRiA** franchit une nouvelle étape de son développement. Nous vous offrons l'opportunité de devenir acteurs de cette expansion en soutenant directement nos ambitions compétitives.\n\n` +

            `### ${EMOJIS.DIAMANT} **L'optimisation de nos ressources**\n` +
            `Chaque contribution est intégralement réallouée au développement de l'écosystème **HeLoRiA** afin de :\n\n` +
            `• **Professionnaliser l'encadrement** de nos effectifs pour garantir des performances optimales sur la scène nationale.\n` +
            `• **Sécuriser l'accès aux circuits compétitifs** majeurs et financer les engagements en tournois de haut niveau.\n` +
            `• **Déployer des infrastructures événementielles** propriétaires (cashprizes, tournois, bootcamps).\n` +
            `• **Subventionner la création de contenus** audiovisuels et graphiques pour accroître le rayonnement de la structure.\n\n` +

            `### ${EMOJIS.HANDSHAKE} **Comment participer à notre essor ?**\n` +
            `Si vous partagez notre vision de l'excellence et souhaitez investir dans l'avenir de nos talents, vous pouvez effectuer une contribution sécurisée via notre portail officiel :\n\n` +
            `**${EMOJIS.PAYPAL} Plateforme de contribution sécurisée :**\n` +
            `**[Faire un don via PayPal.me](https://paypal.me/TeamHeLoRiA)**\n\n` +

            `*Chaque soutien, quel que soit son montant, constitue un levier stratégique majeur pour notre progression. Nous remercions les membres qui, par leur générosité, pérennisent ce projet et participent à son succès.*`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });
};

// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM (UPSERT)
const deployOrUpdateSoutenirEmbed = async (client) => {
    try {
        const channel = await client.channels.fetch(SOUTENIR_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`[SOUTENIR] Salon introuvable : ${SOUTENIR_CHANNEL_ID}`);

        const embed = createSoutenirEmbed();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
            const oldEmbed = existingMessage.embeds[0];

            // Vérification si le contenu est déjà à jour
            if (oldEmbed && oldEmbed.title === embed.data.title && oldEmbed.description === embed.data.description) {
                console.log("ℹ️ Aucun changement détecté pour le message de soutien. Message conservé.");
                return;
            }

            await existingMessage.edit({ embeds: [embed] });
            console.log("✅ Message de soutien mis à jour.");
        } else {
            await channel.send({ embeds: [embed] });
            console.log("✅ Nouveau message de soutien envoyé.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du message de soutien :", error);
    }
};

module.exports = { 
    createSoutenirEmbed, 
    deployOrUpdateSoutenirEmbed,
    SOUTENIR_CHANNEL_ID 
};