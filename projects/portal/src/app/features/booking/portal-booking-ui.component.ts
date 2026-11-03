import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { telHref } from '@portal/app/shared/format/portal-labels';

/** Talep özeti satırı (bitti ekranı). */
export interface PortalBookingSummaryItem {
    readonly icon: string;
    readonly label: string;
    readonly value: string;
}

/**
 * Talep akışının numaralı adım kartı: başta numara rozeti, tamamlanınca onay işareti ve seçimin özeti. İçerik projeksiyonla
 * gelir; adımlar aynı sayfada sırayla açılır.
 */
@Component({
    selector: 'portal-booking-step',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .step-head {
            display: flex;
            align-items: flex-start;
            gap: 0.75rem;
        }
        .step-badge {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 0 0 auto;
            width: 2rem;
            height: 2rem;
            border-radius: 999px;
            background: var(--vetinity-navy);
            color: #fff;
            font-weight: 700;
            font-size: 0.9375rem;
        }
        .step-badge.is-done {
            background: #0b6f69;
        }
        .step-titles {
            display: flex;
            flex-direction: column;
            gap: 0.125rem;
            min-width: 0;
            padding-top: 0.25rem;
        }
        .step-summary {
            margin: 0;
            color: #0b5f5a;
            font-size: 0.9375rem;
            font-weight: 500;
            overflow-wrap: anywhere;
        }
    `,
    template: `
        <section class="portal-card portal-stack" [attr.aria-labelledby]="headingId()">
            <header class="step-head">
                <span class="step-badge" [class.is-done]="done()" aria-hidden="true">
                    @if (done()) {
                        <i class="fa-solid fa-check"></i>
                    } @else {
                        {{ step() }}
                    }
                </span>
                <div class="step-titles">
                    <h2 class="portal-subtitle" [id]="headingId()">
                        <span class="sr-only">{{ step() }}. adım{{ done() ? ' (tamamlandı)' : '' }}: </span>{{ title() }}
                    </h2>
                    @if (summary(); as text) {
                        <p class="step-summary" data-testid="step-summary">{{ text }}</p>
                    }
                </div>
            </header>
            <ng-content />
        </section>
    `
})
export class PortalBookingStep {
    readonly step = input.required<number>();
    readonly title = input.required<string>();
    readonly headingId = input.required<string>();
    readonly done = input(false);
    readonly summary = input<string | null>(null);
}

/** "Nasıl işler?" şeridi: talep klinik onayıyla kesinleşir (ADR-042 K3, "kesin randevu değil" açıkça söylenir). */
@Component({
    selector: 'portal-booking-how',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        ol {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 0.5rem;
            margin: 0;
            padding: 0;
            list-style: none;
        }
        li {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.375rem;
            padding: 0.75rem 0.375rem;
            border-radius: 0.75rem;
            background: var(--vetinity-bg-soft);
            color: var(--vetinity-navy);
            font-size: 0.8125rem;
            font-weight: 500;
            line-height: 1.3;
            text-align: center;
        }
        i {
            font-size: 1.125rem;
            color: #0b6f69;
        }
    `,
    template: `
        <ol aria-label="Nasıl işler?">
            <li><i class="fa-solid fa-calendar-check" aria-hidden="true"></i>Saati seçin</li>
            <li><i class="fa-solid fa-user-doctor" aria-hidden="true"></i>Klinik onaylar</li>
            <li><i class="fa-solid fa-envelope-open-text" aria-hidden="true"></i>E-posta gelir</li>
        </ol>
    `
})
export class PortalBookingHow {}

/**
 * Talep gönderildi ekranı (bağlantı ve oturumlu talep ortak): özet, "kesin randevu değil" uyarısı, sıradaki adımlar ve
 * klinik telefonu. Eylem bağlantıları projeksiyonla gelir.
 */
@Component({
    selector: 'portal-booking-done',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .done-head {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 0.5rem;
            text-align: center;
        }
        .done-icon {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 3.5rem;
            height: 3.5rem;
            border-radius: 999px;
            background: var(--vetinity-bg-soft);
            color: #0b6f69;
            font-size: 1.5rem;
        }
        dl {
            margin: 0;
            border-radius: 0.75rem;
            background: #f8fafc;
            padding: 0.25rem 0.875rem;
        }
        dl > div {
            display: flex;
            align-items: baseline;
            gap: 0.625rem;
            padding: 0.5rem 0;
        }
        dl > div + div {
            border-top: 1px solid var(--portal-border);
        }
        dt {
            flex: 0 0 auto;
            color: var(--portal-text-muted);
            font-size: 0.875rem;
        }
        dt i {
            width: 1.25rem;
            color: #0b6f69;
        }
        dd {
            margin: 0 0 0 auto;
            font-weight: 600;
            text-align: right;
            overflow-wrap: anywhere;
        }
        ol {
            display: grid;
            gap: 0.375rem;
            margin: 0;
            padding-left: 1.25rem;
            list-style: decimal;
            font-size: 0.9375rem;
        }
        li::marker {
            color: #0b6f69;
            font-weight: 700;
        }
        .done-phone {
            white-space: nowrap;
        }
    `,
    template: `
        <section class="portal-card portal-stack" role="status" aria-labelledby="booking-done-title">
            <div class="done-head">
                <span class="done-icon" aria-hidden="true"><i class="fa-solid fa-paper-plane"></i></span>
                @if (pageTitle()) {
                    <h1 id="booking-done-title" class="portal-title">Talebiniz alındı</h1>
                } @else {
                    <h2 id="booking-done-title" class="portal-title">Talebiniz alındı</h2>
                }
                <p class="portal-muted">Bu bir <strong>randevu talebidir, kesin randevu değildir.</strong></p>
            </div>
            <dl>
                @for (item of items(); track item.label) {
                    <div>
                        <dt><i class="fa-solid" [class]="item.icon" aria-hidden="true"></i> {{ item.label }}</dt>
                        <dd>{{ item.value }}</dd>
                    </div>
                }
            </dl>
            <div class="portal-stack">
                <h3 class="portal-subtitle">Sırada ne var?</h3>
                <ol>
                    <li>{{ clinicName() || 'Klinik' }} talebinizi inceler.</li>
                    <li>
                        Onaylandığında ya da klinik farklı bir saat verdiğinde
                        @if (email()) {
                            <strong>{{ email() }}</strong> adresine
                        }
                        e-posta gelir.
                    </li>
                    <li>Randevu ancak klinik onayından sonra kesinleşir.</li>
                </ol>
            </div>
            @if (phoneHref(); as href) {
                <p class="portal-muted">Sorunuz varsa kliniği arayın: <a class="done-phone" [href]="href">{{ clinicPhone() }}</a></p>
            }
            <ng-content />
        </section>
    `
})
export class PortalBookingDone {
    readonly items = input.required<readonly PortalBookingSummaryItem[]>();
    readonly clinicName = input<string | null>(null);
    readonly clinicPhone = input<string | null>(null);
    readonly email = input<string | null>(null);
    /** Kabuksuz sayfada (bağlantı) başlık sayfanın tek `h1`'idir. */
    readonly pageTitle = input(false);

    readonly phoneHref = computed(() => telHref(this.clinicPhone()));
}
