/**
 * Declarative per-category form shape. A passport, a motorcycle, a dog and a
 * missing child have almost nothing in common — asking every declarer for
 * "marque / modèle / N° de série" regardless of what they're reporting, with
 * the same generic phone/passport examples in every placeholder, was the
 * previous, incoherent, one-size-fits-all form. This module is the single
 * source of truth for:
 *   - which generic fields apply to a category (showBrand, showColor, ...)
 *   - what each field's label and placeholder/example text should say
 *   - which category-specific extra fields (stored in `lostItems.details` /
 *     `foundItems.details`, see db/schema.ts) should be collected instead
 *
 * Resolution: subcategory config is merged over its parent category's
 * config over DEFAULT_CONFIG, so a subcategory only needs to declare what
 * differs from its parent — e.g. "moto" only overrides the brand/model
 * examples and title placeholders that "transport" already turned on.
 *
 * Adding a new subcategory's contextual copy later means adding one entry
 * to CONFIG_BY_SLUG here — never touching declare-form.tsx.
 */

export type ExtraFieldType = "text" | "select" | "number";

export type ExtraField = {
  key: string;
  label: string;
  type: ExtraFieldType;
  options?: readonly string[];
  placeholder?: string;
  hint?: string;
};

export type CategoryFieldConfig = {
  showBrand: boolean;
  showModel: boolean;
  showColor: boolean;
  showSerial: boolean;
  showIdPartial: boolean;
  /** "État de l'objet" — only meaningful for found physical objects. */
  showCondition: boolean;
  showReward: boolean;
  /** "Déposer dans un Point RETRUV" — nonsensical for a found/located person. */
  showRecoveryPoint: boolean;
  titlePlaceholderLost: string;
  titlePlaceholderFound: string;
  brandPlaceholder: string;
  modelPlaceholder: string;
  /** Label for the "serial" field — contextual: IMEI for a phone, châssis for a vehicle. */
  serialLabel: string;
  serialHint: string;
  serialPlaceholder: string;
  /** Label for the "idPartial" field — contextual: immatriculation, n° de passeport, n° de CNI... */
  idPartialLabel: string;
  idPartialHint: string;
  idPartialPlaceholder: string;
  cityLabel: string;
  eventDateLabelLost: string;
  eventDateLabelFound: string;
  distinctiveLabel: string;
  distinctiveHint: string;
  distinctivePlaceholder: string;
  extraFields: readonly ExtraField[];
  /**
   * Shown prominently on the declare form and on match/detail pages. Missing
   * persons are the one case where RETRUV is explicitly a *complement* to
   * real emergency services, never a substitute — this says so wherever the
   * category appears.
   */
  safetyNotice?: string;
  /**
   * For a lost passport, blurring the public photo protects the owner.
   * For a missing person the photo is the entire point of a public appeal —
   * blurring it would actively hinder recognition. isSensitive still applies
   * (location precision, private notes, verification-gated details), it
   * just never blurs the photo itself.
   */
  blurSensitivePhotos: boolean;
  /**
   * True only for missing-person categories. A false or malicious report
   * here isn't just noise — it can expose a real child's photo publicly, be
   * weaponized in a custody dispute, or waste a real search effort. Unlike
   * every other category, this content is queued for a human moderator
   * (see /admin/moderation) instead of publishing and matching immediately.
   */
  requiresModeration: boolean;
};

