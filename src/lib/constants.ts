export const APP_NAME = "RETRUV";
export const APP_TAGLINE = "Retrouvons ce qui compte.";
export const APP_DESCRIPTION =
  "La plateforme intelligente qui reconnecte les objets perdus à leurs propriétaires.";

/**
 * RETRUV is a worldwide platform, not a Burkina Faso product — this list
 * spans every continent on purpose. Sorted alphabetically by name so no
 * single country reads as "the default."
 */
export const COUNTRIES = [
  { code: "DE", name: "Allemagne", currency: "EUR", phonePrefix: "+49" },
  { code: "SA", name: "Arabie saoudite", currency: "SAR", phonePrefix: "+966" },
  { code: "AR", name: "Argentine", currency: "ARS", phonePrefix: "+54" },
  { code: "AU", name: "Australie", currency: "AUD", phonePrefix: "+61" },
  { code: "BE", name: "Belgique", currency: "EUR", phonePrefix: "+32" },
  { code: "BJ", name: "Bénin", currency: "XOF", phonePrefix: "+229" },
  { code: "BR", name: "Brésil", currency: "BRL", phonePrefix: "+55" },
  { code: "BF", name: "Burkina Faso", currency: "XOF", phonePrefix: "+226" },
  { code: "CM", name: "Cameroun", currency: "XAF", phonePrefix: "+237" },
  { code: "CA", name: "Canada", currency: "CAD", phonePrefix: "+1" },
  { code: "CN", name: "Chine", currency: "CNY", phonePrefix: "+86" },
  { code: "CI", name: "Côte d'Ivoire", currency: "XOF", phonePrefix: "+225" },
  { code: "EG", name: "Égypte", currency: "EGP", phonePrefix: "+20" },
  { code: "AE", name: "Émirats arabes unis", currency: "AED", phonePrefix: "+971" },
  { code: "ES", name: "Espagne", currency: "EUR", phonePrefix: "+34" },
  { code: "US", name: "États-Unis", currency: "USD", phonePrefix: "+1" },
  { code: "FR", name: "France", currency: "EUR", phonePrefix: "+33" },
  { code: "GH", name: "Ghana", currency: "GHS", phonePrefix: "+233" },
  { code: "IN", name: "Inde", currency: "INR", phonePrefix: "+91" },
  { code: "IT", name: "Italie", currency: "EUR", phonePrefix: "+39" },
  { code: "JP", name: "Japon", currency: "JPY", phonePrefix: "+81" },
  { code: "KE", name: "Kenya", currency: "KES", phonePrefix: "+254" },
  { code: "MA", name: "Maroc", currency: "MAD", phonePrefix: "+212" },
  { code: "ML", name: "Mali", currency: "XOF", phonePrefix: "+223" },
  { code: "MX", name: "Mexique", currency: "MXN", phonePrefix: "+52" },
  { code: "NE", name: "Niger", currency: "XOF", phonePrefix: "+227" },
  { code: "NG", name: "Nigéria", currency: "NGN", phonePrefix: "+234" },
  { code: "NL", name: "Pays-Bas", currency: "EUR", phonePrefix: "+31" },
  { code: "PH", name: "Philippines", currency: "PHP", phonePrefix: "+63" },
  { code: "PT", name: "Portugal", currency: "EUR", phonePrefix: "+351" },
  { code: "CD", name: "RD Congo", currency: "CDF", phonePrefix: "+243" },
  { code: "GB", name: "Royaume-Uni", currency: "GBP", phonePrefix: "+44" },
  { code: "SN", name: "Sénégal", currency: "XOF", phonePrefix: "+221" },
  { code: "ZA", name: "Afrique du Sud", currency: "ZAR", phonePrefix: "+27" },
  { code: "CH", name: "Suisse", currency: "CHF", phonePrefix: "+41" },
  { code: "TG", name: "Togo", currency: "XOF", phonePrefix: "+228" },
] as const;

/** Display name for a country code — falls back to the code itself for one not in COUNTRIES. */
export function countryName(code: string): string {
  return COUNTRIES.find((c) => c.code === code)?.name ?? code;
}

/**
 * Currency for a country code — used so a reward amount is tagged in the
 * declarer's own currency instead of inheriting the `reward_currency`
 * column's default (see db/schema.ts), which would otherwise silently tag
 * every declaration worldwide in West African CFA francs.
 */
export function countryCurrency(code: string | null | undefined): string {
  return COUNTRIES.find((c) => c.code === code)?.currency ?? "EUR";
}

export const COLORS = [
  "Noir",
  "Blanc",
  "Gris",
  "Argenté",
  "Doré",
  "Rouge",
  "Bleu",
  "Vert",
  "Jaune",
  "Orange",
  "Marron",
  "Beige",
  "Rose",
  "Violet",
  "Multicolore",
  "Autre",
] as const;

