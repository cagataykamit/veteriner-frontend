import { ChangeDetectionStrategy, Component, computed, effect, input, output, untracked } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { TextareaModule } from 'primeng/textarea';
import { formatPortalPhone, telHref } from '@portal/app/shared/format/portal-labels';
import type { PortalBookingReason } from './portal-booking.api';
import { NOTE_REQUIRED_MESSAGE, PORTAL_BOOKING_LIMITS, reasonKey } from './portal-booking.rules';
import { PortalBookingStep } from './portal-booking-ui.component';

/**
 * Talep akışının 1. adımı (oturumlu talep ve kliniğe özel bağlantı ortak, ADR-042 eki): başta tek satır acil durum şeridi ve aranabilir
 * klinik telefonu, kart olarak neden listesi (sonda her zaman "Diğer / emin değilim"; tek seçenekse seçili gelir), hemen altında not. Not "Diğer"de
 * zorunludur; kural sunucudan (`requiresNote`) gelir, doğrulayıcıyı üst bileşen nedene göre kurar.
 */
@Component({
    selector: 'portal-booking-reason-step',
    standalone: true,
    imports: [ReactiveFormsModule, TextareaModule, PortalBookingStep],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        /* Acil uyarısı formun önüne geçmesin (PO-03): tek satır ince şerit, telefon satır içi bağlantı. */
        .urgent {
            display: flex;
            align-items: baseline;
            gap: 0.5rem;
            margin: 0;
            padding: 0.5rem 0.75rem;
            border-left: 3px solid var(--portal-danger-soft-border, #f5b8a8);
            border-radius: 0.5rem;
            background: var(--portal-danger-soft-bg, #fff5f2);
            color: var(--portal-danger-soft-text, #7a2410);
            font-size: 0.875rem;
        }
        .urgent a {
            color: inherit;
            font-weight: 600;
            white-space: nowrap;
        }
        .portal-choice {
            gap: 0.5rem;
        }
        .reason-other {
            margin-top: 0.25rem;
            border-style: dashed;
        }
        .reason-chip {
            flex: 0 0 auto;
            padding: 0.125rem 0.5rem;
            border-radius: 999px;
            background: var(--portal-muted-bg, #eef2f6);
            color: var(--portal-muted-text, #334155);
            font-size: 0.8125rem;
            font-weight: 600;
            white-space: nowrap;
        }
        .note-label {
            display: flex;
            justify-content: space-between;
            gap: 0.5rem;
        }
        textarea {
            width: 100%;
            font-size: 1rem;
        }
    `,
    template: `
        <portal-booking-step [step]="1" title="Ne için geliyorsunuz?" [headingId]="idPrefix() + '-reason-title'" [done]="done()" [summary]="summary()">
            <p class="urgent" data-testid="booking-urgent">
                <i class="fa-solid fa-triangle-exclamation" aria-hidden="true"></i>
                @if (phoneHref(); as href) {
                    <span>Acil durumda beklemeyin: <a [href]="href" [attr.aria-label]="'Kliniği ara: ' + phoneText()">{{ phoneText() }} ara</a></span>
                } @else {
                    <span>Acil durumda beklemeyin; kliniğe ya da en yakın veteriner acil servisine başvurun.</span>
                }
            </p>

            <fieldset class="portal-choice">
                <legend class="sr-only">Randevu nedeni</legend>
                @for (reason of reasons(); track key(reason)) {
                    <label class="portal-option" [class.reason-other]="!reason.id">
                        <input type="radio" [name]="idPrefix() + '-reason'" [value]="key(reason)" [checked]="selectedKey() === key(reason)" (change)="selectedChange.emit(key(reason))" />
                        <span class="portal-option-text">
                            <span>{{ reason.name }}</span>
                            @if (reason.requiresNote) {
                                <span class="portal-field-hint">Ne için geldiğinizi aşağıya yazın</span>
                            }
                        </span>
                        <span class="reason-chip">~{{ reason.durationMinutes }} dk</span>
                    </label>
                }
            </fieldset>

            <div class="portal-field">
                <label class="note-label" [for]="idPrefix() + '-note'">
                    <span>{{ noteRequired() ? 'Kısaca ne için geliyorsunuz?' : 'Not (isteğe bağlı)' }}</span>
                    <span class="portal-field-hint" aria-hidden="true">{{ note().value.length }}/{{ limits.note }}</span>
                </label>
                <textarea
                    pTextarea
                    [id]="idPrefix() + '-note'"
                    rows="3"
                    [formControl]="note()"
                    [attr.maxlength]="limits.note"
                    [attr.aria-invalid]="!!noteError()"
                    [attr.aria-required]="noteRequired()"
                    placeholder="Örn. iki gündür iştahsız, sol arka bacağını aksatıyor"
                    data-testid="booking-note"
                ></textarea>
                <p class="portal-field-hint">Şikâyet, belirti ya da istediğiniz işlem; klinik talebi buna göre değerlendirir.</p>
                @if (noteError(); as message) {
                    <p class="portal-field-error" role="alert">{{ message }}</p>
                }
            </div>
        </portal-booking-step>
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

    readonly selected = computed(() => this.reasons().find((r) => reasonKey(r) === this.selectedKey()) ?? null);
    readonly noteRequired = computed(() => this.selected()?.requiresNote ?? false);
    readonly summary = computed(() => {
        const reason = this.selected();

        return reason ? `${reason.name} · ~${reason.durationMinutes} dk` : null;
    });
    readonly phoneHref = computed(() => telHref(this.clinicPhone()));
    readonly phoneText = computed(() => formatPortalPhone(this.clinicPhone()));

    constructor() {
        // Klinik neden tanımlamamışsa tek seçenek ("Diğer / emin değilim") kalır; seçmek için ayrıca dokunmak gerekmesin (PO-03).
        effect(() => {
            const reasons = this.reasons();

            if (reasons.length === 1 && !untracked(this.selectedKey)) {
                this.selectedChange.emit(reasonKey(reasons[0]));
            }
        });
    }

    /** Neden seçili ve not kurala uyuyor. Not alanı sinyal değildir; değer her değişiklik olayında yeniden okunur. */
    done(): boolean {
        return !!this.selected() && this.note().valid;
    }

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
