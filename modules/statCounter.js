const config = require('../ticket_config.js');

module.exports = (client) => {
    // ID du salon vocal transmis : 1550597435418615899
    const CHANNEL_ID = config.MEMBER_COUNT_CHANNEL || "1550597435418615899";
    
    // Variables pour gérer la mise à jour fluide sans spam d'API
    let isUpdating = false;
    let pendingUpdate = false;

    /**
     * Met à jour le nom du salon avec le nombre total de membres
     */
    async function updateCounter() {
        // Anti-collision : si une mise à jour est déjà en cours, on repousse la suivante
        if (isUpdating) {
            pendingUpdate = true;
            return;
        }

        isUpdating = true;

        try {
            const channel = await client.channels.fetch(CHANNEL_ID).catch(() => null);
            
            if (!channel) {
                console.error(`[StatCounter] Salon introuvable avec l'ID : ${CHANNEL_ID}`);
                isUpdating = false;
                return;
            }

            // Récupère le nombre total de membres (humains + bots)
            const count = channel.guild.memberCount;
            const newName = `│👥・Membres : ${count}`;

            // Modification uniquement si le nom a changé
            if (channel.name !== newName) {
                await channel.setName(newName);
                console.log(`[StatCounter] Compteur mis à jour : ${count} membres.`);
            }
        } catch (error) {
            // Gestion des erreurs d'API (Rate Limit Discord : max 2 renommages par 10 min)
            if (error.code === 429) {
                console.warn(`[StatCounter] Rate Limit atteint. Prochaine tentative dans quelques minutes.`);
            } else {
                console.error(`[StatCounter] Erreur lors de la mise à jour :`, error.message);
            }
        } finally {
            isUpdating = false;

            // Si une mise à jour a été demandée pendant le traitement, on relance
            if (pendingUpdate) {
                pendingUpdate = false;
                setTimeout(updateCounter, 5000); // Petite pause de sécurité (5s)
            }
        }
    }

    // 1. Mise à jour immédiate au lancement du bot
    updateCounter();

    // 2. Événements instantanés lors des arrivées et départs
    client.on('guildMemberAdd', () => updateCounter());
    client.on('guildMemberRemove', () => updateCounter());

    // 3. Intervalle de sécurité toutes les 10 minutes pour synchroniser au besoin
    setInterval(updateCounter, 10 * 60 * 1000);
};