# JambaarPayAdmin

Frontend Angular 20 des portails administrateur, entreprise et restaurant de Jambaar Pay.

## Development server

Run `npm start` puis ouvrez `http://localhost:4200/`. Le proxy de développement transmet `/api/v1` à l’API Gateway sur `http://localhost:8080`.

## Sources de données

Le frontend fonctionne exclusivement en mode backend strict :

```html
<meta name="jambaar-backend-api-url" content="/api/v1">
```

Il n’existe aucun repli vers des données métier locales. Une route backend absente produit une erreur explicite. Les appels passent par le client HTTP commun, avec cookies, délai maximal, corrélation et erreurs structurées.

### Accès de démonstration temporaires

En attendant l’endpoint de connexion backend, trois sessions UI temporaires permettent de parcourir les espaces :

- `admin@jambaarpay.com` / `Admin@1234` ;
- `entreprise@jambaarpay.com` / `Entreprise@1234` ;
- `restaurant@jambaarpay.com` / `Restaurant@1234`.

Ces comptes ne créent aucun jeton et n’accordent aucun droit dans les microservices. Les opérations métier restent soumises à l’authentification et aux autorisations du backend. Supprimer `TemporaryDemoAuthRepository` dès que l’authentification par cookie `HttpOnly` est disponible.

Contrats backend encore requis pour rendre tous les écrans opérationnels :

- `POST /api/v1/auth/login` et `POST /api/v1/auth/logout` avec cookie `HttpOnly` ;
- création et modification d’une entreprise ;
- `/api/v1/audit/logs` ;
- `/api/v1/settings/platform` ;
- génération du QR marchand avec accès au point de vente du restaurant.

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
