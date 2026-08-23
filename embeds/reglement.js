const { EmbedBuilder } = require('discord.js');

const REGLEMENT_CHANNEL_ID = '1531791102011772963';

// Emojis personnalisés
const EMOJIS = {
    RULES: '<:580437rules:1537583160345366578>',
    TRIAL_MOD: '<:94919trialmod:1537582836318609521>',
    MODERATOR: '<:3446blurplecertifiedmoderator:1533535324309815367>',
    MIC_ANIM: '<:68052micanimation:1537582247278813204>',
    BAN: '<:9299blurpleban:1533535325996056807>',
    HLR_WIN: '<:hlrwin:1537584105536094248>'
};

const createReglementEmbeds = () => {
    // PREMIER EMBED : INTRODUCTION ET CHARTE DE CONDUITE
    const embed1 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.RULES} HeLoRiA — RÈGLEMENT OFFICIEL`)
        .setDescription(
            `Bienvenue au sein de **HeLoRiA**. Notre structure rassemble joueurs, créateurs et passionnés autour d'une ambition commune : l'excellence.\n\n` +
            `> **Respect • Compétition • Ambition**\n\n` +
            `Ce règlement définit le cadre nécessaire au bon fonctionnement de notre écosystème. Chaque membre est un ambassadeur de l'image de **HeLoRiA** et se doit d'adopter un comportement irréprochable.\n\n` +
            `### ${EMOJIS.TRIAL_MOD} ARTICLE I : CONDUITE ET ÉCHANGES\n` +
            `> **01.** Le respect mutuel envers les membres et la direction est une condition sine qua non.\n` +
            `> **02.** Les provocations, insultes, menaces ou tentatives d'humiliation sont strictement proscrites.\n` +
            `> **03.** Tout propos discriminatoire (racisme, sexisme, homophobie, haine) entraînera une exclusion immédiate.\n` +
            `> **04.** En cas de désaccord, maintenez un ton courtois ou déplacez l'échange en privé.\n` +
            `> **05.** Toute forme de spam, flood ou envoi massif de messages est interdite.\n` +
            `> **06.** La diffusion de contenus pornographiques, violents ou illégaux est passible de bannissement.`
        );

    // DEUXIÈME EMBED : IDENTITÉ ET UTILISATION DU SERVEUR
    const embed2 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setDescription(
            `### ${EMOJIS.MODERATOR} ARTICLE II : IDENTITÉ ET SÉCURITÉ DES COMPTES\n` +
            `> **01.** Votre identité (pseudo, avatar) doit rester compatible avec l'image professionnelle de la structure.\n` +
            `> **02.** L'usurpation d'identité d'un responsable ou d'un membre est un acte grave lourdement sanctionné.\n` +
            `> **03.** L'exposition de données personnelles (Doxxing) d'un tiers est strictement interdite.\n` +
            `> **04.** Vous êtes l'unique responsable des actions effectuées depuis votre compte Discord.\n` +
            `> **05.** L'utilisation de comptes secondaires pour contourner une sanction est proscrite.\n\n` +
            `### ${EMOJIS.MIC_ANIM} ARTICLE III : ESPACES VOCAUX ET MÉDIAS\n` +
            `> **01.** Chaque salon doit être utilisé selon sa fonction spécifique.\n` +
            `> **02.** Les nuisances sonores volontaires (cris, bruits parasites) sont interdites en vocal.\n` +
            `> **03.** Les soundboards et partages d'écran doivent être utilisés avec modération et respect.\n` +
            `> **04.** **Restriction Textuelle :** L'écriture dans les salons textuels liés aux vocaux est restreinte. La modération ne pouvant assurer une surveillance H24 de ces espaces, ils sont verrouillés pour prévenir tout débordement (insultes, spam de pseudos).\n` +
            `> **05.** Tout démarchage ou publicité non sollicitée fera l'objet d'une suppression immédiate.`
        );

    // TROISIÈME EMBED : PROTOCOLE DE MODÉRATION ET ENGAGEMENT
    const embed3 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setDescription(
            `### ${EMOJIS.BAN} ARTICLE IV : PROTOCOLE DE MODÉRATION\n` +
            `> **01.** La modération se réserve le droit d'intervenir pour préserver la sécurité de la communauté.\n` +
            `> **02.** La gradation des sanctions (avertissement, restriction, exclusion) est à la discrétion du staff.\n` +
            `> **03.** Pour toute situation grave, une sanction immédiate sera appliquée sans préavis.\n` +
            `> **04.** Les décisions de la direction sont définitives et doivent être respectées.\n\n` +
            `### ${EMOJIS.HLR_WIN} ENGAGEMENT & PHILOSOPHIE\n` +
            `**Une structure. Une communauté. Une ambition.**\n\n` +
            `*Le respect de ces dispositions permet à chacun de profiter d'un environnement sain. En restant sur ce serveur, vous acceptez l'intégralité de cette charte.*`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });

    return [embed1, embed2, embed3];
};

// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM (UPSERT MULTI-EMBEDS)
const deployOrUpdateReglementEmbeds = async (client) => {
    try {
        const channel = await client.channels.fetch(REGLEMENT_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`[RÈGLEMENT] Salon introuvable : ${REGLEMENT_CHANNEL_ID}`);

        const embeds = createReglementEmbeds();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
            const oldEmbeds = existingMessage.embeds;
            
            // Comparaison simple pour éviter l'édition si le contenu est identique
            const isIdentical = oldEmbeds.length === embeds.length &&
                oldEmbeds.every((oldEmb, index) => 
                    oldEmb.description === embeds[index].data.description &&
                    oldEmb.title === embeds[index].data.title
                );

            if (isIdentical) {
                console.log("ℹ️ Aucun changement détecté pour le règlement. Message conservé.");
                return;
            }

            await existingMessage.edit({ embeds });
            console.log("✅ Message du règlement mis à jour.");
        } else {
            await channel.send({ embeds });
            console.log("✅ Nouveau message du règlement envoyé.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour du règlement :", error);
    }
};

module.exports = { 
    createReglementEmbeds, 
    deployOrUpdateReglementEmbeds,
    REGLEMENT_CHANNEL_ID 
};