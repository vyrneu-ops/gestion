const { 
    EmbedBuilder, 
    ActionRowBuilder, 
    StringSelectMenuBuilder, 
    PermissionsBitField 
} = require("discord.js");
const fs = require("fs");
const path = require("path");
const config = require("../data/ticket_database");

const DB_PATH = path.join(__dirname, "../data/ticket_database.json");

const EMOJIS = {
    warning: "<:warningd:1533535400176386068>",
    lock: "<a:lockicon:1533535370787033198>",
    certified: "<:20336certified:1537579306690281544>",
    ticket: "<:29909ticket:1537580036159316108>",
    rules: "<:580437rules:1537583160345366578>",
    mod: "<:3446blurplecertifiedmoderator:1533535324309815367>",
    premium: "<:5647premiumicon:1533535330538360942>",
    update: "<:update:1533535384674369777>",
    mic: "<:68052micanimation:1537582247278813204>"
};

function readDB() {
    try {
        const data = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
        if (data.maintenance === undefined) data.maintenance = false;
        return data;
    } catch {
        return { tickets: {}, blacklist: [], stats: {}, maintenance: false };
    }
}

function writeDB(data) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 4), "utf-8");
    } catch (err) {
        console.error("[MAINTENANCE DB ERROR]", err);
    }
}

/**
 * Met à jour le message principal du panel selon l'état de maintenance
 */
async function refreshPanelMessage(client, isMaintenance) {
    const panelChannel = await client.channels.fetch(config.PANEL_CHANNEL).catch(() => null);
    if (!panelChannel) return;

    const cachedMessages = await panelChannel.messages.fetch({ limit: 10 }).catch(() => null);
    if (cachedMessages) {
        const botMessages = cachedMessages.filter(m => m.author.id === client.user.id);
        for (const msg of botMessages.values()) await msg.delete().catch(() => {});
    }

    if (isMaintenance) {
        const maintenanceEmbed = new EmbedBuilder()
            .setColor("#ED4245")
            .setTitle(`${EMOJIS.lock} SUPPORT EN MAINTENANCE — TEAM HELORIA`)
            .setDescription(
                `Le centre de support de la **Team HeLoRiA** est actuellement **fermé pour maintenance**.\n\n` +
                `${EMOJIS.warning} **Information**\n` +
                `• La création de nouveaux tickets est temporairement suspendue.\n` +
                `• Nos équipes effectuent une mise à jour ou des opérations d'entretien.\n` +
                `• Le service réouvrira très prochainement.\n\n` +
                `Merci de votre patience !`
            )
            .setFooter({ text: "Team HeLoRiA • Maintenance Support" })
            .setTimestamp();

        await panelChannel.send({ embeds: [maintenanceEmbed] }).catch(() => {});
    } else {
        const panelEmbed = new EmbedBuilder()
            .setColor("#2F3136")
            .setTitle(`${EMOJIS.ticket} HUB D'ASSISTANCE — TEAM HELORIA`)
            .setDescription(
                `Bienvenue sur le centre du support officiel de la **Team HeLoRiA**.\n` +
                `Notre équipe est à votre disposition pour vous accompagner dans vos démarches.\n\n` +
                `${EMOJIS.rules} **Consignes d'ouverture**\n` +
                `• Sélectionnez votre catégorie dans le menu ci-dessous.\n` +
                `• Indiquez directement vos informations dans le salon créé.\n` +
                `• Vous disposez de 24h pour répondre aux sollicitations du staff.\n\n` +
                `───\n\n` +
                `Sélectionnez une option ci-dessous pour démarrer.`
            )
            .setFooter({ text: "Team HeLoRiA • Support Officiel" });

        const menuSelection = new StringSelectMenuBuilder()
            .setCustomId("ticket_select")
            .setPlaceholder("Choisissez le motif de votre demande...")
            .addOptions([
                { label: "Recrutement Staff", description: "Rejoindre l'équipe administrative", value: "staff", emoji: EMOJIS.mod },
                { label: "Recrutement Joueur", description: "Postuler en tant que joueur eSport / Grinder", value: "joueur", emoji: EMOJIS.premium },
                { label: "Augmentation PR / Grade (Réservé Joueurs)", description: "Mise à jour de votre statut Grinder/Joueur", value: "upgrade_pr", emoji: EMOJIS.update },
                { label: "Recrutement Audiovisuel", description: "Graphistes, monteurs et créateurs", value: "audiovisuel", emoji: EMOJIS.mic },
                { label: "Assistance Générale", description: "Questions et aide technique", value: "aide", emoji: EMOJIS.certified },
                { label: "Demande de Partenariat", description: "Proposer une collaboration", value: "partenariat", emoji: EMOJIS.handshake }
            ]);

        await panelChannel.send({
            embeds: [panelEmbed],
            components: [new ActionRowBuilder().addComponents(menuSelection)]
        }).catch(() => {});
    }
}

module.exports = {
    /**
     * Commande d'activation / désactivation de la maintenance
     * Exemples d'utilisation dans une commande : 
     * await maintenanceModule.toggleMaintenance(message.member, client, true);
     */
    async toggleMaintenance(member, client, state = null) {
        if (!member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return { success: false, message: `${EMOJIS.warning} Vous devez être administrateur pour exécuter cette commande.` };
        }

        const db = readDB();
        const newState = (state !== null) ? state : !db.maintenance;
        
        db.maintenance = newState;
        writeDB(db);

        await refreshPanelMessage(client, newState);

        return {
            success: true,
            state: newState,
            message: newState 
                ? `${EMOJIS.lock} La maintenance du support a été **activée**. Les nouveaux tickets sont bloqués.` 
                : `${EMOJIS.certified} La maintenance du support a été **désactivée**. Le hub a été restauré.`
        };
    },

    /**
     * Vérification à intégrer au début de l'événement interactionCreate
     */
    checkMaintenance(interaction) {
        const db = readDB();
        return db.maintenance;
    },

    refreshPanelMessage
};