# Audit frontend Angular — Jambaar Pay Admin

Date : 29 juillet 2026  
Périmètre : `src/app`, styles globaux, configuration Angular/TypeScript/ESLint, routage, sécurité frontend, tests et déploiement Vercel.  
Méthode : lecture statique du dépôt, inventaire des composants/services/repositories, recherche de duplications et de valeurs codées en dur, compilation de production, lint et tests unitaires.

## 1. Synthèse exécutive

Le projet possède une base Angular moderne et plus structurée qu’un simple prototype issu de maquettes Figma. Les choix `standalone`, Signals, `OnPush`, lazy loading, repositories et façades sont pertinents. Le code compile et les 18 tests existants passent.

Cependant, le niveau de qualité n’est pas encore homogène ni suffisant pour une application financière en production. L’architecture est bien dessinée dans les modules administrateur, mais plusieurs pages entreprise et restaurant restent orientées démonstration : données générées dans les composants, persistance locale, montants représentés par des chaînes, formulaires pilotés par `ngModel`, styles très dupliqués et tests absents.

**Note globale : 7/10**

| Axe | Note | Évaluation |
|---|---:|---|
| Architecture Angular | 8/10 | Bonne séparation globale, mais incohérente entre features |
| Qualité TypeScript | 8/10 | Mode strict, types propres, peu de dette évidente |
| Réutilisabilité UI | 6/10 | Design system amorcé, duplication encore importante |
| Design system / thème | 6/10 | Tokens existants, mais largement contournés |
| Responsive | 7/10 | Effort réel, mais stratégie non centralisée |
| Performance | 7/10 | `OnPush` généralisé, quelques composants trop chargés |
| Sécurité frontend | 6/10 | CSP et guards présents, stockage JWT perfectible |
| Tests / qualité automatisée | 4/10 | 18 tests réussis, couverture fonctionnelle trop faible, lint cassé |
| Préparation production | 5/10 | Backend non branché, données locales et mocks |

## 2. Mesures factuelles

- Environ 15 395 lignes TypeScript, HTML et SCSS dans `src/app`.
- 30 composants Angular ; les 30 utilisent `ChangeDetectionStrategy.OnPush`.
- 159 fichiers applicatifs, seulement 7 fichiers de tests.
- 18 tests unitaires exécutés avec succès.
- 655 occurrences de couleurs littérales dans les SCSS.
- 711 occurrences de dimensions en pixels dans les SCSS.
- 58 media queries réparties dans les styles.
- 134 occurrences de `#fff`, en plus de `#ffffff` et du token existant.
- 68 champs `<input>` pour 60 `<label>` : certains champs doivent être audités individuellement pour leur nom accessible.
- Aucun usage de Reactive Forms détecté ; les formulaires reposent sur `FormsModule`/`ngModel`.
- Build production réussi.
- Lint impossible : le module `@eslint/js`, importé par `eslint.config.js`, n’est pas déclaré/installé.

## 3. Points forts

### 3.1 Socle Angular moderne

- Angular 20, composants standalone et chargement paresseux par route.
- TypeScript strict avec `strictTemplates`, `strictInjectionParameters`, `noImplicitReturns` et `noFallthroughCasesInSwitch`.
- `ChangeDetectionStrategy.OnPush` sur tous les composants.
- Signals et `computed` utilisés pour l’état dérivé.
- Intercepteurs fonctionnels pour JWT, corrélation et gestion d’erreurs.

### 3.2 Architecture métier déjà amorcée

Les features `audit`, `monitoring`, `settings`, `companies` et `restaurants` exposent des ports de type repository, avec implémentations locales et BFF. Le choix de la source de données est centralisé par `APP_RUNTIME_CONFIG`.

Cette frontière est saine :

`Component → Facade → Repository port → Local/BFF adapter → BffApiClient`

Elle permet de remplacer les données locales par le backend sans réécrire les composants, si elle est appliquée partout.

### 3.3 Sécurité et exploitation

- Le client HTTP refuse les endpoints absolus passés par les features.
- Le JWT n’est attaché qu’aux requêtes appartenant à la base BFF.
- Les routes protégées sont filtrées par authentification et rôles.
- Une CSP, des politiques de permissions et des en-têtes de sécurité sont configurés dans `vercel.json`.
- Les budgets Angular empêchent une dérive excessive du bundle.

### 3.4 Premiers composants de design system

Le dépôt contient déjà `EmptyState`, `FeedbackMessage`, `KpiCard`, `LoadingState`, `Pagination` et `StatusBadge`, ainsi que des styles partagés pour les listes et formulaires d’entités. Ce socle doit être consolidé, pas remplacé.

## 4. Constats prioritaires

