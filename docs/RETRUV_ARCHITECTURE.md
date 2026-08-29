# RETRUV — Analyse, architecture & MVP

> **Retrouvons ce qui compte.**  
> La plateforme intelligente qui reconnecte les objets perdus à leurs propriétaires.

---

## 1. Architecture recommandée

**Monolithe modulaire Next.js (App Router) + PostgreSQL**

| Couche | Choix | Pourquoi |
|--------|--------|----------|
| Frontend | Next.js App Router + React + Tailwind | SSR rapide, PWA-ready, un seul déploiement |
| Backend | Route Handlers Next.js | Moins de latence ops, coût faible, simple à héberger en Afrique |
| DB | PostgreSQL + Drizzle ORM | Relations riches, JSONB pour scores/questions, open-source |
| Auth | Sessions cookie httpOnly | Simple, sécurisé, pas de JWT exposé |
| Matching | Service TypeScript in-process | Pas de micro-service Python au MVP |
| Files (V2) | Object storage (S3/R2) + pipeline blur | Hors MVP |
| Cache/Queue (V2) | Redis | Matching async, rate-limit distribué |
| Mobile | **PWA mobile-first** (pas RN/Flutter au départ) | Installation sans store, offline léger, un codebase |

### Pourquoi pas NestJS / Prisma / Supabase au MVP ?
- NestJS : excellent plus tard si équipe backend dédiée ; overhead inutile pour un MVP solo/small team.
- Prisma : bien, mais Drizzle est déjà en place, plus léger, SQL-friendly.
- Supabase : vendor lock-in + coût ; PostgreSQL self-hosted suffit.

### Mobile : PWA vs React Native vs Flutter
| | PWA | React Native | Flutter |
|--|-----|--------------|---------|
| Time-to-market | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Android bas de gamme | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Offline | ⭐⭐ (service worker) | ⭐⭐⭐ | ⭐⭐⭐ |
| Coût | ⭐⭐⭐ | ⭐⭐ | ⭐⭐ |
| Stores | Non requis | Oui | Oui |

**Décision : PWA d’abord**, apps natives en V3 si traction.

---

## 2. Stack recommandée (implémentée)

- Next.js 16 + TypeScript + Tailwind 4
- PostgreSQL + Drizzle ORM
- bcryptjs (mots de passe)
- zod (validation)
- Sessions cookie `retruv_session`

---

## 3. Schéma de base de données

Entités principales :

- **users** — rôles, réputation, blocage, tentatives vérif
- **categories** — arbre parent/enfant, flag sensible
- **lost_items / found_items** — déclarations, masquage, expiration
- **matches** — score, level, breakdown JSON
- **verifications** — questions, réponses, tentatives
- **conversations / messages** — chat interne
- **recovery_points / recoveries** — réseau + workflow restitution
- **ratings** — réputation post-récupération
- **notifications**
- **reports / fraud_flags / audit_logs / sessions**

Relations clés :
`User 1—N Lost/Found → Match N—1 Lost+Found → Verification/Conversation/Recovery`

---

## 4. Écrans MVP

1. Accueil (2 CTA géants)
2. Login / Register
3. Déclarer perte / trouvaille
4. Listes + fiches lost/found
5. Dashboard utilisateur
6. Matches + détail + vérification
7. Messages / chat
8. Points RETRUV
9. Carte approximative
10. Notifications
11. Admin dashboard

---

## 5. API

```
POST /api/auth/register|login|logout
GET  /api/auth/me
GET  /api/categories
GET/POST /api/lost
GET/POST /api/found
GET  /api/matches
GET  /api/matches/:id
POST /api/matches/:id/verify
GET  /api/messages
GET/POST /api/messages/:id
POST/PATCH /api/recoveries
GET  /api/points
GET/PATCH /api/notifications
POST /api/reports
GET  /api/admin/stats
GET/POST /api/seed
```

---

## 6. Système de matching

Score pondéré multi-signaux (0–100) :

| Signal | Poids approx. |
|--------|----------------|
| Catégorie | 18 |
| Sous-catégorie | 10 |
| Marque/modèle | 14 |
| Couleur | 10 |
| Description / keywords (Jaccard) | 18 |
| Localisation (ville, quartier, haversine) | 14 |
| Date | 10 |
| Identifiant partiel | 16 |

Niveaux (jamais « preuve ») :
- faible (35–49)
- possible (50–69)
- probable (70–84)
- très probable (85–100)

Boost si serial/ID partiel fort. Pénalité dure si catégorie différente.

---

## 7. Anti-fraude

