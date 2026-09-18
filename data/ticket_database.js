module.exports = {
    // 📌 ID du salon où le panneau principal des tickets sera affiché
    PANEL_CHANNEL: "1531793909871808803",

    // 📌 ID du rôle temporaire pour les modérateurs en test
    TEST_MODO_ROLE: "1532014992407269386",

    // 📁 ID des catégories uniques pour Staff, Audiovisuel, Aide et Partenariat
    CATEGORIES: {
        staff: "1535306833349320776",
        audiovisuel: "1535306927591002122",
        aide: "1535306955260956822",
        partenariat: "1535307012546498630",
        upgrade_pr: "1535306876164640920" // Catégorie par défaut pour les augmentations de PR
    },

    // 📁 Pool de catégories spécifiques pour les tickets "Joueur"
    JOUEUR_CATEGORIES_POOL: [
        "1535306876164640920", // 1ère catégorie principale Joueur
        "1541230358526304256", // 2ème catégorie de secours Joueur
        "1541544133171347710", // 3ème catégorie de secours Joueur
        "1541544174971650088"  // 4ème catégorie de secours Joueur
    ],

    // 🛡️ IDs des rôles Staff autorisés à voir et gérer chaque type de ticket
    ROLES: {
        staff: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625", 
            "1532015037047115788", "1532015021314408470", "1532015006374432930"
        ],
        joueur: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625", 
            "1532015037047115788", "1532015021314408470", "1532015006374432930", 
            "1532015009595392111", "1532015003748536400", "1532014997842952202", 
            "1532015000426905633", "1532015026851020871", "1532014983305498684", 
            "1532014980063428730"
        ],
        upgrade_pr: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625"
        ],
        audiovisuel: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625", 
            "1532015037047115788", "1532015021314408470", "1532015006374432930"
        ],
        aide: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625", 
            "1532015037047115788", "1532015021314408470", "1532015006374432930"
        ],
        partenariat: [
            "1532015048552087695", "1532015045800628244", "1532015042948628610", 
            "1532015039806963763", "1532015034572738721", "1532015029480853625", 
            "1532015037047115788", "1532015021314408470", "1532015006374432930", 
            "1532015009595392111"
        ]
    },

    // 🏆 IDs des rôles Pôles (Spécifiques & Principaux Globaux)
    // Remplace les IDs ci-dessous par les véritables IDs Discord de tes rôles
    ROLES_POLES: {
        // --- RÔLES D'APPARTENANCE GÉNÉRAUX (Pôles Globaux) ---
        main_esport: "1532014943438897262",     // Rôle global "Membre Pôle eSport"
        main_academique: "1532014935729508474", // Rôle global "Membre Pôle Académique"
        main_formation: "1532014929584853015",  // Rôle global "Membre Centre de Formation"
        main_espoir: "1532014923339530353",     // Rôle global "Membre Pôle Espoir"
        main_grinder: "1532014917719163083",    // Rôle global "Membre Pôle Grinder" (Commun à Grinder 1-5)

        // --- RÔLES SPÉCIFIQUES ---
        esport: "1532014940569735299",      // Joueur eSport Officiel
        academique: "1532014932630044873",  // Joueur Académique
        formation: "1532014926623674573",   // Joueur Formation
        espoir: "1532014920361574594",      // Joueur Espoir

        // Grades Grinders
        grinder1: "1532014914498203649",    // Grinder Grade 1
        grinder2: "1532014911771774996",    // Grinder Grade 2
        grinder3: "1532014908961587211",    // Grinder Grade 3
        grinder4: "1532014906373570580",    // Grinder Grade 4
        grinder5: "1532014903513186326"     // Grinder Grade 5
    }
};