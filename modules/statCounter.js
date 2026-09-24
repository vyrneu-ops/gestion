module.exports = (client) => {
    // ID du salon vocal du compteur
    const CHANNEL_ID = "1550597435418615899";
    
    // Variables de contrôle de flux et d'anti-rate limit
    let isUpdating = false;
    let pendingUpdate = false;
    let lastUpdateTimestamp = 0;
    const COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes entre deux requêtes d'API (Discord autorise ~2 renommages / 10 min)

    /**
     * Met à jour le nom du salon avec le nombre total de membres
     */
    async function updateCounter(reason = "Mise à jour automatique") {
        const now = Date.now();

        // 1. Détection si une mise à jour est déjà en cours d'exécution
        if (isUpdating) {
            console.log(`[STATCOUNTER LOG] Demande mise en attente (Mise à jour déjà en cours). Raison : ${reason}`);
            pendingUpdate = true;
            return;
        }

        // 2. Protection Anti-Rate Limit Discord (Attente obligatoire si trop récent)
        const timeSinceLastUpdate = now - lastUpdateTimestamp;
        if (timeSinceLastUpdate < COOLDOWN_MS) {
            const waitTime = COOLDOWN_MS - timeSinceLastUpdate;
            console.log(`[STATCOUNTER LOG] Cooldown API actif. Mise à jour repoussée de ${Math.round(waitTime / 1000)}s. Raison : ${reason}`);
            
            if (!pendingUpdate) {
                pendingUpdate = true;
                setTimeout(() => {
                    pendingUpdate = false;
                    updateCounter("Execution différée après Cooldown");
                }, waitTime);
            }
            return;
        }

        isUpdating = true;
        console.log(`[STATCOUNTER LOG] Début de la mise à jour du compteur. Motifs : ${reason}`);

        try {
            const channel = await client.channels.fetch(CHANNEL_ID).catch((err) => {
                console.error(`[STATCOUNTER LOG] Échec de la récupération du salon (${CHANNEL_ID}) :`, err.message);
                return null;
            });
            
            if (!channel) {
                console.error(`[STATCOUNTER LOG] Salon introuvable avec l'ID : ${CHANNEL_ID}`);
                return;
            }

            // Récupération du nombre total de membres
            const count = channel.guild.memberCount;
            const newName = `│👥・Membres : ${count}`;

            // Verification si la modification est nécessaire
            if (channel.name === newName) {
                console.log(`[STATCOUNTER LOG] Le nom du salon est déjà à jour (${newName}). Aucune action API requise.`);
            } else {
                console.log(`[STATCOUNTER LOG] Envoi de la requête de renommage à l'API Discord : "${channel.name}" -> "${newName}"`);
                await channel.setName(newName);
                lastUpdateTimestamp = Date.now();
                console.log(`[STATCOUNTER LOG] Compteur mis à jour avec succès : ${count} membres.`);
            }

        } catch (error) {
            if (error.code === 429) {
                console.warn(`[STATCOUNTER LOG] Rate Limit Discord (HTTP 429) atteint ! Temps de rechargement imposé : ${error.retryAfter || 'inconnu'} ms.`);
            } else {
                console.error(`[STATCOUNTER LOG] Erreur lors de la mise à jour du salon :`, error);
            }
        } finally {
            isUpdating = false;

            // Si une mise à jour a été demandée pendant le traitement
            if (pendingUpdate) {
                pendingUpdate = false;
                console.log(`[STATCOUNTER LOG] Traitement de la mise à jour en attente planifiée...`);
                setTimeout(() => updateCounter("Traitement de la file d'attente"), 5000);
            }
        }
    }

    // 1. Initialisation au lancement du bot
    client.once("ready", () => {
        console.log("[STATCOUNTER LOG] Initialisation du système de compteur de membres...");
        updateCounter("Lancement du bot");
    });

    // 2. Événements instantanés (Arrivées et Départs)
    client.on("guildMemberAdd", (member) => {
        console.log(`[STATCOUNTER LOG] Événement guildMemberAdd détecté (Membre : ${member.user.tag})`);
        updateCounter(`Arrivée de ${member.user.username}`);
    });

    client.on("guildMemberRemove", (member) => {
        console.log(`[STATCOUNTER LOG] Événement guildMemberRemove détecté (Membre : ${member.user.tag})`);
        updateCounter(`Départ de ${member.user.username}`);
    });

    // 3. Tâche de fond régulière (Intervalle de sécurité toutes les 10 minutes)
    setInterval(() => {
        console.log("[STATCOUNTER LOG] Exécution de la vérification périodique (10 min).");
        updateCounter("Intervalle périodique");
    }, 10 * 60 * 1000);
};