module.exports = (client) => {
    // ID du salon vocal du compteur
    const CHANNEL_ID = "1550597435418615899";
    
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
            
            if (!channel) return;

            // Récupère le nombre total de membres (humains + bots)
            const count = channel.guild.memberCount;
            const newName = `│👥・Membres : ${count}`;

            // Modification uniquement si le nom a changé
            if (channel.name !== newName) {
                await channel.setName(newName);
            }
        } catch (error) {
            // Erreur ignorée
        } finally {
            isUpdating = false;

            // Si une mise à jour a été demandée pendant le traitement, on relance
            if (pendingUpdate) {
                pendingUpdate = false;
                setTimeout(updateCounter, 5000); // Pause de sécurité (5s)
            }
        }
    }

    // 1. Mise à jour immédiate au lancement
    updateCounter();

    // 2. Événements instantanés lors des arrivées et départs
    client.on('guildMemberAdd', () => updateCounter());
    client.on('guildMemberRemove', () => updateCounter());

    // 3. Intervalle de sécurité toutes les 10 minutes
    setInterval(updateCounter, 10 * 60 * 1000);
};