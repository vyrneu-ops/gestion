const { EmbedBuilder } = require('discord.js');

// 📌 ID du salon et du fondateur
const PRESENTATION_CHANNEL_ID = '1531795577942048769';
const FOUNDER_ID = '1208405611658739784'; // ID de Lyzo (@HLR Logs)

// Emojis personnalisés
const EMOJIS = {
    HLR_WIN: '<:hlrwin:1537584105536094248>',
    QUILL: '<:6880quill:1537585310794391563>',
    CROWN: '<a:darkbluecrown:1533535362566324245>',
    PILLARS: '<:5647premiumicon:1533535330538360942>',
    TELESCOPE: '<:65264telescope:1537586517453832222>'
};

const createPresentationEmbeds = () => {
    // PREMIER EMBED : LA GENÈSE ET LA DIRECTION
    const embed1 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.HLR_WIN} PRÉSENTATION INSTITUTIONNELLE — HeLoRiA`)
        .setDescription(
            `Bienvenue au cœur de l'écosystème **HeLoRiA**. Plus qu'une organisation, notre structure s'affirme comme une institution moderne, bâtie sur l'exigence, la rigueur et le dépassement de soi.\n\n` +
            `Fondée officiellement le **7 août**, **HeLoRiA** est née d'une volonté de rupture avec les standards actuels afin de proposer un cadre de développement pérenne, structuré et ambitieux dans l'univers de l'esport.\n\n` +
            `### ${EMOJIS.CROWN} LA DIRECTION GÉNÉRALE\n` +
            `Sous l'impulsion de <@${FOUNDER_ID}>, également connu sous le nom de **Lyzo**, la structure est animée par une vision stratégique claire : offrir un environnement d'élite où joueurs, créateurs et membres disposent des leviers nécessaires pour forger leur propre succès.\n\n` +
            `> *HeLoRiA n'est pas une simple bannière, c'est une identité forte, une communauté soudée et une architecture tournée vers l'avenir.*`
        );

    // DEUXIÈME EMBED : LES PILIERS STRUCTURANTS
    const embed2 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.PILLARS} LES QUATRE PILIERS FONDATEURS`)
        .setDescription(
            `L'ascension de **HeLoRiA** repose sur une structure en quatre axes fondamentaux, garantissant la stabilité et la croissance de notre projet :\n\n` +
            `**Ⅰ — L'ÉCOSYSTÈME SOCIAL**\n` +
            `> La communauté est la pierre angulaire de notre projet. Nous cultivons un environnement actif, respectueux et solidaire où l'échange prime sur l'individualisme.\n\n` +
            `**Ⅱ — LE RAYONNEMENT DIGITAL**\n` +
            `> Notre identité transcende nos serveurs. À travers une communication millimétrée et des projets ambitieux, nous affirmons notre présence sur l'ensemble de la scène compétitive.\n\n` +
            `**Ⅲ — L'INTÉGRITÉ & LA SÉCURITÉ**\n` +
            `> Nous maintenons un cadre éthique strict. La protection de nos membres et le maintien d'un environnement sain sont des impératifs non négociables.\n\n` +
            `**Ⅳ — LA CULTURE DE LA PERFORMANCE**\n` +
            `> L'ambition est notre moteur. Nous accompagnons chaque profil pour transformer le potentiel en résultats concrets, contribuant ainsi à l'excellence globale de la structure.`
        );

    // TROISIÈME EMBED : VISION ET ENGAGEMENT
    const embed3 = new EmbedBuilder()
        .setColor('#D4AF37')
        .setTitle(`${EMOJIS.TELESCOPE} VISION STRATÉGIQUE & AVENIR`)
        .setDescription(
            `Notre ambition ne se limite pas à la simple compétition. Nous construisons un projet capable de traverser les époques, de développer ses effectifs et de marquer durablement son passage.\n\n` +
            `La discipline, la constance et la régularité sont les maîtres-mots de notre progression. Nous avançons avec méthode, étape par étape, pour hisser les couleurs de **HeLoRiA** au sommet.\n\n` +
            `### ${EMOJIS.QUILL} BIENVENUE DANS L'AVENTURE\n` +
            `Derrière chaque succès se cache une volonté collective. Que vous soyez joueur, créateur ou passionné, vous faites partie intégrante de cette ascension.\n\n` +
            `*Notre identité repose sur la passion, notre évolution sur le travail, et notre avenir sur l'ambition.*\n\n` +
            `**EST. 7 AOÛT — HeLoRiA**`
        )
        .setFooter({
            text: 'HeLoRiA • #RiseSoarConquer',
            iconURL: 'https://media.discordapp.net/attachments/1531791102011772966/1537576540991127613/a9275f03-54ce-466f-afbd-6f67fb185796.png?ex=6a7f8b3e&is=6a7e39be&hm=d3a936db99c5ec4dc13609ae8eba49975bd2b655d8788cf10fa1f79e78bc30d4&=&format=webp&quality=lossless&width=320&height=320'
        });

    return [embed1, embed2, embed3];
};

<<<<<<< HEAD
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM
=======
// 🔄 FONCTION AUTOMATIQUE DE MISE À JOUR SANS SPAM (UPSERT MULTI-EMBEDS)
>>>>>>> temporary-branch
const deployOrUpdatePresentationEmbeds = async (client) => {
    try {
        const channel = await client.channels.fetch(PRESENTATION_CHANNEL_ID).catch(() => null);
        if (!channel) return console.error(`[PRÉSENTATION] Salon introuvable : ${PRESENTATION_CHANNEL_ID}`);

        const embeds = createPresentationEmbeds();
        const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
        const existingMessage = messages ? messages.find(m => m.author.id === client.user.id) : null;

        if (existingMessage) {
<<<<<<< HEAD
=======
            const oldEmbeds = existingMessage.embeds;

            // Comparaison simple des titres et descriptions pour éviter tout appel inutile
            const isIdentical = oldEmbeds.length === embeds.length &&
                oldEmbeds.every((oldEmb, index) => 
                    oldEmb.description === embeds[index].data.description &&
                    oldEmb.title === embeds[index].data.title
                );

            if (isIdentical) {
                console.log("ℹ️ Aucun changement détecté pour le message de présentation. Message conservé.");
                return;
            }

>>>>>>> temporary-branch
            await existingMessage.edit({ embeds });
            console.log("✅ Message de présentation mis à jour.");
        } else {
            await channel.send({ embeds });
            console.log("✅ Nouveau message de présentation envoyé.");
        }
    } catch (error) {
        console.error("❌ Erreur lors de la mise à jour de la présentation :", error);
    }
};

module.exports = { 
    createPresentationEmbeds, 
    deployOrUpdatePresentationEmbeds,
    PRESENTATION_CHANNEL_ID 
};