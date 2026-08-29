# RETRUV — LANDMINES (pièges cachés restants)

Audit rapide après REDTEAM. Ce qui casse sans prévenir.

---

## 1. Chiffrement = base64 (P0 silencieux)

**Lieu** : `src/lib/security.ts` ligne 193  
**Code** : `Buffer.from(JSON.stringify(data), "utf8").toString("base64")`  
**Piège** : Toute personne avec un accès DB (dev, backup, attaque) lit `privateDataEncrypted` en décodant le base64. Aucune clé nécessaire.  
**Fix immédiat** : remplacer par `crypto.createCipheriv('aes-256-gcm', key, iv)` avec `RETRUV_ENC_KEY` dans `.env`.

---

## 2. Photos « floutées » = cosmétique (P1)

**Lieu** : `src/lib/security.ts` ligne 170-180  
**Code** : `?blur=sensitive` ajouté à l'URL.  
**Piège** : L'attaquant enlève `?blur=sensitive` et obtient la photo originale si le stockage ne fait pas de redaction côté serveur. Même si le fichier original est séparé, le nom de l'objet peut être prévisible.  
**Fix** : utiliser `sharp` côté serveur pour générer un vrai fichier flouté avec un nom aléatoire (`uuid`), jamais exposer le nom original.

---

## 3. Brute-force login = sans limite (P0)

**Lieu** : `src/app/api/auth/login/route.ts`  
**Piège** : Aucune limite de tentatives. Un bot peut tester `+22670111111` avec un dictionnaire.  
**Fix** : ajouter `failedLoginAttempts` dans `users`, verrouiller après 5 échecs, délai exponentiel.

---

## 4. Session sans limite ni rotation (P1)

**Lieu** : `src/lib/auth.ts`  
**Piège** : `createSession` ne limite pas le nombre de sessions par `userId`. Un attaquant qui vole un cookie crée des centaines de sessions valides.  
**Fix** : limiter à 5 sessions actives par `userId`, supprimer la plus ancienne à chaque nouvelle création.

---

## 5. Chat = pas de fermeture ni blocage après récupération (P2)

**Lieu** : `components/chat-box.tsx`  
**Piège** : Une fois le match `completed`, le chat reste ouvert (`isActive: true`). Un harceleur continue d'écrire. Pas de bouton « Bloquer ».  
**Fix** : ajouter un bouton de blocage (`update users.isBlocked` + vérifier dans `GET /api/messages/[id]`). Fermer le chat après 7 jours d'inactivité post-`completed`.

---

## 6. Matching = préfiltre géographique manquant (P2 performance + sécurité)

**Lieu** : `src/lib/matching.ts` ligne 322-329  
**Piège** : `runMatchingForLostItem` fait `limit(200)` sans filtre sur la ville. Pour un pays avec des milliers d'objets, cela rate des correspondances probables et fait du travail inutile sur le CPU.  
**Fix** : filtrer par `city` dans la requête SQL avant le `limit(200)`.

---

## 7. Déclaration = `keywords` non nettoyés (P2)

**Lieu** : `src/app/api/lost/route.ts` et `/api/found/route.ts`  
**Piège** : `keywords` est un tableau de strings sans nettoyage HTML. Un attaquant injecte `<script>` dans un mot-clé. Si un futur export ou affichage ne fait pas d'échappement, c'est un XSS stocké.  
**Fix** : `keywords.map(k => sanitizeHtml(k))` côté serveur.

---

## 8. `restitutionCode` manquant au point RETRUV (P0)

**Lieu** : `src/app/api/recoveries/route.ts`  
**Piège** : Aucune vérification physique au point de récupération. Un attaquant peut se présenter avec le bon nom et récupérer le document.  
**Fix** : générer un `restitutionCode` (6 caractères) au moment où `recovery` passe à `accepted`. Envoyer au propriétaire et au trouveur séparément. Le point doit le vérifier avant remise.

---

## 9. `auditLogs` dans la même DB = pas immuable (P3)