### P0 — Blocage production : opérations financières locales

**Fichiers concernés**

- `src/app/features/enterprise/application/enterprise-employees.facade.ts`
- `src/app/features/enterprise/pages/balance-charge/*`
- `src/app/core/services/dataset-storage.service.ts`
- `src/index.html`

Le chargement de soldes modifie un jeu de données dans le navigateur. Il n’existe ni transaction serveur, ni idempotence, ni contrôle d’autorisation backend, ni preuve d’audit. Une personne peut aussi manipuler directement le stockage du navigateur.

**Risque**

Cette fonctionnalité ne doit jamais représenter un mouvement financier réel tant qu’elle ne passe pas par un backend transactionnel.

**Cible**

- Créer un `EnterpriseBalancesRepository`.
- Envoyer une commande typée au BFF.
- Utiliser un identifiant d’idempotence.
- Faire valider droits, plafond et solde côté serveur.
- Retourner un reçu et enregistrer un événement d’audit.
- Garder le mode local uniquement comme fixture explicite de développement.

### P0 — Authentification frontend insuffisante pour un contexte financier

**Fichiers concernés**

- `src/app/core/auth/application/auth.facade.ts`
- `src/app/core/services/storage.service.ts`
- `src/app/core/http/interceptors/jwt.interceptor.ts`

Le token est stocké dans `localStorage` ou `sessionStorage` puis ajouté dans un header Bearer. Une injection XSS peut lire ce token. Les guards Angular protègent la navigation, mais ne constituent jamais une autorisation de sécurité.

**Cible recommandée**

- Session BFF avec cookie `HttpOnly`, `Secure`, `SameSite`.
- Autorisation systématique côté backend.
- Protection CSRF si cookie cross-site.
- Expiration/rotation et révocation de session.
- Ne conserver dans le navigateur que l’état UI non sensible.

### P1 — Architecture incohérente entre features

Les modules administrateur utilisent souvent `domain/application/data-access`. Les parties entreprise et restaurant utilisent parfois une façade directement liée au stockage local, ou placent les données dans le composant.

Exemple critique : `EnterpriseHistoryComponent` fabrique 120 transactions dans sa classe. Le composant assume données, recherche, filtrage temporel, pagination, agrégation, export et interaction UI.

**Cible**

Pour chaque feature :

```text
feature/
  domain/
    models.ts
  application/
    feature.facade.ts
    feature.repository.ts
  data-access/
    local-feature.repository.ts
    bff-feature.repository.ts
  pages/
  components/
  feature.routes.ts
```

### P1 — Modèle monétaire incorrect

Plusieurs modèles conservent les montants sous forme de textes comme `2 000 Fcfa`, puis les reparsent avec des expressions régulières.

**Risques**

- Erreurs de parsing selon le format.
- Mélange domaine/présentation.
- Opérations arithmétiques fragiles.
- Impossibilité de garantir les arrondis si des décimales apparaissent.

**Cible**

```ts
interface Money {
  amount: number; // entier en unité minimale
  currency: 'XOF';
}
```

Le domaine conserve `2000`; `FcfaCurrencyPipe` gère uniquement l’affichage.

### P1 — Couverture de tests trop faible

Les 18 tests passent, mais ils couvrent principalement l’authentification, le client BFF, la pagination et une façade restaurant. Les parcours métier récents ne sont pas protégés.

**Manques prioritaires**

- Chargement de soldes : sélection, montant invalide, double soumission, erreurs serveur et idempotence.
- Historique : semaines ISO, changements d’année, filtres et pagination.
- Guards de rôles.
- Intercepteurs d’erreurs et de corrélation.
- Import CSV/XLSX/PDF et validation des données.
- Composants de formulaire et accessibilité.
- Tests d’intégration des routes par rôle.
- Tests E2E des trois espaces : admin, entreprise, restaurant.

Le `skipTests: true` configuré pour presque tous les schematics encourage mécaniquement l’absence de tests.

### P1 — Lint non opérationnel

`eslint.config.js` exige `@eslint/js`, mais le paquet manque. La commande `npm run lint` échoue avant d’analyser le moindre fichier.

**Conséquence**

Les règles d’architecture définies dans ESLint — notamment l’interdiction d’importer `HttpClient` ou `data-access` depuis les composants — ne protègent actuellement pas le projet.

**Cible**

- Corriger la dépendance.
- Exécuter lint, tests et build dans la CI.
- Interdire le merge si l’une des trois étapes échoue.

## 5. Audit UI et design system

### 5.1 Tokens présents mais peu respectés

`src/styles/variables.scss` définit couleurs, espacements, rayons, ombres, tailles et mouvements. Malgré cela, les composants contiennent encore des centaines de couleurs et dimensions littérales.

