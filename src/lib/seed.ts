import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  categories,
  foundItems,
  lostItems,
  recoveryPoints,
  users,
} from "@/db/schema";
import { CATEGORY_TREE, DECLARATION_EXPIRY_DAYS } from "./constants";
import { hashPassword } from "./auth";
import { extractKeywords } from "./utils";
import { runMatchingForFoundItem } from "./matching";
import { encryptPrivatePayload } from "./security";

/**
 * Backfills any CATEGORY_TREE entry missing from the DB, keyed by slug —
 * not just a one-time seed of an empty table. CATEGORY_TREE grows over time
 * (e.g. the "personnes" category added later), and an already-seeded
 * production DB needs those new rows without a manual reseed trigger.
 */
export async function seedCategories() {
  const existingRows = await db.select().from(categories);
  const bySlug = new Map(existingRows.map((c) => [c.slug, c]));
  let maxSort = existingRows.reduce((m, c) => Math.max(m, c.sortOrder ?? 0), -10);

  for (const cat of CATEGORY_TREE) {
    let parent = bySlug.get(cat.slug);
    if (!parent) {
      maxSort += 10;
      [parent] = await db
        .insert(categories)
        .values({
          slug: cat.slug,
          nameFr: cat.nameFr,
          nameEn: cat.nameEn,
          icon: cat.icon,
          isSensitive: cat.isSensitive,
          sortOrder: maxSort,
        })
        .returning();
      bySlug.set(cat.slug, parent);
    } else if (
      parent.nameFr !== cat.nameFr ||
      parent.nameEn !== cat.nameEn ||
      parent.icon !== cat.icon
    ) {
      // Relabel drift only (e.g. CATEGORY_TREE renaming "Véhicule" to
      // "Voiture") — never touches the id, so existing declarations
      // referencing this category keep working unchanged.
      [parent] = await db
        .update(categories)
        .set({ nameFr: cat.nameFr, nameEn: cat.nameEn, icon: cat.icon })
        .where(eq(categories.id, parent.id))
        .returning();
      bySlug.set(cat.slug, parent);
    }

    for (const child of cat.children) {
      const existingChild = bySlug.get(child.slug);
      if (!existingChild) {
        maxSort += 1;
        const [inserted] = await db
          .insert(categories)
          .values({
            slug: child.slug,
            nameFr: child.nameFr,
            nameEn: child.nameEn,
            icon: child.icon,
            parentId: parent.id,
            isSensitive: child.isSensitive,
            sortOrder: maxSort,
          })
          .returning();
        bySlug.set(child.slug, inserted);
      } else if (
        existingChild.nameFr !== child.nameFr ||
        existingChild.nameEn !== child.nameEn ||
        existingChild.icon !== child.icon
      ) {
        const [updated] = await db
          .update(categories)
          .set({ nameFr: child.nameFr, nameEn: child.nameEn, icon: child.icon })
          .where(eq(categories.id, existingChild.id))
          .returning();
        bySlug.set(child.slug, updated);
      }
    }
  }
}

