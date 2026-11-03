import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import type { PortalBookingReason } from './portal-booking.api';
import { NOTE_REQUIRED_MESSAGE, PORTAL_BOOKING_LIMITS, reasonKey } from './portal-booking.rules';

/**
 * Talep akışının 1. adımı (oturumlu talep ve kliniğe özel bağlantı ortak, ADR-042 eki): başta acil durum uyarısı ve klinik
 * telefonu, neden listesi (sonda her zaman "Diğer / emin değilim"), hemen altında not. Not "Diğer"de zorunludur; kural
 * sunucudan (`requiresNote`) gelir, doğrulayıcıyı üst bileşen nedene göre kurar.
 */
@Component({
    selector: 'portal-booking-reason-step',
    standalone: true,
    imports: [ReactiveFormsModule, MessageModule, TextareaModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-field textarea {
            width: 100%;
            font-size: 1rem;
        }
    `,
    template: `
        <section class="portal-card portal-stack" [attr.aria-labelledby]="idPrefix() + '-reason-title'">
            <p-message severity="warn" data-testid="booking-urgent">
                <span>
                    <strong>Acil durum mu?</strong> Online talep kliniğin onayını bekler.
                    @if (telHref(); as href) {
                        Acil durumda hemen arayın: <a [href]="href">{{ clinicPhone() }}</a>
                    } @else {
                        Acil durumda kliniği hemen arayın.
                    }
                </span>
            </p-message>

            <h2 [id]="idPrefix() + '-reason-title'" class="portal-subtitle">1. Ne için geliyorsunuz?</h2>
            <fieldset class="portal-choice">
                <legend class="sr-only">Randevu nedeni</legend>
                @for (reason of reasons(); track key(reason)) {
                    <label class="portal-check">
                        <input type="radio" [name]="idPrefix() + '-reason'" [value]="key(reason)" [checked]="selectedKey() === key(reason)" (change)="selectedChange.emit(key(reason))" />
                        <span>
                            {{ reason.name }}
                            <span class="portal-field-hint">
                                Yaklaşık {{ reason.durationMinutes }} dk
                                @if (reason.requiresNote) {
                                    · Ne için geldiğinizi aşağıya yazın
                                }
                            </span>
                        </span>
                    </label>
                }
            </fieldset>

            <div class="portal-field">
                <label [for]="idPrefix() + '-note'">{{ noteRequired() ? 'Kısaca ne için geliyorsunuz?' : 'Not (isteğe bağlı)' }}</label>
                <textarea
                    pTextarea
                    [id]="idPrefix() + '-note'"
                    rows="3"
                    [formControl]="note()"
                    [attr.maxlength]="limits.note"
                    [attr.aria-invalid]="!!noteError()"
                    data-testid="booking-note"
                ></textarea>
                <p class="portal-field-hint">Şikâyet, belirti ya da istediğiniz işlem; klinik talebi buna göre değerlendirir.</p>
                @if (noteError(); as message) {
                    <p class="portal-field-error" role="alert">{{ message }}</p>
                }
            </div>
        </section>
    `
})
export class PortalBookingReasonStep {
    readonly reasons = input.required<readonly PortalBookingReason[]>();
    readonly selectedKey = input<string | null>(null);
    readonly note = input.required<FormControl<string>>();
    readonly clinicPhone = input<string | null>(null);
    /** Gönder'e basıldıysa not hatası dokunulmamış olsa da gösterilir. */
    readonly showErrors = input(false);
    /** Aynı sayfada çakışmasın diye alan kimliklerinin öneki. */
    readonly idPrefix = input('booking');

    readonly selectedChange = output<string>();

    readonly limits = PORTAL_BOOKING_LIMITS;
    readonly key = reasonKey;

    readonly noteRequired = computed(() => this.reasons().find((r) => reasonKey(r) === this.selectedKey())?.requiresNote ?? false);
    readonly telHref = computed(() => {
        const digits = (this.clinicPhone() ?? '').replace(/[^\d+]/g, '');

        return digits ? `tel:${digits}` : null;
    });

    noteError(): string | null {
        const control = this.note();

        if (!this.showErrors() && !control.touched) {
            return null;
        }

        if (control.errors?.['noteRequired']) {
            return NOTE_REQUIRED_MESSAGE;
        }

        return control.errors?.['maxlength'] ? 'Bu alan çok uzun.' : null;
    }
}
