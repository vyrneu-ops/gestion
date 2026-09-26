// Empêche une double initialisation si le module est require() plusieurs fois
// (sinon deux jeux de variables de cooldown indépendants se marchent dessus).
let statCounterInitialized = false;

module.exports = (client) => {
    if (statCounterInitialized) return;
    statCounterInitialized = true;

    const CHANNEL_ID = "1553373002119385139";

    let isUpdating = false;
    let pendingUpdate = false;
    let lastUpdateTimestamp = 0;
    // Discord autorise ~2 renommages de salon par tranche de 10 minutes.
    // On garde une marge de sécurité au lieu de coller pile à la limite.
    const COOLDOWN_MS = 6 * 60 * 1000;

    /**
     * Met à jour le nom du salon avec le nombre total de membres.
     * Les appels rapprochés (arrivées/départs en rafale) sont coalescés :
     * un seul renommage est effectué une fois le cooldown écoulé.
     */
    async function updateCounter(reason = "Mise à jour automatique") {
        const now = Date.now();

        if (isUpdating) {
            pendingUpdate = true;
            return;
        }

        const timeSinceLastUpdate = now - lastUpdateTimestamp;
        if (timeSinceLastUpdate < COOLDOWN_MS) {
            const waitTime = COOLDOWN_MS - timeSinceLastUpdate;

            if (!pendingUpdate) {
                pendingUpdate = true;
                setTimeout(() => {
                    pendingUpdate = false;
                    updateCounter("Exécution différée après cooldown").catch(err =>
                        console.error("[STATCOUNTER] Erreur lors de la mise à jour différée :", err)
                    );
                }, waitTime);
            }
            return;
        }

        isUpdating = true;

        try {
            const channel = await client.channels.fetch(CHANNEL_ID).catch((err) => {
                console.error(`[STATCOUNTER] Échec de la récupération du salon (${CHANNEL_ID}) :`, err.message);
                return null;
            });

            if (!channel) {
                console.error(`[STATCOUNTER] Salon introuvable avec l'ID : ${CHANNEL_ID}`);
                return;
            }

            const count = channel.guild.memberCount;
            const newName = `│👥・Membres : ${count}`;

            if (channel.name !== newName) {
                await channel.setName(newName);
                lastUpdateTimestamp = Date.now();
                console.log(`[STATCOUNTER] Compteur mis à jour : ${count} membres (${reason}).`);
            }
        } catch (error) {
            const isRateLimited = error.status === 429 || error.httpStatus === 429 || error.code === 429;
            if (isRateLimited) {
                const retryAfter = error.retry_after ?? error.retryAfter ?? "inconnu";
                console.warn(`[STATCOUNTER] Rate limit Discord atteint (HTTP 429). Nouvel essai dans : ${retryAfter} ms.`);
            } else {
                console.error("[STATCOUNTER] Erreur lors de la mise à jour du salon :", error);
            }
        } finally {
            isUpdating = false;

            if (pendingUpdate) {
                pendingUpdate = false;
                setTimeout(() => {
                    updateCounter("Traitement de la file d'attente").catch(err =>
                        console.error("[STATCOUNTER] Erreur lors du traitement de la file d'attente :", err)
                    );
                }, 5000);
            }
        }
    }

    client.once("ready", () => {
        console.log("[STATCOUNTER] Système de compteur de membres initialisé.");
        updateCounter("Lancement du bot").catch(err => console.error("[STATCOUNTER] Erreur au lancement :", err));
    });

    client.on("guildMemberAdd", (member) => {
        updateCounter(`Arrivée de ${member.user.username}`).catch(err => console.error("[STATCOUNTER] Erreur guildMemberAdd :", err));
    });

    client.on("guildMemberRemove", (member) => {
        updateCounter(`Départ de ${member.user.username}`).catch(err => console.error("[STATCOUNTER] Erreur guildMemberRemove :", err));
    });

    // Filet de sécurité périodique, au cas où un événement aurait été manqué
    setInterval(() => {
        updateCounter("Vérification périodique").catch(err => console.error("[STATCOUNTER] Erreur vérification périodique :", err));
    }, 10 * 60 * 1000);
};