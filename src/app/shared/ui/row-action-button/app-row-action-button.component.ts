import { Component, computed, input, output } from '@angular/core';
import { Params, RouterLink } from '@angular/router';
import { TooltipModule } from 'primeng/tooltip';

export type RowActionKind = 'detail' | 'edit' | 'delete' | 'void';

/** Satır eylemi türünün simgesi ve varsayılan Türkçe etiketi; Font Awesome Solid (ADR-026). */
export const ROW_ACTIONS: Readonly<Record<RowActionKind, { readonly icon: string; readonly label: string; readonly danger: boolean }>> = {
    detail: { icon: 'fa-eye', label: 'Detay', danger: false },
    edit: { icon: 'fa-pen-to-square', label: 'Düzenle', danger: false },
    delete: { icon: 'fa-trash-can', label: 'Sil', danger: true },
    void: { icon: 'fa-ban', label: 'İptal et', danger: true }
};

/**
 * Liste satırı eylem simge düğmesi (ADR-026): metin yerine dolu simge, `aria-label` ve ipucu taşır.
 * `link` verilirse bağlantı, verilmezse `pressed` yayan düğmedir. Sil/İptal tehlike rengindedir.
 * Devre dışı düğme `aria-disabled` ile işaretlenir; böylece ipucu (örn. "salt okunur") yine görünür.
 */
@Component({
    selector: 'app-row-action-button',
    standalone: true,
    imports: [RouterLink, TooltipModule],
    template: `
        @if (link() && !inactive()) {
            <a
                [routerLink]="link()"
                [queryParams]="queryParams()"
                class="row-action-button"
                [class.row-action-button--danger]="danger()"
                [attr.aria-label]="text()"
                [pTooltip]="text()"
                tooltipPosition="top"
                [attr.data-testid]="testId()"
            >
                <i [class]="iconClass()" aria-hidden="true"></i>
            </a>
        } @else {
            <button
                type="button"
                class="row-action-button"
                [class.row-action-button--danger]="danger()"
                [attr.aria-disabled]="inactive() || null"
                [attr.aria-busy]="loading() || null"
                [attr.aria-label]="text()"
                [pTooltip]="text()"
                tooltipPosition="top"
                [attr.data-testid]="testId()"
                (click)="press()"
            >
                <i [class]="iconClass()" aria-hidden="true"></i>
            </button>
        }
    `,
    styles: `
        :host {
            display: inline-flex;
        }

        .row-action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 32px; // ADR-026: en az 32 px; rem ile 14 px kökte 31,98 px oluyordu
            height: 32px;
            padding: 0;
            border: 0;
            border-radius: var(--content-border-radius);
            background: transparent;
            color: var(--text-color-secondary);
            font-size: 1rem; // 14 px: menü simgeleriyle aynı (ADR-023)
            line-height: 1;
            cursor: pointer;
            text-decoration: none;
            transition:
                background-color var(--element-transition-duration),
                color var(--element-transition-duration);

            &:hover:not([aria-disabled='true']) {
                background-color: var(--surface-hover);
                color: var(--text-color);
            }

            &:focus-visible {
                outline: 2px solid var(--primary-color);
                outline-offset: -2px;
            }

            &[aria-disabled='true'] {
                opacity: 0.5;
                cursor: default;
            }

            @media (pointer: coarse) {
                width: 40px; // dokunmatik
                height: 40px;
            }
        }

        .row-action-button--danger {
            color: var(--p-red-600);

            &:hover:not([aria-disabled='true']) {
                background-color: color-mix(in srgb, var(--p-red-500) 12%, transparent);
                color: var(--p-red-700);
            }

            :host-context(.app-dark) & {
                color: var(--p-red-400);

                &:hover:not([aria-disabled='true']) {
                    background-color: color-mix(in srgb, var(--p-red-400) 16%, transparent);
                    color: var(--p-red-300);
                }
            }
        }
    `
})
export class AppRowActionButtonComponent {
    readonly action = input.required<RowActionKind>();
    /** Varsayılan etiket yerine alana özgü ad (örn. "Düzelt", "Taslağı sil"); simge türü değişmez. */
    readonly label = input<string>();
    readonly link = input<string | readonly unknown[]>();
    readonly queryParams = input<Params>();
    /** Bağlantı da devre dışıyken düğme olarak çizilir ve yönlendirmez. */
    readonly disabled = input(false);
    /** Satır işlemi sürerken simge döner ve düğme basılamaz. */
    readonly loading = input(false);
    readonly testId = input<string>();
    readonly pressed = output<void>();

    private readonly spec = computed(() => ROW_ACTIONS[this.action()]);
    protected readonly text = computed(() => this.label() ?? this.spec().label);
    protected readonly iconClass = computed(() => `fa-solid fa-fw ${this.loading() ? 'fa-spinner fa-spin' : this.spec().icon}`);
    protected readonly inactive = computed(() => this.disabled() || this.loading());
    protected readonly danger = computed(() => this.spec().danger);

    protected press(): void {
        if (!this.inactive()) {
            this.pressed.emit();
        }
    }
}
