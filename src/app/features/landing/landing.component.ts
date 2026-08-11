import { DOCUMENT } from '@angular/common';
import { AfterViewInit, ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

interface PortalCard {
  readonly title: string;
  readonly description: string;
  readonly icon: string;
}

interface PortalStat {
  readonly value: string;
  readonly label: string;
}

interface FooterColumn {
  readonly title: string;
  readonly links: readonly LandingLink[];
}

interface LandingLink {
  readonly label: string;
  readonly route: string;
}

interface PricingPlan {
  readonly name: string;
  readonly audience: string;
  readonly description: string;
  readonly monthlyPrice: string;
  readonly features: readonly string[];
  readonly featured?: boolean;
  readonly amount: number;
}

@Component({
  selector: 'app-landing',
  imports: [RouterLink],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'landing-page',
  },
})
export class LandingComponent implements AfterViewInit {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly paymentMessage = signal('');

  readonly benefits: readonly PortalCard[] = [
    {
      title: 'Gérez vos salariés',
      description: 'Ajoutez vos collaborateurs, chargez leurs soldes et suivez leurs opérations depuis l’espace entreprise.',
      icon: '↗',
    },
    {
      title: 'Encaissez par QR',
      description: 'Le restaurant enregistre rapidement le paiement via son QR fixe lié à son numéro de téléphone.',
      icon: '◉',
    },
    {
      title: 'Suivez et exportez',
      description: 'Consultez les historiques, filtrez les transactions et exportez les données en CSV ou PDF.',
      icon: '▥',
    },
  ];

  readonly stats: readonly PortalStat[] = [
    { value: '3', label: 'Espaces métiers' },
    { value: 'QR', label: 'Paiement restaurant' },
    { value: 'CSV + PDF', label: 'Exports disponibles' },
    { value: 'Temps réel', label: 'Monitoring des flux' },
  ];

  readonly partners: readonly string[] = ['Administration centrale', 'Espace entreprise', 'Espace restaurant'];

  readonly securityItems: readonly string[] = [
    'Authentification JWT',
    'Accès contrôlé par rôle',
    'Anti-doublon et idempotence',
    'Journal d’audit',
  ];

  readonly pricingPlans: readonly PricingPlan[] = [
    {
      name: 'Essentiel',
      audience: 'Petites équipes',
      description: 'Pour démarrer simplement la gestion des repas de vos salariés.',
      monthlyPrice: '75 000',
      amount: 75000,
      features: ['Gestion des salariés', 'Chargement des soldes', 'Historique des transactions'],
    },
    {
      name: 'Entreprise',
      audience: 'Équipes en croissance',
      description: 'Pour piloter les paiements et les données de plusieurs équipes.',
      monthlyPrice: '150 000',
      amount: 150000,
      features: ['Toutes les fonctions Essentiel', 'Exports CSV et PDF', 'Suivi et reporting avancés'],
      featured: true,
    },
    {
      name: 'Sur mesure',
      audience: 'Grandes organisations',
      description: 'Un accompagnement adapté à vos volumes et à votre organisation.',
      monthlyPrice: '250 000',
      amount: 250000,
      features: ['Configuration personnalisée', 'Accompagnement au déploiement', 'Support dédié'],
    },
  ];

  readonly footerColumns: readonly FooterColumn[] = [
    {
      title: 'Produit',
      links: [
        { label: 'Gestion des salariés', route: '/fonctionnalites' },
        { label: 'Paiement QR', route: '/fonctionnalites' },
        { label: 'Monitoring', route: '/fonctionnalites' },
        { label: 'Exports', route: '/fonctionnalites' },
      ],
    },
    {
      title: 'Entreprise',
      links: [
        { label: 'Entreprises', route: '/espaces' },
        { label: 'Restaurants', route: '/espaces' },
        { label: 'Administrateurs', route: '/espaces' },
        { label: 'Contact', route: '/a-propos' },
      ],
    },
    {
      title: 'Support',
      links: [
        { label: 'Connexion', route: '/login' },
        { label: 'Créer un compte', route: '/register' },
        { label: 'Sécurité', route: '/securite' },
        { label: 'Mentions légales', route: '/a-propos' },
      ],
    },
  ];

  ngAfterViewInit(): void {
    const sectionId = this.route.snapshot.data['landingSection'] as string | undefined;
    const target = sectionId ? this.document.getElementById(sectionId) : null;

    if (target) {
      target.scrollIntoView({ block: 'start' });
    }
    if (this.route.snapshot.queryParamMap.get('status') === 'success') {
      this.paymentMessage.set('Paiement reçu. Votre demande d’activation est en cours de vérification.');
    }
  }

  startPlanRegistration(plan: PricingPlan): void {
    sessionStorage.setItem('jp_pending_subscription_plan', JSON.stringify({
      name: plan.name,
      amount: plan.amount,
    }));
    void this.router.navigate(['/register'], { queryParams: { plan: plan.name } });
  }
}
