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

  // Demo/dev environment defaults to Italy — RETRUV isn't tied to any one
  // country, but a fresh environment has to show *something*, and defaulting
  // that to the same country every declarer's browser happens to be built in
  // (Burkina Faso) reads as "this is a Burkinabè product." Italy also lets
  // the demo personas illustrate the actual pitch: a document lost in one
  // country and found in another, in the same network.
  const [admin] = await db
    .insert(users)
    .values({
      phone: "+390000000000",
      email: "admin@retruv.app",
      passwordHash,
      fullName: "Admin RETRUV",
      role: "admin",
      country: "IT",
      city: "Rome",
      isVerified: true,
      reputationScore: 200,
      reputationLevel: "partner",
    })
    .returning();

  const [aicha] = await db
    .insert(users)
    .values({
      phone: "+390000000001",
      email: "aicha@example.com",
      passwordHash,
      fullName: "Aïcha Ouédraogo",
      role: "user",
      country: "IT",
      city: "Rome",
      isVerified: true,
      reputationScore: 25,
      reputationLevel: "reliable",
    })
    .returning();

  const [moussa] = await db
    .insert(users)
    .values({
      phone: "+390000000002",
      email: "moussa@example.com",
      passwordHash,
      fullName: "Moussa Traoré",
      role: "verified_finder",
      country: "IT",
      city: "Milan",
      isVerified: true,
      reputationScore: 60,
      reputationLevel: "verified_finder",
    })
    .returning();

  const [fatou] = await db
    .insert(users)
    .values({
      phone: "+390000000003",
      email: "fatou@example.com",
      passwordHash,
      fullName: "Fatou Kaboré",
      role: "user",
      country: "IT",
      city: "Turin",
      isVerified: true,
      reputationScore: 15,
      reputationLevel: "new",
    })
    .returning();

  const [ibrahim] = await db
    .insert(users)
    .values({
      phone: "+390000000004",
      passwordHash,
      fullName: "Ibrahim Sawadogo",
      role: "user",
      country: "IT",
      city: "Naples",
      reputationScore: 5,
      reputationLevel: "new",
    })
    .returning();

  // Recovery points
  const points = await db
    .insert(recoveryPoints)
    .values([
      {
        name: "RETRUV POINT — Stazione Termini (Rome)",
        type: "gare",
        address: "Piazza dei Cinquecento",
        city: "Rome",
        country: "IT",
        latitude: 41.9009,
        longitude: 12.5019,
        phone: "+390600000001",
        hours: "Lun–Sam 8h–18h",
        managerName: "Giulia Romano",
        itemsDeposited: 12,
        itemsRecovered: 9,
      },
      {
        name: "RETRUV POINT — Mairie de Milan",
        type: "mairie",
        address: "Piazza della Scala",
        city: "Milan",
        country: "IT",
        latitude: 45.4669,
        longitude: 9.19,
        phone: "+390200000001",
        hours: "Lun–Ven 7h30–15h30",
        managerName: "Marco Colombo",
        itemsDeposited: 28,
        itemsRecovered: 21,
      },
      {
        name: "RETRUV POINT — Gare de Turin Porta Nuova",
        type: "gare",
        address: "Corso Vittorio Emanuele II",
        city: "Turin",
        country: "IT",
        latitude: 45.0625,
        longitude: 7.6779,
        phone: "+390110000001",
        hours: "Tous les jours 6h–20h",
        managerName: "Elena Ferrari",
        itemsDeposited: 45,
        itemsRecovered: 33,
      },
      {
        name: "Commissariat central de Naples",
        type: "commissariat",
        address: "Via Medina",
        city: "Naples",
        country: "IT",
        latitude: 40.8433,
        longitude: 14.2461,
        phone: "+390810000001",
        hours: "24h/24",
        managerName: "Ispettore Esposito",
        itemsDeposited: 7,
        itemsRecovered: 5,
      },
      {
        name: "RETRUV POINT — Université de Bologne",
        type: "universite",
        address: "Via Zamboni",
        city: "Bologna",
        country: "IT",
        latitude: 44.4964,
        longitude: 11.3536,
        phone: "+390510000001",
        hours: "Lun–Ven 8h–17h",
        managerName: "Dott.ssa Bianchi",
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
      title: "Passeport perdu à Rome",
      description:
        "Passeport biométrique perdu près de la gare Termini, à Rome. Couverture bordeaux, quelques pages tamponnées.",
      color: "Bordeaux",
      distinctiveFeatures:
        "Petite tache d'encre en bas de la page 3, coin supérieur légèrement plié",
      idPartialMasked: "IT****84",
      keywords: extractKeywords(
        "passeport biométrique gare termini rome"
      ),
      lostDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lostTimeApprox: "14h00",
      city: "Rome",
      district: "Termini",
      locationApprox: "Gare Termini",
      latitude: 41.9009,
      longitude: 12.5019,
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
        "Passeport trouvé par terre près d'un quai de la gare Termini, à Rome. Couverture bordeaux.",
      color: "Bordeaux",
      distinctiveFeatures: "Coin supérieur un peu abîmé, tache visible à l'intérieur",
      idPartialMasked: "IT****84",
      keywords: extractKeywords("passeport trouvé gare termini rome bordeaux"),
      foundDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
      foundTimeApprox: "16h30",
      city: "Rome",
      district: "Termini",
      locationApprox: "Gare Termini",
      latitude: 41.9012,
      longitude: 12.5022,
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
    title: "iPhone 15 Pro perdu dans le tram",
    description:
      "iPhone 15 Pro noir avec coque transparente fissurée. Fond d'écran photo de famille.",
    brand: "Apple",
    model: "iPhone 15 Pro",
    color: "Noir",
    distinctiveFeatures: "Coque transparente fissurée en bas à droite, sticker discret au dos",
    serialPartial: "****7291",
    keywords: extractKeywords("iphone 15 pro noir coque fissurée tram turin"),
    lostDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lostTimeApprox: "19h00",
    city: "Turin",
    district: "Centro",
    locationApprox: "Tram ligne 4, proche de Porta Nuova",
    latitude: 45.0703,
    longitude: 7.6869,
    rewardAmount: 20,
    rewardCurrency: "EUR",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "IT",
  });

  await db.insert(foundItems).values({
    userId: ibrahim.id,
    categoryId: phoneCat.id,
    subcategoryId: phoneSub.id,
    title: "iPhone noir trouvé dans un taxi",
    description:
      "iPhone noir trouvé sur la banquette arrière d'un taxi à Turin. Coque transparente abîmée.",
    brand: "Apple",
    model: "iPhone 15 Pro",
    color: "Noir",
    distinctiveFeatures: "Coque fissurée, petit autocollant au dos",
    keywords: extractKeywords("iphone noir taxi turin coque"),
    foundDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    foundTimeApprox: "20h00",
    city: "Turin",
    district: "Centro",
    locationApprox: "Taxi, zone Porta Nuova",
    latitude: 45.0698,
    longitude: 7.6861,
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
    keywords: extractKeywords("portefeuille cuir marron déchirure naples"),
    lostDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    city: "Naples",
    district: "Centro storico",
    locationApprox: "Centre historique",
    status: "active",
    isSensitive: false,
    rewardAmount: 10,
    expiresAt: expires,
    country: "IT",
  });

  // Moto
  await db.insert(lostItems).values({
    userId: moussa.id,
    categoryId: motoCat.id,
    subcategoryId: motoSub.id,
    title: "Moto Yamaha MT-07 perdue",
    description: "Moto Yamaha MT-07 noire volée / perdue près de la gare de Milan.",
    brand: "Yamaha",
    model: "MT-07",
    color: "Noir",
    serialPartial: "11***IT",
    distinctiveFeatures: "Rétroviseur gauche cassé, autocollant RETRUV sur le réservoir",
    keywords: extractKeywords("moto yamaha mt-07 noire milan"),
    lostDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    city: "Milan",
    district: "Centrale",
    locationApprox: "Près de la gare centrale",
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
    title: "Chien Labrador perdu à Turin",
    description: "Chien Labrador croisé brun, très gentil, répond au nom de Rex.",
    color: "Marron",
    distinctiveFeatures: "Collier bleu, tache blanche sur le poitrail, boite légèrement",
    keywords: extractKeywords("chien labrador rex collier bleu turin"),
    lostDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    city: "Turin",
    district: "San Salvario",
    locationApprox: "Quartier San Salvario",
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
    keywords: extractKeywords("clés trousseau ballon foot rome"),
    foundDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
    city: "Rome",
    district: "Trastevere",
    locationApprox: "Devant une boutique",
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
      "Sac à dos noir trouvé dans un bus reliant Milan à Bologne. Contient des cahiers scolaires.",
    color: "Noir",
    brand: "Eastpak",
    distinctiveFeatures: "Badge lycée, zip avant cassé",
    keywords: extractKeywords("sac dos noir bus cahiers milan bologne"),
    foundDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
    city: "Milan",
    district: "Gare routière",
    locationApprox: "Bus ligne Milan–Bologne",
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
      { phone: "+390000000000", password: "retruv2026", role: "admin", name: "Admin" },
      { phone: "+390000000001", password: "retruv2026", role: "user", name: "Aïcha" },
      { phone: "+390000000002", password: "retruv2026", role: "verified_finder", name: "Moussa" },
      { phone: "+390000000003", password: "retruv2026", role: "user", name: "Fatou" },
      { phone: "+390000000004", password: "retruv2026", role: "user", name: "Ibrahim" },
    ],
    demoMatch: { lostPassportId: lostPassport.id, foundPassportId: foundPassport.id },
  };
}