**Lieu** : `src/db/schema.ts`  
**Piège** : Si un attaquant obtient un accès DB ou un rôle admin, il peut supprimer ses traces (`DELETE FROM audit_logs`).  
**Fix court terme** : donner des droits DB séparés (utilisateur `audit_readonly`) pour la lecture des logs.  
**Fix long terme** : envoyer vers un système externe (syslog, S3 append-only).

---

## 10. Notifications = `link` non whitelisté (P2)

**Lieu** : `src/lib/matching.ts` et routes notifications  
**Piège** : `notifications.link` est généré côté serveur mais sans whitelist stricte (`/matches/*`, `/messages/*`). Si un bug permet d'injecter un `link` arbitraire (ex : via un `metadata` corrompu), cela devient un vecteur de phishing.  
**Fix** : valider `link` contre un regex (`/^\/([a-z]+)(\/[^/]*)*$/`) et rejeter tout ce qui contient `http`, `https`, `//`, `@`, `.` au début.

---

## 11. Race condition dans le chat (P1)

**Lieu** : `components/chat-box.tsx`  
**Piège** : `useEffect` lance le polling toutes les 5 secondes sans `abort` sur le `fetch`. Si le composant est démonté et remonté rapidement (navigation rapide), plusieurs fetches concurrentes peuvent mettre à jour l'état avec des données périmées.  
**Fix** : utiliser `AbortController` dans `load()` et annuler au démontage.

---

## 12. Déclarations expirées = jamais supprimées (P3)

**Lieu** : `DECLARATION_EXPIRY_DAYS = 90` (`src/lib/constants.ts`)  
**Piège** : `expiresAt` est rempli mais aucune suppression automatique n'existe. La base grossit indéfiniment, ralentissant le matching et coûtant du stockage.  
**Fix** : ajouter un `pg_cron` ou un script `next` qui supprime `lost_items` / `found_items` avec `expiresAt < now - interval '7 days'` et `status` non `recovered`.

---

## 13. `recoveryPoint` = relation manquante dans le schéma ? (vérifié)

Le `recoveryPointId` dans `foundItems` a bien `references()` (vérifié dans le push Drizzle).  
Le `recoveryPoint` est correctement géré dans `/api/points` et `/api/found`.

---

## Synthèse des landmines actives

| Priorité | Landmine | Fichier | Action immédiate |
|----------|----------|---------|------------------|
| **P0** | Chiffrement = base64 | `security.ts` | Remplacer par AES-256-GCM |
| **P0** | Photos floutées cosmétiques | `security.ts` | Pipeline `sharp` côté serveur |
| **P0** | Brute-force login | `auth/login` | 5 essais max + délai |
| **P0** | Pas de `restitutionCode` | `recoveries` | Générer code 6 caractères |
| **P1** | Session illimitée | `auth.ts` | Limite 5 + nettoyage |
| **P1** | Chat sans blocage/fermeture | `chat-box.tsx` | Blocage + fermeture auto |
| **P2** | `keywords` non nettoyés | `lost/route`, `found/route` | `sanitizeHtml` |
| **P2** | Matching sans filtre ville | `matching.ts` | `eq(city, ...)` avant `limit` |
| **P2** | Notifications `link` libre | `notifications` | Whitelist regex |
| **P3** | Audit non immuable | `schema.ts` | Droits séparés / log externe |
| **P3** | Déclarations non supprimées | `constants` | `pg_cron` suppression |

---

## Verdict

Le code RETRUV fonctionne (build OK, base appliquée, seed OK), mais il reste **4 landmines P0** qui doivent être corrigées avant tout lancement public au-delà d'une beta fermée :

1. **Base64 au lieu d'AES** (confidentialité cassée si DB compromise)
2. **Photos floutées cosmétiques** (fuite d'image possible)
3. **Pas de `restitutionCode`** (remise physique non sécurisée)
4. **Brute-force sans limite** (accès compte facile)

Le reste (P1-P3) peut être traité en parallèle mais est critique pour la confiance à long terme.