export const ITEM_CONDITIONS = [
  "Excellent",
  "Bon",
  "Moyen",
  "Abîmé",
  "Inutilisable",
] as const;

export const CATEGORY_TREE = [
  {
    slug: "personnes",
    nameFr: "Personnes disparues",
    nameEn: "Missing persons",
    icon: "🧑",
    isSensitive: true,
    children: [
      { slug: "enfant", nameFr: "Enfant disparu(e)", nameEn: "Missing child", icon: "🧒", isSensitive: true },
      { slug: "femme", nameFr: "Femme disparue", nameEn: "Missing woman", icon: "👩", isSensitive: true },
      { slug: "homme", nameFr: "Homme disparu", nameEn: "Missing man", icon: "👨", isSensitive: true },
      { slug: "personne-agee", nameFr: "Personne âgée disparue", nameEn: "Missing elderly person", icon: "🧓", isSensitive: true },
    ],
  },
  {
    slug: "documents",
    nameFr: "Documents personnels",
    nameEn: "Personal documents",
    icon: "📄",
    isSensitive: true,
    children: [
      { slug: "cni", nameFr: "Carte nationale d'identité", nameEn: "National ID", icon: "🪪", isSensitive: true },
      { slug: "passeport", nameFr: "Passeport", nameEn: "Passport", icon: "🛂", isSensitive: true },
      { slug: "permis", nameFr: "Permis de conduire", nameEn: "Driver license", icon: "🚗", isSensitive: true },
      { slug: "carte-etudiant", nameFr: "Carte d'étudiant", nameEn: "Student card", icon: "🎓", isSensitive: false },
      { slug: "carte-pro", nameFr: "Carte professionnelle", nameEn: "Professional card", icon: "💼", isSensitive: false },
      { slug: "carte-electeur", nameFr: "Carte d'électeur", nameEn: "Voter card", icon: "🗳️", isSensitive: true },
      { slug: "carte-bancaire", nameFr: "Carte bancaire", nameEn: "Bank card", icon: "💳", isSensitive: true },
      { slug: "diplome", nameFr: "Diplôme / Certificat", nameEn: "Diploma / Certificate", icon: "📜", isSensitive: false },
      { slug: "doc-admin", nameFr: "Document administratif", nameEn: "Admin document", icon: "📋", isSensitive: true },
    ],
  },
  {
    slug: "objets",
    nameFr: "Objets personnels",
    nameEn: "Personal items",
    icon: "🎒",
    isSensitive: false,
    children: [
      { slug: "telephone", nameFr: "Téléphone", nameEn: "Phone", icon: "📱", isSensitive: false },
      { slug: "ordinateur", nameFr: "Ordinateur", nameEn: "Computer", icon: "💻", isSensitive: false },
      { slug: "tablette", nameFr: "Tablette", nameEn: "Tablet", icon: "📲", isSensitive: false },
      { slug: "montre", nameFr: "Montre", nameEn: "Watch", icon: "⌚", isSensitive: false },
      { slug: "portefeuille", nameFr: "Portefeuille", nameEn: "Wallet", icon: "👛", isSensitive: false },
      { slug: "sac", nameFr: "Sac / Sac à main", nameEn: "Bag", icon: "👜", isSensitive: false },
      { slug: "valise", nameFr: "Valise / Bagage", nameEn: "Luggage", icon: "🧳", isSensitive: false },
      { slug: "cles", nameFr: "Clés", nameEn: "Keys", icon: "🔑", isSensitive: false },
      { slug: "bijoux", nameFr: "Bijoux", nameEn: "Jewelry", icon: "💍", isSensitive: false },
      { slug: "lunettes", nameFr: "Lunettes", nameEn: "Glasses", icon: "👓", isSensitive: false },
      { slug: "vetements", nameFr: "Vêtements", nameEn: "Clothing", icon: "👕", isSensitive: false },
      { slug: "electronique", nameFr: "Équipement électronique", nameEn: "Electronics", icon: "🎧", isSensitive: false },
    ],
  },
  {
    slug: "transport",
    nameFr: "Transport",
    nameEn: "Transport",
    icon: "🛵",
    isSensitive: false,
    children: [
      { slug: "moto", nameFr: "Moto", nameEn: "Motorcycle", icon: "🏍️", isSensitive: false },
      { slug: "velo", nameFr: "Vélo", nameEn: "Bicycle", icon: "🚲", isSensitive: false },
      { slug: "vehicule", nameFr: "Voiture", nameEn: "Car", icon: "🚗", isSensitive: false },
      { slug: "camion", nameFr: "Camion", nameEn: "Truck", icon: "🚚", isSensitive: false },
      { slug: "bus", nameFr: "Bus", nameEn: "Bus", icon: "🚌", isSensitive: false },
      { slug: "plaque", nameFr: "Plaque d'immatriculation", nameEn: "License plate", icon: "🔢", isSensitive: true },
      { slug: "doc-vehicule", nameFr: "Documents de véhicule", nameEn: "Vehicle papers", icon: "📑", isSensitive: true },
      { slug: "casque", nameFr: "Casque", nameEn: "Helmet", icon: "⛑️", isSensitive: false },
      { slug: "cle-vehicule", nameFr: "Clé de véhicule", nameEn: "Vehicle key", icon: "🔑", isSensitive: false },
      { slug: "transport-autre", nameFr: "Autre", nameEn: "Other", icon: "❓", isSensitive: false },
    ],
  },
  {
    slug: "animaux",
    nameFr: "Animaux",
    nameEn: "Animals",
    icon: "🐾",
    isSensitive: false,
    children: [
      { slug: "chien", nameFr: "Chien", nameEn: "Dog", icon: "🐕", isSensitive: false },
      { slug: "chat", nameFr: "Chat", nameEn: "Cat", icon: "🐈", isSensitive: false },
      { slug: "oiseau", nameFr: "Oiseau", nameEn: "Bird", icon: "🦜", isSensitive: false },
      { slug: "lapin", nameFr: "Lapin", nameEn: "Rabbit", icon: "🐇", isSensitive: false },
      { slug: "betail", nameFr: "Bétail", nameEn: "Livestock", icon: "🐄", isSensitive: false },
      { slug: "autre-animal", nameFr: "Autre animal", nameEn: "Other animal", icon: "🐾", isSensitive: false },
    ],
  },
] as const;

