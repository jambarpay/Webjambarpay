import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

interface PageSeo {
  readonly title: string;
  readonly description: string;
  readonly type?: 'website' | 'article';
}

const SITE_NAME = 'Jambaar Pay';
const DEFAULT_DESCRIPTION =
  'Jambaar Pay, fintech sénégalaise, simplifie le paiement des repas et le suivi des indemnités de vos équipes pour les entreprises et les restaurants.';

const PUBLIC_PAGES: Readonly<Record<string, PageSeo>> = {
  '/': {
    title: 'Jambaar Pay | Paiement et indemnités repas au Sénégal',
    description: DEFAULT_DESCRIPTION,
  },
  '/fonctionnalites': {
    title: 'Fonctionnalités | Paiement QR et gestion des salariés',
    description:
      'Gérez les salariés, chargez les soldes, encaissez par QR et exportez vos transactions depuis un portail unique avec Jambaar Pay.',
  },
  '/espaces': {
    title: 'Espaces entreprise et restaurant | Jambaar Pay',
    description:
      'Découvrez les espaces connectés de Jambaar Pay pour les entreprises, les restaurants et les administrateurs au Sénégal.',
  },
  '/securite': {
    title: 'Sécurité des paiements | Jambaar Pay',
    description:
      'Paiements traçables, authentification contrôlée et prévention des doublons : découvrez la sécurité de la plateforme Jambaar Pay.',
  },
  '/forfaits': {
    title: 'Forfaits et offres entreprise | Jambaar Pay',
    description:
      'Choisissez une offre Jambaar Pay adaptée à la taille de votre équipe, à vos volumes de paiement et à votre niveau d’accompagnement.',
  },
  '/a-propos': {
    title: 'À propos de Jambaar Pay | Fintech sénégalaise',
    description:
      'Jambaar Pay est une solution sénégalaise qui relie entreprises, salariés et restaurants autour d’un paiement simple et traçable.',
  },
};

const PRIVATE_PATHS = new Set(['/login', '/register']);

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly document = inject(DOCUMENT);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly router = inject(Router);

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe(event => this.update(event.urlAfterRedirects));

    this.update(this.router.url);
  }

  private update(url: string): void {
    const path = this.getPath(url);
    const page = PUBLIC_PAGES[path];
    const isPublic = page !== undefined;
    const canonicalUrl = this.getCanonicalUrl(path);
    const title = page?.title ?? (PRIVATE_PATHS.has(path) ? `Accès sécurisé | ${SITE_NAME}` : SITE_NAME);
    const description = page?.description ?? DEFAULT_DESCRIPTION;
    const robots = isPublic ? 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1' : 'noindex, nofollow';
    const imageUrl = new URL('assets/images/landing-dashboard-preview.png', this.document.baseURI).href;

    this.title.setTitle(title);
    this.meta.updateTag({ name: 'description', content: description });
    this.meta.updateTag({ name: 'robots', content: robots });
    this.meta.updateTag({ name: 'author', content: SITE_NAME });
    this.meta.updateTag({ property: 'og:title', content: title });
    this.meta.updateTag({ property: 'og:description', content: description });
    this.meta.updateTag({ property: 'og:url', content: canonicalUrl });
    this.meta.updateTag({ property: 'og:type', content: page?.type ?? 'website' });
    this.meta.updateTag({ property: 'og:image', content: imageUrl });
    this.meta.updateTag({ property: 'og:image:alt', content: 'Tableau de bord Jambaar Pay' });
    this.meta.updateTag({ name: 'twitter:title', content: title });
    this.meta.updateTag({ name: 'twitter:description', content: description });
    this.meta.updateTag({ name: 'twitter:image', content: imageUrl });
    this.meta.updateTag({ name: 'twitter:image:alt', content: 'Tableau de bord Jambaar Pay' });

    this.setCanonical(canonicalUrl);
    this.setAlternate('fr-SN', canonicalUrl);
    this.setAlternate('x-default', canonicalUrl);
    this.setStructuredData(path, title, description, canonicalUrl, imageUrl, isPublic);
  }

  private getPath(url: string): string {
    const path = url.split('?')[0].split('#')[0].replace(/\/+$/, '');
    return path || '/';
  }

  private getCanonicalUrl(path: string): string {
    return new URL(path === '/' ? '/' : path, this.document.baseURI).href;
  }

  private setCanonical(url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }

  private setAlternate(hreflang: string, url: string): void {
    let link = this.document.head.querySelector<HTMLLinkElement>(`link[rel="alternate"][hreflang="${hreflang}"]`);

    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'alternate');
      link.setAttribute('hreflang', hreflang);
      this.document.head.appendChild(link);
    }

    link.setAttribute('href', url);
  }

  private setStructuredData(
    path: string,
    title: string,
    description: string,
    canonicalUrl: string,
    imageUrl: string,
    isPublic: boolean,
  ): void {
    let script = this.document.head.querySelector<HTMLScriptElement>('script[data-jambaar-seo]');

    if (!script) {
      script = this.document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-jambaar-seo', 'true');
      this.document.head.appendChild(script);
    }

    if (!isPublic) {
      script.textContent = '{}';
      return;
    }

    script.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'Organization',
          '@id': `${new URL('/', this.document.baseURI).href}#organization`,
          name: SITE_NAME,
          url: new URL('/', this.document.baseURI).href,
          logo: imageUrl,
          areaServed: { '@type': 'Country', name: 'Sénégal' },
          contactPoint: {
            '@type': 'ContactPoint',
            contactType: 'customer support',
            email: 'support@jambaarpay.com',
            availableLanguage: ['fr'],
          },
        },
        {
          '@type': 'SoftwareApplication',
          name: SITE_NAME,
          applicationCategory: 'FinanceApplication',
          operatingSystem: 'Web',
          description: DEFAULT_DESCRIPTION,
          image: imageUrl,
          url: new URL('/', this.document.baseURI).href,
          areaServed: { '@type': 'Country', name: 'Sénégal' },
          publisher: { '@id': `${new URL('/', this.document.baseURI).href}#organization` },
        },
        {
          '@type': 'WebPage',
          '@id': `${canonicalUrl}#webpage`,
          url: canonicalUrl,
          name: title,
          description,
          isPartOf: { '@id': `${new URL('/', this.document.baseURI).href}#website` },
          inLanguage: 'fr-SN',
        },
        {
          '@type': 'WebSite',
          '@id': `${new URL('/', this.document.baseURI).href}#website`,
          url: new URL('/', this.document.baseURI).href,
          name: SITE_NAME,
          inLanguage: 'fr-SN',
        },
      ],
      ...(path === '/' ? { keywords: 'paiement Sénégal, indemnité repas, paiement QR, fintech Sénégal' } : {}),
    });
  }
}
