import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';


@Component({
    selector: 'app-kpi-card',
    imports: [],
    templateUrl: './kpi-card.component.html',
    styleUrls: ['./kpi-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class KpiCardComponent {
  readonly label = input('');
  readonly value = input<number | string>(0);
  readonly change = input(0);
  readonly changeLabel = input('');
  readonly helper = input('');
  readonly unit = input('');
  readonly icon = input('pi pi-chart-line');
  readonly iconSrc = input('');

  readonly displayChange = computed(() => this.changeLabel() || `${this.change()}%`);
}
