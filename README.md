# JambaarPayAdmin

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.17.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Sources de données

Les données mockées restent le mode par défaut :

```html
<meta name="jambaar-data-source" content="local">
```

Trois modes sont disponibles dans `src/index.html` :

- `local` : jeux de données de démonstration conservés dans le navigateur ;
- `bff` : contrats historiques sous `/bff` ;
- `backend` : contrats directs des microservices Java sous `/api/v1`.

Pour charger les restaurants du backend :

```html
<meta name="jambaar-data-source" content="backend">
<meta name="jambaar-backend-api-url" content="http://localhost:8080/api/v1">
```

Le mode backend aligne la liste et la création des restaurants sur `RestaurantResponse` et `CreateRestaurantRequest`. Les entreprises, l'audit, les paramètres, l'authentification administrateur et le monitoring restent en local, car aucun endpoint correspondant n'existe encore dans les microservices.

La gateway présente dans le dépôt doit conserver les chemins `/api/v1/...` et autoriser l'origine Angular avant qu'un test bout en bout soit possible.

## Types de partenaires

La création et la modification dans `/restaurants` proposent un choix de type :
Restaurant, Boutique, Supermarché ou Marché. La catégorie apparaît dans la liste
et les détails et est envoyée au serveur dans `partnerType` : `RESTAURANT`, `SHOP`,
`SUPERMARKET`, `MARKET`. Les partenaires existants restent des restaurants par
défaut. Il s’agit d’une classification d’affichage pour les filtres du mobile :
le statut, le propriétaire, les permissions et le paiement ne changent pas.

Le formulaire public `/register?type=restaurant`, accessible depuis « Devenir
partenaire », utilise deux étapes : catégorie, puis coordonnées et accès au compte.
Le choix peut être modifié sans perdre les champs saisis. La catégorie est
transmise dans `partnerType` à `POST /api/v1/auth/register/organization` avec le
rôle technique `RESTAURANT` inchangé ; `user-service` la transmet au profil
marchand de `restaurant-service`. L’inscription entreprise reste indépendante.

Déployer d’abord `restaurant_service` avec Flyway activé et la migration
`V4__add_partner_type.sql`, puis `user-service`, puis ce Web et le mobile. Aucun nouveau secret ni
variable d’environnement n’est nécessaire. Les tests navigateur de
`e2e/partner-categories.spec.ts` simulent toutes les API : création, modification,
conservation après rechargement et refus serveur, sur ordinateur et mobile.
Les tests `e2e/public-partner-registration.spec.ts` couvrent aussi le formulaire
public, les quatre catégories, le changement de sélection, la validation et les
erreurs serveur. Les appels API sont entièrement simulés.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.

# Webjambarpay