La même intention visuelle possède parfois plusieurs valeurs :

- orange principal : `#e8722a`, `#f07a2a` et variantes ;
- blanc : `#fff`, `#ffffff`, `white` et token ;
- rayons : `0.5rem`, `0.6875rem`, `0.8rem`, `0.85rem`, `0.875rem`, `1.1rem`, `12px`, etc.

**Action**

Créer une nomenclature unique :

- couleurs sémantiques : `--surface-card`, `--text-muted`, `--border-default`, `--action-primary`;
- grille d’espacement : 4, 8, 12, 16, 24, 32, 48;
- rayons : small, medium, large, pill;
- typographie par rôle, pas par page;
- élévations limitées et documentées.

Supprimer le double système SCSS + CSS variables lorsqu’il ne sert qu’à dupliquer la même valeur.

### 5.2 Composants réutilisables manquants

Les patterns suivants apparaissent dans plusieurs pages et doivent rejoindre le design system :

- `PageHeader` : titre, sous-titre, actions.
- `PageToolbar` : recherche, filtres, export.
- `DataTableShell` : état de chargement, erreur, vide, table et pagination.
- `SearchField`.
- `FilterSelect`.
- `DatePeriodFilter`.
- `ExportActions`.
- `EntityFormField`.
- `PasswordField`.
- `FormError`.
- `ConfirmDialog`.
- `Toast/NotificationService`.
- `MoneyAmount`.
- `ResponsivePageContainer`.
- `Stepper` pour le chargement de comptes.

Les composants doivent exposer une API métier minimale et conserver les textes/événements dans la page.

### 5.3 Pages et styles trop volumineux

Les fichiers les plus préoccupants sont :

- `landing.component.scss` : environ 25 Ko.
- `landing.component.html` : environ 10 Ko.
- `enterprise-history.component.*` : logique, template et styles volumineux.
- `register.component.*`.
- `monitoring.component.scss`.
- `dashboard.component.scss`.

Un gros fichier n’est pas automatiquement mauvais, mais ces tailles révèlent ici plusieurs sections UI autonomes et styles locaux répétitifs.

**Découpage proposé**

- Landing : hero, trust section, features, role cards, CTA et footer.
- Historique : summary, employee filter, period filter, export actions, transaction table.
- Register : account fields, role selector, organization fields, credentials.
- Dashboard : KPI section, chart panel, recent activity.

### 5.4 Formulaires

Tous les formulaires utilisent `FormsModule`/`ngModel`; aucun Reactive Form n’a été détecté.

Pour une application d’entreprise, les Reactive Forms typés sont préférables pour :

- validateurs synchrones et asynchrones ;
- validation métier composable ;
- état de soumission explicite ;
- tests unitaires ;
- formulaires dynamiques ;
- prévention de double soumission ;
- mapping DTO fiable.

Les formulaires simples peuvent rester template-driven, mais login, inscription, création d’entreprise/restaurant et chargement financier devraient être réécrits en formulaires réactifs typés.

## 6. Responsive et layouts

Le projet possède de nombreux media queries et un `MainLayout` avec sidebar/topbar. L’effort responsive est réel, mais la stratégie est dispersée dans 58 blocs locaux.

**Problèmes**

- Breakpoints potentiellement différents d’une page à l’autre.
- Valeurs fixes nombreuses.
- Règles responsive dupliquées.
- Comportement mobile difficile à tester globalement.

**Architecture recommandée**

```text
AppShell
  MainLayout
    Sidebar
    Topbar
    PageContainer
      PageHeader
      PageContent
```

Compléter avec :

- mixins ou custom media centralisés : mobile, tablet, desktop, wide;
- `--content-max-width` réellement utilisé partout;
- container queries pour les widgets réutilisables;
- tableaux avec stratégie explicite : scroll, colonnes prioritaires ou cartes mobiles;
- tests visuels aux largeurs 360, 768, 1024, 1440 et 1920 px.

## 7. Performance Angular

### Bonnes pratiques déjà présentes

- `OnPush` partout.
- Lazy loading des composants de routes.
- Signals pour éviter une gestion RxJS excessive.
- Pagination locale des grandes listes.
- Budgets du bundle.

### Améliorations

- Extraire les grands tableaux/sections pour réduire la portée des mises à jour.
- Utiliser `track` systématiquement dans les boucles `@for`.
- Éviter les getters appelés fréquemment depuis les templates lorsqu’ils recréent des `Set` ou filtrent des listes.
- Ne pas générer de grands datasets dans les constructeurs/composants de production.
- Auditer Chart.js : destruction des instances, redimensionnement et chargement uniquement sur les dashboards concernés.
- Préférer `takeUntilDestroyed()` ou `toSignal()` pour chaque souscription ayant un cycle de vie.
- Ajouter une analyse de bundle périodique.