export async function seedDemoData() {
  await seedCategories();

  // Keyed by email, not phone: the demo phone numbers/cities changed (see
  // above) when this environment's default moved from Burkina Faso to
  // Italy, but an already-seeded environment (this one included) still has
  // its original admin under the old phone number — checking by phone would
  // make this think no admin exists and try to insert a colliding second
  // one (same admin@retruv.app email, unique constraint failure).
  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.email, "admin@retruv.app"))
    .limit(1);
  if (existingAdmin.length > 0) return { seeded: false };

  const passwordHash = await hashPassword("retruv2026");

  // Demo: cohérent BF — les données de démo reflètent la réalité terrain d'origine (Burkina Faso).
  // Le caractère mondial de RETRUV est illustré par les Points et Partenaires (36 pays) et non par des
  // incohérences noms BF / villes IT. Un BF peut voyager, mais la démo se veut exemplaire et lisible.
  const [admin] = await db
    .insert(users)
    .values({
      phone: "+226700000000",
      email: "admin@retruv.app",
      passwordHash,
      fullName: "Admin RETRUV",
      role: "admin",
      country: "BF",
      city: "Ouagadougou",
      isVerified: true,
      reputationScore: 200,
      reputationLevel: "partner",
    })
    .returning();

  const [aicha] = await db
    .insert(users)
    .values({
      phone: "+226700000001",
      email: "aicha@example.com",
      passwordHash,
      fullName: "Aïcha Ouédraogo",
      role: "user",
      country: "BF",
      city: "Ouagadougou",
      isVerified: true,
      reputationScore: 25,
      reputationLevel: "reliable",
    })
    .returning();

  const [moussa] = await db
    .insert(users)
    .values({
      phone: "+226700000002",
      email: "moussa@example.com",
      passwordHash,
      fullName: "Moussa Traoré",
      role: "verified_finder",
      country: "BF",
      city: "Bobo-Dioulasso",
      isVerified: true,
      reputationScore: 60,
      reputationLevel: "verified_finder",
    })
    .returning();

  const [fatou] = await db
    .insert(users)
    .values({
      phone: "+226700000003",
      email: "fatou@example.com",
      passwordHash,
      fullName: "Fatou Kaboré",
      role: "user",
      country: "BF",
      city: "Bobo-Dioulasso",
      isVerified: true,
      reputationScore: 15,
      reputationLevel: "new",
    })
    .returning();

  const [ibrahim] = await db
    .insert(users)
    .values({
      phone: "+226700000004",
      passwordHash,
      fullName: "Ibrahim Sawadogo",
      role: "user",
      country: "BF",
      city: "Ouagadougou",
      reputationScore: 5,
      reputationLevel: "new",
    })
    .returning();

  // Recovery points
  const points = await db
    .insert(recoveryPoints)
    .values([
      {
        name: "RETRUV POINT — Gare Centrale Ouagadougou",
        type: "gare",
        address: "Avenue Kwame Nkrumah, Gare Centrale",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.3676,
        longitude: -1.5275,
        phone: "+22625300001",
        hours: "Tous les jours 5h30–20h",
        managerName: "M. Kaboré",
        itemsDeposited: 12,
        itemsRecovered: 9,
      },
      {
        name: "RETRUV POINT — Mairie de Bobo-Dioulasso",
        type: "mairie",
        address: "Avenue de la République, Hôtel de Ville",
        city: "Bobo-Dioulasso",
        country: "BF",
        latitude: 11.1772,
        longitude: -4.2979,
        phone: "+22620970002",
        hours: "Lun–Ven 7h30–16h",
        managerName: "Mme Ouédraogo",
        itemsDeposited: 28,
        itemsRecovered: 21,
      },
      {
        name: "RETRUV POINT — Gare routière Ouaga",
        type: "gare",
        address: "Avenue Naaba Zombré, Ouagadougou",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.345,
        longitude: -1.51,
        phone: "+22625490003",
        hours: "Tous les jours 6h–20h",
        managerName: "M. Sawadogo",
        itemsDeposited: 45,
        itemsRecovered: 33,
      },
      {
        name: "Commissariat Central Ouagadougou",
        type: "commissariat",
        address: "Avenue Dimdolobsom, Ouagadougou",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.3648,
        longitude: -1.5336,
        phone: "+22625491122",
        hours: "24h/24",
        managerName: "Commissaire Diallo",
        itemsDeposited: 7,
        itemsRecovered: 5,
      },
      {
        name: "RETRUV POINT — Université Joseph Ki-Zerbo",
        type: "universite",
        address: "03 BP 7021, Ouagadougou",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.3714,
        longitude: -1.5012,
        phone: "+22625307064",
        hours: "Lun–Ven 7h–18h",
        managerName: "Présidence UJKZ",
        itemsDeposited: 19,
        itemsRecovered: 14,
      },
    ])
    .returning();

  const allCats = await db.select().from(categories);
  const bySlug = Object.fromEntries(allCats.map((c) => [c.slug, c]));

  const expires = new Date();
  expires.setDate(expires.getDate() + DECLARATION_EXPIRY_DAYS);

  // Aïcha lost passport in Bobo
  const passportCat = bySlug["documents"];
  const passportSub = bySlug["passeport"];
  const phoneCat = bySlug["objets"];
  const phoneSub = bySlug["telephone"];
  const walletSub = bySlug["portefeuille"];
  const motoCat = bySlug["transport"];
  const motoSub = bySlug["moto"];
  const dogSub = bySlug["chien"];
  const animalCat = bySlug["animaux"];
  const keysSub = bySlug["cles"];
  const bagSub = bySlug["sac"];

  const [lostPassport] = await db
    .insert(lostItems)
    .values({
      userId: aicha.id,
      categoryId: passportCat.id,
      subcategoryId: passportSub.id,
      title: "Passeport perdu à Ouagadougou",
      description:
        "Passeport biométrique perdu près de la gare centrale de Ouagadougou. Couverture bordeaux, quelques pages tamponnées.",
      color: "Bordeaux",
      distinctiveFeatures:
        "Petite tache d'encre en bas de la page 3, coin supérieur légèrement plié",
      idPartialMasked: "BF****84",
      keywords: extractKeywords(
        "passeport biométrique gare centrale ouagadougou"
      ),
      lostDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lostTimeApprox: "14h00",
      city: "Ouagadougou",
      district: "Gounghin",
      locationApprox: "Gare Centrale Ouagadougou",
      latitude: 12.3676,
      longitude: -1.5275,
      rewardAmount: 0,
      status: "active",
      isSensitive: true,
      privateNotes: "Nom complet: Aïcha Ouédraogo. N° se termine par 84.",
      verificationHints: [
        "tache d'encre page 3",
        "coin plié",
        "gare termini",
      ],
      expiresAt: expires,
      country: "IT",
    })
    .returning();

  // Moussa found passport
  const [foundPassport] = await db
    .insert(foundItems)
    .values({
      userId: moussa.id,
      categoryId: passportCat.id,
      subcategoryId: passportSub.id,
      title: "Passeport trouvé à la gare",
      description:
        "Passeport trouvé par terre près d'un quai de la gare centrale de Ouagadougou. Couverture bordeaux.",
      color: "Bordeaux",
      distinctiveFeatures: "Coin supérieur un peu abîmé, tache visible à l'intérieur",
      idPartialMasked: "BF****84",
      keywords: extractKeywords("passeport trouvé gare centrale ouagadougou bordeaux"),
      foundDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
      foundTimeApprox: "16h30",
      city: "Ouagadougou",
      district: "Gounghin",
      locationApprox: "Gare Centrale Ouagadougou",
      latitude: 12.368,
      longitude: -1.528,
      condition: "Bon",
      status: "active",
      isSensitive: true,
      blurredPhotoUrls: [],
      privateDataEncrypted: encryptPrivatePayload({
        lastDigits: "84",
        docType: "passeport",
      }),
      recoveryPointId: points[0].id,
      expiresAt: expires,
      country: "IT",
    })
    .returning();

  // Phone lost in Turin
  await db.insert(lostItems).values({
    userId: fatou.id,
    categoryId: phoneCat.id,
    subcategoryId: phoneSub.id,
    title: "iPhone 15 Pro perdu à Bobo-Dioulasso",
    description:
      "iPhone 15 Pro noir avec coque transparente fissurée. Perdu entre la mairie et le marché central de Bobo-Dioulasso. Fond d'écran photo de famille.",
    brand: "Apple",
    model: "iPhone 15 Pro",
    color: "Noir",
    distinctiveFeatures: "Coque transparente fissurée en bas à droite, sticker discret au dos",
    serialPartial: "****7291",
    keywords: extractKeywords("iphone 15 pro noir coque fissurée bobo dioulasso"),
    lostDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lostTimeApprox: "19h00",
    city: "Bobo-Dioulasso",
    district: "Centre",
    locationApprox: "Avenue Naaba Zombré, Bobo-Dioulasso",
    latitude: 11.1772,
    longitude: -4.2979,
    rewardAmount: 20,
    rewardCurrency: "XOF",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "BF",
  });

  await db.insert(foundItems).values({
    userId: ibrahim.id,
    categoryId: phoneCat.id,
    subcategoryId: phoneSub.id,
    title: "iPhone noir trouvé dans un taxi",
    description:
      "iPhone noir trouvé sur la banquette arrière d'un taxi à Bobo-Dioulasso. Coque transparente abîmée.",
    brand: "Apple",
    model: "iPhone 15 Pro",
    color: "Noir",
    distinctiveFeatures: "Coque fissurée, petit autocollant au dos",
    keywords: extractKeywords("iphone noir taxi bobo coque"),
    foundDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    foundTimeApprox: "20h00",
    city: "Bobo-Dioulasso",
    district: "Centre",
    locationApprox: "Taxi, zone mairie Bobo",
    latitude: 11.178,
    longitude: -4.298,
    condition: "Bon",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "IT",
  });

  // Wallet
  await db.insert(lostItems).values({
    userId: ibrahim.id,
    categoryId: phoneCat.id,
    subcategoryId: walletSub.id,
    title: "Portefeuille cuir marron perdu",
    description:
      "Portefeuille en cuir marron avec une déchirure sur le côté. Contient des cartes et un peu d'argent.",
    color: "Marron",
    brand: "Artisanal",
    distinctiveFeatures: "Déchirure côté droit, initiales IS gravées à l'intérieur",
    keywords: extractKeywords("portefeuille cuir marron déchirure ouagadougou"),
    lostDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    city: "Ouagadougou",
    district: "Centre-ville",
    locationApprox: "Centre-ville Ouagadougou",
    status: "active",
    isSensitive: false,
    rewardAmount: 10,
    expiresAt: expires,
    country: "BF",
  });

  // Moto
  await db.insert(lostItems).values({
    userId: moussa.id,
    categoryId: motoCat.id,
    subcategoryId: motoSub.id,
    title: "Moto Yamaha MT-07 perdue",
    description: "Moto Yamaha MT-07 noire volée / perdue près de la mairie de Bobo-Dioulasso.",
    brand: "Yamaha",
    model: "MT-07",
    color: "Noir",
    serialPartial: "11***BF",
    distinctiveFeatures: "Rétroviseur gauche cassé, autocollant RETRUV sur le réservoir",
    keywords: extractKeywords("moto yamaha mt-07 noire bobo"),
    lostDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    city: "Bobo-Dioulasso",
    district: "Accart-Ville",
    locationApprox: "Près de la mairie de Bobo-Dioulasso",
    status: "active",
    isSensitive: false,
    rewardAmount: 100,
    expiresAt: expires,
    country: "IT",
  });

  // Dog
  await db.insert(lostItems).values({
    userId: fatou.id,
    categoryId: animalCat.id,
    subcategoryId: dogSub.id,
    title: "Chien berger local brun",
    description: "Chien berger local croisé brun, très gentil, répond au nom de Rex. Perdu à Bobo-Dioulasso.",
    color: "Marron",
    distinctiveFeatures: "Collier bleu, tache blanche sur le poitrail, boite légèrement",
    keywords: extractKeywords("chien berger local rex collier bleu bobo"),
    lostDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    city: "Bobo-Dioulasso",
    district: "Diarradougou",
    locationApprox: "Quartier Diarradougou, Bobo",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "IT",
  });

  // Keys found
  await db.insert(foundItems).values({
    userId: aicha.id,
    categoryId: phoneCat.id,
    subcategoryId: keysSub.id,
    title: "Trousseau de clés trouvé",
    description: "Trousseau avec 4 clés et un porte-clés ballon de foot.",
    color: "Argenté",
    distinctiveFeatures: "Porte-clés ballon de foot, une clé de moto",
    keywords: extractKeywords("clés trousseau ballon foot ouaga"),
    foundDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
    city: "Ouagadougou",
    district: "Cissin",
    locationApprox: "Devant une boutique, Ouaga",
    condition: "Bon",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "IT",
  });

  // Bag in bus
  await db.insert(foundItems).values({
    userId: moussa.id,
    categoryId: phoneCat.id,
    subcategoryId: bagSub.id,
    title: "Sac à dos noir dans un bus",
    description:
      "Sac à dos noir trouvé dans un bus reliant Ouagadougou à Bobo-Dioulasso. Contient des cahiers scolaires.",
    color: "Noir",
    brand: "Eastpak",
    distinctiveFeatures: "Badge lycée, zip avant cassé",
    keywords: extractKeywords("sac dos noir bus cahiers ouaga bobo"),
    foundDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
    city: "Ouagadougou",
    district: "Gare routière",
    locationApprox: "Bus ligne Ouagadougou–Bobo",
    condition: "Moyen",
    status: "active",
    isSensitive: false,
    recoveryPointId: points[0].id,
    expiresAt: expires,
    country: "IT",
  });

  // Run matching for passport scenario
  await runMatchingForFoundItem(foundPassport.id);

  return {
    seeded: true,
    accounts: [
      { phone: "+226700000000", password: "retruv2026", role: "admin", name: "Admin" },
      { phone: "+226700000001", password: "retruv2026", role: "user", name: "Aïcha" },
      { phone: "+226700000002", password: "retruv2026", role: "verified_finder", name: "Moussa" },
      { phone: "+226700000003", password: "retruv2026", role: "user", name: "Fatou" },
      { phone: "+226700000004", password: "retruv2026", role: "user", name: "Ibrahim" },
    ],
    demoMatch: { lostPassportId: lostPassport.id, foundPassportId: foundPassport.id },
  };
}
