/**
 * Declarative per-category form shape. A passport, a bicycle, a dog and a
 * missing child have almost nothing in common — asking every declarer for
 * "marque / modèle / N° de série" regardless of what they're reporting was
 * the previous, incoherent, one-size-fits-all form. This module is the
 * single source of truth for which generic fields apply to a category, what
 * the free-text "distinctive" field should actually ask for, and which
 * category-specific extra fields (stored in `lostItems.details` /
 * `foundItems.details`, see db/schema.ts) should be collected instead.
 *
 * Resolution: subcategory config is merged over its parent category's
 * config over DEFAULT_CONFIG, so a subcategory only needs to declare what
 * differs from its parent.
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
  distinctiveLabel: string;
  distinctiveHint: string;
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
  titlePlaceholderLost: "Ex : Passeport burkinabè perdu",
  titlePlaceholderFound: "Ex : Téléphone Samsung trouvé",
  distinctiveLabel: "Caractéristiques particulières",
  distinctiveHint:
    "Rayure, sticker, contenu, collier… Ces détails aident au matching et à la vérification.",
  extraFields: [],
  blurSensitivePhotos: true,
  requiresModeration: false,
};

const PERSON_SAFETY_NOTICE =
  "Contactez d'abord la police ou les autorités locales — RETRUV complète une recherche, il ne remplace jamais un signalement officiel. En cas de danger immédiat, appelez les secours avant toute déclaration en ligne.";

const PERSON_EXTRA_FIELDS: readonly ExtraField[] = [
  { key: "ageApprox", label: "Âge approximatif", type: "text", placeholder: "Ex : 7 ans" },
  { key: "height", label: "Taille approximative", type: "text", placeholder: "Ex : 1m20" },
  {
    key: "build",
    label: "Corpulence",
    type: "select",
    options: ["Mince", "Moyenne", "Forte"],
  },
  { key: "hairColor", label: "Couleur des cheveux", type: "text" },
  { key: "eyeColor", label: "Couleur des yeux", type: "text" },
];

const PERSON_BASE: Partial<CategoryFieldConfig> = {
  showBrand: false,
  showModel: false,
  showColor: false,
  showSerial: false,
  showIdPartial: false,
  showCondition: false,
  showRecoveryPoint: false,
  titlePlaceholderLost: "Ex : Enfant de 7 ans disparu à Bobo-Dioulasso",
  titlePlaceholderFound: "Ex : Personne trouvée, identité inconnue",
  distinctiveLabel: "Vêtements portés et signes distinctifs",
  distinctiveHint:
    "Vêtements au moment de la disparition, cicatrice, tatouage, grain de beauté… Un détail précis mais non public aide à vérifier une correspondance sans l'exposer publiquement.",
  extraFields: PERSON_EXTRA_FIELDS,
  safetyNotice: PERSON_SAFETY_NOTICE,
  blurSensitivePhotos: false,
  requiresModeration: true,
};

/** Keyed by category OR subcategory slug. Subcategory entries are merged over their parent. */
const CONFIG_BY_SLUG: Record<string, Partial<CategoryFieldConfig>> = {
  // Personnes disparues
  personnes: PERSON_BASE,
  enfant: {
    safetyNotice:
      "Disparition d'un enfant : contactez IMMÉDIATEMENT la police (et le numéro national d'urgence enfance si disponible dans votre pays) avant toute autre démarche. RETRUV agit en complément d'un signalement officiel, jamais à sa place.",
  },
  "personne-agee": {
    safetyNotice:
      "Disparition d'une personne âgée (risque d'errance, de désorientation) : contactez immédiatement la police. Mentionnez tout problème de santé pertinent (mémoire, mobilité) qui pourrait aider les secours — dans les caractéristiques non publiques, pas dans la description publique.",
  },

  // Documents
  documents: {
    showIdPartial: true,
    distinctiveLabel: "Détail non visible publiquement (tache, pli, inscription…)",
    distinctiveHint:
      "Ce détail sert uniquement à vérifier le vrai propriétaire — ne le mettez jamais dans la description publique.",
  },

  // Objets
  objets: { showBrand: true, showModel: true, showSerial: true },
  telephone: { showBrand: true, showModel: true, showSerial: true },
  ordinateur: { showBrand: true, showModel: true, showSerial: true },
  tablette: { showBrand: true, showModel: true, showSerial: true },
  montre: { showBrand: true, showModel: true, showSerial: true },
  electronique: { showBrand: true, showModel: true, showSerial: true },
  cles: { showBrand: false, showModel: false },
  bijoux: { showBrand: false, showModel: false },

  // Transport
  transport: { showBrand: true, showModel: true, showSerial: true },
  moto: { showBrand: true, showModel: true, showSerial: true },
  velo: { showBrand: true, showModel: true, showSerial: true },
  vehicule: { showBrand: true, showModel: true, showSerial: true },
  plaque: { showIdPartial: true, showBrand: false, showModel: false, showColor: false },
  "doc-vehicule": { showIdPartial: true, showBrand: false, showModel: false, showColor: false },

  // Animaux
  animaux: {
    distinctiveLabel: "Signes distinctifs (collier, tache, comportement…)",
    distinctiveHint:
      "Couleur du collier, tache particulière, comportement (craintif, joueur)… utile au matching et à la vérification.",
    extraFields: [
      { key: "breed", label: "Race", type: "text", placeholder: "Ex : Berger local, Européen..." },
      {
        key: "chipNumber",
        label: "N° de puce électronique (si connu)",
        type: "text",
      },
    ],
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
