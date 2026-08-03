import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';


type StatusType = 'Validé' | 'En cours' | 'En attente' | 'Échoué' | 'Actif' | 'Inactif' | 'Suspendu';

@Component({
    selector: 'app-status-badge',
    imports: [],
    template: `<span [class]="'status-badge ' + badgeClass()">{{ status() }}</span>`,
    styleUrl: './status-badge.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatusBadgeComponent {
  readonly status = input<StatusType>('Actif');

  readonly badgeClass = computed(() => {
    const map: Record<StatusType, string> = {
      'Validé':     'badge-valid',
      'En cours':   'badge-pending',
      'En attente': 'badge-pending',
      'Échoué':     'badge-failed',
      'Actif':      'badge-active',
      'Inactif':    'badge-inactive',
      'Suspendu':   'badge-inactive',
    };
    return map[this.status()] ?? 'badge-inactive';
  });
}