- Rate-limit déclarations (max ~10/h)
- Rate-limit vérifications (max ~15/j)
- Max 3 tentatives de vérification / match
- Flags `fraud_flags` + auto-blocage si sévérité cumulée
- Audit log de toutes actions sensibles
- Signalements utilisateurs
- Masquage PII / IDs longs
- Pas d’exposition téléphone avant partage volontaire
- Documents sensibles : photos « floutées » (pipeline réel en V2)

---

## 8. Vérification de propriété

Questions dynamiques basées sur la déclaration de perte :
- lieu approx.
- date
- caractéristique non publique
- 2 derniers caractères d’ID
- marque/modèle / couleur

Score réponses ≥ 70 % → match `verified` + ouverture chat.

---

## 9. MVP (livré)

✅ Auth téléphone + session  
✅ Déclarations lost/found multi-catégories  
✅ Matching automatique au submit  
✅ Vérification propriété  
✅ Chat interne  
✅ Récupération (meetup / point RETRUV)  
✅ Réputation basique  
✅ Points RETRUV  
✅ Admin stats  
✅ Carte approximative par ville  
✅ Seed scénario Aïcha / Moussa (passeport Bobo)  
✅ UI mobile-first  

Hors MVP (prévu) :
- OCR + floutage image réel
- Matching vision
- SMS/WhatsApp/push
- Offline-first robuste (queue IndexedDB)
- Paiements récompenses
- Multi-langue Mooré/Dioula…

---

## 10. Roadmap

### MVP (maintenant)
Burkina Faso, core loop perte→trouvaille→match→vérif→chat→récupération.

### V1
- Upload photos + redaction documents
- PWA installable + offline draft
- SMS OTP
- Modération signalements UI
- Stats avancées

### V2
- Matching image (embeddings)
- Réseau Points RETRUV partenaires
- API publique matching (B2B)
- Multi-pays UEMOA
- Notifications WhatsApp Business

### V3
- Apps natives si besoin
- Livraison intégrée
- Autorités vérifiées (workflow CNI)
- Langues locales
- Premium / entreprises

---

## 11. Risques majeurs

1. **Faux propriétaires / ingénierie sociale** → vérif stricte, limites tentatives  
2. **Fuite données documents** → minimisation, chiffrement, jamais d’affichage public complet  
3. **Adoption** → UX ultra simple, points physiques, partenariats gares/mairies  
4. **Faible connectivité** → pages légères, PWA, formulaires courts  
5. **Confiance** → réputation non manipulable, transparence score  
6. **Réglementation** → consentement, suppression, conservation limitée (90 j)  
7. **Coûts SMS/IA** → matching local d’abord, IA vision plus tard  

---

## 12. Ce que je changerais / avis honnête

### À garder absolument
- Dual CTA perdu/trouvé
- Matching + vérification séparés
- Chat sans téléphone
- Points RETRUV physiques (critique en Afrique)
- Privacy-by-design documents

### À simplifier ou reporter
1. **Matching image au jour 1** — dangereux (faux positifs) et cher. Texte + méta d’abord.  
2. **Récompenses financières intégrées** — risque d’escroquerie ; rester optionnel et off-platform au début.  
3. **Livraison** — complexité logistique énorme ; Points RETRUV > delivery.  
4. **Trop de langues locales au lancement** — FR (+ EN UI) suffit ; langues locales en contenu progressif.  
5. **Autorité vérifiée trop tôt** — partenariats institutionnels longs ; prévoir le rôle, ne pas bloquer le MVP.  
6. **Offline-first complet** — coûteux ; offline draft de déclaration suffit au départ.  
7. **CAPTCHA permanent** — friction mobile ; rate-limit + device signals d’abord.

### Améliorations produit
- **« Code de restitution »** à 6 chiffres généré après vérif, à présenter au Point RETRUV.
- **Mode « trouvé par commerce / bus / hôtel »** (compte entreprise).
- **Déclaration assistée vocale** (fort pour l’inclusion).
- **Ne pas publier de « feed public » trop détaillé** pour documents — matching silencieux + notif.

---

## Comptes démo

| Qui | Téléphone | Mot de passe |
|-----|-----------|--------------|
| Admin | +22670000000 | retruv2026 |
| Aïcha (passeport perdu) | +22670111111 | retruv2026 |
| Moussa (trouveur) | +22670222222 | retruv2026 |
| Fatou | +22670333333 | retruv2026 |
| Ibrahim | +22670444444 | retruv2026 |

Scénario démo : Aïcha a perdu son passeport à Bobo ; Moussa l’a trouvé ; un match est pré-calculé.