export const MATCH_LEVELS = {
  weak: { min: 35, max: 49, label: "Correspondance faible", color: "slate" },
  possible: { min: 50, max: 69, label: "Correspondance possible", color: "amber" },
  probable: { min: 70, max: 84, label: "Correspondance probable", color: "orange" },
  very_probable: { min: 85, max: 100, label: "Correspondance très probable", color: "emerald" },
} as const;

export const REPUTATION_THRESHOLDS = {
  new: 0,
  reliable: 20,
  verified_finder: 50,
  super_finder: 100,
  partner: 200,
} as const;

/**
 * A rating's weight on the recipient's reputation depends on the rater's
 * own standing — a fresh/`new` account (cheap to create in bulk) can't move
 * someone's reputation as much as an established one. Blunts the "ring of
 * new accounts rating each other" attack (RETRUV_REDTEAM Scénario B).
 */
export const RATING_TRUST_WEIGHT: Record<
  keyof typeof REPUTATION_THRESHOLDS,
  number
> = {
  new: 0.5,
  reliable: 0.75,
  verified_finder: 1,
  super_finder: 1.25,
  partner: 1.5,
} as const;

/** Max ratings a single user can receive within 24h — caps reputation-gain velocity. */
export const MAX_RATINGS_RECEIVED_PER_DAY = 3;

/**
 * Declarations by the same user within the past hour, at and beyond which a
 * CAPTCHA is required. Frictionless below this (RETRUV_ARCHITECTURE.md
 * explicitly rejects a permanent CAPTCHA as mobile friction); required past
 * it, matching RETRUV_REDTEAM.md's "CAPTCHA sur /api/lost et /api/found
 * après 3 déclarations/h".
 */
export const CAPTCHA_DECLARATION_THRESHOLD = 3;

export const SENSITIVE_DOC_SLUGS = [
  "cni",
  "passeport",
  "permis",
  "carte-electeur",
  "carte-bancaire",
  "doc-admin",
  "plaque",
  "doc-vehicule",
];

export const SESSION_COOKIE = "retruv_session";
export const SESSION_DAYS = 30;
/** Active sessions kept per user; the oldest is dropped past this count. */
export const MAX_SESSIONS_PER_USER = 5;
/** A conversation auto-closes this many days after its match completes. */
export const CONVERSATION_AUTO_CLOSE_DAYS = 7;
export const MAX_VERIFY_ATTEMPTS = 3;
export const DECLARATION_EXPIRY_DAYS = 90;
/** Extra buffer after expiresAt before an expired declaration is archived. */
export const DECLARATION_ARCHIVE_GRACE_DAYS = 7;
export const MATCH_THRESHOLD = 35;
/** Same-city candidates checked first — the dominant real-world case. */
export const MATCH_SAME_CITY_LIMIT = 150;
/** Extra cross-city candidates checked only if same-city supply is scarce. */
export const MATCH_CROSS_CITY_LIMIT = 50;

/** Failed logins allowed before the account is temporarily locked. */
export const LOGIN_MAX_ATTEMPTS = 5;
/** Lockout duration doubles per extra failure beyond the threshold, capped here. */
export const LOGIN_LOCK_MAX_MINUTES = 60;
