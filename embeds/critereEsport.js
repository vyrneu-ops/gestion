const { EmbedBuilder } = require('discord.js');

// 📌 ID du salon "Critères Esport"
const CRITERE_CHANNEL_ID = '1531793911562109060';

// Emojis personnalisés du serveur
const EMOJIS = {
    HLR_WIN: '<:hlrwin:1537584105536094248>',
    CERTIFIED: '<:20336certified:1537579306690281544>',
    PREMIUM: '<:5647premiumicon:1533535330538360942>',
    TRIAL_MOD: '<:94919trialmod:1537582836318609521>',
    RULES: '<:580437rules:1537583160345366578>'
};

const createCritereEmbeds = () => {
    // PREMIER EMBED : PHILOSOPHIE & CALCUL DU POWER RANKING (PR)
    const embed1 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.HLR_WIN} PARCOURS COMPÉTITIF — CRITÈRES ESPORT`)
        .setDescription(
            `Chez **HeLoRiA**, la progression se bâtit sur la rigueur, le travail et la régularité. Notre écosystème compétitif offre un parcours balisé permettant à chaque joueur d'évoluer à son rythme, du niveau initiatique jusqu'au pôle professionnel.\n\n` +
            `> **Critères d'évaluation globaux :**\n` +
            `> • Performance individuelle et régularité en compétition\n` +
            `> • État d'esprit, maturité et assiduité aux entraînements\n` +
            `> • Implication active au sein de la structure\n\n` +
            `### ${EMOJIS.RULES} BARÈME D'ÉVALUATION — POWER RANKING (PR)\n` +
            `Afin de garantir une équité parfaite dans le classement de nos effectifs, l'évaluation du niveau s'appuie sur la formule de calcul suivante :\n\n` +
            `\`\`\`text\n` +
            `PR Final = (PR EU × 0.65) + (PR Overall × 0.35)\n` +
            `\`\`\`\n` +
            `*Ce système pondéré associe l'exigence du circuit européen (65%) à la constance globale du joueur (35%).*`
        );

    // DEUXIÈME EMBED : LES PÔLES D'ÉVOLUTION
    const embed2 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setDescription(
            `### ${EMOJIS.TRIAL_MOD} PÔLE GRINDER — INTÉGRATION\n` +
            `Première étape du cursus compétitif. Ouvert à tous pour prouver sa valeur sans engagement d'exclusivité.\n` +
            `> **Âge minimum :** 12 ans révolus (Strictement aucune exception)\n` +
            `> **Échelonnement des grades :**\n` +
            `> • **Grinder 5** : 0 à 20 PR\n` +
            `> • **Grinder 4** : 20 à 40 PR\n` +
            `> • **Grinder 3** : 40 à 60 PR\n` +
            `> • **Grinder 2** : 60 à 80 PR\n` +
            `> • **Grinder 1** : 80 à 100 PR\n\n` +

            `### ${EMOJIS.PREMIUM} PÔLE ESPOIR — DÉVELOPPEMENT\n` +
            `Pôle intermédiaire axé sur le suivi personnalisé et la préparation aux exigences du haut niveau.\n` +
            `> **Rôle attribué :** <@&1532014920361574594>\n` +
            `> **Éligibilité :** 12 à 13 ans | **PR Requis :** 100 à 350 PR\n\n` +

            `### ${EMOJIS.CERTIFIED} CENTRE DE FORMATION — ACCOMPAGNEMENT\n` +
            `Entrée dans le cursus structuré avec signature d'un contrat d'évolution de 2 semaines.\n` +
            `> **Rôle attribué :** <@&1532014926623674573>\n` +
            `> **Éligibilité :** 13 ans minimum obligatoires | **PR Requis :** 350 à 700 PR\n` +
            `> *Objectifs : Bilan technique, plan de progression personnalisé et évaluation d'adaptabilité.*`
        );

    // TROISIÈME EMBED : HAUT NIVEAU & PÔLE OFFICIEL
    const embed3 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setDescription(
            `### 🎓 PÔLE ACADÉMIQUE — PRÉPARATION PRO\n` +
            `Période d'évaluation approfondie sous contrat académique (1 à 3 mois) avant intégration officielle.\n` +
            `> **Rôle attribué :** <@&1532014932630044873>\n` +
            `> **Éligibilité :** 14 ans minimum | **PR Requis :** 700 à 5 000 PR\n\n` +

            `### 🏆 PÔLE ESPORT OFFICIEL — REPRÉSENTATION\n` +
            `Le sommet de notre structure. Les joueurs représentent **HeLoRiA** sur les tournois majeurs.\n` +
            `> **Rôle attribué :** <@&1532014940569735299>\n` +
            `> **Éligibilité :** 14 ans minimum | **PR Requis :** 5 000+ PR\n` +
            `> *Engagement officiel auprès de la structure (Contrat d'image et de représentation).* \n\n` +

            `*Chaque palier franchi rapproche nos joueurs de leurs objectifs. Le travail paie toujours.*`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });

    return [embed1, embed2, embed3];
};

// 🔄 FONCTION D'ENVOI OU DE MISE À JOUR SANS SPAM (UPSERT MULTI-EMBEDS)
const deployOrUpdateCritereEmbeds = async (client) => {
    try {
        const channel = await client.channels.fetch(CRITERE_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`[CRITÈRES ESPORT] Salon introuvable : ${CRITERE_CHANNEL_ID}`);

        const embeds = createCritereEmbeds();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
            const oldEmbeds = existingMessage.embeds;

            // Verification d'identite du contenu existant
            const isIdentical = oldEmbeds.length === embeds.length &&
                oldEmbeds.every((oldEmb, index) => 
                    oldEmb.description === embeds[index].data.description &&
                    oldEmb.title === embeds[index].data.title
                );

            if (isIdentical) {
                console.log("ℹ️ Aucun changement détecté pour le message des critères. Message conservé.");
                return;
            }

            await existingMessage.edit({ embeds });
            console.log("✅ Message des critères mis à jour avec succès.");
        } else {
            await channel.send({ embeds });
            console.log("✅ Nouveau message des critères envoyé.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour des critères :", error);
    }
};

module.exports = { 
    createCritereEmbeds, 
    deployOrUpdateCritereEmbeds,
    CRITERE_CHANNEL_ID 
};