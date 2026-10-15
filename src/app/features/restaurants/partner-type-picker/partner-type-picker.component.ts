import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { PARTNER_TYPES, PartnerType } from '../domain/restaurant.model';

@Component({
  selector: 'app-partner-type-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="partner-types" [disabled]="disabled()">
      <legend>Type de partenaire</legend>
      <div class="type-grid">
        @for (type of types; track type.value) {
          <label class="type-card" [class.selected]="value() === type.value" [for]="name() + '-' + type.value">
            <input type="radio" [id]="name() + '-' + type.value" [name]="name()" [value]="type.value"
              [checked]="value() === type.value" (change)="valueChange.emit(type.value)" />
            <i [class]="type.icon" aria-hidden="true"></i>
            <strong>{{ type.label }}</strong>
            <span>{{ type.description }}</span>
            @if (value() === type.value) { <small>✓ Sélectionné</small> }
          </label>
        }
      </div>
      <p>Cette catégorie permet aux salariés de filtrer les partenaires dans l’application.
        Le fonctionnement du paiement reste identique.</p>
    </fieldset>
  `,
  styles: `
    :host { display: block; margin-bottom: 1.5rem; }
    .partner-types { margin: 0; padding: 0; border: 0; min-width: 0; }
    legend { margin-bottom: .75rem; color: #17182f; font-size: 1rem; font-weight: 700; }
    .type-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; }
    .type-card { position: relative; display: flex; flex-direction: column; align-items: center;
      justify-content: center; gap: .5rem; padding: 1.25rem .75rem; min-height: 9rem;
      border: 2px solid #e4e5eb; border-radius: 1rem; background: white; color: #17182f;
      text-align: center; cursor: pointer; }
    .type-card.selected { border-color: #ff6b3d; background: #17182f; color: white; }
    .type-card:focus-within { outline: 3px solid #ff6b3d; outline-offset: 3px; }
    input { position: absolute; top: .75rem; right: .75rem; accent-color: #ff6b3d; }
    i { color: #ff6b3d; font-size: 1.75rem; }
    strong { font-size: 1rem; }
    span { font-size: .8rem; opacity: .8; }
    small { padding: .25rem .65rem; background: #ff6b3d; color: white; border-radius: 1rem; }
    p { margin: .75rem 0 0; font-size: .8rem; line-height: 1.5; color: #747681; }
    fieldset:disabled .type-card { cursor: wait; opacity: .65; }
    @media (max-width: 340px) { .type-grid { grid-template-columns: 1fr; } }
  `,
})
export class PartnerTypePickerComponent {
  readonly value = input<PartnerType>('RESTAURANT');
  readonly disabled = input(false);
  readonly name = input('partnerType');
  readonly valueChange = output<PartnerType>();
  readonly types = PARTNER_TYPES;
}
