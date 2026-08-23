const { EmbedBuilder } = require('discord.js');

// 📌 ID du salon "Partenaires"
const PARTENAIRE_CHANNEL_ID = '1531793925155590245';

// Emojis personnalisés
const EMOJIS = {
    HANDSHAKE: '<:600404handshake:1537578056447828058>',
    CERTIFIED: '<:20336certified:1537579306690281544>',
    BRIEFCASE: '<:75828briefcase:1537579702812807248>',
    TICKET: '<:29909ticket:1537580036159316108>'
};

const createPartenaireEmbed = () => {
    return new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle('Partenariats & Collaborations')
        .setDescription(
            `Dans le cadre de son expansion et de son affirmation sur la scène compétitive, **HeLoRiA** étudie activement de nouvelles opportunités de partenariat stratégique pour soutenir ses projets et accompagner ses effectifs.\n\n` +

            `Nous privilégions des synergies durables avec des acteurs ambitieux afin de bâtir des collaborations solides, professionnelles et mutuellement bénéfiques.\n\n` +

            `### ${EMOJIS.CERTIFIED} **Exigences et conditions d'affiliation**\n` +
            `• **Marques & Entreprises établies :** Nous collaborons exclusivement avec des sociétés, équipementiers et acteurs professionnels reconnus.\n` +
            `• **Politique d'exclusivité :** Nous ne réalisons aucun partenariat, affiliation ou fusion avec d'autres structures ou clans esport.\n\n` +

            `### ${EMOJIS.BRIEFCASE} **Vous représentez une marque ?**\n` +
            `Si vous partagez notre quête d'excellence et souhaitez associer votre image à l'ascension de **HeLoRiA**, notre direction générale se tient à votre disposition pour analyser vos propositions d'affiliation.\n\n` +

            `### ${EMOJIS.TICKET} **Contact professionnel**\n` +
            `Pour toute demande de dossier de sponsorisation ou proposition commerciale, veuillez ouvrir un **Ticket Partenariat** ou contacter directement l'équipe dirigeante.`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });
};

<<<<<<< HEAD
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM
=======
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM (UPSERT)
>>>>>>> temporary-branch
const deployOrUpdatePartenaireEmbed = async (client) => {
    try {
        const channel = await client.channels.fetch(PARTENAIRE_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`[PARTENARIAT] Salon introuvable : ${PARTENAIRE_CHANNEL_ID}`);

        const embed = createPartenaireEmbed();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
<<<<<<< HEAD
=======
            const oldEmbed = existingMessage.embeds[0];

            // Vérification si le contenu est déjà identique
            if (oldEmbed && oldEmbed.title === embed.data.title && oldEmbed.description === embed.data.description) {
                console.log("ℹ️ Aucun changement détecté pour le message des partenariats. Message conservé.");
                return;
            }

>>>>>>> temporary-branch
            await existingMessage.edit({ embeds: [embed] });
            console.log("✅ Message des partenariats mis à jour.");
        } else {
            await channel.send({ embeds: [embed] });
            console.log("✅ Nouveau message des partenariats envoyé.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour des partenariats :", error);
    }
};

module.exports = { 
    createPartenaireEmbed, 
    deployOrUpdatePartenaireEmbed,
    PARTENAIRE_CHANNEL_ID 
};