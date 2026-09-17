const { EmbedBuilder } = require('discord.js');

// =====================================================
// CONFIGURATION DU MODULE VOICE
// =====================================================

const IS_MAINTENANCE = true; // Forcé en mode maintenance au lancement

const config = {
    TRIGGER_CHANNEL: '1533586742668689519', // Remplacez par l'ID de votre salon déclencheur
    EMOJIS: {
        WARN: '⚠️'
    }
};

module.exports = function voiceManager(client) {
    console.log(`[VOICE MANAGER] Module chargé (Maintenance : ${IS_MAINTENANCE ? 'ACTIVÉE' : 'DÉSACTIVÉE'}).`);

    client.on('voiceStateUpdate', async (oldState, newState) => {
        // Ignorer si le membre n'existe pas ou si c'est un bot
        if (!newState.member || newState.member.user.bot) return;

        // =====================================================
        // MODE MAINTENANCE ACTIF
        // =====================================================
        if (IS_MAINTENANCE) {
            // Déclenchement Création (MODE MAINTENANCE)
            if (newState.channelId === config.TRIGGER_CHANNEL) {
                const member = newState.member;

                // Déconnecte l'utilisateur du salon vocal déclencheur pour éviter qu'il n'y reste
                await member.voice.disconnect().catch(() => {});

                // Envoie un message privé à l'utilisateur pour l'informer de la maintenance
                const maintenanceEmbed = new EmbedBuilder()
                    .setColor('#FF0000')
                    .setTitle(`${config.EMOJIS.WARN} MAINTENANCE EN COURS`)
                    .setDescription(
                        `Bonjour ${member},\n\n` +
                        `La création de salons vocaux temporaires est actuellement **désactivée** pour cause de **maintenance en cours**.\n\n` +
                        `Merci de patienter, le service sera à nouveau disponible très prochainement !`
                    )
                    .setFooter({ text: 'HeLoRiA • Maintenance System' })
                    .setTimestamp();

                await member.send({ embeds: [maintenanceEmbed] }).catch(() => {
                    console.log(`[VOICE] Impossible d'envoyer le MP de maintenance à ${member.user.tag}.`);
                });

                return; // Interrompt la suite de l'exécution (aucune création de salon)
            }
            return;
        }

        // =====================================================
        // CODE NORMAL (Exécuté uniquement si IS_MAINTENANCE = false)
        // =====================================================
        // Insérez ici le reste de votre logique habituelle du voiceManager
    });
};