import { sql } from "drizzle-orm";
import { db } from "@/db";
import { requireAdmin } from "@/lib/auth";
import { jsonOk, handleApiError } from "@/lib/api";
import { logAudit } from "@/lib/security";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const admin = await requireAdmin();

    // 1. Corrige les utilisateurs demo incohérents (noms BF en IT) -> BF cohérent
    await db.execute(sql`UPDATE users SET country='BF', city='Ouagadougou', phone='+226700000000' WHERE email='admin@retruv.app'`);
    await db.execute(sql`UPDATE users SET country='BF', city='Ouagadougou', phone='+226700000001' WHERE email='aicha@example.com'`);
    await db.execute(sql`UPDATE users SET country='BF', city='Bobo-Dioulasso', phone='+226700000002' WHERE email='moussa@example.com'`);
    await db.execute(sql`UPDATE users SET country='BF', city='Bobo-Dioulasso', phone='+226700000003' WHERE email='fatou@example.com'`);
    await db.execute(sql`UPDATE users SET country='BF', city='Ouagadougou', phone='+226700000004' WHERE email='ibrahim@example.com'`);

    // 2. Corrige les points de récupération demo IT -> BF (garde les IDs, juste renomme)
    await db.execute(sql`UPDATE recovery_points SET name='RETRUV POINT — Gare Centrale Ouagadougou', address='Avenue Kwame Nkrumah, Gare Centrale', city='Ouagadougou', country='BF', latitude=12.3676, longitude=-1.5275, phone='+22625300001', hours='Tous les jours 5h30–20h', manager_name='M. Kaboré' WHERE name='RETRUV POINT — Stazione Termini (Rome)'`);
    await db.execute(sql`UPDATE recovery_points SET name='RETRUV POINT — Mairie de Bobo-Dioulasso', address='Avenue de la République, Hôtel de Ville', city='Bobo-Dioulasso', country='BF', latitude=11.1772, longitude=-4.2979, phone='+22620970002', hours='Lun–Ven 7h30–16h', manager_name='Mme Ouédraogo' WHERE name='RETRUV POINT — Mairie de Milan'`);
    await db.execute(sql`UPDATE recovery_points SET name='RETRUV POINT — Gare routière Ouaga', address='Avenue Naaba Zombré, Ouagadougou', city='Ouagadougou', country='BF', latitude=12.3450, longitude=-1.5100, phone='+22625490003', hours='Tous les jours 6h–20h', manager_name='M. Sawadogo' WHERE name='RETRUV POINT — Gare de Turin Porta Nuova'`);
    await db.execute(sql`UPDATE recovery_points SET name='Commissariat Central Ouagadougou', address='Avenue Dimdolobsom, Ouagadougou', city='Ouagadougou', country='BF', latitude=12.3648, longitude=-1.5336, phone='+22625491122', hours='24h/24', manager_name='Commissaire Diallo' WHERE name='Commissariat central de Naples'`);
    await db.execute(sql`UPDATE recovery_points SET name='RETRUV POINT — Université Joseph Ki-Zerbo', address='03 BP 7021, Ouagadougou', city='Ouagadougou', country='BF', latitude=12.3714, longitude=-1.5012, phone='+22625307064', hours='Lun–Ven 7h–18h', manager_name='Présidence UJKZ' WHERE name='RETRUV POINT — Université de Bologne'`);

    // 3. Corrige les déclarations demo IT -> BF (ville + pays + district + devise)
    await db.execute(sql`UPDATE lost_items SET city='Ouagadougou', country='BF', district='Gounghin', location_approx='Gare Centrale Ouagadougou', latitude=12.3676, longitude=-1.5275, title='Passeport perdu à Ouagadougou', description='Passeport biométrique perdu près de la gare centrale de Ouagadougou. Couverture bordeaux, quelques pages tamponnées.' WHERE title='Passeport perdu à Rome'`);
    await db.execute(sql`UPDATE found_items SET city='Ouagadougou', country='BF', district='Gounghin', location_approx='Gare Centrale Ouagadougou', title='Passeport trouvé à la gare', description='Passeport trouvé par terre près d\'un quai de la gare centrale de Ouagadougou. Couverture bordeaux.' WHERE title='Passeport trouvé à la gare'`);
    await db.execute(sql`UPDATE lost_items SET city='Bobo-Dioulasso', country='BF', district='Centre', location_approx='Avenue Naaba Zombré, Bobo', latitude=11.1772, longitude=-4.2979, title='iPhone 15 Pro perdu à Bobo-Dioulasso', description='iPhone 15 Pro noir avec coque transparente fissurée. Perdu entre la mairie et le marché central.', reward_currency='XOF' WHERE title='iPhone 15 Pro perdu dans le tram'`);
    await db.execute(sql`UPDATE found_items SET city='Bobo-Dioulasso', country='BF', district='Centre', location_approx='Taxi, zone mairie Bobo', title='iPhone noir trouvé dans un taxi', description='iPhone noir trouvé sur la banquette arrière d\'un taxi à Bobo-Dioulasso. Coque transparente abîmée.' WHERE title='iPhone noir trouvé dans un taxi'`);
    await db.execute(sql`UPDATE lost_items SET city='Ouagadougou', country='BF', district='Centre-ville', location_approx='Centre-ville Ouagadougou', title='Portefeuille cuir marron perdu', reward_currency='XOF' WHERE title='Portefeuille cuir marron perdu'`);
    await db.execute(sql`UPDATE lost_items SET city='Bobo-Dioulasso', country='BF', district='Accart-Ville', location_approx='Près de la mairie de Bobo-Dioulasso', title='Moto Yamaha MT-07 perdue', reward_currency='XOF' WHERE title='Moto Yamaha MT-07 perdue'`);
    await db.execute(sql`UPDATE lost_items SET city='Bobo-Dioulasso', country='BF', district='Diarradougou', location_approx='Quartier Diarradougou, Bobo' WHERE title='Chien Labrador perdu à Turin'`);
    await db.execute(sql`UPDATE lost_items SET title='Chien berger local brun' WHERE title='Chien Labrador perdu à Turin'`);
    await db.execute(sql`UPDATE found_items SET city='Ouagadougou', country='BF', district='Cissin', location_approx='Devant une boutique, Ouaga' WHERE title='Trousseau de clés trouvé'`);
    await db.execute(sql`UPDATE found_items SET city='Ouagadougou', country='BF', district='Gare routière', location_approx='Bus ligne Ouagadougou–Bobo', title='Sac à dos noir dans un bus', description='Sac à dos noir trouvé dans un bus reliant Ouagadougou à Bobo-Dioulasso. Contient des cahiers scolaires.' WHERE title='Sac à dos noir dans un bus'`);

    // 4. Sécurité : masque les tests webhook restants (même logique que clean-test-data)
    await db.execute(sql`UPDATE lost_items SET moderation_status='rejected', moderation_notes='Masqué automatiquement : test', moderated_by=${admin.id}, moderated_at=now() WHERE title ILIKE '%test%' OR title ILIKE '%webhook%' OR description ILIKE '%webhook%'`);
    await db.execute(sql`UPDATE found_items SET moderation_status='rejected', moderation_notes='Masqué automatiquement : test', moderated_by=${admin.id}, moderated_at=now() WHERE title ILIKE '%test%' OR title ILIKE '%webhook%' OR description ILIKE '%webhook%'`);

    await logAudit({ userId: admin.id, action: "admin.fix_demo_coherence", entityType: "system", entityId: "demo-coherence" });

    return jsonOk({ message: "Cohérence corrigée : utilisateurs, points, déclarations demo passés en BF (Ouaga/Bobo), tests masqués" });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET() {
  try {
    await requireAdmin();
    return jsonOk({ ready: true, note: "POST pour corriger demo incohérence BF/IT" });
  } catch (err) {
    return handleApiError(err);
  }
}
