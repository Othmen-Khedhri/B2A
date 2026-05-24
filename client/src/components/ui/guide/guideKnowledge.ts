export interface GuideIntent {
  keywords: string[];
  response: { en: string; fr: string };
  route?: string;
  linkLabel?: { en: string; fr: string };
}

export const intents: GuideIntent[] = [

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  {
    keywords: ["tableau de bord", "accueil", "overview", "kpi", "statistiques", "résumé", "aperçu", "dashboard", "home", "summary", "vue d'ensemble", "page principale"],
    response: {
      fr: "La vue d'ensemble affiche tous les KPIs clés : projets actifs, personnel, alertes burnout, projets hors budget, collaborateurs actifs et gain cumulé. Elle contient aussi le vérificateur de pace projet et les top 10 des projets rentables / hors budget.",
      en: "The overview displays all key KPIs: active projects, staff count, burnout alerts, over-budget projects, active collaborators, and YTD gain. It also includes the project pace checker and the top 10 most profitable / over-budget projects.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Aller à la vue d'ensemble", en: "Go to Overview" },
  },
  {
    keywords: ["kpi card", "carte kpi", "indicateur", "compteur", "chiffre clé", "nombre projets", "nombre collaborateurs"],
    response: {
      fr: "Les cartes KPI en haut de la vue d'ensemble affichent : nombre total de projets, projets hors budget, total du personnel, alertes burnout, clients hors budget, collaborateurs actifs et gain annuel cumulé (top 10 clients).",
      en: "The KPI cards at the top of the overview show: total projects, over-budget projects, total staff, burnout alerts, over-budget clients, active collaborators, and YTD gain (top 10 clients).",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir les KPIs", en: "View KPIs" },
  },
  {
    keywords: ["vérificateur pace", "pace checker", "rechercher projet", "chercher projet", "statut projet rapide"],
    response: {
      fr: "Le vérificateur de pace en bas de la vue d'ensemble vous permet de rechercher n'importe quel projet par nom ou client et d'obtenir instantanément son statut (en cours / à risque / hors budget), ses heures consommées et son avancement budgétaire.",
      en: "The pace checker at the bottom of the overview lets you search any project by name or client and instantly see its status (on track / at risk / over budget), hours consumed, and budget progress.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Ouvrir le vérificateur", en: "Open Checker" },
  },

  // ── TIMESHEETS ────────────────────────────────────────────────────────────
  {
    keywords: ["feuille de temps", "feuilles de temps", "timesheet", "timesheets", "soumettre", "upload feuille", "uploader", "submit timesheet", "upload timesheet", "charger feuille"],
    response: {
      fr: "Pour importer la feuille de temps d'un collaborateur :\n1. Rendez-vous sur la page Fiches Horaires\n2. Sélectionnez le collaborateur et le mois\n3. Déposez le fichier Excel nettoyé (préalablement traité par le Parseur)\n\nRe-déposer le même mois remplace la feuille précédente sans doublon.",
      en: "To upload a collaborator's timesheet:\n1. Go to the Timesheets page\n2. Select the collaborator and month\n3. Drop the cleaned Excel file (pre-processed by the File Parser)\n\nRe-uploading the same month replaces the previous entry without duplication.",
    },
    route: "/dashboard/timesheets",
    linkLabel: { fr: "Aller aux fiches horaires", en: "Go to Timesheets" },
  },
  {
    keywords: ["rappel", "relance", "feuilles manquantes", "collaborateur manquant", "qui n'a pas soumis", "missing timesheet", "reminder", "pas encore soumis"],
    response: {
      fr: "La page Fiches Horaires affiche un tableau de statut : chaque collaborateur y est listé avec son badge Soumis / En attente et la date d'upload. Le bouton « Envoyer un rappel » envoie automatiquement un email à tous les admins listant les collaborateurs manquants.",
      en: "The Timesheets page shows a status table listing every collaborator with a Submitted / Pending badge and upload date. The 'Send reminder' button automatically emails all admins with the list of missing collaborators.",
    },
    route: "/dashboard/timesheets",
    linkLabel: { fr: "Voir les fiches horaires", en: "View Timesheets" },
  },
  {
    keywords: ["supprimer feuille", "delete timesheet", "effacer feuille", "retirer feuille"],
    response: {
      fr: "Seuls les admins peuvent supprimer une feuille de temps. Sur la page Fiches Horaires, chaque ligne soumise dispose d'un bouton de suppression (icône corbeille).",
      en: "Only admins can delete a timesheet. On the Timesheets page, each submitted row has a delete button (trash icon).",
    },
    route: "/dashboard/timesheets",
    linkLabel: { fr: "Gérer les fiches horaires", en: "Manage Timesheets" },
  },
  {
    keywords: ["format feuille de temps", "colonnes timesheet", "excel timesheet format", "comment préparer feuille"],
    response: {
      fr: "Le fichier Excel de feuille de temps doit contenir les colonnes : Client/Affaire (format 'NomClient - Mission'), Date, Consommé (heures), Prestation (ex. COMPTA, Audit) et Détail (texte libre). Utilisez le Parseur pour préparer le fichier brut.",
      en: "The timesheet Excel file must contain: Client/Affaire (format 'ClientName - Mission'), Date, Consommé (hours), Prestation (e.g. COMPTA, Audit) and Détail (free text). Use the File Parser to prepare the raw file.",
    },
    route: "/dashboard/parse",
    linkLabel: { fr: "Aller au parseur", en: "Go to File Parser" },
  },

  // ── FILE PARSER ───────────────────────────────────────────────────────────
  {
    keywords: ["parseur", "parser", "découper", "nettoyer", "préparer", "split", "multi-feuille", "classeur brut", "file parser", "parse", "zip", "preprocess", "traitement fichier"],
    response: {
      fr: "Le Parseur de fichiers (admin + manager) permet de traiter un classeur Excel multi-feuilles en 3 étapes :\n1. Déposez le fichier brut\n2. Prévisualisez les feuilles détectées\n3. Cliquez 'Découper & Nettoyer' — un ZIP contenant les fichiers nettoyés est téléchargé automatiquement\n\nImportez ensuite chaque fichier via la page Fiches Horaires.",
      en: "The File Parser (admin + manager) processes a multi-sheet Excel workbook in 3 steps:\n1. Drop the raw file\n2. Preview the detected sheets\n3. Click 'Split & Clean' — a ZIP with the cleaned files is downloaded automatically\n\nThen import each file via the Timesheets page.",
    },
    route: "/dashboard/parse",
    linkLabel: { fr: "Aller au parseur de fichiers", en: "Go to File Parser" },
  },
  {
    keywords: ["split excel", "diviser excel", "séparer feuilles", "onglets excel", "feuilles excel", "sheets"],
    response: {
      fr: "Le Parseur détecte chaque onglet du classeur et génère un fichier Excel séparé par feuille. Les lignes à cellule vide en première colonne sont fusionnées avec la ligne précédente (gestion des lignes continuées).",
      en: "The Parser detects each tab in the workbook and generates a separate Excel file per sheet. Rows with an empty first cell are merged with the previous row (handling continued rows).",
    },
    route: "/dashboard/parse",
    linkLabel: { fr: "Utiliser le parseur", en: "Use File Parser" },
  },

  // ── IMPORT HISTORY ────────────────────────────────────────────────────────
  {
    keywords: ["historique import", "import history", "imports passés", "nettoyage orphelins", "orphan cleanup", "cleanup", "historique des fichiers"],
    response: {
      fr: "La page Historique d'import affiche tous les fichiers importés dans le système : nom, type, statut (succès / partiel / échec), utilisateur et date. Elle contient aussi un outil de nettoyage des experts orphelins (experts sans données actives).",
      en: "The Import History page shows all files imported into the system: name, type, status (success / partial / failed), user, and date. It also includes an orphan expert cleanup tool (experts with no active data).",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique d'import", en: "View Import History" },
  },
  {
    keywords: ["statut import", "import status", "import partiel", "import échoué", "partial import", "failed import", "erreurs import"],
    response: {
      fr: "Chaque import peut avoir l'un de ces statuts :\n• Succès : toutes les lignes ont été importées\n• Partiel : certaines lignes ont été ignorées (avec avertissements)\n• Échec : l'import n'a pas abouti\n\nConsultez l'historique d'import pour voir les détails de chaque opération.",
      en: "Each import can have one of these statuses:\n• Success: all rows were imported\n• Partial: some rows were skipped (with warnings)\n• Failed: the import did not complete\n\nCheck Import History for details of each operation.",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique", en: "View History" },
  },

  // ── PROJECTS ──────────────────────────────────────────────────────────────
  {
    keywords: ["projet", "projets", "liste des projets", "voir les projets", "créer projet", "nouveau projet", "project", "projects", "create project", "add project"],
    response: {
      fr: "La page Projets liste tous vos projets avec statut, pace index et budget. Vous pouvez filtrer par statut, chercher par nom/client, créer un projet (admin/manager) ou cliquer sur un projet pour voir son détail complet.",
      en: "The Projects page lists all projects with status, pace index, and budget. You can filter by status, search by name/client, create a project (admin/manager), or click a project to view its full detail.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Aller aux projets", en: "Go to Projects" },
  },
  {
    keywords: ["détail projet", "fiche projet", "project detail", "modifier projet", "editer projet", "edit project", "voir projet"],
    response: {
      fr: "La fiche projet affiche : budget heures/coût, consommation réelle, marge brute, pace index, collaborateurs affectés et responsable partenaire. Les admins et managers peuvent modifier les informations du projet.",
      en: "The project detail shows: hours/cost budget, actual consumption, gross margin, pace index, assigned collaborators, and responsible partner. Admins and managers can edit project information.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["statut projet", "project status", "actif", "terminé", "en attente", "annulé", "active", "completed", "on hold", "cancelled"],
    response: {
      fr: "Un projet peut avoir 4 statuts : Actif, Terminé, En attente ou Annulé. Le statut est visible sur la liste des projets et peut être modifié par les admins et managers depuis la fiche projet.",
      en: "A project can have 4 statuses: Active, Completed, On hold, or Cancelled. The status is visible on the project list and can be changed by admins and managers from the project detail.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["marge", "margin", "rentabilité projet", "profit projet", "marge brute", "gross margin", "marge %"],
    response: {
      fr: "La marge brute d'un projet = montant facturé − coût réel. Le pourcentage de marge = marge brute / montant facturé × 100. Ces valeurs sont recalculées automatiquement à chaque mise à jour des données.",
      en: "A project's gross margin = invoiced amount − real cost. Margin % = gross margin / invoiced amount × 100. These values are recalculated automatically each time data is updated.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["importer projets", "import projets", "import projects", "bulk project import", "excel projets"],
    response: {
      fr: "Les projets peuvent être importés en masse via un fichier Excel depuis la page Projets (bouton 'Importer'). Le fichier doit contenir les colonnes standard de projet. Seuls les admins et managers peuvent effectuer cet import.",
      en: "Projects can be bulk imported via an Excel file from the Projects page (Import button). The file must contain standard project columns. Only admins and managers can perform this import.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Aller aux projets", en: "Go to Projects" },
  },

  // ── PACE INDEX (PROJECT) ──────────────────────────────────────────────────
  {
    keywords: ["pace", "pace index", "dépassement", "sur-budget", "suivi projet", "avancement projet", "alerte projet", "overbudget", "over budget"],
    response: {
      fr: "Le Pace Index mesure l'avancement réel vs budget :\n• Vert : < 0.8 (en avance)\n• Jaune : 0.8–1.0 (dans les clous)\n• Orange : 1.0–1.2 (léger dépassement)\n• Rouge : > 1.2 (dépassement critique)\n\nFormule : (heures consommées / budget heures) / ratio temps écoulé",
      en: "The Pace Index measures actual vs budget progress:\n• Green: < 0.8 (ahead)\n• Yellow: 0.8–1.0 (on track)\n• Orange: 1.0–1.2 (slight overrun)\n• Red: > 1.2 (critical overrun)\n\nFormula: (hours consumed / budget hours) / elapsed time ratio",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["alerte pace", "pace alert", "seuil alerte", "50%", "75%", "90%", "110%", "notification dépassement", "email dépassement"],
    response: {
      fr: "Des alertes email sont envoyées automatiquement au partenaire responsable lorsqu'un projet atteint 50%, 75%, 90% ou 110% de son budget. Chaque seuil n'est déclenché qu'une seule fois et est enregistré dans l'historique du projet.",
      en: "Email alerts are automatically sent to the responsible partner when a project reaches 50%, 75%, 90%, or 110% of its budget. Each threshold fires only once and is recorded in the project history.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },

  // ── PACE INDEX (CLIENT) ───────────────────────────────────────────────────
  {
    keywords: ["pace client", "pace index client", "suivi client", "rentabilité client", "projection fin d'année", "client pace", "year-end projection", "profit prediction", "projection annuelle"],
    response: {
      fr: "Le pace index client croise le budget annuel (heures internes/client) avec les heures réelles des feuilles de temps :\n• Vert : avgPace ≤ 0.85\n• Jaune : 0.86–1.0\n• Rouge : > 1.0\n\nIl projette la consommation en fin d'année et calcule le profit attendu en TND.",
      en: "The client pace index cross-references the annual budget (internal/client hours) with actual timesheet hours:\n• Green: avgPace ≤ 0.85\n• Yellow: 0.86–1.0\n• Red: > 1.0\n\nIt projects year-end consumption and calculates expected profit in TND.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },
  {
    keywords: ["alerte pace client", "envoyer alerte client", "email client pace", "notifier collaborateur client"],
    response: {
      fr: "Depuis la vue d'ensemble, vous pouvez envoyer manuellement une alerte de pace client. Elle est envoyée par email au collaborateur principal et secondaire du client avec le détail du statut (heures consommées, projection, profit attendu).",
      en: "From the overview, you can manually send a client pace alert. It is emailed to the client's primary and secondary collaborator with status details (hours consumed, projection, expected profit).",
    },
    route: "/dashboard",
    linkLabel: { fr: "Envoyer une alerte", en: "Send Alert" },
  },

  // ── ANNUAL BUDGET ─────────────────────────────────────────────────────────
  {
    keywords: ["budget annuel", "budget client", "allocation annuelle", "importer budget", "annual budget", "client budget", "liste des budgets", "heures internes", "heures client"],
    response: {
      fr: "Le budget annuel définit pour chaque client :\n• Les heures internes estimées par mois (charge B2A)\n• Les heures facturées au client par mois\n• Le budget financier total en TND\n• Le collaborateur principal et secondaire\n\nImportez-le via un fichier Excel ('liste des budgets.xlsx').",
      en: "The annual budget defines per client:\n• Estimated internal hours per month (B2A workload)\n• Billed client hours per month\n• Total financial budget in TND\n• Primary and secondary collaborator\n\nImport it via Excel file ('liste des budgets.xlsx').",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique d'import", en: "View Import History" },
  },
  {
    keywords: ["format budget", "colonnes budget", "budget excel format", "excel budget import"],
    response: {
      fr: "Le fichier de budget annuel doit contenir les colonnes : Annee, Client, Collaborateur, CollaborateursSecondaires, Budget (TND), Budgethoraireestime (h/mois internes), Budgetenvaleur (h/mois facturés client). La clé d'upsert est Annee + Client.",
      en: "The annual budget file must contain: Annee, Client, Collaborateur, CollaborateursSecondaires, Budget (TND), Budgethoraireestime (internal h/month), Budgetenvaleur (client billed h/month). The upsert key is Annee + Client.",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique", en: "View History" },
  },

  // ── STAFF ─────────────────────────────────────────────────────────────────
  {
    keywords: ["personnel", "staff", "collaborateur", "expert", "employé", "équipe", "liste du personnel", "employee", "team member", "worker", "liste staff"],
    response: {
      fr: "La page Personnel liste tous les collaborateurs avec leur niveau (Junior/Mid/Senior/Partner), spécialisation, taux horaire, charge actuelle et indicateurs de burnout. Cliquez sur un profil pour voir tous les détails RH.",
      en: "The Staff page lists all collaborators with their level (Junior/Mid/Senior/Partner), specialization, hourly rate, current workload, and burnout indicators. Click a profile to see full HR details.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Aller au personnel", en: "Go to Staff" },
  },
  {
    keywords: ["ajouter collaborateur", "créer collaborateur", "ajouter employé", "nouveau staff", "add staff", "create staff", "new employee"],
    response: {
      fr: "Pour ajouter un collaborateur, cliquez sur 'Ajouter un membre' sur la page Personnel (réservé aux admins). Renseignez le nom, email, rôle (admin/manager/collaborateur/worker), niveau et taux horaire. Un mot de passe initial est défini lors de la création.",
      en: "To add a collaborator, click 'Add Staff Member' on the Staff page (admin only). Fill in name, email, role (admin/manager/collaborator/worker), level, and hourly rate. An initial password is set during creation.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Aller au personnel", en: "Go to Staff" },
  },
  {
    keywords: ["taux horaire", "cout horaire", "hourly rate", "cout heure", "tarif horaire", "rate"],
    response: {
      fr: "Le taux horaire (coutHoraire en TND) de chaque expert est utilisé pour calculer le coût réel des projets et les prédictions du Team Builder. Il est défini dans le profil du collaborateur (admin uniquement).",
      en: "Each expert's hourly rate (coutHoraire in TND) is used to calculate actual project costs and Team Builder predictions. It is set in the collaborator's profile (admin only).",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },
  {
    keywords: ["niveau", "junior", "senior", "mid", "partner", "level", "grade"],
    response: {
      fr: "Les collaborateurs ont 4 niveaux : Junior, Mid, Senior et Partner. Le niveau influence le filtrage dans le Team Builder et les alertes de burnout. Il est visible sur la carte du personnel et dans le profil.",
      en: "Collaborators have 4 levels: Junior, Mid, Senior, and Partner. The level influences filtering in the Team Builder and burnout alerts. It appears on the staff card and in the profile.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },
  {
    keywords: ["burnout", "surcharge", "charge", "risque", "alerte personnel", "workload", "overload", "burnout risk", "flagged burnout"],
    response: {
      fr: "Le système détecte automatiquement les collaborateurs à risque de burnout selon leur charge de travail (heures ce mois-ci). Un badge d'alerte rouge apparaît sur leur carte. Consultez la page Personnel pour voir les alertes actives et les raisons.",
      en: "The system automatically detects collaborators at burnout risk based on their monthly workload. A red alert badge appears on their card. Go to the Staff page to see active alerts and reasons.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },
  {
    keywords: ["avatar", "photo profil", "photo collaborateur", "profile picture", "upload photo", "changer photo"],
    response: {
      fr: "Vous pouvez uploader une photo de profil depuis la fiche d'un collaborateur (admin/manager). Le fichier doit être JPEG, PNG ou WebP et ne pas dépasser 500 Ko.",
      en: "You can upload a profile picture from a collaborator's profile page (admin/manager). The file must be JPEG, PNG, or WebP and not exceed 500 KB.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },
  {
    keywords: ["profil collaborateur", "fiche expert", "staff profile", "expert profile", "détail staff"],
    response: {
      fr: "La fiche d'un collaborateur affiche ses informations RH complètes : données civiles (CIN, CNSS, date de naissance), contrat, département, spécialisations, charge actuelle, total heures et indicateurs de burnout.",
      en: "A collaborator's profile shows complete HR information: civil data (CIN, CNSS, date of birth), contract, department, specializations, current workload, total hours, and burnout indicators.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },

  // ── CLIENTS ───────────────────────────────────────────────────────────────
  {
    keywords: ["client", "clients", "liste clients", "fiche client", "répertoire clients", "client list", "client profile", "client directory"],
    response: {
      fr: "La page Clients contient le répertoire complet avec informations légales et fiscales (SIRET, forme juridique, régime TVA, pays…). Vous pouvez créer, modifier, supprimer ou importer des clients en masse.",
      en: "The Clients page contains the full directory with legal and tax information (SIRET, legal form, VAT regime, country…). You can create, edit, delete, or bulk import clients.",
    },
    route: "/dashboard/clients",
    linkLabel: { fr: "Aller aux clients", en: "Go to Clients" },
  },
  {
    keywords: ["ajouter client", "créer client", "nouveau client", "add client", "create client", "new client"],
    response: {
      fr: "Pour ajouter un client, cliquez sur 'Nouveau client' sur la page Clients (admin/manager). Renseignez le nom (obligatoire), secteur, contact, et informations légales. Un ExternalId peut être défini pour la liaison avec les imports Excel.",
      en: "To add a client, click 'New client' on the Clients page (admin/manager). Fill in name (required), sector, contact, and legal information. An ExternalId can be set to link with Excel imports.",
    },
    route: "/dashboard/clients",
    linkLabel: { fr: "Aller aux clients", en: "Go to Clients" },
  },
  {
    keywords: ["importer clients", "import clients", "bulk client import", "excel clients", "import excel client"],
    response: {
      fr: "Les clients peuvent être importés en masse via un fichier Excel depuis la page Clients. Les colonnes requises incluent : Nom, Secteur, Téléphone, Email, Adresse, SIRET, Forme Juridique, ExternalId (clé d'upsert).",
      en: "Clients can be bulk imported via an Excel file from the Clients page. Required columns include: Nom, Secteur, Téléphone, Email, Adresse, SIRET, Forme Juridique, ExternalId (upsert key).",
    },
    route: "/dashboard/clients",
    linkLabel: { fr: "Aller aux clients", en: "Go to Clients" },
  },

  // ── ASSIGNMENTS ───────────────────────────────────────────────────────────
  {
    keywords: ["affectation", "affectations", "assignation", "assigner", "attribuer", "lier expert projet", "assignment", "assignments", "assign", "qui travaille sur"],
    response: {
      fr: "La page Affectations montre toutes les liaisons expert ↔ projet. Vous pouvez filtrer par expert ou par projet, et voir la liste groupée. Les affectations sont reconstruites automatiquement depuis les données de temps.",
      en: "The Assignments page shows all expert ↔ project links. You can filter by expert or by project and view the grouped list. Assignments are automatically rebuilt from time data.",
    },
    route: "/dashboard/assignments",
    linkLabel: { fr: "Aller aux affectations", en: "Go to Assignments" },
  },

  // ── ROLES & PERMISSIONS ───────────────────────────────────────────────────
  {
    keywords: ["rôle", "permission", "droits", "accès", "admin", "manager", "collaborateur", "worker", "role", "permissions", "access rights", "qui peut faire quoi"],
    response: {
      fr: "La plateforme a 4 rôles :\n• Admin : accès complet (créer/modifier/supprimer tout, audit logs)\n• Manager : créer/modifier projets, clients, staff, envoyer alertes\n• Collaborateur : lecture + upload de ses propres feuilles de temps\n• Worker : accès en lecture uniquement",
      en: "The platform has 4 roles:\n• Admin: full access (create/edit/delete everything, audit logs)\n• Manager: create/edit projects, clients, staff, send alerts\n• Collaborator: read + upload own timesheets\n• Worker: read-only access",
    },
  },
  {
    keywords: ["changer rôle", "modifier rôle", "change role", "update role", "promouvoir", "promote"],
    response: {
      fr: "Seuls les admins peuvent modifier le rôle d'un collaborateur. Accédez à la fiche du collaborateur sur la page Personnel, puis modifiez le champ 'Rôle'.",
      en: "Only admins can change a collaborator's role. Go to the collaborator's profile on the Staff page, then edit the 'Role' field.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },

  // ── ESTIMATION ML ─────────────────────────────────────────────────────────
  {
    keywords: ["estimation", "prédiction", "ml", "machine learning", "estimer", "coût projet", "heures projet", "budget projet", "predict", "cost estimate", "hour estimate", "ia", "intelligence artificielle"],
    response: {
      fr: "La page Estimation utilise un modèle ML (GradientBoosting) pour prédire heures et coût d'un projet selon : type de mission, secteur, complexité (Faible/Moyenne/Élevée/Critique), composition d'équipe et délai strict. Vous obtenez une fourchette optimiste / probable / pessimiste.",
      en: "The Estimation page uses an ML model (GradientBoosting) to predict hours and cost based on: mission type, sector, complexity (Low/Medium/High/Critical), team composition, and strict deadline. You get an optimistic / likely / pessimistic range.",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Aller à l'estimation", en: "Go to Estimation" },
  },
  {
    keywords: ["confiance estimation", "confidence", "high confidence", "low confidence", "fiabilité prédiction", "similarité projets"],
    response: {
      fr: "Le niveau de confiance de l'estimation dépend du nombre de projets similaires dans la base :\n• Élevée : ≥ 30 projets similaires\n• Moyenne : ≥ 10 projets\n• Faible : < 10 projets\n\nLes 5 projets les plus similaires sont affichés pour référence.",
      en: "The estimation confidence level depends on the number of similar past projects:\n• High: ≥ 30 similar projects\n• Medium: ≥ 10 projects\n• Low: < 10 projects\n\nThe 5 most similar projects are shown for reference.",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Voir l'estimation", en: "View Estimation" },
  },
  {
    keywords: ["réentraîner", "retraining", "retrain", "nouveau modèle ml", "mise à jour modèle", "actualiser ml", "10 projets"],
    response: {
      fr: "Le modèle ML se réentraîne automatiquement tous les 10 nouveaux projets terminés. Un admin peut aussi déclencher manuellement le réentraînement depuis la page Estimation en important des données historiques supplémentaires.",
      en: "The ML model is automatically retrained every 10 newly completed projects. An admin can also manually trigger retraining from the Estimation page by importing additional historical data.",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Aller à l'estimation", en: "Go to Estimation" },
  },
  {
    keywords: ["complexité", "complexity", "faible", "moyenne", "élevée", "critique", "low complexity", "high complexity"],
    response: {
      fr: "La complexité du projet est un paramètre clé de l'estimation ML. Elle peut être : Faible, Moyenne, Élevée ou Critique. Elle influence directement les fourchettes d'heures et de coût prédites.",
      en: "Project complexity is a key ML estimation parameter. It can be: Low, Medium, High, or Critical. It directly influences the predicted hours and cost ranges.",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Estimer un projet", en: "Estimate a Project" },
  },

  // ── TEAM BUILDER ──────────────────────────────────────────────────────────
  {
    keywords: ["team builder", "constituer équipe", "composer équipe", "mission", "sélectionner collaborateurs", "build team", "team composition", "former équipe"],
    response: {
      fr: "Le Team Builder vous aide à composer une équipe en se basant sur les taux horaires réels et l'expérience passée. Choisissez un type de mission et le système suggère les collaborateurs les plus adaptés avec leur coût estimé.",
      en: "The Team Builder helps compose a team based on real hourly rates and past experience. Select a mission type and the system suggests the most suitable collaborators with their estimated cost.",
    },
    route: "/dashboard/team-builder",
    linkLabel: { fr: "Aller au team builder", en: "Go to Team Builder" },
  },

  // ── AUDIT LOGS ────────────────────────────────────────────────────────────
  {
    keywords: ["audit", "journal", "historique actions", "logs", "traçabilité", "qui a fait quoi", "audit logs", "activity log", "action history", "journal d'audit"],
    response: {
      fr: "Le Journal d'audit (admin uniquement) affiche toutes les actions des 365 derniers jours : créations, modifications (avec diff des champs modifiés), suppressions, imports, connexions, emails envoyés. Vous pouvez filtrer par utilisateur, action, ressource ou période.",
      en: "The Audit Logs (admin only) shows all actions from the last 365 days: creates, updates (with field diff), deletes, imports, logins, emails sent. You can filter by user, action, resource, or date range.",
    },
    route: "/dashboard/audit-logs",
    linkLabel: { fr: "Voir les logs d'audit", en: "View Audit Logs" },
  },
  {
    keywords: ["qui a supprimé", "qui a modifié", "qui a créé", "historique modification", "diff champs", "field changes", "what changed"],
    response: {
      fr: "Le journal d'audit enregistre le diff exact pour chaque modification : champ par champ, ancienne valeur et nouvelle valeur. Recherchez l'action 'UPDATE' sur la ressource concernée pour voir ces détails.",
      en: "The audit log records the exact diff for each update: field by field, old value and new value. Search for the 'UPDATE' action on the relevant resource to see these details.",
    },
    route: "/dashboard/audit-logs",
    linkLabel: { fr: "Voir les logs", en: "View Logs" },
  },
  {
    keywords: ["durée conservation logs", "rétention audit", "combien de temps logs", "365 jours", "1 an logs"],
    response: {
      fr: "Les logs d'audit sont conservés pendant 365 jours. Au-delà, ils sont supprimés automatiquement par MongoDB (index TTL). Il n'est pas possible d'étendre cette durée sans modification de la base de données.",
      en: "Audit logs are retained for 365 days. Beyond that, they are automatically deleted by MongoDB (TTL index). Extending this period requires a database schema change.",
    },
    route: "/dashboard/audit-logs",
    linkLabel: { fr: "Voir les logs", en: "View Logs" },
  },

  // ── PROFILE ───────────────────────────────────────────────────────────────
  {
    keywords: ["profil", "mon compte", "modifier mot de passe", "changer mot de passe", "avatar", "photo", "profile", "my account", "password", "change password", "mes informations"],
    response: {
      fr: "Sur la page Profil, vous pouvez modifier vos informations personnelles, changer votre mot de passe et mettre à jour votre photo de profil (JPEG/PNG/WebP, max 500 Ko).",
      en: "On the Profile page, you can update your personal information, change your password, and upload a new profile picture (JPEG/PNG/WebP, max 500 KB).",
    },
    route: "/dashboard/profile",
    linkLabel: { fr: "Aller à mon profil", en: "Go to My Profile" },
  },

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  {
    keywords: ["notification", "cloche", "badge", "alerte", "bell", "badge notification", "alertes en temps réel", "unread"],
    response: {
      fr: "La cloche de notifications en haut à droite affiche 4 types d'alertes :\n• Clients hors budget (pace rouge)\n• Feuilles de temps en attente\n• Collaborateurs à risque de burnout\n• Projets à risque (pace jaune/rouge)\n\nLes données sont rafraîchies toutes les 5 minutes.",
      en: "The notification bell in the top right shows 4 alert types:\n• Over-budget clients (red pace)\n• Pending timesheets\n• Staff at burnout risk\n• At-risk projects (yellow/red pace)\n\nData is refreshed every 5 minutes.",
    },
  },
  {
    keywords: ["email", "envoyer email", "alerte email", "rappel email", "send email", "email alert", "email reminder", "notification email"],
    response: {
      fr: "La plateforme envoie deux types d'emails :\n1. Rappel de feuilles de temps (fin de mois, auto) → tous les admins\n2. Alerte pace client (manuel depuis la vue d'ensemble) → collaborateur principal + secondaire du client",
      en: "The platform sends two types of emails:\n1. Timesheet reminders (end of month, automatic) → all admins\n2. Client pace alerts (manual from overview) → primary + secondary client collaborator",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },
  {
    keywords: ["marquer lu", "mark as read", "effacer notifications", "dismiss notifications", "vider notifications"],
    response: {
      fr: "Dans le panneau de notifications, vous pouvez marquer toutes les alertes comme lues en cliquant sur 'Tout marquer comme lu'. Chaque notification peut aussi être fermée individuellement avec le bouton ×.",
      en: "In the notifications panel, you can mark all alerts as read by clicking 'Mark all as read'. Each notification can also be individually dismissed with the × button.",
    },
  },

  // ── SESSION & AUTH ────────────────────────────────────────────────────────
  {
    keywords: ["connexion", "login", "se connecter", "sign in", "authentification"],
    response: {
      fr: "Connectez-vous avec votre email et mot de passe sur la page de connexion. Après 5 tentatives échouées, votre compte est verrouillé 15 minutes. Votre session dure 8 heures.",
      en: "Log in with your email and password on the login page. After 5 failed attempts, your account is locked for 15 minutes. Your session lasts 8 hours.",
    },
  },
  {
    keywords: ["mot de passe oublié", "réinitialiser mot de passe", "forgot password", "reset password", "lien réinitialisation"],
    response: {
      fr: "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Entrez votre email et un lien de réinitialisation vous sera envoyé. Le lien est valable un temps limité. Cliquez dessus pour définir un nouveau mot de passe.",
      en: "On the login page, click 'Forgot password'. Enter your email and a reset link will be sent. The link is valid for a limited time. Click it to set a new password.",
    },
  },
  {
    keywords: ["déconnexion", "logout", "se déconnecter", "fermer session", "sign out"],
    response: {
      fr: "Cliquez sur 'Se déconnecter' en bas du menu latéral. La déconnexion est synchronisée sur tous les onglets ouverts : tous les onglets de la plateforme seront redirigés vers la page de connexion.",
      en: "Click 'Sign out' at the bottom of the sidebar. Logout is synced across all open tabs: all platform tabs will redirect to the login page.",
    },
  },
  {
    keywords: ["inactivité", "session expirée", "session expire", "inactivity", "session timeout", "déconnexion automatique"],
    response: {
      fr: "La session se ferme automatiquement après 15 minutes d'inactivité (aucun mouvement de souris, frappe clavier ou scroll). Un message 'Session expirée' s'affiche à la reconnexion.",
      en: "The session closes automatically after 15 minutes of inactivity (no mouse movement, keystroke, or scroll). A 'Session expired' message is shown upon reconnection.",
    },
  },
  {
    keywords: ["tentatives connexion", "compte bloqué", "verrouillage", "failed attempts", "account locked", "brute force"],
    response: {
      fr: "Après 5 tentatives de connexion échouées, le compte est verrouillé pendant 15 minutes. Les tentatives sont enregistrées dans le journal d'audit avec l'action LOGIN_FAILED.",
      en: "After 5 failed login attempts, the account is locked for 15 minutes. Attempts are recorded in the audit log with the LOGIN_FAILED action.",
    },
    route: "/dashboard/audit-logs",
    linkLabel: { fr: "Voir les logs", en: "View Logs" },
  },

  // ── THEME & LANGUAGE ──────────────────────────────────────────────────────
  {
    keywords: ["thème", "mode sombre", "mode clair", "dark mode", "light mode", "theme", "dark", "light"],
    response: {
      fr: "Le bouton de thème (icône soleil/lune) se trouve en haut à droite dans la barre d'en-tête. Le thème choisi est sauvegardé automatiquement dans votre navigateur.",
      en: "The theme button (sun/moon icon) is in the top right of the header. Your chosen theme is automatically saved in your browser.",
    },
  },
  {
    keywords: ["langue", "language", "francais", "english", "fr", "en", "changer langue", "switch language"],
    response: {
      fr: "Le sélecteur de langue EN/FR se trouve à côté du bouton de thème, en haut à droite. Il est disponible sur toutes les pages. La langue est sauvegardée dans votre navigateur.",
      en: "The EN/FR language selector is next to the theme button, top right. It is available on every page. The language choice is saved in your browser.",
    },
  },

  // ── SIDEBAR ───────────────────────────────────────────────────────────────
  {
    keywords: ["menu", "sidebar", "navigation", "menu latéral", "réduire menu", "collapse sidebar", "réduire barre"],
    response: {
      fr: "Le menu latéral peut être réduit (mode icônes seules) en cliquant sur le bouton hamburger en haut à gauche dans la barre d'en-tête. La navigation reste entièrement accessible via les icônes avec tooltip.",
      en: "The sidebar can be collapsed (icon-only mode) by clicking the hamburger button at the top left of the header. Navigation remains fully accessible via icons with tooltips.",
    },
  },

  // ── CALCULATIONS ─────────────────────────────────────────────────────────

  {
    keywords: ["calcul pace index projet", "formule pace", "pace formula", "comment calculé pace", "how is pace calculated", "elapsed ratio", "ratio temps écoulé"],
    response: {
      fr: "Formule du Pace Index projet :\n\n1. elapsedRatio = clamp((aujourd'hui − dateDebut) / (dateFin − dateDebut), 0.05, 1.0)\n2. paceIndexHeures = (heuresConsommées / budgetHeures) / elapsedRatio\n3. paceIndexCoût = (coûtConsommé / budgetCoût) / elapsedRatio\n\nLes deux valeurs sont plafonnées à 5. Le clamp 0.05 évite la division par zéro en tout début de projet.",
      en: "Project Pace Index formula:\n\n1. elapsedRatio = clamp((today − startDate) / (endDate − startDate), 0.05, 1.0)\n2. paceIndexHours = (hoursConsumed / budgetHours) / elapsedRatio\n3. paceIndexCost = (costConsumed / budgetCost) / elapsedRatio\n\nBoth values are capped at 5. The 0.05 clamp avoids division by zero at the very start of a project.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["couleur pace", "pace color", "seuil couleur", "vert jaune orange rouge", "green yellow orange red pace", "code couleur pace"],
    response: {
      fr: "Codes couleur du Pace Index :\n• Vert   : pace < 0.8   → projet en avance sur le budget\n• Jaune  : 0.8 ≤ pace ≤ 1.0 → dans les clous\n• Orange : 1.0 < pace ≤ 1.2 → léger dépassement\n• Rouge  : pace > 1.2   → dépassement critique\n\nCes seuils s'appliquent aux deux axes : heures et coût.",
      en: "Pace Index color thresholds:\n• Green  : pace < 0.8   → project ahead of budget\n• Yellow : 0.8 ≤ pace ≤ 1.0 → on track\n• Orange : 1.0 < pace ≤ 1.2 → slight overrun\n• Red    : pace > 1.2   → critical overrun\n\nThese thresholds apply to both axes: hours and cost.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["calcul marge", "formule marge", "gross margin formula", "marge brute calcul", "margin calculation", "effectivecostperhour", "coût horaire effectif"],
    response: {
      fr: "Calculs de marge d'un projet :\n\n• Marge brute = montantFacturé − coûtRéel\n• % Marge = (marge brute / montantFacturé) × 100\n• Coût horaire effectif = coûtConsommé / heuresConsommées\n\nCes valeurs sont recalculées automatiquement à chaque mise à jour de données.",
      en: "Project margin calculations:\n\n• Gross margin = invoicedAmount − realCost\n• Margin % = (gross margin / invoicedAmount) × 100\n• Effective cost per hour = costConsumed / hoursConsumed\n\nThese values are recalculated automatically on every data update.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["calcul pace client", "formule pace client", "client pace formula", "pace ratio mensuel", "monthly pace ratio", "avgpace", "pace moyen"],
    response: {
      fr: "Formule du Pace Index client (mensuel) :\n\n• paceRatio (mois M) = heuresConsomméesM / heuresInternesM\n• avgPace = moyenne des paceRatio sur tous les mois écoulés\n\nSanté client :\n• Vert   : avgPace ≤ 0.85\n• Jaune  : 0.86 ≤ avgPace ≤ 1.0\n• Rouge  : avgPace > 1.0",
      en: "Client Pace Index formula (monthly):\n\n• paceRatio (month M) = consumedHoursM / internalHoursM\n• avgPace = average paceRatio over all elapsed months\n\nClient health:\n• Green  : avgPace ≤ 0.85\n• Yellow : 0.86 ≤ avgPace ≤ 1.0\n• Red    : avgPace > 1.0",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },
  {
    keywords: ["projection fin d'année", "year-end projection formula", "formule projection", "calcul projection annuelle", "mois restants", "remaining months"],
    response: {
      fr: "Projection de consommation en fin d'année :\n\nProjection = heuresConsomméesYTD + avgPace × heuresInternes × moisRestants\n\nPrédiction de profit :\n• surplusHeures = totalHeuresClient − projection\n• profit (TND) = surplusHeures × (budgetFinancier / totalHeuresClient)",
      en: "Year-end consumption projection:\n\nProjection = ytdConsumed + avgPace × internalHours × remainingMonths\n\nProfit prediction:\n• surplusHours = totalClientHours − projection\n• profit (TND) = surplusHours × (financialBudget / totalClientHours)",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },
  {
    keywords: ["calcul charge", "currentload", "charge actuelle", "workload calculation", "comment calculé charge", "heures mois", "recalculer charges"],
    response: {
      fr: "La charge actuelle d'un collaborateur (currentLoad) est la somme de ses heures sur la période active en cours. Elle agrège les données de deux sources :\n• TimeEntry (imports Excel legacy)\n• Timesheet (uploads individuels)\n\nElle est recalculée automatiquement après chaque upload de feuille de temps.",
      en: "A collaborator's current workload (currentLoad) is the sum of their hours for the current active period. It aggregates data from two sources:\n• TimeEntry (legacy Excel imports)\n• Timesheet (individual uploads)\n\nIt is recalculated automatically after every timesheet upload.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },
  {
    keywords: ["calcul alerte seuil", "threshold alert calculation", "50 75 90 110 calcul", "quand alerte envoyée", "when alert sent", "seuil dépassement"],
    response: {
      fr: "Les alertes de dépassement projet sont déclenchées quand :\n\n• (heuresConsommées / budgetHeures) × 100 atteint 50%, 75%, 90% ou 110%\n\nChaque seuil n'est envoyé qu'une seule fois (enregistré dans Project.alertsSent). L'email est adressé au partenaire responsable du projet.",
      en: "Project overrun alerts are triggered when:\n\n• (hoursConsumed / budgetHours) × 100 reaches 50%, 75%, 90%, or 110%\n\nEach threshold fires only once (recorded in Project.alertsSent). The email is sent to the project's responsible partner.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["calcul ml", "algorithme estimation", "gradient boosting", "quantile regression", "knn", "nearest neighbors", "modèle ml", "ml algorithm"],
    response: {
      fr: "L'estimation ML utilise 6 modèles :\n\n• model_hours_q10 → GradientBoosting (α=0.05) → heures optimistes\n• model_hours_q50 → GradientBoosting (α=0.50) → heures probables\n• model_hours_q90 → GradientBoosting (α=0.95) → heures pessimistes\n• model_cost → GradientBoosting → coût réel\n• knn (k=6, euclidien) → 5 projets passés les plus similaires\n• scaler → StandardScaler pour normaliser les features",
      en: "The ML estimation uses 6 models:\n\n• model_hours_q10 → GradientBoosting (α=0.05) → optimistic hours\n• model_hours_q50 → GradientBoosting (α=0.50) → likely hours\n• model_hours_q90 → GradientBoosting (α=0.95) → pessimistic hours\n• model_cost → GradientBoosting → actual cost\n• knn (k=6, euclidean) → 5 most similar past projects\n• scaler → StandardScaler to normalize features",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Voir l'estimation", en: "View Estimation" },
  },
  {
    keywords: ["confiance ml", "confidence level", "calcul confiance", "nb similar", "nombre projets similaires", "high medium low confidence"],
    response: {
      fr: "Le niveau de confiance de l'estimation est déterminé par le nombre de projets similaires trouvés par le KNN :\n\n• Élevée  : ≥ 30 projets similaires\n• Moyenne : ≥ 10 projets similaires\n• Faible  : < 10 projets similaires\n\nPlus la base de données contient de projets terminés, plus la confiance augmente.",
      en: "The estimation confidence level is determined by the number of similar projects found by the KNN:\n\n• High   : ≥ 30 similar projects\n• Medium : ≥ 10 similar projects\n• Low    : < 10 similar projects\n\nThe more completed projects in the database, the higher the confidence.",
    },
    route: "/dashboard/estimation",
    linkLabel: { fr: "Voir l'estimation", en: "View Estimation" },
  },
  {
    keywords: ["plafond 5 pace", "cap pace", "pace capped", "pace max", "pace plafonné", "pourquoi 5 pace"],
    response: {
      fr: "Le Pace Index est plafonné à 5 pour éviter que des valeurs extrêmes (ex. projet démarré il y a 2 jours avec beaucoup d'heures) ne faussent les graphiques et le classement. Un pace de 5 signifie déjà un dépassement massif.",
      en: "The Pace Index is capped at 5 to prevent extreme outliers (e.g. a project started 2 days ago with many hours logged) from distorting charts and rankings. A pace of 5 already indicates a massive overrun.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },
  {
    keywords: ["gain ytd", "gain cumulé", "ytd gain", "top 10 clients gain", "calcul gain annuel", "comment calculé gain"],
    response: {
      fr: "Le gain YTD (année en cours) affiché sur la vue d'ensemble est la somme des marges brutes des 10 clients les plus rentables : Σ (montantFacturé − coûtRéel) pour chaque projet actif/terminé de l'année.",
      en: "The YTD gain shown on the overview is the sum of gross margins for the top 10 most profitable clients: Σ (invoicedAmount − realCost) for each active/completed project of the year.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── GENERAL HELP ─────────────────────────────────────────────────────────
  {
    keywords: ["aide", "help", "comment utiliser", "how to use", "guide", "tutoriel", "tutorial", "je ne sais pas", "i don't know", "expliquer"],
    response: {
      fr: "Je suis le guide B2A et je peux vous aider sur tous les sujets de la plateforme. Essayez de me poser une question précise, par exemple :\n• « Comment importer une feuille de temps ? »\n• « Qu'est-ce que le pace index ? »\n• « Qui peut accéder aux logs d'audit ? »",
      en: "I'm the B2A guide and can help with any platform topic. Try asking a specific question, for example:\n• \"How do I upload a timesheet?\"\n• \"What is the pace index?\"\n• \"Who can access the audit logs?\"",
    },
  },
];

// ── NEW INTENTS ──────────────────────────────────────────────────────────────

intents.push(

  // ── BURNOUT THRESHOLD / FORMULA ──────────────────────────────────────────
  {
    keywords: [
      "seuil burnout", "burnout threshold", "comment détecté burnout", "how burnout detected",
      "burnout calcul", "burnout formula", "burnout calculation", "quand burnout déclenché",
      "when burnout triggered", "heures burnout", "burnout hours limit", "limite burnout",
      "critère burnout", "burnout criteria", "raison burnout", "burnout reason",
      "comment calculé burnout", "how is burnout calculated",
    ],
    response: {
      fr: "Calcul du burnout :\n\nUn collaborateur est signalé à risque de burnout quand sa charge actuelle (currentLoad) dépasse le seuil mensuel normal, qui est estimé à 160–180 heures/mois pour un temps plein.\n\n• currentLoad = somme des heures sur la période active en cours\n• Si currentLoad > seuil → badge rouge 🔴 sur la carte du personnel\n\nLes raisons sont affichées sur la fiche du collaborateur (page Personnel).",
      en: "Burnout calculation:\n\nA collaborator is flagged at burnout risk when their current workload (currentLoad) exceeds the normal monthly threshold, estimated at 160–180 h/month for full-time.\n\n• currentLoad = sum of hours for the current active period\n• If currentLoad > threshold → red badge 🔴 on the staff card\n\nReasons are shown on the collaborator's profile (Staff page).",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },

  // ── REAL COST FORMULA ────────────────────────────────────────────────────
  {
    keywords: [
      "coût réel", "real cost", "cout reel", "comment calculé coût", "how is cost calculated",
      "calcul coût réel", "real cost formula", "coût consommé", "cost consumed",
      "coût projet calculé", "project cost calculation", "comment coût calculé",
      "taux horaire coût", "hourly rate cost", "coût par heure",
    ],
    response: {
      fr: "Formule du coût réel d'un projet :\n\ncoûtRéel = Σ (heuresParExpert × coutHoraireExpert)\n\nPour chaque expert affecté au projet :\n• On récupère ses heures consommées depuis les Timesheets / TimeEntries\n• On les multiplie par son taux horaire (coutHoraire en TND)\n• Le total est sommé sur tous les experts\n\nCe calcul est mis à jour automatiquement à chaque nouvel import de données.",
      en: "Real project cost formula:\n\nrealCost = Σ (hoursPerExpert × expertHourlyRate)\n\nFor each expert assigned to the project:\n• Their consumed hours are pulled from Timesheets / TimeEntries\n• Multiplied by their hourly rate (coutHoraire in TND)\n• Summed across all experts\n\nThis is recalculated automatically on every data import.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },

  // ── TEAM BUILDER COST FORMULA ────────────────────────────────────────────
  {
    keywords: [
      "coût team builder", "team builder cost", "coût équipe", "team cost",
      "comment calculé coût équipe", "how team cost calculated", "estimation team",
      "team builder formule", "team builder formula", "coût mission team",
      "team builder calcul", "calcul équipe",
    ],
    response: {
      fr: "Formule du coût estimé dans le Team Builder :\n\ncoûtEstimé = Σ (heuresEstiméesParMembre × coutHoraireMembre)\n\n• Les heures estimées sont basées sur l'historique des missions similaires\n• Le taux horaire de chaque membre est issu de son profil (coutHoraire en TND)\n• La composition optimale est suggérée pour minimiser le coût tout en maintenant la qualité selon le type de mission",
      en: "Team Builder estimated cost formula:\n\nestimatedCost = Σ (estimatedHoursPerMember × memberHourlyRate)\n\n• Estimated hours are based on similar past mission history\n• Each member's hourly rate comes from their profile (coutHoraire in TND)\n• The optimal composition is suggested to minimize cost while maintaining quality for the mission type",
    },
    route: "/dashboard/team-builder",
    linkLabel: { fr: "Aller au team builder", en: "Go to Team Builder" },
  },

  // ── WHAT IS B2A / PLATFORM DESCRIPTION ──────────────────────────────────
  {
    keywords: [
      "qu'est-ce que b2a", "what is b2a", "c'est quoi b2a", "plateforme b2a",
      "b2a platform", "à quoi sert b2a", "what does b2a do", "présentation plateforme",
      "platform overview", "b2a description", "b2a dashboard", "présentation b2a",
      "about b2a", "b2a features", "fonctionnalités b2a",
    ],
    response: {
      fr: "B2A est une plateforme de gestion de cabinet de conseil qui centralise :\n\n• 📊 Suivi des projets (pace index, budget, marges)\n• ⏱️ Fiches horaires des collaborateurs\n• 👥 Gestion du personnel et burnout\n• 💰 Budget annuel par client\n• 🤖 Estimation ML de projets\n• 🏗️ Team Builder\n• 📋 Clients & affectations\n• 🔍 Audit logs & notifications\n\nLa plateforme supporte 4 rôles : Admin, Manager, Collaborateur et Worker.",
      en: "B2A is a consulting firm management platform that centralizes:\n\n• 📊 Project tracking (pace index, budget, margins)\n• ⏱️ Collaborator timesheets\n• 👥 Staff management and burnout detection\n• 💰 Annual client budget\n• 🤖 ML project estimation\n• 🏗️ Team Builder\n• 📋 Clients & assignments\n• 🔍 Audit logs & notifications\n\nThe platform supports 4 roles: Admin, Manager, Collaborator, and Worker.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Aller au tableau de bord", en: "Go to Dashboard" },
  },

  // ── TOP 10 CHARTS ────────────────────────────────────────────────────────
  {
    keywords: [
      "top 10", "top 10 rentables", "top 10 hors budget", "most profitable",
      "most over budget", "classement projets", "project ranking", "meilleurs projets",
      "worst projects", "projets rentables", "projets dépassement", "top rentabilité",
      "top projets", "graphique classement", "ranking chart",
    ],
    response: {
      fr: "La vue d'ensemble contient deux classements Top 10 :\n\n• Top 10 Rentables : classé par marge brute décroissante (montantFacturé − coûtRéel)\n• Top 10 Hors Budget : classé par dépassement budgétaire décroissant (coûtRéel / budgetCoût)\n\nCes deux graphiques sont limités à l'année en cours et aux projets Actif/Terminé.",
      en: "The overview shows two Top 10 rankings:\n\n• Top 10 Profitable: sorted by descending gross margin (invoicedAmount − realCost)\n• Top 10 Over-Budget: sorted by descending budget overrun (realCost / budgetCost)\n\nBoth charts are limited to the current year and Active/Completed projects.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── HEURES CONSOMMÉES VS BUDGET ──────────────────────────────────────────
  {
    keywords: [
      "heures consommées", "hours consumed", "heures réelles", "actual hours",
      "heures vs budget", "hours vs budget", "consommation heures", "hours consumption",
      "budget heures", "hours budget", "reste heures", "remaining hours",
      "combien d'heures", "how many hours", "heures utilisées",
    ],
    response: {
      fr: "Suivi des heures d'un projet :\n\n• heuresConsommées = somme des heures de tous les experts depuis les Timesheets\n• budgetHeures = heures planifiées définies lors de la création du projet\n• resteHeures = budgetHeures − heuresConsommées\n• % consommé = (heuresConsommées / budgetHeures) × 100\n\nCes valeurs sont visibles dans le détail de chaque projet.",
      en: "Project hours tracking:\n\n• hoursConsumed = sum of all expert hours from Timesheets\n• budgetHours = planned hours defined at project creation\n• remainingHours = budgetHours − hoursConsumed\n• % consumed = (hoursConsumed / budgetHours) × 100\n\nThese values are visible in each project's detail view.",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },

  // ── CURRENCY / TND ────────────────────────────────────────────────────────
  {
    keywords: [
      "tnd", "dinar", "monnaie", "currency", "devise", "dinars tunisiens",
      "tunisian dinar", "unité monétaire", "monetary unit", "€ euro tnd",
      "conversion", "budget tnd",
    ],
    response: {
      fr: "Toutes les valeurs monétaires de la plateforme sont exprimées en TND (Dinar Tunisien). Cela inclut :\n• Les taux horaires des collaborateurs (coutHoraire)\n• Les budgets financiers des clients\n• Les coûts réels et marges des projets\n• Le gain YTD affiché sur la vue d'ensemble",
      en: "All monetary values on the platform are expressed in TND (Tunisian Dinar). This includes:\n• Collaborator hourly rates (coutHoraire)\n• Client financial budgets\n• Project actual costs and margins\n• The YTD gain shown on the overview",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── PACE INDEX PAGE ───────────────────────────────────────────────────────
  {
    keywords: [
      "page pace index", "pace index page", "suivi pace", "pace dashboard",
      "voir pace", "pace projects", "all projects pace", "tableau pace",
      "pace table", "liste pace", "projets par pace",
    ],
    response: {
      fr: "La page Projets affiche le Pace Index de chaque projet sous forme de badge coloré. Vous pouvez trier et filtrer les projets par statut de pace (En avance / Dans les clous / Léger dépassement / Critique). Cliquez sur un projet pour voir le détail complet du pace (heures et coût).",
      en: "The Projects page displays the Pace Index for each project as a colored badge. You can sort and filter projects by pace status (Ahead / On track / Slight overrun / Critical). Click a project to see the full pace breakdown (hours and cost).",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },

  // ── IMPORT EXCEL COLUMNS ──────────────────────────────────────────────────
  {
    keywords: [
      "colonnes excel", "excel columns", "format excel", "excel format",
      "champs requis", "required fields", "colonnes obligatoires", "mandatory columns",
      "structure fichier", "file structure", "modèle excel", "excel template",
    ],
    response: {
      fr: "Colonnes Excel selon le type d'import :\n\n📋 Feuille de temps : Client/Affaire, Date, Consommé, Prestation, Détail\n👥 Clients : Nom, Secteur, Téléphone, Email, Adresse, SIRET, Forme Juridique, ExternalId\n💼 Projets : colonnes standard projet (Nom, Client, Budget, Dates…)\n💰 Budget annuel : Annee, Client, Collaborateur, CollaborateursSecondaires, Budget, Budgethoraireestime, Budgetenvaleur\n\nUtilisez la page Historique d'import pour vérifier les résultats.",
      en: "Excel columns by import type:\n\n📋 Timesheet: Client/Affaire, Date, Consommé (hours), Prestation, Détail\n👥 Clients: Nom, Secteur, Téléphone, Email, Adresse, SIRET, Forme Juridique, ExternalId\n💼 Projects: standard project columns (Name, Client, Budget, Dates…)\n💰 Annual budget: Annee, Client, Collaborateur, CollaborateursSecondaires, Budget, Budgethoraireestime, Budgetenvaleur\n\nUse the Import History page to check results.",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique d'import", en: "View Import History" },
  },

  // ── ACTIVE COLLABORATORS KPI ──────────────────────────────────────────────
  {
    keywords: [
      "collaborateurs actifs", "active collaborators", "kpi collaborateurs",
      "collaborators kpi", "nombre actifs", "active count", "comment compté actifs",
      "how counted active", "qui est actif", "who is active collaborator",
      "définition actif", "active definition",
    ],
    response: {
      fr: "Le KPI 'Collaborateurs actifs' sur la vue d'ensemble compte les experts ayant soumis au moins une feuille de temps au cours du mois en cours. C'est une mesure d'activité réelle, pas du nombre total de collaborateurs dans la base.",
      en: "The 'Active Collaborators' KPI on the overview counts experts who submitted at least one timesheet during the current month. It is a measure of actual activity, not the total number of collaborators in the database.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── ORPHAN CLEANUP ────────────────────────────────────────────────────────
  {
    keywords: [
      "orphelin", "orphan", "nettoyage orphelins", "orphan cleanup",
      "expert orphelin", "orphan expert", "supprimer orphelins",
      "delete orphans", "données orphelines", "orphan data", "cleanup experts",
    ],
    response: {
      fr: "L'outil de nettoyage des experts orphelins est disponible sur la page Historique d'import. Il identifie les experts présents en base mais sans aucune donnée active (pas de feuille de temps, pas de projet actif) et permet de les supprimer en masse. Cette opération est irréversible — réservée aux admins.",
      en: "The orphan expert cleanup tool is available on the Import History page. It identifies experts in the database with no active data (no timesheets, no active projects) and allows bulk deletion. This operation is irreversible — admin only.",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique d'import", en: "View Import History" },
  },

  // ── SECONDARY COLLABORATOR ────────────────────────────────────────────────
  {
    keywords: [
      "collaborateur secondaire", "secondary collaborator", "collaborateur principal",
      "primary collaborator", "collaborateurs secondaires", "qui reçoit alerte client",
      "who receives client alert", "principal secondaire", "backup collaborator",
      "responsable client", "client owner",
    ],
    response: {
      fr: "Chaque client dans le budget annuel est associé à :\n• Un collaborateur principal (responsable du suivi)\n• Un ou plusieurs collaborateurs secondaires (backups)\n\nLes deux reçoivent les alertes pace client (email manuel depuis la vue d'ensemble). Le collaborateur principal est aussi affiché sur la fiche client.",
      en: "Each client in the annual budget is associated with:\n• A primary collaborator (responsible for follow-up)\n• One or more secondary collaborators (backups)\n\nBoth receive client pace alert emails (sent manually from the overview). The primary collaborator is also shown on the client profile.",
    },
    route: "/dashboard/clients",
    linkLabel: { fr: "Voir les clients", en: "View Clients" },
  },

  // ── GENERAL CALCULATIONS ENTRY POINT ─────────────────────────────────────
  {
    keywords: [
      "calcul", "calculs", "calcules", "formule", "formules", "formula", "formulas",
      "comment calculer", "how to calculate", "faire les calculs", "faire les calcules",
      "les formules", "les calculs", "les calcules", "comment calculé",
      "quelles formules", "which formulas", "toutes les formules", "all formulas",
      "calcul comment", "how calculate", "how are things calculated",
      "comment sont calculés", "comment sont calculées",
    ],
    response: {
      fr: "Voici toutes les formules et calculs disponibles. Posez une question précise ou cliquez sur un sujet :\n\n📐 Pace Index projet → \"formule pace index\"\n📐 Pace Index client → \"formule pace client\"\n📐 Projection fin d'année → \"projection fin d'année\"\n📐 Marge brute → \"calcul marge\"\n📐 Coût réel → \"coût réel formule\"\n📐 Burnout → \"seuil burnout\"\n📐 Gain YTD → \"calcul gain ytd\"\n📐 Alertes seuil → \"calcul alerte seuil\"\n📐 Algorithme ML → \"calcul ml\"",
      en: "Here are all available formulas and calculations. Ask a specific question or pick a topic:\n\n📐 Project Pace Index → \"pace index formula\"\n📐 Client Pace Index → \"client pace formula\"\n📐 Year-end projection → \"year-end projection formula\"\n📐 Gross margin → \"margin calculation\"\n📐 Real cost → \"real cost formula\"\n📐 Burnout → \"burnout threshold\"\n📐 YTD gain → \"ytd gain calculation\"\n📐 Threshold alerts → \"threshold alert calculation\"\n📐 ML algorithm → \"ml algorithm\"",
    },
  },

  // ── PACE INDEX FULL EXPLANATION ───────────────────────────────────────────
  {
    keywords: [
      "expliquer pace index", "explain pace index", "c'est quoi pace", "what is pace",
      "pace definition", "définition pace", "pace signifie", "pace means",
      "comprendre pace", "understand pace", "pace indicator", "indicateur pace",
      "pace index explication", "pace index explanation",
    ],
    response: {
      fr: "Le Pace Index est un indicateur clé qui mesure si un projet consomme son budget trop vite par rapport à sa durée.\n\nUn pace de 1.0 signifie que le projet consomme exactement au rythme prévu.\nUn pace > 1.0 signifie qu'il consomme plus vite que prévu (risque de dépassement).\nUn pace < 1.0 signifie qu'il est en avance sur le budget.\n\nFormule : (heures consommées / budget heures) / ratio temps écoulé",
      en: "The Pace Index is a key indicator measuring whether a project is consuming its budget too quickly relative to its duration.\n\nA pace of 1.0 means the project is consuming exactly as planned.\nA pace > 1.0 means it's consuming faster than planned (overrun risk).\nA pace < 1.0 means it's ahead of budget.\n\nFormula: (hours consumed / budget hours) / elapsed time ratio",
    },
    route: "/dashboard/projects",
    linkLabel: { fr: "Voir les projets", en: "View Projects" },
  },

  // ── FORGOT WHICH PAGE ────────────────────────────────────────────────────
  {
    keywords: [
      "où trouver", "where to find", "comment accéder", "how to access",
      "quelle page", "which page", "aller à", "navigate to", "find page",
      "trouver page", "où est", "where is the", "page pour",
    ],
    response: {
      fr: "Voici les pages principales de la plateforme :\n\n• 🏠 /dashboard → Vue d'ensemble & KPIs\n• ⏱️ /dashboard/timesheets → Fiches horaires\n• 📁 /dashboard/parse → Parseur de fichiers\n• 💼 /dashboard/projects → Projets\n• 👥 /dashboard/staff → Personnel\n• 🏢 /dashboard/clients → Clients\n• 🔗 /dashboard/assignments → Affectations\n• 🤖 /dashboard/estimation → Estimation ML\n• 🏗️ /dashboard/team-builder → Team Builder\n• 📋 /dashboard/import → Historique d'import\n• 🔍 /dashboard/audit-logs → Audit Logs",
      en: "Here are the main platform pages:\n\n• 🏠 /dashboard → Overview & KPIs\n• ⏱️ /dashboard/timesheets → Timesheets\n• 📁 /dashboard/parse → File Parser\n• 💼 /dashboard/projects → Projects\n• 👥 /dashboard/staff → Staff\n• 🏢 /dashboard/clients → Clients\n• 🔗 /dashboard/assignments → Assignments\n• 🤖 /dashboard/estimation → ML Estimation\n• 🏗️ /dashboard/team-builder → Team Builder\n• 📋 /dashboard/import → Import History\n• 🔍 /dashboard/audit-logs → Audit Logs",
    },
    route: "/dashboard",
    linkLabel: { fr: "Aller au tableau de bord", en: "Go to Dashboard" },
  },

  // ── HOW THE SITE WORKS ────────────────────────────────────────────────────
  {
    keywords: [
      "comment fonctionne le site", "comment fonctionne la plateforme", "how does the site work",
      "how does the platform work", "comment ça marche", "how does it work",
      "comment utiliser la plateforme", "how to use the platform", "fonctionnement",
      "how it works", "comment ça fonctionne", "le site fonctionne comment",
      "principe de la plateforme", "how the site works", "site fonctions",
      "site fonction", "comment le site marche", "fonctionnement site",
    ],
    response: {
      fr: "Voici comment fonctionne la plateforme B2A en 5 étapes :\n\n1️⃣ Import des données\nChargez les feuilles de temps (via le Parseur puis la page Fiches Horaires) et les budgets annuels clients.\n\n2️⃣ Suivi des projets\nLe système calcule automatiquement le Pace Index de chaque projet (avancement vs budget).\n\n3️⃣ Alertes automatiques\nDes emails sont envoyés au partenaire responsable quand un projet dépasse 50%, 75%, 90% ou 110% de son budget.\n\n4️⃣ Tableau de bord\nLa vue d'ensemble centralise tous les KPIs : projets actifs, burnout, top 10 rentables, gain YTD.\n\n5️⃣ Outils avancés\nEstimation ML pour budgéter de nouveaux projets, Team Builder pour composer les équipes.",
      en: "Here is how the B2A platform works in 5 steps:\n\n1️⃣ Data import\nUpload timesheets (via the File Parser then the Timesheets page) and annual client budgets.\n\n2️⃣ Project tracking\nThe system automatically calculates each project's Pace Index (progress vs budget).\n\n3️⃣ Automatic alerts\nEmails are sent to the responsible partner when a project exceeds 50%, 75%, 90%, or 110% of its budget.\n\n4️⃣ Dashboard\nThe overview centralizes all KPIs: active projects, burnout, top 10 profitable, YTD gain.\n\n5️⃣ Advanced tools\nML Estimation to budget new projects, Team Builder to compose teams.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir le tableau de bord", en: "View Dashboard" },
  },

  // ── GETTING STARTED / FIRST STEPS ────────────────────────────────────────
  {
    keywords: [
      "par où commencer", "where to start", "comment démarrer", "how to get started",
      "premiers pas", "first steps", "débuter", "getting started", "démarrer",
      "je suis nouveau", "i am new", "nouveau sur la plateforme", "new to the platform",
      "que faire en premier", "what to do first", "comment commencer",
      "guide démarrage", "onboarding", "setup", "configuration initiale",
    ],
    response: {
      fr: "Pour bien démarrer sur B2A, suivez ces étapes :\n\n✅ Étape 1 — Créer les clients\nAjoutez vos clients (page Clients) ou importez-les en masse via Excel.\n\n✅ Étape 2 — Ajouter le personnel\nCréez les fiches collaborateurs avec leur niveau et taux horaire (page Personnel).\n\n✅ Étape 3 — Importer le budget annuel\nChargez le fichier 'liste des budgets.xlsx' via la page Historique d'import.\n\n✅ Étape 4 — Créer les projets\nAjoutez ou importez vos projets (page Projets).\n\n✅ Étape 5 — Charger les feuilles de temps\nUtilisez le Parseur pour préparer les fichiers Excel, puis uploadez-les sur la page Fiches Horaires.\n\nLe tableau de bord se met à jour automatiquement dès que des données sont importées.",
      en: "To get started on B2A, follow these steps:\n\n✅ Step 1 — Create clients\nAdd your clients (Clients page) or bulk import via Excel.\n\n✅ Step 2 — Add staff\nCreate collaborator profiles with their level and hourly rate (Staff page).\n\n✅ Step 3 — Import the annual budget\nUpload the 'liste des budgets.xlsx' file via the Import History page.\n\n✅ Step 4 — Create projects\nAdd or import your projects (Projects page).\n\n✅ Step 5 — Upload timesheets\nUse the File Parser to prepare Excel files, then upload them on the Timesheets page.\n\nThe dashboard updates automatically as soon as data is imported.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Aller au tableau de bord", en: "Go to Dashboard" },
  },

  // ── WHAT CAN I DO ─────────────────────────────────────────────────────────
  {
    keywords: [
      "que puis-je faire", "what can i do", "que faire sur ce site", "what can i do here",
      "fonctionnalités disponibles", "available features", "quelles fonctionnalités",
      "what features", "capacités", "capabilities", "options disponibles",
      "que propose la plateforme", "what does the platform offer", "tout ce que je peux faire",
      "everything i can do", "liste des fonctionnalités", "feature list",
    ],
    response: {
      fr: "Voici tout ce que vous pouvez faire sur B2A selon votre rôle :\n\n📊 Suivre les projets et leur budget (Pace Index)\n⏱️ Gérer les feuilles de temps des collaborateurs\n👥 Consulter et gérer le personnel (burnout, charge)\n💰 Suivre les budgets annuels par client\n🤖 Estimer le coût et les heures d'un nouveau projet (ML)\n🏗️ Composer une équipe optimale (Team Builder)\n🏢 Gérer le répertoire clients\n📋 Consulter l'historique de tous les imports\n🔔 Recevoir des alertes en temps réel (projets, burnout, feuilles manquantes)\n🔍 Auditer toutes les actions de la plateforme (admin)",
      en: "Here is everything you can do on B2A depending on your role:\n\n📊 Track projects and their budget (Pace Index)\n⏱️ Manage collaborator timesheets\n👥 View and manage staff (burnout, workload)\n💰 Track annual budgets per client\n🤖 Estimate cost and hours for a new project (ML)\n🏗️ Compose an optimal team (Team Builder)\n🏢 Manage the client directory\n📋 View the full import history\n🔔 Receive real-time alerts (projects, burnout, missing timesheets)\n🔍 Audit all platform actions (admin only)",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir le tableau de bord", en: "View Dashboard" },
  },

  // ── DATA FLOW ─────────────────────────────────────────────────────────────
  {
    keywords: [
      "flux de données", "data flow", "comment les données circulent", "how data flows",
      "données importées comment", "how data is imported", "pipeline données",
      "data pipeline", "de où viennent les données", "where does data come from",
      "source données", "data source", "import vers dashboard", "import to dashboard",
      "comment alimenter", "how to feed data", "cycle données",
    ],
    response: {
      fr: "Flux de données de la plateforme :\n\n📥 Excel brut (classeur multi-feuilles)\n    ↓  Parseur de fichiers\n📄 Fichiers Excel nettoyés par collaborateur\n    ↓  Page Fiches Horaires\n🗄️ Base de données (Timesheet / TimeEntry)\n    ↓  Calcul automatique\n📊 Pace Index projets + KPIs vue d'ensemble\n    ↓  Seuils dépassés\n📧 Alertes email partenaires\n\nParallèlement :\n• Budget annuel → importé via Excel → alimente le Pace Index client\n• Taux horaires personnel → calcul du coût réel",
      en: "Platform data flow:\n\n📥 Raw Excel (multi-sheet workbook)\n    ↓  File Parser\n📄 Cleaned Excel files per collaborator\n    ↓  Timesheets page\n🗄️ Database (Timesheet / TimeEntry)\n    ↓  Automatic calculation\n📊 Project Pace Index + Overview KPIs\n    ↓  Thresholds exceeded\n📧 Partner email alerts\n\nIn parallel:\n• Annual budget → imported via Excel → feeds client Pace Index\n• Staff hourly rates → real cost calculation",
    },
    route: "/dashboard/import",
    linkLabel: { fr: "Voir l'historique d'import", en: "View Import History" },
  },

  // ── TYPICAL WORKFLOW ──────────────────────────────────────────────────────
  {
    keywords: [
      "workflow", "flux de travail", "processus", "process", "étapes", "steps",
      "routine", "journée type", "typical day", "utilisation quotidienne",
      "daily usage", "que faire chaque mois", "what to do each month",
      "tâches régulières", "regular tasks", "monthly tasks", "tâches mensuelles",
    ],
    response: {
      fr: "Flux de travail mensuel typique sur B2A :\n\n📅 Début de mois\n• Vérifier que tous les collaborateurs ont soumis leur feuille du mois précédent\n• Envoyer un rappel si nécessaire (page Fiches Horaires)\n\n📈 En cours de mois\n• Surveiller le Pace Index des projets actifs (vue d'ensemble)\n• Réagir aux alertes email de dépassement\n\n📁 Fin de mois\n• Traiter les nouveaux fichiers Excel via le Parseur\n• Uploader les feuilles de temps sur la page Fiches Horaires\n• Vérifier les KPIs mis à jour sur la vue d'ensemble",
      en: "Typical monthly workflow on B2A:\n\n📅 Start of month\n• Check all collaborators submitted last month's timesheet\n• Send a reminder if needed (Timesheets page)\n\n📈 During the month\n• Monitor the Pace Index of active projects (overview)\n• React to budget overrun email alerts\n\n📁 End of month\n• Process new Excel files via the File Parser\n• Upload timesheets on the Timesheets page\n• Review updated KPIs on the overview",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir le tableau de bord", en: "View Dashboard" },
  },

  // ── DIFFERENCE BETWEEN ROLES ──────────────────────────────────────────────
  {
    keywords: [
      "différence rôles", "difference between roles", "admin vs manager", "manager vs collaborateur",
      "que peut admin", "what can admin do", "que peut manager", "what can manager do",
      "droits admin", "admin rights", "droits manager", "manager rights",
      "accès collaborateur", "collaborator access", "droits worker", "worker rights",
      "rôles expliqués", "roles explained", "comparaison rôles", "role comparison",
    ],
    response: {
      fr: "Comparaison des rôles :\n\n👑 Admin\n• Tout créer, modifier, supprimer\n• Accès aux logs d'audit\n• Gérer les rôles et mots de passe\n• Nettoyage des orphelins\n\n🔧 Manager\n• Créer/modifier projets, clients, staff\n• Envoyer des alertes\n• Importer des données\n\n👤 Collaborateur\n• Lecture de toutes les pages\n• Uploader ses propres feuilles de temps\n\n👁️ Worker\n• Lecture seule sur toutes les pages",
      en: "Role comparison:\n\n👑 Admin\n• Create, edit, delete everything\n• Access audit logs\n• Manage roles and passwords\n• Orphan cleanup\n\n🔧 Manager\n• Create/edit projects, clients, staff\n• Send alerts\n• Import data\n\n👤 Collaborator\n• Read access to all pages\n• Upload own timesheets\n\n👁️ Worker\n• Read-only access to all pages",
    },
  },

  // ── HOW ARE KPIS UPDATED ──────────────────────────────────────────────────
  {
    keywords: [
      "comment kpi mis à jour", "how kpis updated", "kpi rafraîchi", "kpi refresh",
      "données temps réel", "real time data", "quand données mises à jour",
      "when data updated", "mise à jour automatique", "automatic update",
      "fréquence mise à jour", "update frequency", "données actualisées",
      "kpi actualisé", "dashboard refresh",
    ],
    response: {
      fr: "Fréquence de mise à jour des données :\n\n⚡ Immédiat (après chaque import)\n• Pace Index projets\n• Coût réel et marges\n• Charge des collaborateurs (currentLoad)\n• Top 10 rentables / hors budget\n\n🕐 Toutes les 5 minutes\n• Notifications dans la cloche (alertes projets, burnout, feuilles manquantes)\n\n📅 Mensuel (automatique)\n• Rappels email feuilles de temps manquantes\n• Alertes de seuil projet (50%, 75%, 90%, 110%)",
      en: "Data update frequency:\n\n⚡ Immediate (after each import)\n• Project Pace Index\n• Real cost and margins\n• Collaborator workload (currentLoad)\n• Top 10 profitable / over-budget\n\n🕐 Every 5 minutes\n• Bell notifications (project alerts, burnout, missing timesheets)\n\n📅 Monthly (automatic)\n• Missing timesheet email reminders\n• Project threshold alerts (50%, 75%, 90%, 110%)",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir le tableau de bord", en: "View Dashboard" },
  },

  // ════════════════════════════════════════════════════════════════
  // OVERVIEW PAGE — DETAILED KPI KNOWLEDGE (from kpis.txt)
  // ════════════════════════════════════════════════════════════════

  // ── ANNUAL BUDGET PANEL ───────────────────────────────────────────────────
  {
    keywords: [
      "panneau budget annuel", "annual budget panel", "bloc budget annuel",
      "budget panel", "collapsible budget", "bilan annuel", "annual health check",
      "vue annuelle", "budget overview panel", "annual summary",
    ],
    response: {
      fr: "Le panneau Budget Annuel (bloc repliable en haut de la vue d'ensemble) donne un bilan de santé rapide de toute la société pour l'année en cours. Il contient :\n\n• Clients actifs — nombre de clients avec un budget signé cette année\n• Consommé YTD — total des heures réellement travaillées depuis le 1er janvier\n• Gain Client YTD — différence entre heures facturées et heures consommées\n• Heures ce mois-ci — heures enregistrées par toute l'équipe ce mois calendaire\n• Santé du pace — compteurs Vert / Jaune / Rouge par client\n• Progression des feuilles de temps — X/Y collaborateurs ont soumis ce mois",
      en: "The Annual Budget panel (collapsible block at the top of the overview) gives a 30-second health check of the whole firm for the current year. It contains:\n\n• Active Clients — number of clients with a signed budget this year\n• YTD Consumed — total hours actually worked since January 1st\n• YTD Client Gain — difference between billed and consumed hours\n• This Month's Hours — hours logged by the whole team this calendar month\n• Pace Health — Green / Yellow / Red counters per client\n• Timesheet Submission Progress — X/Y collaborators submitted this month",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── CLIENTS ACTIFS ────────────────────────────────────────────────────────
  {
    keywords: [
      "clients actifs", "active clients", "nombre clients actifs", "how many active clients",
      "combien de clients", "clients avec budget", "clients budget signé",
      "clients signed budget", "total clients actifs",
    ],
    response: {
      fr: "\"Clients actifs\" dans le panneau Budget Annuel = nombre de clients qui ont un budget signé pour l'année en cours.\n\nCe chiffre vous indique combien de relations vous gérez activement. S'il change de façon inattendue, quelqu'un a ajouté ou supprimé un contrat.",
      en: "\"Active Clients\" in the Annual Budget panel = the number of clients who have a signed budget for the current year.\n\nThis tells you how many relationships you are actively managing. If this number changes unexpectedly, someone added or removed a contract.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── YTD CONSUMED ─────────────────────────────────────────────────────────
  {
    keywords: [
      "consommé ytd", "ytd consumed", "heures consommées ytd", "hours consumed ytd",
      "total heures année", "total hours year", "heures depuis janvier",
      "hours since january", "heures travaillées année", "hours worked year",
      "year to date consumed", "consommation annuelle",
    ],
    response: {
      fr: "\"Consommé YTD\" = total des heures réellement travaillées et enregistrées par toute l'équipe, tous clients confondus, du 1er janvier à aujourd'hui.\n\nExemple : si nous sommes en mai et que l'équipe a travaillé 1 200 heures au total, ce chiffre affiche 1 200h.\n\nC'est votre compteur de charge réelle. Comparez-le au budget total pour savoir si vous êtes en avance, en retard ou dans les clous.\n\n⚠️ Tant qu'une feuille de temps n'est pas soumise, les heures de cette personne ne sont pas comptabilisées ici.",
      en: "\"YTD Consumed\" = total hours actually worked and logged by the whole team across ALL clients, from January 1st up to today.\n\nExample: if it is May and the team has worked 1,200 hours total, this shows 1,200h.\n\nIt is your real workload meter. Compare it to the total budget to know if you are ahead, behind, or on pace.\n\n⚠️ Until a timesheet is submitted, those hours are not counted here.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── YTD CLIENT GAIN ───────────────────────────────────────────────────────
  {
    keywords: [
      "gain client ytd", "ytd client gain", "gain annuel client", "client gain year",
      "gain ytd c'est quoi", "what is ytd gain", "gain positif négatif",
      "positive negative gain", "profit annuel", "annual profit hours",
      "comment calculé gain ytd", "how ytd gain calculated", "gain global",
      "overall gain", "rentabilité globale", "global profitability",
    ],
    response: {
      fr: "\"Gain Client YTD\" = différence entre les heures facturées aux clients depuis le début de l'année et les heures réellement consommées.\n\n✅ Positif (vert) = l'équipe a travaillé MOINS d'heures que facturé → marge bénéficiaire\n❌ Négatif (rouge) = l'équipe a travaillé PLUS d'heures que facturé → perte\n\nFormule pour chaque client :\n(Heures/mois du contrat × mois écoulés) − heures consommées à ce jour\n\nExemple :\nClient payant 10h/mois. Nous sommes en mai (4 mois écoulés = jan–avr). L'équipe a travaillé 35h.\nGain = (10 × 4) − 35 = 40 − 35 = +5h\n\nLe total de tous les clients donne le Gain Client YTD affiché.",
      en: "\"YTD Client Gain\" = the difference between what all clients were billed for so far this year and what the team actually consumed.\n\n✅ Positive (green) = team worked FEWER hours than billed → profit margin\n❌ Negative (red) = team worked MORE hours than billed → loss\n\nFormula per client:\n(Monthly contract hours × months elapsed) − hours consumed so far\n\nExample:\nClient pays for 10h/month. It is May (4 months elapsed = Jan–Apr). Team worked 35h.\nGain = (10 × 4) − 35 = 40 − 35 = +5h\n\nThe sum across all clients gives the displayed YTD Client Gain.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── THIS MONTH'S HOURS ────────────────────────────────────────────────────
  {
    keywords: [
      "heures ce mois", "this month hours", "heures du mois", "hours this month",
      "heures mois en cours", "current month hours", "heures mois calendaire",
      "heures totales mois", "total hours month", "heures équipe mois",
    ],
    response: {
      fr: "\"Heures ce mois-ci\" = total des heures enregistrées par toute l'équipe dans le mois calendaire en cours.\n\nC'est un indicateur de pouls rapide. Si le chiffre est anormalement bas en milieu de mois, c'est probablement que les feuilles de temps n'ont pas encore été soumises.\n\nConsultez la barre de progression des feuilles pour voir qui est en attente.",
      en: "\"This Month's Hours\" = total hours logged by the whole team in the current calendar month.\n\nThis is a quick pulse check. If the number is unusually low mid-month, timesheets may not have been submitted yet.\n\nCheck the timesheet submission progress bar to see who is still pending.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── PACE HEALTH COUNTERS ──────────────────────────────────────────────────
  {
    keywords: [
      "pace health", "santé du pace", "compteurs pace", "pace counters",
      "on track at risk over budget counters", "nombre clients vert jaune rouge",
      "how many clients green yellow red", "clients en bonne santé",
      "healthy clients", "pace traffic light", "feux tricolores pace",
      "clients in each pace color", "pace health counters",
    ],
    response: {
      fr: "Les compteurs de Santé du Pace indiquent combien de clients tombent dans chaque catégorie :\n\n🟢 Vert — l'équipe consomme à ≤ 85% du rythme interne prévu → tout va bien\n🟡 Jaune — entre 85% et 100% du rythme prévu → à surveiller\n🔴 Rouge — plus de 100% du rythme prévu → déjà en dépassement\n\nExemple : vous avez prévu 10h/mois pour un client en interne. L'équipe travaille en moyenne 11h/mois → 110% → Rouge.\n\nLe compteur Rouge est le plus urgent : chaque client rouge consomme de la capacité plus vite que le contrat ne le permet.",
      en: "The Pace Health counters show how many clients fall in each category:\n\n🟢 Green — team consuming at ≤ 85% of planned internal pace → all good\n🟡 Yellow — between 85% and 100% of planned pace → watch closely\n🔴 Red — above 100% of planned pace → already over\n\nExample: you planned 10h/month internally for a client. The team actually averages 11h/month → 110% → Red.\n\nThe Red count is the most urgent number: every red client is burning capacity faster than the contract allows.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── TIMESHEET SUBMISSION PROGRESS ────────────────────────────────────────
  {
    keywords: [
      "progression feuilles de temps", "timesheet submission progress",
      "barre progression feuilles", "timesheet progress bar",
      "combien ont soumis", "how many submitted", "qui n'a pas soumis ce mois",
      "who hasn't submitted this month", "feuilles manquantes ce mois",
      "missing timesheets this month", "soumission ce mois", "submission this month",
      "x sur y feuilles", "x out of y timesheets",
    ],
    response: {
      fr: "La barre de progression des feuilles de temps montre combien de collaborateurs ont soumis leur feuille pour ce mois vs combien le doivent.\n\nExemple : '3/7' → 3 ont soumis, 4 sont en attente.\n\n⚠️ Important : tant qu'une feuille n'est pas soumise, les heures de cette personne NE sont PAS comptabilisées dans le Consommé YTD ni dans les calculs de Gain. Tous les chiffres YTD sont donc sous-estimés si des feuilles sont en attente.\n\nLes noms des personnes en attente sont affichés directement pour faciliter le suivi.",
      en: "The timesheet submission progress bar shows how many collaborators have already submitted their timesheet for this month vs how many need to.\n\nExample: '3/7' → 3 submitted, 4 pending.\n\n⚠️ Important: until a timesheet is submitted, that person's hours are NOT counted in YTD Consumed or Gain calculations. All YTD numbers are understated if submissions are pending.\n\nPending people's names are shown directly so you can follow up.",
    },
    route: "/dashboard/timesheets",
    linkLabel: { fr: "Voir les fiches horaires", en: "View Timesheets" },
  },

  // ── KPI CARD — CLIENTS IN BUDGET OVERRUN ─────────────────────────────────
  {
    keywords: [
      "clients en dépassement", "clients in overrun", "carte rouge kpi", "red kpi card",
      "clients hors budget kpi", "over budget clients kpi", "nombre clients dépassement",
      "count overrun clients", "clients dépassement budget", "overrun count",
      "combien de clients dépassent", "how many clients over budget",
      "clients budget overrun card", "kpi clients overrun",
    ],
    response: {
      fr: "La carte KPI rouge \"Clients en Dépassement\" affiche le nombre de clients actuellement dans la zone rouge : soit leur rythme de consommation dépasse 100%, soit ils ont déjà consommé plus d'heures que facturé depuis le début de l'année.\n\nZéro est l'objectif. Chaque client compté ici nécessite une conversation ou une action corrective.\n\nCette carte est votre alerte immédiate la plus importante.",
      en: "The red KPI card \"Clients in Budget Overrun\" shows the number of clients currently in the red zone: either their burn rate exceeds 100% OR they have already consumed more hours than billed year to date.\n\nZero is the goal. Each client counted here needs a conversation or a corrective action.\n\nThis card is your most important immediate alert.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── KPI CARD — ACTIVE COLLABORATORS / BURNOUT ────────────────────────────
  {
    keywords: [
      "carte collaborateurs actifs", "active collaborators card", "kpi collaborateurs actifs",
      "blue kpi card", "carte bleue kpi", "risque burnout kpi", "burnout risk kpi",
      "x at burnout risk", "x à risque burnout", "headcount kpi", "effectif kpi",
      "nombre collaborateurs système", "staff count kpi",
    ],
    response: {
      fr: "La carte KPI bleue \"Collaborateurs actifs\" affiche le nombre total de membres du personnel suivis dans le système (collaborateurs et workers, hors admins).\n\nSi une sous-ligne apparaît avec \"X à risque de burnout\", cela signifie que X personnes travaillent à un rythme inhabituellement élevé récemment.\n\nCette carte garde la visibilité sur l'effectif. L'avertissement burnout est un signal précoce indiquant que la charge de travail doit être redistribuée.",
      en: "The blue KPI card \"Active Collaborators\" shows the total number of staff members tracked in the system (collaborators and workers, not admins).\n\nIf a sub-line appears saying \"X at burnout risk\", that means X people have been working at an unusually high pace recently.\n\nThis keeps headcount visible. The burnout warning is an early signal that workload needs to be redistributed.",
    },
    route: "/dashboard/staff",
    linkLabel: { fr: "Voir le personnel", en: "View Staff" },
  },

  // ── KPI CARD — TOTAL YTD GAIN ─────────────────────────────────────────────
  {
    keywords: [
      "carte gain ytd total", "total ytd gain card", "kpi gain total", "green kpi card",
      "carte verte kpi", "gain top 10", "gain top 10 clients rentables",
      "top 10 gain total", "buffer clients rentables", "profitable clients buffer",
      "gain combined top 10", "gain combiné top 10",
    ],
    response: {
      fr: "La carte KPI verte \"Gain YTD Total\" affiche le gain combiné des 10 clients les plus rentables spécifiquement (pas tous les clients — uniquement les 10 premiers du tableau Rentables).\n\nUn chiffre positif = ces clients ont généré de la capacité épargnée cette année.\n\nCela donne une idée rapide du \"tampon\" que vos meilleurs clients apportent. Si ce chiffre est faible, même vos meilleurs clients ne génèrent pas beaucoup de marge.",
      en: "The green KPI card \"Total YTD Gain\" shows the combined YTD gain across the top 10 most profitable clients specifically (not all clients — just the profitable ones from the top 10 rentable table).\n\nPositive = those clients generated saved capacity so far this year.\n\nThis gives a quick sense of the 'buffer' your best-performing clients are providing. If this number is low, even your best clients aren't generating much margin.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── TOP 10 MOST PROFITABLE — EXPLANATION ─────────────────────────────────
  {
    keywords: [
      "top 10 rentables explication", "top 10 profitable explanation",
      "comment classé top 10 rentables", "how top 10 profitable ranked",
      "colonnes top 10 rentables", "top 10 profitable columns",
      "client h/an", "client hours per year", "heures par an client",
      "supervised column", "superviseur colonne", "gain ytd colonne",
      "rythme moyen colonne", "average pace column",
    ],
    response: {
      fr: "Le tableau Top 10 Rentables classe les clients par Gain YTD décroissant (le plus grand gain en tête).\n\nColonnes :\n• Rang — position dans le classement (#1 = plus rentable, en or)\n• Client — nom tel qu'enregistré dans le budget annuel\n• Superviseur — responsable interne du suivi client\n• Client H/an — heures contractuelles par an (Heures/mois × 12)\n• Consommé YTD — heures réellement travaillées depuis janvier\n• Gain YTD — (H/mois × mois écoulés) − Consommé YTD (vert = profit, rouge = perte)\n• Rythme moyen — pace moyen mensuel (vert ≤85%, jaune 85–100%, rouge >100%)",
      en: "The Top 10 Profitable table ranks clients by descending YTD Gain (highest gain at the top).\n\nColumns:\n• Rank — position in the ranking (#1 = most profitable, shown in gold)\n• Client — name as registered in the annual budget\n• Supervisor — internal person responsible for this client\n• Client H/yr — annual contractual hours (Monthly hours × 12)\n• Consumed YTD — hours actually worked since January\n• Gain YTD — (Monthly hours × months elapsed) − Consumed YTD (green = profit, red = loss)\n• Average Pace — monthly average pace (green ≤85%, yellow 85–100%, red >100%)",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── CLIENT H/AN ───────────────────────────────────────────────────────────
  {
    keywords: [
      "client h/an", "client hours per year", "heures par an", "hours per year",
      "plafond heures client", "hours ceiling client", "heures contractuelles annuelles",
      "annual contract hours", "combien heures client par an",
      "how many hours client per year", "heures contrat annuel",
    ],
    response: {
      fr: "\"Client H/an\" = nombre d'heures que le client contractualise par an.\n\nComment calculé :\nHeures/mois contrat × 12\n\nExemple : un client payant 40h/mois → Client H/an = 480h.\n\nC'est le plafond. Votre équipe ne doit pas dépasser ce nombre d'ici la fin de l'année, sinon vous travaillez gratuitement.",
      en: "\"Client H/yr\" = the number of hours the client contracts for per year.\n\nHow it is calculated:\nMonthly contract hours × 12\n\nExample: a client paying for 40h/month → Client H/yr = 480h.\n\nThis is the ceiling. Your team must not exceed this number by year-end, or you are working for free.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── RYTHME MOYEN / AVERAGE PACE ───────────────────────────────────────────
  {
    keywords: [
      "rythme moyen", "average pace", "rythme moyen calcul", "average pace calculation",
      "comment calculé rythme moyen", "how average pace calculated",
      "pace mensuel moyen", "monthly average pace", "pace percentage",
      "pourcentage pace", "pace en pourcentage", "pace moyen clients",
      "average pace clients", "rythme moyen client",
    ],
    response: {
      fr: "\"Rythme moyen\" = à quelle vitesse l'équipe consomme le budget d'heures INTERNE, exprimé en pourcentage.\n\nFormule :\n1. Pour chaque mois : heures travaillées ce mois ÷ heures internes planifiées ce mois\n2. Faire la moyenne sur tous les mois écoulés\n\nCouleurs :\n🟢 < 85% → bien maîtrisé\n🟡 85–100% → approche la limite\n🔴 > 100% → déjà au-dessus du budget interne\n\n⚠️ Distinction importante : les heures internes (budget B2A) sont DIFFÉRENTES des heures client du contrat. B2A fixe intentionnellement un budget interne plus bas pour créer une marge de profit.",
      en: "\"Average Pace\" = how fast the team is consuming the INTERNAL hour budget, expressed as a percentage.\n\nFormula:\n1. Each month: hours worked that month ÷ internal hours planned for that month\n2. Average across all elapsed months\n\nColors:\n🟢 < 85% → well under control\n🟡 85–100% → approaching the limit\n🔴 > 100% → already over the internal budget\n\n⚠️ Important distinction: internal hours (B2A's budget) are DIFFERENT from the client's contract hours. B2A intentionally sets a lower internal budget to create a profit buffer.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── TOP 10 BUDGET OVERRUN — EXPLANATION ──────────────────────────────────
  {
    keywords: [
      "top 10 dépassement", "top 10 overrun", "top 10 hors budget explication",
      "top 10 budget overrun explanation", "qui apparaît tableau dépassement",
      "who appears overrun table", "comment classé dépassement",
      "how overrun ranked", "colonnes tableau dépassement",
      "overrun table columns", "client h/mois colonne",
      "dépassement colonne", "overrun column",
    ],
    response: {
      fr: "Le tableau Top 10 Dépassement classe les clients dont le Gain YTD est le plus négatif (pire dépassement en tête).\n\nQui apparaît ici :\n• Rythme moyen > 100% (consomme plus vite que le budget interne)\n• OU Gain YTD négatif (déjà travaillé plus que facturé)\n\nColonnes :\n• Rang — #1 = pire situation, en rouge\n• Client H/mois — heures contractuelles par mois (pas par an)\n• Consommé YTD — heures travaillées depuis janvier\n• Dépassement — Gain YTD négatif = heures travaillées au-delà de ce qui est facturé\n• Rythme moyen — toujours rouge ou orange dans ce tableau\n\nExemple :\nClient H/mois = 8h. 5 mois écoulés. 52h consommées.\nFacturé jusqu'ici = 8 × 5 = 40h. Dépassement = 40 − 52 = −12h.",
      en: "The Top 10 Overrun table ranks clients whose YTD Gain is the most negative (worst overrun at the top).\n\nWho appears here:\n• Average pace > 100% (consuming faster than internal budget)\n• OR YTD Gain is negative (already worked more than billed)\n\nColumns:\n• Rank — #1 = worst situation, shown in red\n• Client H/month — monthly contractual hours (not annual)\n• Consumed YTD — hours worked since January\n• Overrun — negative YTD Gain = hours worked beyond what was billed\n• Average Pace — always red or amber in this table\n\nExample:\nClient H/month = 8h. 5 months elapsed. 52h consumed.\nBilled so far = 8 × 5 = 40h. Overrun = 40 − 52 = −12h.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── PROFITABILITY BY MANAGER ──────────────────────────────────────────────
  {
    keywords: [
      "rentabilité par manager", "profitability by manager", "carte superviseur",
      "supervisor card", "cartes managers", "manager cards",
      "portefeuille superviseur", "supervisor portfolio",
      "rentabilité superviseur", "manager profitability",
      "taux dépassement manager", "manager overrun rate",
      "clients en dépassement manager", "clients in overrun manager",
      "gain ytd manager", "manager ytd gain",
    ],
    response: {
      fr: "La section \"Rentabilité par Manager\" (bas de la vue d'ensemble) répond à : quel superviseur gère le portefeuille le plus rentable ?\n\nChaque carte représente un superviseur et résume TOUS ses clients combinés :\n\n• Gain YTD Total — somme des gains de tous ses clients (vert = rentable, rouge = perte)\n• Barre Rythme moyen — pace moyen sur tous ses clients (même code couleur)\n• Clients — nombre total de clients dont il est responsable\n• Clients en Dépassement (ex. '2/5') — combien sont en rouge ou en gain négatif\n• Consommé YTD — total heures travaillées pour tous ses clients\n• Taux de Dépassement — (clients en dépassement ÷ total clients) × 100",
      en: "The \"Profitability by Manager\" section (bottom of the overview) answers: which supervisor is managing the most profitable portfolio?\n\nEach card represents one supervisor and summarises ALL their clients combined:\n\n• Total YTD Gain — sum of gains across all their clients (green = profitable, red = loss)\n• Average Pace bar — average pace across all their clients (same color logic)\n• Clients — total number of clients they are responsible for\n• Clients in Overrun (e.g. '2/5') — how many are red or have negative gain\n• Consumed YTD — total hours worked across all their clients\n• Overrun Rate — (clients in overrun ÷ total clients) × 100",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── TWO BUDGETS CONCEPT ───────────────────────────────────────────────────
  {
    keywords: [
      "deux budgets", "two budgets", "budget interne vs client", "internal vs client budget",
      "budget b2a vs client", "heures internes vs heures client",
      "internal hours vs client hours", "budget interne b2a",
      "b2a internal budget", "pourquoi deux budgets", "why two budgets",
      "différence budget interne client", "concept clé", "key concept",
      "plafond revenu cible coût", "revenue ceiling cost target",
    ],
    response: {
      fr: "Concept clé : chaque client a DEUX budgets d'heures.\n\n1️⃣ Ce que le CLIENT paie (le contrat) → c'est le plafond de revenu. Ne pas dépasser.\n2️⃣ Ce que B2A planifie en interne (toujours plus bas) → c'est la cible de coût. Intentionnellement sous le contrat pour créer une marge.\n\n• \"Gain YTD\" mesure l'écart par rapport au plafond de revenu (contrat client).\n• \"Rythme moyen\" mesure l'écart par rapport à la cible de coût (heures internes).\n\nUn client peut être vert sur le rythme (équipe efficace) et avoir un gain modeste si le contrat est généreux. Un client peut aussi être rouge sur le rythme mais rester rentable si le contrat avait beaucoup d'heures tampons.\n\nClient idéal : Gain YTD élevé + Rythme moyen vert.",
      en: "Key concept: every client has TWO hour budgets.\n\n1️⃣ What the CLIENT pays for (the contract) → this is the revenue ceiling. Do not exceed it.\n2️⃣ What B2A internally plans to spend (always lower) → this is the cost target. Intentionally below the contract to create a profit buffer.\n\n• \"YTD Gain\" measures how far you are from the revenue ceiling (client contract).\n• \"Average Pace\" measures how far you are from the cost target (internal hours).\n\nA client can be green on pace (efficient team) and have a modest gain if the contract is generous. A client can also be red on pace but still profitable if the contract had lots of buffer hours.\n\nIdeal client: high YTD Gain + green Average Pace.",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

  // ── COLOUR MEANINGS ───────────────────────────────────────────────────────
  {
    keywords: [
      "signification couleurs", "color meanings", "que signifie vert", "what does green mean",
      "que signifie rouge", "what does red mean", "que signifie jaune", "what does yellow mean",
      "code couleur", "color code", "couleurs plateforme", "platform colors",
      "vert jaune rouge signification", "green yellow red meaning",
      "couleurs kpi", "kpi colors", "seuils couleurs", "color thresholds",
    ],
    response: {
      fr: "Code couleur universel de la plateforme :\n\n🟢 Vert → Bon. Rythme < 85% du budget interne. Marge confortable.\n🟡 Jaune → Attention. Entre 85% et 100% du budget interne. Plus de place à l'erreur.\n🔴 Rouge → Problème. Rythme > 100% du budget interne. L'équipe sur-consomme.\n\nPour les chiffres de gain :\n✅ Positif (vert) → rentable, moins d'heures travaillées que facturées\n❌ Négatif (rouge) → perte, plus d'heures travaillées que facturées",
      en: "Universal platform color code:\n\n🟢 Green → Good. Pace below 85% of internal budget. Comfortable margin.\n🟡 Yellow → Watch out. Between 85% and 100% of internal budget. No room for error.\n🔴 Red → Problem. Pace above 100% of internal budget. The team is over-consuming.\n\nFor gain numbers:\n✅ Positive (green) → profitable, fewer hours worked than billed\n❌ Negative (red) → loss, more hours worked than billed",
    },
    route: "/dashboard",
    linkLabel: { fr: "Voir la vue d'ensemble", en: "Go to Overview" },
  },

);

// Pre-compute word counts once at module load — normalize accents for matching
function normalizeText(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

const keywordWeights = intents.map((intent) =>
  intent.keywords.map((kw) => ({ kw: normalizeText(kw), weight: kw.split(" ").length }))
);

const FALLBACK_TOPICS = {
  fr: [
    "fiches horaires", "projets & pace index", "clients", "personnel & burnout",
    "affectations", "historique d'import", "parseur de fichiers", "estimation ML",
    "team builder", "budget annuel", "audit logs", "profil", "rôles & permissions",
    "notifications", "session & connexion", "formules & calculs",
  ],
  en: [
    "timesheets", "projects & pace index", "clients", "staff & burnout",
    "assignments", "import history", "file parser", "ML estimation",
    "team builder", "annual budget", "audit logs", "profile", "roles & permissions",
    "notifications", "session & login", "formulas & calculations",
  ],
};

export function getFallback(lang: "en" | "fr"): string {
  const topics = FALLBACK_TOPICS[lang].map((t) => `• ${t}`).join("\n");
  return lang === "fr"
    ? `Je n'ai pas compris votre question. Voici les sujets sur lesquels je peux vous aider :\n\n${topics}`
    : `I didn't understand your question. Here are the topics I can help you with:\n\n${topics}`;
}

export function matchIntent(input: string): GuideIntent | null {
  const normalized = normalizeText(input.trim());
  // Split into whole words so single-char keywords like "en" / "fr" don't match
  // inside longer words (e.g. "en" inside "comment").
  const wordSet = new Set(normalized.split(/[^a-z0-9]+/).filter(Boolean));

  let bestScore = 0;
  let bestIntent: GuideIntent | null = null;

  for (let i = 0; i < intents.length; i++) {
    let score = 0;
    for (const { kw, weight } of keywordWeights[i]) {
      if (weight === 1) {
        // Single-word keyword → must be a whole word in the input
        if (wordSet.has(kw)) score += weight;
      } else {
        // Multi-word phrase → substring match is fine
        if (normalized.includes(kw)) score += weight;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intents[i];
    }
  }

  return bestScore > 0 ? bestIntent : null;
}
