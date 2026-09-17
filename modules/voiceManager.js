// Déclenchement Création (MODE MAINTENANCE)
if (newState.channelId === config.TRIGGER_CHANNEL) {
    const member = newState.member;

    // Déconnecte l'utilisateur du salon vocal déclencheur pour éviter qu'il n'y reste
    await member.voice.disconnect().catch(() => {});

    // Envoie un message privé à l'utilisateur pour l'informer de la maintenance
    const maintenanceEmbed = new EmbedBuilder()
        .setColor("#FF0000")
        .setTitle(`${EMOJIS.WARN} MAINTENANCE EN COURS`)
        .setDescription(
            `Bonjour ${member},\n\n` +
            `La création de salons vocaux temporaires est actuellement **désactivée** pour cause de **maintenance en cours**.\n\n` +
            `Merci de patienter, le service sera à nouveau disponible très prochainement !`
        )
        .setFooter({ text: "HeLoRiA • Maintenance System" })
        .setTimestamp();

    await member.send({ embeds: [maintenanceEmbed] }).catch(() => {
        console.log(`[VOICE] Impossible d'envoyer le MP de maintenance à ${member.user.tag}.`);
    });

    return; // Interrompt la suite de l'exécution (aucune création de salon)
}