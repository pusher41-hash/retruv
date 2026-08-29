# RETRUV — REDTEAM (Audit offensif / Analyse de menace)

> Évaluation critique de la plateforme RETRUV (MVP Next.js + PostgreSQL + Drizzle) sous l'angle de l'attaquant, du fraudeur, du curieux malveillant, du concurrent et de l'inspecteur RGPD.  
> Objectif : trouver tout ce qui casse avant qu'un adversaire réel ne le fasse.

---

## 1. Méthodologie

Pour chaque vecteur, on pose :  
- **Quelle est la menace ?** (Confidentialité, Intégrité, Disponibilité — plus fraude sociale)  
- **Comment l'exploiter ?** (scénario)  
- **Impact réel ?** (perte d'identité, vol de document, harcèlement, fuite données)  
- **Est-ce présent dans le code actuel ?**  
- **Contre-mesure immédiate / V2**

Sources inspectées : `src/db/schema.ts`, `src/lib/auth.ts`, `src/lib/security.ts`, `src/lib/matching.ts`, routes API (`/api/auth/*`, `/api/lost`, `/api/found`, `/api/matches`, `/api/recoveries`, `/api/messages`), composants React (`DeclareForm`, `MatchActions`, `ChatBox`), `pages`.

---

## 2. Menaces critiques (P0)

### P0-1 — Fausse propriété d'un document sensible via matching + vérif faible

**Contexte** : Aïcha déclare un passeport perdu. Paul (attaquant) trouve un passeport (ou en fabrique un). RETRUV match 96 % car couleur « Bordeaux », ville Bobo, date proche.  

**Attaque** :
1. Paul déclare le document comme « trouvé » avec description volontairement vague.
2. RETRUV détecte un match `probable`.
3. Paul attend que la vraie propriétaire entame la vérification, ou il initie la conversation.
4. La vérification pose des questions (lieu, couleur, détails). Si la propriétaire répond approximativement, Paul observe et adapte.
5. Plus grave : **si le système révèle trop d'indices dans la question**, l'attaquant peut deviner.

**Faiblesse actuelle** :
- `buildVerificationQuestions` expose `expectedHint` dans l'objet JSON envoyé au client ? **Non** dans le code : `questions: q.id, question: q.question, type: q.type`. L'`expectedHint` est bien filtré côté API (`isOwner ? v.questions : v.questions?.map(...)`).  
- **Mais** : le `match` expose le `lostItem.distinctiveFeatures` au `isOwner` ou `verified`. Un attaquant qui atteint `verified` voit tout.  
- **Le vrai risque** : un attaquant qui connaît un peu la victime (ex : ami, ex-conjoint) connaît déjà le quartier, la couleur, le modèle. Le score de vérification sera haut.

**Impact** : Un faux propriétaire récupère un passeport / CNI / permis.  
**Probabilité** : Moyenne (dépend du niveau d'information de l'attaquant).  
**Exploitation dans le code actuel** : Possible si l'attaquant est proche de la victime ; la vérification n'est pas assez « asymétrique ».

**Correction requise** :
- Ne jamais donner la réponse attendue au client, même en JSON caché.
- Ajouter une question **non prévisible** (ex : « Quel était le dernier voyage noté dans votre passeport ? ») — mais cela nécessite que le propriétaire ait saisi ces données au préalable (`privateNotes`). C'est déjà prévu mais facultatif.
- Si `failedVerifyAttempts` atteint 3, **bloquer temporairement le match** et alerter un modérateur.
- Introduire un **délai obligatoire** entre la création du match et la possibilité d'initier la récupération : ex : 6h de « cooling-off » pour permettre au vrai propriétaire de réagir en premier.

---

### P0-2 — Extraction massive de données sensibles par scraping / énumération

**Contexte** : Même si chaque fiche masque certains champs, un bot peut énumérer toutes les déclarations.

**Faiblesse actuelle** :
- `/api/lost` et `/api/found` n'ont **aucun rate-limit** côté application (le code ne montre pas de `rate-limit` middleware). Un bot peut requêter `?limit=100` en boucle sur toutes les villes.
- `photoUrls` et `blurredPhotoUrls` sont exposés dans le JSON. Même floutées, un attaquant peut récupérer toutes les images (métadonnées, empreintes).
- `idPartialMasked` est exposé (ex : `BF****84`). Avec plusieurs déclarations du même document, un attaquant peut corréler.

**Impact** : Fuite de données personnelles partielles, corrélation d'identités, construction d'une base de documents perdus (utile pour usurpation).  
**Probabilité** : Très haute (aucune protection anti-bot visible).  
**Exploitation** : Simple `curl` en boucle.

**Correction requise** :
- Rate-limit par IP + par user sur `/api/lost`, `/api/found`, `/api/matches` (ex : 30/min par IP, 10/min par user).
- Ne pas exposer `blurredPhotoUrls` au public non-authentifié ; exiger au moins `?mine=1` (déjà fait mais pas verrouillé).
- Limiter le nombre de résultats publics (ex : 20, pas 50) et paginer avec curseur opaque (pas `offset`).
- Ajouter `X-Robots-Tag: noindex` et `Cache-Control: private` sur ces endpoints.
- Envisager un CAPTCHA léger (ex : Cloudflare Turnstile) sur `/api/lost` et `/api/found` si plus de 5 requêtes/min.

---

### P0-3 — Vol d'identité via récupération d'un document sans vérification suffisante

**Contexte** : `recoveryPointId` est un point physique. Un attaquant convainc le vrai propriétaire (ou le point) que la récupération est légitime.

**Faiblesse actuelle** :
- `/api/recoveries` accepte `method` et `recoveryPointId`. Aucune vérification que le `match` est bien `verified` avant de créer la récupération.  
  Vérif dans le code : `if (row.match.status !== "verified" && row.match.status !== "completed") return jsonError(...)`. Donc c'est protégé.
- **Mais** : le `recoveryPoint` est un lieu public. Un attaquant pourrait se présenter au point avec un faux « code » ou en se faisant passer pour le trouveur.
- **Le code ne génère pas de « code de restitution » unique** à 6 chiffres. C'est une faille de conception : sans token unique, le point ne peut pas vérifier que la personne qui se présente est bien le propriétaire autorisé.

**Impact** : Un document sensible est remis à la mauvaise personne au point RETRUV.  
**Probabilité** : Moyenne (social engineering au point).  
**Exploitation** : L'attaquant connaît le nom du point et le nom du document ; il se présente avec un faux sourire.

**Correction requise** :
- Générer un `restitutionCode` (6 caractères alphanumériques) au moment où `recovery` passe à `accepted` ou `at_point`.
- Ce code doit être envoyé au propriétaire et au trouveur séparément (via notification), et jamais affiché publiquement.
- Le `recoveryPoint` doit vérifier le code avant de remettre l'objet.
- Enregistrer la remise avec `restitutionCode` dans `auditLogs`.

---

## 3. Menaces hautes (P1)

### P1-1 — Escalade de privilèges / faux administrateur

**Contexte** : `/api/admin/stats` vérifie `user.role === "admin" || user.role === "moderator"`.  
**Faiblesse** : Si un attaquant obtient un compte `verified_finder` et découvre un moyen d'élever son rôle (ex : via injection SQL ou faille dans un endpoint non visible), il accède aux données de tous.

**Protection actuelle** :
- Drizzle ORM avec paramètres liés → pas d'injection SQL directe.
- `publicUser` masque le `passwordHash` et limite le `email` et `phone` dans la réponse API.
- **Mais** : `publicUser` masque le téléphone mais expose `reputationLevel`, `reputationScore`, `role`. Un attaquant peut profiler.

**Risque résiduel** : Si le `token` de session est volé (XSS, sniffing réseau), l'attaquant a accès au rôle.

**Correction requise** :
- Vérifier `sameSite: "lax"` sur le cookie (déjà présent dans `auth.ts`).
- Ajouter `secure: true` en production (déjà présent conditionnellement).
- Mettre en place un `HttpOnly` strict et `__Host-` prefix sur le cookie (déjà `retruv_session` mais sans `__Host-`).
- Introduire un `refresh` court (ex : 30 min d'inactivité = déconnexion).

---

### P1-2 — Manipulation du système de réputation

**Contexte** : `ratings` donne +5 ou +10 points selon le score. Un groupe d'attaquants peut se noter entre eux pour monter en réputation et devenir « Super trouveur » ou « Partenaire RETRUV ».

**Faiblesse actuelle** :
- Aucune limite sur le nombre de `ratings` par utilisateur par jour.
- Un utilisateur peut créer plusieurs comptes (numéros de téléphone différents) et se noter mutuellement.
- Le `reputationScore` est un simple entier cumulatif, sans pondération temporelle.

**Impact** : Un acteur malveillant obtient le statut « Partenaire RETRUV », gagne en crédibilité, et facilite des arnaques.  
**Probabilité** : Moyenne (coût : plusieurs SIMs).  
**Exploitation** : Création de 5 faux comptes → faux matchs → faux récupérations → faux ratings → réputation maximale.

**Correction requise** :
- Limiter 1 `rating` par `recoveryId` et par `fromUserId` (déjà `uniqueIndex` sur `(recoveryId, fromUserId)`).
- Limiter le nombre de `ratings` par `toUserId` sur 24h (ex : max 3).
- Ne pas compter le `rating` dans la réputation si `recovery` n'est pas `completed`.
- Introduire un « poids de confiance » : une note d'un utilisateur `new` vaut moins qu'une note d'un `verified_finder`.

---

### P1-3 — Fuite d'informations via `auditLogs`

**Contexte** : `auditLogs` stocke `entityId`, `metadata` (JSONB).  
**Faiblesse** : `metadata` contient le `matchId`, le score, etc. Si un attaquant obtient un accès `moderator`, il voit l'historique complet de tous. C'est acceptable pour un modérateur, mais le code `publicUser` et `auditLogs` ne limitent pas assez.

**Correction** : S'assurer que `auditLogs` n'est jamais exposé publiquement (déjà non exposé via API publique visible dans la liste des routes). Vérifier que `/api/admin/stats` n'expose pas `auditLogs` au-delà des 20 lignes récentes.

---

## 4. Menaces moyennes (P2)

### P2-1 — Harcèlement via chat après récupération

**Contexte** : `conversations.isActive`. Une fois `completed`, la conversation reste ouverte (`isActive: true`).  
**Faiblesse** : Aucune fonctionnalité de blocage ou de suppression du chat. Un utilisateur malveillant peut continuer à écrire après récupération.

**Correction** :
- Ajouter un bouton « Bloquer cet utilisateur » dans le chat (mise à jour `users.isBlocked` ou table de blocage).
- Fermer automatiquement `conversation.isActive` après `completed` et 7 jours d'inactivité.
- Permettre `conversation.delete` côté propriétaire (ou au moins masquage).

---

### P2-2 — Déclarations massives spam / DoS

**Contexte** : `checkDeclarationRate` limite à 10 déclarations par heure.  
**Faiblesse** : Un bot peut créer des comptes via `POST /api/auth/register` (aucun CAPTCHA visible) et déclarer 10 objets par heure par compte. Avec 10 comptes, 100 déclarations/h.  
**Impact** : Pollution de la base, saturation du matching, coût DB et CPU.

**Correction** :
- CAPTCHA sur `/api/auth/register`.
- CAPTCHA sur `/api/lost` et `/api/found` après 3 déclarations/h.
- Limite globale par IP : 30 déclarations/h (tous comptes confondus).

---

### P2-3 — Corruption des données via JSON non validé dans `privateDataEncrypted`

**Contexte** : `foundItems.privateDataEncrypted` est une chaîne base64 d'un JSON arbitraire.  
**Faiblesse** : Si l'utilisateur injecte du JSON malformé, `decryptPrivatePayload` retourne `null`. Ce n'est pas une faille de sécurité directe, mais cela pourrait provoquer des erreurs non gérées dans un pipeline futur.

**Correction** : Valider le schéma du JSON privé côté `security.ts` avec `z.object`.

---

## 5. Menaces de confidentialité (P1-P3 combinées)

### P3-1 — Corrélation d'identité via `idPartialMasked` et `serialPartial`

**Faiblesse** : Même masqués (`BF****84`), plusieurs déclarations du même document révèlent le même suffixe.  
**Exploitation** : Un bot collecte tous les `idPartialMasked`, fait un clustering sur le suffixe (`84`), et identifie qu'il s'agit du même document, même si la ville change (déclaration perdue puis trouvée dans une autre ville par erreur).  
**Risque** : Fuite du fait qu'une personne possède un document donné (même sans nom complet).

**Correction** :
- Ne pas exposer `idPartialMasked` au public non-authentifié (déjà masqué dans la fiche publique ? Vérif : dans `found_items` GET, `idPartialMasked` est inclus dans le JSON. Dans `lost_items` GET aussi).  
- Pour un document sensible, ne pas exposer cet identifiant du tout au public ; le garder uniquement dans la zone privée et dans le matching.

---

### P3-2 — Méta-données des images

**Contexte** : `photoUrls` sont des URLs publiques. Même si la photo est « floutée », le fichier original (ou sa version non floutée) pourrait être accessible via le même chemin avec un paramètre différent (ex : `?blur=0`).  
**Faiblesse** : Le code actuel ne montre pas de pipeline de redaction. `processSensitivePhotos` ajoute `?blur=sensitive` dans l'URL, mais cela est purement cosmétique. Un attaquant qui connaît l'URL de base peut tenter d'enlever le paramètre.

**Correction** :
- Stocker deux versions : `original` (chiffré, accessible uniquement après vérif) et `public` (redaction côté serveur avec un service d'image, pas un paramètre URL).
- Utiliser des URLs signées (presigned URLs) avec expiration courte pour l'accès à `original`.

---

### P3-3 — Fuite du nom complet dans le chat et dans les fiches

**Contexte** : `publicUser` expose `fullName.split(" ")[0]`. C'est un prénom, pas le nom complet. **Mais** dans le chat, `otherUser` expose `name: other.fullName.split(" ")[0]`. C'est cohérent.  
**Faiblesse** : Si un attaquant connaît le prénom de la victime (facile sur Facebook/LinkedIn) et la ville (`Ouagadougou`), il peut corréler avec la fiche publique et identifier la personne.

**Correction** :
- Pour les documents sensibles, masquer la ville ou la généraliser (ex : « Centre du pays » au lieu de « Ouagadougou ») dans la fiche publique, sauf si le propriétaire le choisit.
- Ne pas exposer `district` ni `locationApprox` au public non-authentifié pour `isSensitive === true`.

---

## 6. Menaces d'architecture et infrastructure

### P4-1 — Base de données non chiffrée au repos

**Contexte** : `DATABASE_URL` pointe vers PostgreSQL. Aucune mention de chiffrement des données sensibles au repos (`isSensitive` flag mais pas de `pgcrypto` ou chiffrement colonne).  
**Faiblesse** : Si l'hôte PostgreSQL est compromis (accès root du serveur), toutes les données sont lisibles en clair, y compris `privateNotes`, `verificationHints`, `answers` (même si `answers` est en JSON, il contient des réponses de vérification).  
**Correction** : Utiliser `pgcrypto` pour chiffrer `verificationHints` et `answers` avec une clé dérivée du serveur (non stockée dans la DB). Pour le MVP, au moins s'assurer que `answers` et `privateNotes` sont chiffrés côté application (`crypto.createCipheriv`) avant insertion.

---

### P4-2 — Logs d'audit non protégés contre l'altération

**Contexte** : `auditLogs` est dans la même DB que le reste. Un attaquant avec accès DB peut supprimer ou modifier ses traces (`DELETE FROM audit_logs WHERE userId = '...'`).  
**Correction** : Pour V2, envoyer les logs critiques vers un système externe immuable (ex : syslog distant, ou table append-only avec droits séparés).

---

### P4-3 — Pas de sauvegarde / rétention définie

**Faiblesse** : `DECLARATION_EXPIRY_DAYS = 90`. Mais il n'y a pas de `cron` ou de mécanisme de suppression dans le code. Les données expirées restent dans la base indéfiniment.  
**Correction** : Un job `pg_cron` ou un script `next` qui supprime `lost_items` et `found_items` avec `expiresAt < now` et `status` non `recovered`.

---

## 7. Menaces UX et sociales

### P5-1 — Social engineering via « récompense »

**Contexte** : Un utilisateur déclare un objet avec `rewardAmount: 50000`. Un attaquant peut créer une fausse déclaration de trouvaille et demander le paiement avant remise.  
**Protection** : Le code n'a pas d'intégration de paiement. Mais le texte « Récompense proposée » est affiché publiquement dans la fiche (`lost` detail).  
**Correction** : Ne pas afficher le montant de récompense au public non-authentifié. L'afficher uniquement au propriétaire et au trouveur après match.

---

### P5-2 — Phishing via notification

**Contexte** : `notifications` contient `title`, `body`, `link`. Un attaquant qui contrôle un compte peut envoyer des notifications avec des liens vers des sites externes.  
**Protection** : `link` est généré côté serveur. L'utilisateur ne peut pas injecter un lien arbitraire dans `/api/notifications`.  
**Faiblesse résiduelle** : Si l'attaquant compromet le serveur (code injection), il peut insérer des notifications malveillantes.  
**Correction** : Limiter le `link` à des chemins internes (`/matches/*`, `/messages/*`, `/dashboard`) via une whitelist.

---

### P5-3 — Utilisateur bloqué qui continue à utiliser le chat

**Contexte** : `users.isBlocked` est vérifié dans `getSessionUser` (`if (user.isBlocked) return null`).  
**Faiblesse** : Si un utilisateur est bloqué après avoir ouvert un chat, le chat reste accessible (le `conversation` n'est pas vérifié contre le blocage du participant).  
**Correction** : Dans `GET /api/messages/[id]`, vérifier que ni `participant1` ni `participant2` n'est bloqué, sinon renvoyer 403.

---

## 8. Audit du code actuel — points précis

### Auth (`src/lib/auth.ts`)
- ✅ `hashPassword` avec `bcrypt` (10 rounds) — bon.
- ✅ `verifyPassword` — bon.
- ✅ `publicUser` masque `phone` et limite `email` — bon.
- ⚠️ `createSession` ne limite pas le nombre de sessions par utilisateur. Un attaquant peut créer des centaines de sessions valides (DoS léger sur la table `sessions`).
  - **Fix** : Limiter à 5 sessions actives par `userId`. Nettoyer les anciennes lors de la création d'une nouvelle.

### Schéma (`src/db/schema.ts`)
- ✅ `uniqueIndex` sur `matches` (`lostItemId`, `foundItemId`) — évite les doublons.
- ⚠️ `lostItems` et `foundItems` n'ont pas de contrainte `ON DELETE` explicite sur `userId` ? Vérif : `references: [users.id], { onDelete: "cascade" }` — présent. Bon.
- ⚠️ `messages` n'a pas d'index sur `(senderId, createdAt)` — pourrait ralentir le chat pour un utilisateur très actif.
- ⚠️ `foundItems.blurredPhotoUrls` et `photoUrls` sont des `text[].array()` sans validation (pas d'URL validation). Un attaquant peut insérer des URLs arbitraires (phishing, malware).  
  - **Fix** : Valider que chaque URL commence par `https://` et appartient au domaine autorisé.

### Matching (`src/lib/matching.ts`)
- ✅ `computeMatchScore` est pure, sans accès direct à la DB.
- ⚠️ `runMatchingForLostItem` fait un `limit(200)` sur les `foundItems`. Pour un pays avec des milliers de déclarations, cela rate des correspondances probables au-delà des 200 premières (triées par `categoryId` et `status` mais sans priorité géographique dans la requête).  
  - **Fix** : Pré-filtrer par ville (`eq(foundItems.city, lost.city)`) avant le matching, ou utiliser un index géographique.
- ⚠️ `buildVerificationQuestions` utilise `distinctiveFeatures` comme `expectedHint`. Si le propriétaire a mis « petit chien blanc » dans `distinctiveFeatures`, la question devient « Décrivez une caractéristique particulière... » avec la réponse attendue « petit chien blanc ». Un attaquant qui lit la fiche publique du `foundItem` (si elle expose `distinctiveFeatures`) voit la réponse attendue.  
  - Vérif : dans `found_items` GET public (`isFinder || verified ? ... : null`), `distinctiveFeatures` est masqué. Mais dans le `match` détail (`/api/matches/[id]`), il est exposé au `verified`.  
  - **Le vrai risque** : avant `verified`, le `foundItem` ne révèle pas `distinctiveFeatures`. Donc l'attaquant ne peut pas le voir directement. Cependant, si le `foundItem` est très similaire au `lostItem` (même catégorie, même ville), l'attaquant peut deviner certains détails (ex : « passeport bordeaux »).  
  - **Fix** : Ne jamais utiliser le même `distinctiveFeatures` comme `expectedHint` et comme description publique. Séparer clairement `publicDistinctiveFeatures` (vague) et `verificationDistinctiveFeatures` (précis, privé).

### Sécurité (`src/lib/security.ts`)
- ⚠️ `processSensitivePhotos` fait un simple `?blur=sensitive` dans l'URL. C'est cosmétique.  
  - **Fix** : Utiliser un service de redaction (ex : `sharp` côté serveur ou pipeline d'image) pour créer un vrai fichier flouté.
- ⚠️ `encryptPrivatePayload` est `Buffer.from(JSON.stringify(data), "utf8").toString("base64")`. C'est du **base64**, pas du chiffrement. Toute personne avec accès à la DB peut lire `privateDataEncrypted` en décodant le base64.  
  - **Fix immédiat** : Remplacer par `crypto.createCipheriv` avec une clé stockée dans `process.env.RETRUV_ENC_KEY` (hors DB, dans un secret manager ou `.env` local). Même au minimum, utiliser `AES-256-GCM`.
- ⚠️ `maskSensitiveText` remplace `\b\d{6,}\b` par `maskId`. Un numéro de téléphone à 10 chiffres (`70222222`) est masqué. Un identifiant court (`84`) n'est pas masqué (`id.length <= visibleStart + visibleEnd`). C'est cohérent avec le design, mais un attaquant qui voit plusieurs `idPartialMasked` (`BF****84`, `BF****85`, `BF****86`) peut inférer la structure.

### API Routes
- `/api/auth/register` : pas de CAPTCHA, pas de validation du format du téléphone (`+226...`).  
  - **Fix** : Valider `phone` avec un regex (`/^\+?[0-9]{8,15}$/`).
- `/api/auth/login` : pas de limite de tentatives (`brute-force`). Un attaquant peut tester des milliers de mots de passe sur un numéro connu.  
  - **Fix** : Ajouter un `failedLoginAttempts` dans `users`, verrouiller temporairement après 5 échecs, et utiliser `bcrypt.compare` (déjà fait) mais avec un délai exponentiel (`setTimeout` ou `redis` en V2).
- `/api/lost` et `/api/found` : `createSchema` utilise `z.string().uuid()` pour `categoryId` et `subcategoryId`. C'est bon.  
  - **Mais** : `keywords` est un tableau de strings sans validation du contenu. Un attaquant peut injecter du HTML/JS dans `keywords` (ex : `"<script>alert(1)</script>"`). Même si le front n'exécute pas directement le HTML des keywords, un futur export ou affichage non échappé pourrait le faire.  
  - **Fix** : Nettoyer chaque `keyword` avec `stripHtml` ou `DOMPurify` (ou au minimum `text.replace(/</g, "&lt;")`).
- `/api/messages/[id]` : `postSchema` accepte `sharePhone: z.boolean()`. Quand `sharePhone` est `true`, le chat met à jour `conversation.phoneShared`. Il n'y a pas de confirmation double. Un utilisateur peut partager son numéro par erreur en cliquant sur la checkbox.  
  - **Fix** : Demander une confirmation (`"Êtes-vous sûr ? Votre numéro sera visible.")` ou ajouter un bouton séparé « Partager mon numéro » au lieu d'une checkbox dans le formulaire de message.
- `/api/matches/[id]/verify` : la réponse `questions` est renvoyée au client même si `status === "pending"` et `attemptsUsed` n'a pas atteint `maxAttempts`. C'est bien.  
  - **Mais** : le `answers` envoyé par le client est `Record<string, string>`. Il n'y a pas de limite sur la taille de chaque réponse (`expectedHint` est masqué, mais rien n'empêche d'envoyer un `answers` de 10 000 caractères).  
  - **Fix** : Limiter chaque `answers[key]` à 500 caractères.
- `/api/reports` : `targetType` est validé (`z.enum`). `targetId` est `z.string().uuid()`. Bon.  
  - **Mais** : `details` est `max(2000)`. Un attaquant peut envoyer un rapport très long pour DoS.  
  - **Fix** : Limiter le nombre de rapports par `reporterId` par heure.

### Composants React
- `DeclareForm` (`components/declare-form.tsx`) : le `select` pour `parentId` (catégorie) est ouvert au public. Un utilisateur peut voir toutes les catégories (y compris `documents`). C'est acceptable (pas d'information sensible).  
  - **Mais** : `distinctiveFeatures` est un `<textarea>` sans limite de caractères côté navigateur (seulement `maxLength` non spécifié dans le HTML, seulement `max(1000)` côté Zod). Un utilisateur peut envoyer un `distinctiveFeatures` de plusieurs mégaoctets (Zod rejette, mais le navigateur envoie quand même le payload).  
  - **Fix** : Ajouter `maxLength={1000}` sur le `<textarea>`.
- `ChatBox` (`components/chat-box.tsx`) : `load()` fait un `fetch` toutes les 5 secondes (`setInterval`). Si 100 utilisateurs ont le même chat ouvert, cela fait 20 requêtes/s vers le même endpoint.  
  - **Fix** : Utiliser `WebSocket` ou `Server-Sent Events` (SSE) pour le chat au lieu du polling. Pour le MVP, au moins ajouter un `AbortController` et arrêter le polling si le composant se démonte (déjà implicite via `clearInterval` mais pas de `abort` sur `fetch`).
- `MatchActions` (`components/match-actions.tsx`) : le bouton « Confirmer la restitution » envoie `rating: { score: 5, comment: "Merci via RETRUV" }`. L'utilisateur ne peut pas modifier le score, mais il est toujours `5`. Un acteur malveillant pourrait créer un faux match et le valider pour obtenir des points.  
  - **Fix** : Ne pas autoriser un `rating` automatique dans le même appel que `complete`. Séparer : `PATCH /api/recoveries` avec `action: "complete"`, puis un `POST /api/ratings` séparé après 24h de délai.

---

## 9. Scénarios d'attaque détaillés

### Scénario A : « Le faux passeport » (P0-1 + P0-3)

1. **Reconnaissance** : L'attaquant (Paul) connaît Aïcha (connaissance, ex-collègue, voisin). Il sait qu'elle a perdu un passeport à Bobo.
2. **Préparation** : Paul obtient un passeport (volé ou acheté au marché noir) avec des caractéristiques similaires (couverture bordeaux, coin plié).
3. **Déclaration trouvée** : Paul déclare le passeport sur RETRUV avec `color: "Bordeaux"`, `city: "Bobo-Dioulasso"`, `distinctiveFeatures: "coin plié"` (il a observé une photo du passeport d'Aïcha sur un réseau social privé, ou il a vu le document auparavant).
4. **Match** : RETRUV détecte un match `probable` (80 %).
5. **Vérification** : Aïcha initie la vérification. Elle répond : quartier `Centre-ville`, date `hier`, couleur `Bordeaux`, détails `coin plié`.
6. **Score de vérif** : 85 % (fort, car Paul connaît ces détails). Paul reçoit la notification « Vérification réussie ».
7. **Récupération** : Paul propose `direct_meetup`. Aïcha accepte. Paul se présente au rendez-vous. Sans `restitutionCode`, le point RETRUV n'a aucun moyen de vérifier que Paul est le bon trouveur. Aïcha remet le passeport à Paul, ou Paul le récupère au point s'il se fait passer pour le propriétaire.
8. **Impact** : Passeport d'Aïcha est récupéré par Paul. Utilisé pour usurpation d'identité, voyage, ouverture de compte bancaire.

**Contre-mesures** :
- `restitutionCode` (déjà identifié).
- Séparer la vérification (« est-ce bien le propriétaire ? ») de la récupération (« qui récupère physiquement ? »). Même après `verified`, le propriétaire doit explicitement désigner qui vient chercher (lui-même, un tiers de confiance avec code).
- Pour un document `isSensitive`, obliger que la récupération passe par un `recoveryPoint` (pas de `direct_meetup`) et que le point vérifie l'identité du propriétaire (photo, CNI physique) avant remise.

---

### Scénario B : « L'usurpateur systématique » (P1-2)

1. **Création de réseau** : L'attaquant crée 5 comptes (`+226701...`, `+226702...`, etc.).
2. **Déclarations croisées** : Compte A déclare un téléphone perdu. Compte B déclare un téléphone trouvé (même modèle, même couleur). Compte C déclare un autre objet.
3. **Matchs internes** : RETRUV crée des matchs entre A et B.
4. **Vérifications** : A et B répondent aux questions l'un de l'autre (car ils contrôlent les deux comptes). Les scores sont élevés.
5. **Récupérations** : Ils confirment la récupération mutuellement.
6. **Réputation** : Ils se notent 5 étoiles mutuellement. En 10 récupérations, chaque compte atteint `partner`.
7. **Exploitation** : Un compte `partner` est très crédible. L'attaquant l'utilise pour cibler des victimes réelles : il déclare des objets sensibles et utilise sa réputation pour rassurer.

**Contre-mesures** :
- Ne pas autoriser `rating` entre deux comptes qui ont participé au même `match` si `createdAt` du match est < 24h avant le `rating` (déjà implicite mais pas vérifié).
- Limiter le nombre de `ratings` par `toUserId` sur 24h.
- Vérifier que `fromUserId` et `toUserId` ne sont pas liés par un même `recoveryPointId` ou par une même IP récente.
- Introduire un « délai de confiance » : un nouveau compte ne peut pas initier une récupération avant 7 jours d'existence et au moins 1 déclaration validée par un utilisateur ancien.

---

### Scénario C : « Le scraper de données » (P0-2)

1. **Bot** : `python -c "... curl /api/lost?limit=50 ..."` en boucle.
2. **Extraction** : Le bot récupère `title`, `description`, `city`, `district`, `locationApprox`, `idPartialMasked`, `color`, `keywords`.
3. **Agrégation** : Pour chaque document sensible (`isSensitive: true`), le bot collecte `city` et `idPartialMasked`.
4. **Corrélation** : Si le même `idPartialMasked` (`BF****84`) apparaît dans `lost` et `found`, le bot sait que le document a été retrouvé.
5. **Ciblage** : L'attaquant sait que quelqu'un dans `Bobo-Dioulasso` possède (ou possède encore) un passeport se terminant par `84`. Si l'attaquant a accès à une base de données de passeports (ex : fuite d'une administration), il peut corréler.

**Contre-mesures** :
- Rate-limit strict (30/min par IP).
- Ne pas exposer `district`, `locationApprox`, `idPartialMasked` au public pour `isSensitive: true`.
- Exiger `auth` (cookie valide) pour accéder à `/api/lost` et `/api/found` au-delà de 5 résultats.
- Utiliser `cursor` opaque au lieu de `limit/offset`.

---

### Scénario D : « Le chat harceleur post-récupération » (P2-1)

1. Aïcha et Moussa récupèrent le passeport au point RETRUV.
2. La récupération passe à `completed`.
3. Moussa, mécontent de la récompense (ou par malveillance), continue à envoyer des messages dans le chat.
4. Aïcha reçoit des notifications (`notification.type: "message"`) avec le contenu.
5. Aïcha n'a pas d'option pour bloquer Moussa (pas de bouton « Bloquer » dans `ChatBox`).

**Contre-mesures** :
- Ajouter un bouton « Signaler / Bloquer » dans `ChatBox`.
- Mettre à jour `users.isBlocked` (déjà présent) et vérifier dans `GET /api/messages/[id]` que ni `senderId` ni `otherId` n'est bloqué par l'autre.
- Fermer le chat automatiquement après `completed` + 7 jours d'inactivité.

---

## 10. Maturité de la sécurité du code

| Dépôt | Score | Commentaire |
|-------|-------|-------------|
| Auth (hash, cookie) | 7/10 | Bon, manque brute-force et session limit |
| Validation (Zod) | 8/10 | Bonne, manque URL validation et HTML sanitize |
| Confidentialité (masquage) | 6/10 | Masquage cosmétique, base64 au lieu de chiffrement |
| Matching (algorithme) | 7/10 | Bon, manque préfiltre géographique |
| Vérification (propriété) | 6/10 | Bonne idée, manque code de restitution, manque question asymétrique |
| Anti-fraude | 5/10 | Rate limit basique, pas assez de contraintes sur réputation et récupération |
| Audit | 7/10 | Présent, mais immuable et stocké dans la même DB |
| Chat / Messagerie | 6/10 | Pas de blocage, pas de fermeture auto |
| Récupération | 5/10 | Manque token de remise au point, pas de séparation rôle |
| Photos / données sensibles | 4/10 | `?blur=sensitive` est cosmétique, pas de redaction serveur |

**Score global : 6.2/10 (MVP)**  
Le produit est utilisable, mais plusieurs failles P0 et P1 doivent être corrigées avant un lancement public au-delà d'une beta contrôlée.

---

## 11. Plan de durcissement immédiat (priorisé)

### Week 1 — P0 (bloquant)
- [ ] Remplacer `encryptPrivatePayload` par AES-256-GCM (`crypto`).
- [ ] Limiter `publicUser` et API publiques : ne pas exposer `district`, `locationApprox`, `idPartialMasked`, `serialPartial` pour `isSensitive`.
- [ ] Ajouter `restitutionCode` dans `recovery` et vérifier dans le chat / notification.
- [ ] Rate-limit strict (`express-rate-limit` ou middleware custom) sur `/api/auth/login`, `/api/lost`, `/api/found`, `/api/messages`.
- [ ] Limiter `answers` à 500 caractères côté serveur.
- [ ] Nettoyer `keywords` et `distinctiveFeatures` côté client et serveur (strip HTML).

### Week 2 — P1 (fortement recommandé)
- [ ] CAPTCHA sur `/api/auth/register`, `/api/lost`, `/api/found`.
- [ ] Brute-force protection : 5 essais max sur `/api/auth/login`, délai exponentiel.
- [ ] Limite de sessions : 5 max par user, nettoyage auto.
- [ ] Limite de `ratings` : 1 par `recoveryId`, max 3 par `toUserId` / 24h.
- [ ] Vérifier `isBlocked` dans toutes les routes `messages`.
- [ ] Séparer la vérification et la récupération : `restitutionCode` obligatoire.
- [ ] Ajouter `reputationLevel` poids dans `rating` (nouveau = moins de poids).

### Week 3 — P2 (important)
- [ ] Pipeline image réel : redaction côté serveur (`sharp` + floutage) au lieu de paramètre URL.
- [ ] Blocage utilisateur et fermeture chat après récupération.
- [ ] Suppression auto des déclarations expirées (`cron` ou `pg_cron`).
- [ ] Préfiltre géographique dans `runMatchingForLostItem` (ville d'abord, distance < 50 km).
- [ ] Limite globale par IP sur les déclarations.
- [ ] `Cache-Control: private, no-store` sur tous les endpoints de données sensibles.

### Month 2 — P3 (architecture)
- [ ] Chiffrer `auditLogs.entityId` et `metadata` au repos (`pgcrypto`).
- [ ] Séparer la table `auditLogs` en lecture seule (droits DB séparés) ou envoyer vers un log externe.
- [ ] `WebSocket` ou `SSE` pour le chat au lieu du polling.
- [ ] Multi-langue (FR + EN) et préparation Mooré/Dioula.
- [ ] Tests de pénétration externes (pentest) sur le MVP avant ouverture publique.

---

## 12. Avis d'expert final

RETRUV a une **vision produit très forte** : la séparation entre « matching » et « preuve de propriété » est la bonne architecture pour ce type de plateforme. Beaucoup d'applications concurrentes échouent parce qu'elles confondent « correspondance probable » et « propriété prouvée ».

Le code actuel est **fonctionnel mais immature en sécurité**. Les failles P0 (base64 au lieu de chiffrement, scraping sans rate limit, manque de `restitutionCode`) sont corrigibles en quelques jours. Le vrai risque n'est pas technique : c'est le **risque social** (escroquerie au point RETRUV, faux documents, pression sur la victime). RETRUV doit donc être lancé non pas comme un « site d'annonces », mais comme un **réseau de confiance** avec des partenaires physiques (gares, mairies, commissariats) qui servent de tiers de confiance.

Le prochain investissement le plus rentable n'est pas une IA vision, mais :
1. **Le pipeline de redaction d'images sécurisé** (P0-2)
2. **Le code de restitution au point RETRUV** (P0-1 / P0-3)
3. **Le CAPTCHA + rate limit** (P0-2 / P2-2)
4. **Le chiffrement AES des données sensibles** (P0-1 / P4-1)

Le produit est prêt pour une **beta fermée avec partenaires contrôlés** (1 gare, 1 université, 1 mairie). Pas encore pour un lancement public ouvert sans ces corrections.