const DEFAULT_CONFIG: CategoryFieldConfig = {
  showBrand: false,
  showModel: false,
  showColor: true,
  showSerial: false,
  showIdPartial: false,
  showCondition: true,
  showReward: true,
  showRecoveryPoint: true,
  titlePlaceholderLost: "Ex : Objet perdu à Rome",
  titlePlaceholderFound: "Ex : Objet trouvé à Milan",
  brandPlaceholder: "Marque",
  modelPlaceholder: "Modèle",
  serialLabel: "N° série partiel",
  serialHint: "Masqué — seuls les derniers caractères, jamais le numéro complet.",
  serialPlaceholder: "****7291",
  idPartialLabel: "Identifiant partiel",
  idPartialHint: "Quelques caractères seulement, jamais le numéro complet.",
  idPartialPlaceholder: "IT****84",
  cityLabel: "Ville",
  eventDateLabelLost: "Date de perte",
  eventDateLabelFound: "Date de trouvaille",
  distinctiveLabel: "Caractéristiques particulières",
  distinctiveHint:
    "Rayure, sticker, contenu, collier… Ces détails aident au matching et à la vérification.",
  distinctivePlaceholder: "Ex : rayure sur le côté, autocollant, marque d'usure...",
  extraFields: [],
  blurSensitivePhotos: true,
  requiresModeration: false,
};

const PERSON_SAFETY_NOTICE =
  "Contactez d'abord la police ou les autorités locales — RETRUV complète une recherche, il ne remplace jamais un signalement officiel. En cas de danger immédiat, appelez les secours avant toute déclaration en ligne.";

const PERSON_EXTRA_FIELDS: readonly ExtraField[] = [
  { key: "ageApprox", label: "Âge approximatif", type: "text", placeholder: "Ex : 7 ans" },
  { key: "sex", label: "Sexe", type: "select", options: ["Femme", "Homme", "Inconnu"] },
  { key: "height", label: "Taille approximative", type: "text", placeholder: "Ex : 1m20" },
  {
    key: "build",
    label: "Corpulence",
    type: "select",
    options: ["Mince", "Moyenne", "Forte"],
  },
  { key: "hairColor", label: "Couleur des cheveux", type: "text" },
  { key: "eyeColor", label: "Couleur des yeux", type: "text" },
  {
    key: "clothing",
    label: "Vêtements portés",
    type: "text",
    placeholder: "Ex : blouson rouge, jean bleu, baskets blanches",
  },
];

const PERSON_BASE: Partial<CategoryFieldConfig> = {
  showBrand: false,
  showModel: false,
  showColor: false,
  showSerial: false,
  showIdPartial: false,
  showCondition: false,
  showRecoveryPoint: false,
  titlePlaceholderLost: "Ex : Personne disparue à Milan",
  titlePlaceholderFound: "Ex : Personne retrouvée, identité inconnue",
  cityLabel: "Dernier lieu vu",
  eventDateLabelLost: "Date de disparition",
  eventDateLabelFound: "Date à laquelle la personne a été vue/retrouvée",
  distinctiveLabel: "Vêtements portés et signes distinctifs",
  distinctiveHint:
    "Vêtements au moment de la disparition, cicatrice, tatouage, grain de beauté… Un détail précis mais non public aide à vérifier une correspondance sans l'exposer publiquement.",
  distinctivePlaceholder: "Ex : blouson rouge, cicatrice au menton, grain de beauté sur la joue",
  idPartialLabel: "Identifiant ou information distinctive",
  extraFields: PERSON_EXTRA_FIELDS,
  safetyNotice: PERSON_SAFETY_NOTICE,
  blurSensitivePhotos: false,
  requiresModeration: true,
};

