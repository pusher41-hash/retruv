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
    }

    for (const child of cat.children) {
      if (bySlug.has(child.slug)) continue;
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
    }
  }
}

export async function seedDemoData() {
  await seedCategories();

  const existingAdmin = await db
    .select()
    .from(users)
    .where(eq(users.phone, "+22670000000"))
    .limit(1);
  if (existingAdmin.length > 0) return { seeded: false };

  const passwordHash = await hashPassword("retruv2026");

  const [admin] = await db
    .insert(users)
    .values({
      phone: "+22670000000",
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
      phone: "+22670111111",
      email: "aicha@example.bf",
      passwordHash,
      fullName: "Aïcha Ouédraogo",
      role: "user",
      country: "BF",
      city: "Bobo-Dioulasso",
      isVerified: true,
      reputationScore: 25,
      reputationLevel: "reliable",
    })
    .returning();

  const [moussa] = await db
    .insert(users)
    .values({
      phone: "+22670222222",
      email: "moussa@example.bf",
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
      phone: "+22670333333",
      email: "fatou@example.bf",
      passwordHash,
      fullName: "Fatou Kaboré",
      role: "user",
      country: "BF",
      city: "Ouagadougou",
      isVerified: true,
      reputationScore: 15,
      reputationLevel: "new",
    })
    .returning();

  const [ibrahim] = await db
    .insert(users)
    .values({
      phone: "+22670444444",
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
        name: "RETRUV POINT — Gare de Bobo-Dioulasso",
        type: "gare",
        address: "Avenue de la Nation, Gare SITARAIL",
        city: "Bobo-Dioulasso",
        country: "BF",
        latitude: 11.177,
        longitude: -4.298,
        phone: "+22620970000",
        hours: "Lun–Sam 8h–18h",
        managerName: "Amadou Sanou",
        itemsDeposited: 12,
        itemsRecovered: 9,
      },
      {
        name: "RETRUV POINT — Mairie centrale Ouaga",
        type: "mairie",
        address: "Avenue de l'Indépendance",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.3714,
        longitude: -1.5197,
        phone: "+22625300000",
        hours: "Lun–Ven 7h30–15h30",
        managerName: "Marie Zongo",
        itemsDeposited: 28,
        itemsRecovered: 21,
      },
      {
        name: "RETRUV POINT — Gare routière Ouagainter",
        type: "gare",
        address: "Ouagainter, zone 1",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.358,
        longitude: -1.498,
        phone: "+22625310000",
        hours: "Tous les jours 6h–20h",
        managerName: "Issa Compaoré",
        itemsDeposited: 45,
        itemsRecovered: 33,
      },
      {
        name: "Commissariat central Banfora",
        type: "commissariat",
        address: "Centre-ville Banfora",
        city: "Banfora",
        country: "BF",
        latitude: 10.633,
        longitude: -4.759,
        phone: "+22620910000",
        hours: "24h/24",
        managerName: "Sgt. Diallo",
        itemsDeposited: 7,
        itemsRecovered: 5,
      },
      {
        name: "RETRUV POINT — Université Joseph Ki-Zerbo",
        type: "universite",
        address: "Campus, Ouagadougou",
        city: "Ouagadougou",
        country: "BF",
        latitude: 12.379,
        longitude: -1.499,
        phone: "+22625320000",
        hours: "Lun–Ven 8h–17h",
        managerName: "Dr. Lamizana",
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
      title: "Passeport burkinabè perdu",
      description:
        "Passeport biométrique burkinabè perdu près du marché central de Bobo-Dioulasso. Couverture bordeaux, quelques pages tamponnées.",
      color: "Bordeaux",
      distinctiveFeatures:
        "Petite tache d'encre en bas de la page 3, coin supérieur légèrement plié",
      idPartialMasked: "BF****84",
      keywords: extractKeywords(
        "passeport burkinabe biométrique marché central bobo"
      ),
      lostDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
      lostTimeApprox: "14h00",
      city: "Bobo-Dioulasso",
      district: "Centre-ville",
      locationApprox: "Marché central / grand marché",
      latitude: 11.178,
      longitude: -4.297,
      rewardAmount: 0,
      status: "active",
      isSensitive: true,
      privateNotes: "Nom complet: Aïcha Ouédraogo. N° se termine par 84.",
      verificationHints: [
        "tache d'encre page 3",
        "coin plié",
        "marché central",
      ],
      expiresAt: expires,
      country: "BF",
    })
    .returning();

  // Moussa found passport
  const [foundPassport] = await db
    .insert(foundItems)
    .values({
      userId: moussa.id,
      categoryId: passportCat.id,
      subcategoryId: passportSub.id,
      title: "Passeport trouvé au marché",
      description:
        "Passeport burkinabè trouvé par terre près d'un étal du marché central de Bobo. Couverture bordeaux.",
      color: "Bordeaux",
      distinctiveFeatures: "Coin supérieur un peu abîmé, tache visible à l'intérieur",
      idPartialMasked: "BF****84",
      keywords: extractKeywords("passeport trouvé marché central bobo bordeaux"),
      foundDate: new Date(Date.now() - 3 * 60 * 60 * 1000),
      foundTimeApprox: "16h30",
      city: "Bobo-Dioulasso",
      district: "Centre-ville",
      locationApprox: "Marché central de Bobo-Dioulasso",
      latitude: 11.179,
      longitude: -4.296,
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
      country: "BF",
    })
    .returning();

  // Phone lost Ouaga
  await db.insert(lostItems).values({
    userId: fatou.id,
    categoryId: phoneCat.id,
    subcategoryId: phoneSub.id,
    title: "Samsung Galaxy A54 noir",
    description:
      "Téléphone Samsung Galaxy A54 noir avec coque transparente fissurée. Fond d'écran photo de famille.",
    brand: "Samsung",
    model: "Galaxy A54",
    color: "Noir",
    distinctiveFeatures: "Coque transparente fissurée en bas à droite, sticker drapeau BF",
    serialPartial: "****7291",
    keywords: extractKeywords("samsung galaxy a54 noir coque fissurée"),
    lostDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    lostTimeApprox: "19h00",
    city: "Ouagadougou",
    district: "Ouaga 2000",
    locationApprox: "Arrêt de bus près du monument des martyrs",
    latitude: 12.35,
    longitude: -1.52,
    rewardAmount: 10000,
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
    title: "Téléphone Samsung noir trouvé",
    description:
      "Samsung noir trouvé dans un taxi à Ouagadougou. Coque transparente abîmée.",
    brand: "Samsung",
    model: "Galaxy A54",
    color: "Noir",
    distinctiveFeatures: "Coque fissurée, petit sticker",
    keywords: extractKeywords("samsung noir taxi ouagadougou coque"),
    foundDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
    foundTimeApprox: "20h00",
    city: "Ouagadougou",
    district: "Ouaga 2000",
    locationApprox: "Taxi zone Ouaga 2000",
    latitude: 12.351,
    longitude: -1.518,
    condition: "Bon",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "BF",
  });

  // Wallet
  await db.insert(lostItems).values({
    userId: ibrahim.id,
    categoryId: phoneCat.id,
    subcategoryId: walletSub.id,
    title: "Portefeuille cuir marron",
    description:
      "Portefeuille en cuir marron avec une déchirure sur le côté. Contient des cartes et un peu d'argent.",
    color: "Marron",
    brand: "Artisanal",
    distinctiveFeatures: "Déchirure côté droit, initiales IS gravées à l'intérieur",
    keywords: extractKeywords("portefeuille cuir marron déchirure"),
    lostDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    city: "Ouagadougou",
    district: "Zone 1",
    locationApprox: "Centre-ville",
    status: "active",
    isSensitive: false,
    rewardAmount: 5000,
    expiresAt: expires,
    country: "BF",
  });

  // Moto
  await db.insert(lostItems).values({
    userId: moussa.id,
    categoryId: motoCat.id,
    subcategoryId: motoSub.id,
    title: "Moto TVS Apache rouge",
    description: "Moto TVS Apache rouge volée / perdue près de la gare.",
    brand: "TVS",
    model: "Apache",
    color: "Rouge",
    serialPartial: "11***BF",
    distinctiveFeatures: "Rétroviseur gauche cassé, autocollant RETRUV sur le réservoir",
    keywords: extractKeywords("moto tvs apache rouge"),
    lostDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    city: "Bobo-Dioulasso",
    district: "Secteur 5",
    locationApprox: "Près de la gare",
    status: "active",
    isSensitive: false,
    rewardAmount: 50000,
    expiresAt: expires,
    country: "BF",
  });

  // Dog
  await db.insert(lostItems).values({
    userId: fatou.id,
    categoryId: animalCat.id,
    subcategoryId: dogSub.id,
    title: "Chien berger local brun",
    description: "Chien berger croisé brun, très gentil, répond au nom de Rex.",
    color: "Marron",
    distinctiveFeatures: "Collier bleu, tache blanche sur le museau, boite légèrement",
    keywords: extractKeywords("chien berger rex collier bleu"),
    lostDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
    city: "Ouagadougou",
    district: "Patte d'Oie",
    locationApprox: "Quartier Patte d'Oie",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "BF",
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
    keywords: extractKeywords("clés trousseau ballon foot"),
    foundDate: new Date(Date.now() - 8 * 60 * 60 * 1000),
    city: "Bobo-Dioulasso",
    district: "Secteur 3",
    locationApprox: "Devant une boutique",
    condition: "Bon",
    status: "active",
    isSensitive: false,
    expiresAt: expires,
    country: "BF",
  });

  // Bag in bus
  await db.insert(foundItems).values({
    userId: moussa.id,
    categoryId: phoneCat.id,
    subcategoryId: bagSub.id,
    title: "Sac à dos noir dans un bus",
    description:
      "Sac à dos noir trouvé dans un bus Bobo-Ouaga. Contient des cahiers scolaires.",
    color: "Noir",
    brand: "Eastpak",
    distinctiveFeatures: "Badge lycée, zip avant cassé",
    keywords: extractKeywords("sac dos noir bus cahiers"),
    foundDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
    city: "Bobo-Dioulasso",
    district: "Gare routière",
    locationApprox: "Bus ligne Bobo-Ouaga",
    condition: "Moyen",
    status: "active",
    isSensitive: false,
    recoveryPointId: points[0].id,
    expiresAt: expires,
    country: "BF",
  });

  // Run matching for passport scenario
  await runMatchingForFoundItem(foundPassport.id);

  return {
    seeded: true,
    accounts: [
      { phone: "+22670000000", password: "retruv2026", role: "admin", name: "Admin" },
      { phone: "+22670111111", password: "retruv2026", role: "user", name: "Aïcha" },
      { phone: "+22670222222", password: "retruv2026", role: "verified_finder", name: "Moussa" },
      { phone: "+22670333333", password: "retruv2026", role: "user", name: "Fatou" },
      { phone: "+22670444444", password: "retruv2026", role: "user", name: "Ibrahim" },
    ],
    demoMatch: { lostPassportId: lostPassport.id, foundPassportId: foundPassport.id },
  };
}