## 8. Accessibilité

Le lint de template inclut les règles d’accessibilité, mais il ne s’exécute pas actuellement. L’inventaire montre un effort sur les attributs ARIA, sans garantir une conformité complète.

À vérifier systématiquement :

- association `label`/`input`;
- nom accessible de tous les boutons icônes;
- ordre de focus des menus et dialogs;
- fermeture avec Échap;
- focus visible;
- annonces `aria-live` pour succès et erreurs;
- tableaux avec en-têtes et légendes adaptés;
- contraste des gris et de l’orange;
- navigation complète au clavier;
- respect de `prefers-reduced-motion`;
- langue et textes d’erreur compréhensibles.

Objectif recommandé : WCAG 2.2 niveau AA.

## 9. Configuration et déploiement

### Points corrects

- Build de production réussi.
- Hashing de sortie activé.
- En-têtes de sécurité présents.
- Rewrites SPA configurés.

### Risques

- Le frontend est actuellement en mode `local`.
- `connect-src 'self'` interdit une API externe.
- La rewrite globale vers `index.html` ne proxyfie pas réellement `/bff`.
- Aucun environnement de staging explicite n’est visible.
- Pas de pipeline CI visible dans le dépôt.

**Cible**

- Environnements local, staging et production.
- Configuration runtime injectée au déploiement.
- BFF servi sur le même domaine ou CSP/CORS configurés précisément.
- Health check backend.
- Monitoring des erreurs frontend.
- Source maps privées en production.

## 10. Plan de remédiation

### Phase 1 — Sécuriser la qualité (1 à 2 jours)

1. Réparer ESLint.
2. Ajouter une CI avec lint, tests et build.
3. Retirer `skipTests: true` comme valeur globale.
4. Définir une convention de dossiers et de nommage unique.
5. Ajouter des tests aux fonctionnalités financières existantes.

### Phase 2 — Unifier domaine et data-access (3 à 5 jours)

1. Extraire l’historique entreprise vers façade/repository.
2. Créer le repository de chargement de soldes.
3. Remplacer les montants texte par un modèle monétaire.
4. Normaliser les états `idle/loading/success/error`.
5. Distinguer fixtures locales et données de production.

### Phase 3 — Consolider le design system (4 à 7 jours)

1. Inventorier et normaliser les tokens.
2. Créer les composants PageHeader, Toolbar, SearchField, Filter, ExportActions et DataTableShell.
3. Migrer d’abord companies/restaurants, puis monitoring/audit, puis enterprise.
4. Découper les grandes pages.
5. Documenter les composants avec Storybook ou une page interne de catalogue.

### Phase 4 — Formulaires et accessibilité (3 à 5 jours)

1. Migrer les formulaires critiques vers Reactive Forms typés.
2. Centraliser messages et validateurs.
3. Tester clavier, focus, lecteur d’écran et contrastes.
4. Ajouter tests de composants.

### Phase 5 — Backend et production

1. Brancher le BFF.
2. Migrer l’authentification vers cookie sécurisé.
3. Mettre en place audit et idempotence des opérations.
4. Ajouter E2E, observabilité et staging.
5. Réaliser une revue sécurité avant mise en production.

## 11. Architecture cible

```text
src/app/
  core/
    auth/
    config/
    http/
    observability/
    routing/
  design-system/
    components/
    directives/
    tokens/
    styles/
  layouts/
    app-shell/
    auth-layout/
    page-layout/
  shared/
    pipes/
    utils/
  features/
    <feature>/
      domain/
      application/
      data-access/
      components/
      pages/
      <feature>.routes.ts
```

Règles de dépendance :

1. Une page dépend d’une façade ou d’un port applicatif.
2. Une page ne dépend jamais d’un adapter `data-access`.
3. Le domaine ne dépend pas d’Angular.
4. Seuls les adapters BFF utilisent le client HTTP.
5. Les composants du design system ignorent les règles métier.
6. Les valeurs visuelles viennent des tokens.
7. Toute opération financière est validée et persistée côté serveur.

## 12. Verdict

Le projet n’est pas « mauvais » : son socle montre déjà de bons choix d’architecture Angular. Le principal problème est l’hétérogénéité. Certaines zones ressemblent à une application d’entreprise bien structurée, tandis que d’autres restent des pages Figma autonomes avec état local et styles spécifiques.

La bonne stratégie n’est pas une réécriture totale. Il faut conserver le socle, imposer les frontières déjà conçues, consolider le design system et migrer progressivement les pages les plus risquées. La priorité absolue reste de sortir toute logique financière du navigateur avant un usage réel.