/** Keyed by category OR subcategory slug. Subcategory entries are merged over their parent. */
const CONFIG_BY_SLUG: Record<string, Partial<CategoryFieldConfig>> = {
  // ── Personnes disparues ────────────────────────────────────────────────
  personnes: PERSON_BASE,
  enfant: {
    titlePlaceholderLost: "Ex : Enfant de 7 ans disparu à Milan",
    safetyNotice:
      "Disparition d'un enfant : contactez IMMÉDIATEMENT la police (et le numéro national d'urgence enfance si disponible dans votre pays) avant toute autre démarche. RETRUV agit en complément d'un signalement officiel, jamais à sa place.",
  },
  femme: { titlePlaceholderLost: "Ex : Femme de 32 ans disparue à Rome" },
  homme: { titlePlaceholderLost: "Ex : Homme de 45 ans disparu à Turin" },
  "personne-agee": {
    titlePlaceholderLost: "Ex : Personne âgée disparue à Naples",
    safetyNotice:
      "Disparition d'une personne âgée (risque d'errance, de désorientation) : contactez immédiatement la police. Mentionnez tout problème de santé pertinent (mémoire, mobilité) qui pourrait aider les secours — dans les caractéristiques non publiques, pas dans la description publique.",
  },

  // ── Documents personnels ───────────────────────────────────────────────
  documents: {
    showIdPartial: true,
    titlePlaceholderLost: "Ex : Document perdu à Rome",
    titlePlaceholderFound: "Ex : Document retrouvé à Milan",
    distinctiveLabel: "Détail non visible publiquement (tache, pli, inscription…)",
    distinctiveHint:
      "Ce détail sert uniquement à vérifier le vrai propriétaire — ne le mettez jamais dans la description publique.",
    distinctivePlaceholder: "Ex : étui bleu, page légèrement pliée, autocollant à l'intérieur",
    idPartialLabel: "Numéro du document (partiel)",
    idPartialPlaceholder: "Ex : IT****84",
  },
  cni: {
    titlePlaceholderLost: "Ex : Carte d'identité perdue à Turin",
    titlePlaceholderFound: "Ex : Carte d'identité retrouvée à Naples",
    idPartialLabel: "Numéro de CNI (partiel)",
    idPartialPlaceholder: "Ex : CI****12",
  },
  passeport: {
    titlePlaceholderLost: "Ex : Passeport perdu à Rome",
    titlePlaceholderFound: "Ex : Passeport retrouvé au marché de Milan",
    idPartialLabel: "Numéro de passeport (partiel)",
    idPartialPlaceholder: "Ex : IT****84",
  },
  permis: {
    titlePlaceholderLost: "Ex : Permis de conduire perdu",
    idPartialLabel: "Numéro de permis (partiel)",
    idPartialPlaceholder: "Ex : PC****56",
  },
  "carte-etudiant": {
    titlePlaceholderLost: "Ex : Carte d'étudiant perdue sur le campus",
    idPartialLabel: "Numéro d'étudiant (partiel)",
    distinctivePlaceholder: "Ex : photo, autocollant, coin écorné",
  },
  "carte-pro": {
    titlePlaceholderLost: "Ex : Carte professionnelle perdue",
    idPartialLabel: "Numéro de badge (partiel)",
    distinctivePlaceholder: "Ex : logo, dragonne, autocollant au dos",
  },
  "carte-electeur": {
    titlePlaceholderLost: "Ex : Carte d'électeur perdue",
    idPartialLabel: "Numéro d'électeur (partiel)",
    distinctivePlaceholder: "Ex : coin écorné, tampon visible",
  },
  "carte-bancaire": {
    titlePlaceholderLost: "Ex : Carte bancaire perdue",
    idPartialLabel: "4 derniers chiffres uniquement",
    idPartialPlaceholder: "Ex : ****4321",
    distinctivePlaceholder: "Ex : carte rayée, autocollant personnalisé",
  },
  diplome: {
    titlePlaceholderLost: "Ex : Diplôme perdu lors d'un déménagement",
    idPartialLabel: "Numéro / référence (partiel)",
  },
  "doc-admin": {
    titlePlaceholderLost: "Ex : Document administratif perdu",
    idPartialLabel: "Numéro de référence (partiel)",
  },

  // ── Objets personnels ──────────────────────────────────────────────────
  objets: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : Sac à dos noir perdu à Naples",
    titlePlaceholderFound: "Ex : Sac à dos trouvé à Turin",
    brandPlaceholder: "Ex : Nike, Samsung, Apple...",
    modelPlaceholder: "Ex : préciser si connu",
  },
  telephone: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : iPhone 15 Pro perdu dans le métro",
    titlePlaceholderFound: "Ex : Téléphone Samsung trouvé dans le bus",
    brandPlaceholder: "Ex : Apple, Samsung, Xiaomi",
    modelPlaceholder: "Ex : iPhone 15 Pro, Galaxy S24",
    distinctiveHint:
      "Coque, fissure, fond d'écran, autocollant… ces détails aident au matching sans exposer le numéro IMEI complet.",
    distinctivePlaceholder: "Ex : coque transparente, petite fissure dans le coin supérieur",
    serialLabel: "Numéro IMEI (partiel)",
    serialHint: "Composez *#06# sur le téléphone pour le retrouver — n'indiquez que les derniers chiffres.",
    serialPlaceholder: "Ex : ****7291",
  },
  ordinateur: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : Ordinateur portable Dell perdu",
    titlePlaceholderFound: "Ex : MacBook trouvé dans un café",
    brandPlaceholder: "Ex : Apple, Dell, HP, Lenovo",
    modelPlaceholder: "Ex : MacBook Air, ThinkPad X1",
    serialLabel: "N° de série (partiel)",
  },
  tablette: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : iPad perdu dans le train",
    brandPlaceholder: "Ex : Apple, Samsung, Huawei",
    modelPlaceholder: "Ex : iPad Air, Galaxy Tab S9",
  },
  montre: {
    showBrand: true,
    showModel: true,
    titlePlaceholderLost: "Ex : Montre connectée perdue",
    brandPlaceholder: "Ex : Apple, Casio, Rolex",
    modelPlaceholder: "Ex : Apple Watch SE, G-Shock",
  },
  portefeuille: {
    showBrand: false,
    showModel: false,
    titlePlaceholderLost: "Ex : Portefeuille cuir marron perdu",
    distinctivePlaceholder: "Ex : déchirure sur le côté, initiales gravées à l'intérieur",
  },
  sac: {
    showBrand: true,
    showModel: false,
    titlePlaceholderLost: "Ex : Sac à dos noir perdu dans le bus",
    brandPlaceholder: "Ex : Eastpak, Nike, Louis Vuitton",
    distinctivePlaceholder: "Ex : badge accroché, zip avant cassé, contenu distinctif",
  },
  valise: {
    showBrand: true,
    titlePlaceholderLost: "Ex : Valise rouge perdue à l'aéroport",
    brandPlaceholder: "Ex : Samsonite, Delsey",
    distinctivePlaceholder: "Ex : ruban jaune sur la poignée, roue avant abîmée",
  },
  cles: {
    showBrand: false,
    showModel: false,
    titlePlaceholderLost: "Ex : Trousseau de clés perdu",
    distinctivePlaceholder: "Ex : porte-clés ballon de foot, clé de moto sur le trousseau",
  },
  bijoux: {
    showBrand: false,
    showModel: false,
    titlePlaceholderLost: "Ex : Bracelet en argent perdu",
    distinctivePlaceholder: "Ex : gravure à l'intérieur, pierre manquante",
  },
  lunettes: {
    showBrand: true,
    titlePlaceholderLost: "Ex : Lunettes de soleil perdues",
    brandPlaceholder: "Ex : Ray-Ban, Oakley",
  },
  vetements: {
    showBrand: true,
    showModel: false,
    titlePlaceholderLost: "Ex : Veste en cuir perdue",
    brandPlaceholder: "Ex : Zara, Nike",
  },
  electronique: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : Casque audio Bose perdu",
    brandPlaceholder: "Ex : Sony, JBL, Bose",
    modelPlaceholder: "Ex : WH-1000XM5",
  },

  // ── Transport ──────────────────────────────────────────────────────────
  transport: {
    showBrand: true,
    showModel: true,
    showSerial: true,
    titlePlaceholderLost: "Ex : Moto perdue à Rome",
    titlePlaceholderFound: "Ex : Vélo retrouvé à Milan",
    brandPlaceholder: "Ex : Yamaha, Honda, Piaggio",
    modelPlaceholder: "Ex : MT-07, SH 125, Liberty 125",
    distinctiveLabel: "Caractéristiques particulières",
    distinctiveHint:
      "Rayure, autocollant, accessoire ajouté ou manquant… un détail visuel précis aide à confirmer la correspondance.",
    distinctivePlaceholder:
      "Ex : rayure sur le réservoir, autocollant sur le garde-boue, rétroviseur différent de l'original",
    serialLabel: "Numéro de série / châssis (partiel)",
    serialPlaceholder: "Ex : 11***IT",
  },
  moto: {
    titlePlaceholderLost: "Ex : Moto Yamaha MT-07 perdue",
    titlePlaceholderFound: "Ex : Moto noire trouvée à Milan",
    brandPlaceholder: "Ex : Yamaha, Honda, Piaggio",
    modelPlaceholder: "Ex : MT-07, SH 125, Liberty 125",
  },
  velo: {
    titlePlaceholderLost: "Ex : Vélo de ville bleu perdu",
    titlePlaceholderFound: "Ex : Vélo retrouvé attaché à un poteau",
    brandPlaceholder: "Ex : Decathlon, Btwin, Trek",
    modelPlaceholder: "Ex : Rockrider, FDJ",
    distinctivePlaceholder: "Ex : panier avant, autocollant sur le cadre, selle personnalisée",
  },
  vehicule: {
    titlePlaceholderLost: "Ex : BMW Série 3 noire perdue à Rome",
    titlePlaceholderFound: "Ex : Voiture Fiat Panda trouvée à Turin",
    brandPlaceholder: "Ex : BMW, Toyota, Fiat",
    modelPlaceholder: "Ex : Série 3, Corolla, Panda",
    distinctivePlaceholder: "Ex : rayure sur la portière arrière droite, jante légèrement abîmée",
    serialLabel: "Numéro de châssis (VIN, partiel)",
  },
  camion: {
    titlePlaceholderLost: "Ex : Camion de livraison blanc perdu",
    brandPlaceholder: "Ex : Iveco, Mercedes, Renault",
    modelPlaceholder: "Ex : Daily, Sprinter, Master",
  },
  bus: {
    titlePlaceholderLost: "Ex : Minibus perdu / volé à Naples",
    brandPlaceholder: "Ex : Mercedes, Toyota Coaster",
  },
  plaque: {
    showBrand: false,
    showModel: false,
    showColor: false,
    showSerial: false,
    showIdPartial: true,
    titlePlaceholderLost: "Ex : Plaque d'immatriculation perdue",
    titlePlaceholderFound: "Ex : Plaque retrouvée près de la gare",
    idPartialLabel: "Numéro d'immatriculation (partiel)",
    idPartialHint: "Quelques caractères seulement, jamais la plaque complète.",
    idPartialPlaceholder: "Ex : AB***123",
    distinctivePlaceholder: "Ex : plaque tordue, autocollant partiellement arraché",
  },
  "doc-vehicule": {
    showBrand: false,
    showModel: false,
    showColor: false,
    showSerial: false,
    showIdPartial: true,
    titlePlaceholderLost: "Ex : Carte grise perdue",
    idPartialLabel: "Numéro du document (partiel)",
    idPartialPlaceholder: "Ex : IT****84",
  },
  casque: {
    showModel: false,
    showSerial: false,
    titlePlaceholderLost: "Ex : Casque de moto noir perdu",
    brandPlaceholder: "Ex : Shark, AGV, HJC",
    distinctivePlaceholder: "Ex : visière teintée, autocollants sur la coque",
  },
  "cle-vehicule": {
    showBrand: true,
    showModel: false,
    showSerial: false,
    titlePlaceholderLost: "Ex : Clé de voiture avec porte-clés perdue",
    distinctivePlaceholder: "Ex : porte-clés distinctif, télécommande avec autocollant",
  },
  "transport-autre": {
    titlePlaceholderLost: "Ex : Trottinette électrique perdue",
    titlePlaceholderFound: "Ex : Trottinette retrouvée près de la gare",
    brandPlaceholder: "Ex : Xiaomi, Decathlon",
    modelPlaceholder: "Ex : préciser si connu",
  },

  // ── Animaux ────────────────────────────────────────────────────────────
  animaux: {
    titlePlaceholderLost: "Ex : Chien Labrador perdu à Milan",
    titlePlaceholderFound: "Ex : Chat trouvé errant à Rome",
    distinctiveLabel: "Signes distinctifs (collier, tache, comportement…)",
    distinctiveHint:
      "Couleur du collier, tache particulière, comportement (craintif, joueur)… utile au matching et à la vérification.",
    distinctivePlaceholder: "Ex : tache blanche sur le poitrail, collier rouge",
    idPartialLabel: "Numéro de puce / identification (si connu)",
    extraFields: [
      { key: "breed", label: "Race", type: "text", placeholder: "Ex : Labrador, Européen, croisé..." },
      { key: "sex", label: "Sexe", type: "select", options: ["Mâle", "Femelle", "Inconnu"] },
      { key: "size", label: "Taille", type: "select", options: ["Petit", "Moyen", "Grand"] },
      {
        key: "chipNumber",
        label: "N° de puce électronique (si connu)",
        type: "text",
      },
    ],
  },
  chien: {
    titlePlaceholderLost: "Ex : Chien Labrador perdu à Milan",
    titlePlaceholderFound: "Ex : Chien errant trouvé, très sociable",
  },
  chat: {
    titlePlaceholderLost: "Ex : Chat gris perdu à Rome",
    titlePlaceholderFound: "Ex : Chat trouvé sans collier",
  },
  oiseau: {
    titlePlaceholderLost: "Ex : Perruche verte envolée",
    extraFields: [
      { key: "breed", label: "Espèce", type: "text", placeholder: "Ex : Perruche, Canari..." },
      { key: "chipNumber", label: "N° de bague (si connu)", type: "text" },
    ],
  },
  lapin: {
    titlePlaceholderLost: "Ex : Lapin nain blanc perdu",
  },
  "autre-animal": {
    titlePlaceholderLost: "Ex : Animal perdu — préciser l'espèce dans le titre",
  },
};

