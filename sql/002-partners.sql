-- 002 - Partners table for editable Partenaires RETRUV tab
-- Allows admin to manage the partner cards shown on /partenaires

CREATE TABLE IF NOT EXISTS "partners" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "title" text NOT NULL,
  "description" text NOT NULL,
  "icon" text NOT NULL DEFAULT 'Building2',
  "website" text,
  "logo_url" text,
  "city" text,
  "country" text DEFAULT 'IT',
  "is_active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "partners_active_idx" ON "partners" ("is_active");
CREATE INDEX IF NOT EXISTS "partners_sort_idx" ON "partners" ("sort_order");

-- Seed with the 3 original static cards so existing UI stays identical
INSERT INTO "partners" ("title", "description", "icon", "sort_order") VALUES
  ('Gares & Transport', 'Gares, aéroports, réseaux de bus, partout dans le monde. Dépôt d''objets, récupération, visibilité. Le point devient un service public utile.', 'Train', 0),
  ('Universités & Campus', 'Établissements d''enseignement, quel que soit le pays. Déclarations de documents étudiants, récupération au secrétariat, confiance institutionnelle.', 'GraduationCap', 1),
  ('Entreprises & Commerces', 'Hôtels, centres commerciaux, entreprises. Intégration du moteur de matching via API. Réputation et service client.', 'Building2', 2)
ON CONFLICT DO NOTHING;
