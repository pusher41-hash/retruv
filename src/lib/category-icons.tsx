import {
  Backpack,
  Baby,
  Beef,
  Bike,
  Bird,
  Briefcase,
  Car,
  CarFront,
  Cat,
  ClipboardList,
  CreditCard,
  Dog,
  FileBadge,
  FileCheck,
  FileText,
  Gem,
  Glasses,
  GraduationCap,
  HardHat,
  Hash,
  Headphones,
  IdCard,
  Key,
  Laptop,
  Luggage,
  type LucideIcon,
  Motorbike,
  Package,
  PawPrint,
  ScrollText,
  ShoppingBag,
  Smartphone,
  Shirt,
  Stamp,
  Tablet,
  UserRound,
  UserSearch,
  Vote,
  Wallet,
  Watch,
} from "lucide-react";

/**
 * Category icons moved from stored emoji (src/db categories.icon, seeded
 * from CATEGORY_TREE) to this slug → component lookup. Emoji render
 * inconsistently across platforms and read as informal; a single-color
 * line-icon set looks consistent everywhere and tints cleanly with
 * currentColor. The DB `icon` column is left untouched (harmless legacy
 * data) — every render site keys off `category.slug` instead.
 */
const CATEGORY_ICONS: Record<string, LucideIcon> = {
  // Top-level
  personnes: UserSearch,
  documents: FileText,
  objets: Backpack,
  transport: CarFront,
  animaux: PawPrint,

  // Personnes disparues
  enfant: Baby,
  femme: UserRound,
  homme: UserRound,
  "personne-agee": UserRound,

  // Documents
  cni: IdCard,
  passeport: Stamp,
  permis: FileBadge,
  "carte-etudiant": GraduationCap,
  "carte-pro": Briefcase,
  "carte-electeur": Vote,
  "carte-bancaire": CreditCard,
  diplome: ScrollText,
  "doc-admin": ClipboardList,

  // Objets
  telephone: Smartphone,
  ordinateur: Laptop,
  tablette: Tablet,
  montre: Watch,
  portefeuille: Wallet,
  sac: ShoppingBag,
  valise: Luggage,
  cles: Key,
  bijoux: Gem,
  lunettes: Glasses,
  vetements: Shirt,
  electronique: Headphones,

  // Transport
  moto: Motorbike,
  velo: Bike,
  vehicule: Car,
  plaque: Hash,
  "doc-vehicule": FileCheck,
  casque: HardHat,

  // Animaux
  chien: Dog,
  chat: Cat,
  betail: Beef,
  "autre-animal": Bird,
};

export function getCategoryIcon(slug: string | null | undefined): LucideIcon {
  return (slug && CATEGORY_ICONS[slug]) || Package;
}

export function CategoryIcon({
  slug,
  className,
}: {
  slug: string | null | undefined;
  className?: string;
}) {
  // getCategoryIcon always resolves to a stable, module-level Lucide
  // component (from CATEGORY_ICONS or the Package fallback) — nothing is
  // instantiated here, but the linter can't verify that statically.
  const Icon = getCategoryIcon(slug);
  // eslint-disable-next-line react-hooks/static-components
  return <Icon className={className} strokeWidth={2} aria-hidden="true" />;
}