const PERSON_SLUGS = new Set(["personnes", "enfant", "femme", "homme", "personne-agee"]);

export function isPersonCategory(
  categorySlug: string | null | undefined,
  subcategorySlug?: string | null | undefined
): boolean {
  return (
    (!!categorySlug && PERSON_SLUGS.has(categorySlug)) ||
    (!!subcategorySlug && PERSON_SLUGS.has(subcategorySlug))
  );
}

export function getCategoryFieldConfig(
  categorySlug: string | null | undefined,
  subcategorySlug?: string | null | undefined
): CategoryFieldConfig {
  let config: CategoryFieldConfig = { ...DEFAULT_CONFIG };
  if (categorySlug && CONFIG_BY_SLUG[categorySlug]) {
    config = { ...config, ...CONFIG_BY_SLUG[categorySlug] };
  }
  if (subcategorySlug && CONFIG_BY_SLUG[subcategorySlug]) {
    config = { ...config, ...CONFIG_BY_SLUG[subcategorySlug] };
  }
  return config;
}

/** Server-side allowlist: only these `details` keys may be stored for a given category. */
export function getAllowedDetailKeys(
  categorySlug: string | null | undefined,
  subcategorySlug?: string | null | undefined
): Set<string> {
  const config = getCategoryFieldConfig(categorySlug, subcategorySlug);
  return new Set(config.extraFields.map((f) => f.key));
}

/** Strips any key not allowlisted for this category — never trust client-submitted `details` keys as-is. */
export function sanitizeDetails(
  details: Record<string, unknown> | null | undefined,
  categorySlug: string | null | undefined,
  subcategorySlug?: string | null | undefined
): Record<string, string> | null {
  if (!details) return null;
  const allowed = getAllowedDetailKeys(categorySlug, subcategorySlug);
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (!allowed.has(key)) continue;
    if (typeof value !== "string" && typeof value !== "number") continue;
    const str = String(value).trim().slice(0, 200);
    if (str) result[key] = str;
  }
  return Object.keys(result).length > 0 ? result : null;
}
