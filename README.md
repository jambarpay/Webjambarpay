# JambaarPayAdmin

Frontend Angular 20 des portails administrateur, entreprise et restaurant de Jambaar Pay.

## Development server

Run `npm start` puis ouvrez `http://localhost:4200/`. Le proxy de développement transmet `/api/v1` à l’API Gateway sur `http://localhost:8888`.

## Sources de données

Le frontend fonctionne exclusivement en mode backend strict :

```html
<meta name="jambaar-backend-api-url" content="/api/v1">
```

Il n’existe aucun repli vers des données métier locales. Une route backend absente produit une erreur explicite. Les appels passent par le client HTTP commun, avec JWT Bearer, délai maximal, corrélation et erreurs structurées.

### Authentification backend

Le portail utilise `POST /api/v1/auth/login` et `POST /api/v1/auth/logout` via l’API Gateway. Le JWT est conservé dans `sessionStorage` pour la durée de l’onglet et ajouté uniquement aux requêtes destinées à `/api/v1`. Les rôles `ADMIN`, `ENTREPRISE` et `RESTAURANT` sont convertis vers les rôles d’interface correspondants.

## Fonctionnalités frontend encore absentes du backend

Cette section recense uniquement les fonctionnalités déjà représentées dans l’interface Angular mais qui ne disposent pas encore d’un contrat backend complet.

### Authentification et sessions

Le login et le logout par JWT sont maintenant disponibles. Les contrats suivants restent à fournir pour une session de production complète :

- `POST /api/v1/auth/refresh` avec rotation du refresh token ;
- `GET /api/v1/auth/session` ou `GET /api/v1/auth/me` ;
- cookie de session `HttpOnly`, `Secure` et `SameSite` ;
- récupération et modification du mot de passe ;
- autorisation des routes côté backend selon le rôle connecté.

Le `user-service` conserve également son parcours d’inscription par téléphone et OTP.

### Inscription et gestion des entreprises

Le frontend possède des écrans d’inscription, de création, de consultation et d’import d’entreprises. Il attend un vrai domaine entreprise avec :

- création et modification d’une entreprise ;
- nom, secteur d’activité, NINEA/RCCM, adresse et effectif ;
- responsable, email et téléphone de contact ;
- activation et suspension ;
- association entre l’entreprise, son responsable et ses salariés ;
- effectif et solde total calculés par le backend.

La liste actuelle repose sur les utilisateurs ayant le rôle `ENTREPRISE`, ce qui ne permet pas de fournir toutes les informations affichées par l’interface.

### Gestion des salariés

La création d’un salarié existe dans le `user-service` avec son prénom, son nom et son téléphone. Les informations et relations suivantes manquent encore :

- email, poste et adresse ;
- identifiant de l’entreprise employeuse ;
- liste des salariés limitée à l’entreprise connectée ;
- consultation du salarié avec son portefeuille et son entreprise.

### Audit

Le frontend utilise `GET /api/v1/payments/admin/audit-logs` pour le journal des paiements. Un audit transverse reste nécessaire pour couvrir :

- enregistrement des connexions, changements de statut, créations, modifications et opérations sensibles ;
- pagination et filtres sur l’ensemble des événements interservices.

### Paramètres de la plateforme

L’écran administrateur attend :

- `GET /api/v1/settings/platform` ;
- `PUT /api/v1/settings/platform` ;
- nom de la plateforme, adresse et téléphone du support ;
- montant maximum d’une transaction et quota journalier.

### Dashboards et statistiques

Les trois espaces affichent des indicateurs qui nécessitent encore des agrégations backend :

- dashboard administrateur : entreprises actives, restaurants actifs, volumes et transactions ;
- dashboard entreprise : salariés, soldes, consommation et évolution mensuelle ;
- dashboard restaurant : encaissements, volumes, paiements récents et entreprises partenaires ;
- statistiques par période, statut, entreprise et restaurant ;
- noms métier associés aux identifiants présents dans les transactions.

### QR marchand et points de vente

Le backend sait déjà générer un QR marchand, mais le frontend ne peut pas encore retrouver le QR à afficher pour le restaurant connecté. Il manque un contrat permettant de :

- lister les points de vente d’un restaurant ;
- récupérer le point de vente actif ;
- récupérer ou régénérer le QR marchand courant ;
- obtenir la référence et l’image du QR à afficher dans le dashboard restaurant.

### Paramètres du restaurant

Le frontend permet de saisir ou d’afficher des informations qui ne sont pas encore persistées par le backend :

- nom du responsable et email ;
- changement du mot de passe ;
- activation des alertes de paiement ;
- activation du son de confirmation ;
- entreprises partenaires du restaurant.

### Notifications

Le frontend annonce l’envoi d’identifiants ou de confirmations lors de certaines inscriptions. Le backend référence un `notification-service`, mais ce service n’est pas présent dans les microservices disponibles. Il reste à fournir pour les OTP WhatsApp, créations de comptes et notifications métier.

## Wallet et paiement déjà intégrés

Les contrats backend déjà disponibles couvrent notamment :

- création et consultation des portefeuilles ;
- consultation d’un portefeuille par propriétaire ;
- recharge individuelle ;
- transfert entre portefeuilles ;
- paiement par QR ;
- consultation d’une transaction par identifiant ;
- consultation des traces d’audit d’un paiement.

Le backend ne fournit pas encore la recharge groupée ni la liste paginée et filtrable des transactions. Le frontend désactive explicitement ces fonctions au lieu d’orchestrer des opérations financières dans le navigateur.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `npm run build`. Les fichiers sont générés dans `dist/jambaar-pay-admin/browser`.

## Running unit tests

Run `npm run test:ci` pour les tests Karma avec couverture.

## Running end-to-end tests

Run `npm run e2e` pour les scénarios Playwright desktop et mobile.

## Quality checks

Run `npm run check` pour exécuter lint, tests unitaires, build de production et E2E. La même chaîne est exécutée par GitHub Actions sur chaque push et pull request vers `main`.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# Webjambarpay
