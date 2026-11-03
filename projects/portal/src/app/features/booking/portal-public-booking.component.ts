import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PORTAL_ERROR_CODES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { PortalResendTimer } from '@portal/app/features/auth/portal-resend-timer';
import { PortalBrandHeader, PortalFooter } from '@portal/app/layout/portal-brand.component';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PortalErrorState, PortalLoadingState } from '@portal/app/shared/ui/portal-states.component';
import { normalizeOneTimeCode, portalEmailValidators, portalFieldError, portalOneTimeCodeValidator } from '@portal/app/shared/validation/portal-form-rules';
import { PortalBookingApi, PortalBookingDay, PortalBookingPage, PortalBookingReason } from './portal-booking.api';
import { PortalBookingReasonStep } from './portal-booking-reason-step.component';
import { bookingNoteValidators, NOTE_REQUIRED_MESSAGE, PORTAL_BOOKING_LIMITS, pendingLimitMessage, reasonKey } from './portal-booking.rules';
import { PortalBookingDone, PortalBookingHow, PortalBookingStep, PortalBookingSummaryItem } from './portal-booking-ui.component';
import { PortalSlotPicker } from './portal-slot-picker.component';

type PageState = 'loading' | 'closed' | 'error' | 'ready' | 'done';
type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error';

/**
 * Kliniğe özel online randevu bağlantısı (`/randevu/:bookingCode`, ADR-042 K1 ve eki; sözleşme §5). Kimliksizdir: neden ve not → gün/saat →
 * iletişim ve hayvan bilgisi → e-posta doğrulama kodu → talep. Talep kesin randevu değildir; klinik onaylayınca e-posta gelir.
 * Bağlantıdan gelen kişi için hesap ya da müşteri kaydı oluşmaz. Adımlar numaralı kartlarda sırayla açılır.
 */
@Component({
    selector: 'portal-public-booking',
    standalone: true,
    imports: [
        ReactiveFormsModule,
        RouterLink,
        ButtonModule,
        InputTextModule,
        MessageModule,
        PortalBookingDone,
        PortalBookingHow,
        PortalBookingReasonStep,
        PortalBookingStep,
        PortalBrandHeader,
        PortalFooter,
        PortalLoadingState,
        PortalErrorState,
        PortalSlotPicker
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-public-booking.component.html',
    styleUrl: './portal-public-booking.component.scss'
})
export class PortalPublicBookingComponent implements OnInit {
    private readonly api = inject(PortalBookingApi);

    /** Rota parametresi (component input binding). */
    readonly bookingCode = input<string | undefined>();

    readonly limits = PORTAL_BOOKING_LIMITS;
    readonly state = signal<PageState>('loading');
    readonly page = signal<PortalBookingPage | null>(null);
    readonly loadError = signal('');

    readonly reasonKey = signal<string | null>(null);
    readonly availabilityState = signal<AvailabilityState>('idle');
    readonly days = signal<readonly PortalBookingDay[]>([]);
    readonly selectedSlot = signal<string | null>(null);
    readonly slotMessage = signal<string | null>(null);

    readonly codeSent = signal(false);
    readonly sendingCode = signal(false);
    readonly codeError = signal<string | null>(null);
    readonly submitError = signal<string | null>(null);
    readonly submitting = signal(false);
    readonly submitted = signal(false);
    readonly doneItems = signal<readonly PortalBookingSummaryItem[]>([]);
    readonly timer = new PortalResendTimer(inject(DestroyRef));

    readonly selectedReason = computed<PortalBookingReason | null>(() => this.page()?.reasons.find((r) => reasonKey(r) === this.reasonKey()) ?? null);
    readonly slotText = computed(() => {
        const slot = this.selectedSlot();

        return slot ? `${formatPortalWeekday(slot)}, ${formatPortalDay(slot)} · ${formatPortalTime(slot)}` : '';
    });

    readonly form = new FormGroup({
        contactName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(PORTAL_BOOKING_LIMITS.contactName)] }),
        phone: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(PORTAL_BOOKING_LIMITS.phone)] }),
        email: new FormControl('', { nonNullable: true, validators: portalEmailValidators }),
        petName: new FormControl('', { nonNullable: true, validators: [Validators.required, Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)] }),
        petSpecies: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.petSpecies)] }),
        petBreed: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.petBreed)] }),
        note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.note)] }),
        code: new FormControl('', { nonNullable: true, validators: [Validators.required, portalOneTimeCodeValidator()] })
    });

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        const code = this.bookingCode()?.trim();

        if (!code) {
            this.state.set('closed');

            return;
        }

        this.state.set('loading');
        this.api.publicPage(code).subscribe({
            next: (page) => {
                this.page.set(page);
                this.state.set('ready');
            },
            error: (err: unknown) => this.handleLoadError(err)
        });
    }

    selectReason(key: string): void {
        if (this.reasonKey() === key) {
            return;
        }

        this.reasonKey.set(key);
        this.form.controls.note.setValidators(bookingNoteValidators(this.selectedReason()));
        this.form.controls.note.updateValueAndValidity();
        this.selectedSlot.set(null);
        this.slotMessage.set(null);
        this.loadAvailability();
    }

    loadAvailability(): void {
        const code = this.bookingCode()?.trim();
        const reason = this.selectedReason();

        if (!code || !reason) {
            return;
        }

        this.availabilityState.set('loading');
        this.api.publicAvailability(code, reason.id).subscribe({
            next: (days) => {
                this.days.set(days);
                this.availabilityState.set('ready');
            },
            error: (err: unknown) => {
                if (this.isClosed(err)) {
                    this.state.set('closed');

                    return;
                }

                this.slotMessage.set(portalErrorMessage(err));
                this.availabilityState.set('error');
            }
        });
    }

    selectSlot(startUtc: string): void {
        this.selectedSlot.set(startUtc);
        this.slotMessage.set(null);
    }

    sendCode(): void {
        const email = this.form.controls.email;
        const code = this.bookingCode()?.trim();

        email.markAsTouched();

        if (email.invalid || !code || !this.timer.canSend() || this.sendingCode()) {
            return;
        }

        this.sendingCode.set(true);
        this.codeError.set(null);
        this.api.requestPublicCode(code, email.value.trim()).subscribe({
            next: () => {
                this.sendingCode.set(false);
                this.codeSent.set(true);
                this.timer.start();
            },
            error: (err: unknown) => {
                this.sendingCode.set(false);

                if (this.isClosed(err)) {
                    this.state.set('closed');

                    return;
                }

                this.codeError.set(portalErrorMessage(err));
            }
        });
    }

    submit(): void {
        this.submitted.set(true);
        this.form.markAllAsTouched();
        const code = this.bookingCode()?.trim();
        const reason = this.selectedReason();
        const slot = this.selectedSlot();

        if (!slot) {
            this.slotMessage.set('Lütfen bir gün ve saat seçin.');
        }

        // Not 1. adımda; gönder düğmesinin yanında da söylenir, yoksa kullanıcı neden gönderemediğini görmez.
        this.submitError.set(this.form.controls.note.errors?.['noteRequired'] ? `${NOTE_REQUIRED_MESSAGE} (1. adım)` : null);

        if (this.form.invalid || !code || !reason || !slot || this.submitting()) {
            return;
        }

        const v = this.form.getRawValue();

        this.submitting.set(true);
        this.submitError.set(null);
        this.codeError.set(null);
        this.api
            .createPublicRequest(code, {
                email: v.email.trim(),
                verificationCode: normalizeOneTimeCode(v.code),
                contactName: v.contactName.trim(),
                phone: v.phone.trim(),
                petName: v.petName.trim(),
                petSpecies: v.petSpecies.trim() || null,
                petBreed: v.petBreed.trim() || null,
                reasonId: reason.id,
                requestedStartUtc: slot,
                note: v.note.trim() || null
            })
            .subscribe({
                next: () => {
                    this.submitting.set(false);
                    this.doneItems.set([
                        { icon: 'fa-stethoscope', label: 'Neden', value: reason.name },
                        { icon: 'fa-calendar-day', label: 'İstenen saat', value: this.slotText() },
                        { icon: 'fa-paw', label: 'Hayvan', value: [v.petName.trim(), v.petSpecies.trim()].filter(Boolean).join(' · ') }
                    ]);
                    this.state.set('done');
                },
                error: (err: unknown) => {
                    this.submitting.set(false);
                    this.handleSubmitError(err);
                }
            });
    }

    /** 3. adım tamam: iletişim ve hayvan alanları geçerli. */
    infoDone(): boolean {
        const c = this.form.controls;

        return c.contactName.valid && c.phone.valid && c.petName.valid && c.petSpecies.valid && c.petBreed.valid;
    }

    infoSummary(): string | null {
        const v = this.form.getRawValue();

        return this.infoDone() ? `${v.petName.trim()} · ${v.contactName.trim()}` : null;
    }

    fieldError(name: 'contactName' | 'phone' | 'email' | 'petName' | 'code'): string | null {
        const control = this.form.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
        }

        if (name === 'email' || name === 'code') {
            return portalFieldError(control.errors, name);
        }

        if (control.errors?.['required']) {
            return { contactName: 'Adınızı ve soyadınızı girin.', phone: 'Telefon numaranızı girin.', petName: 'Hayvanınızın adını girin.' }[name];
        }

        return control.errors?.['maxlength'] ? 'Bu alan çok uzun.' : null;
    }

    private handleSubmitError(err: unknown): void {
        if (this.isClosed(err)) {
            this.state.set('closed');

            return;
        }

        const code = portalProblemCode(err);

        if (code === PORTAL_ERROR_CODES.onlineBookingInvalidCode) {
            this.codeError.set(portalErrorMessage(err));

            return;
        }

        if (code === PORTAL_ERROR_CODES.slotUnavailable) {
            this.selectedSlot.set(null);
            this.slotMessage.set(portalErrorMessage(err));
            this.loadAvailability();

            return;
        }

        if (code === PORTAL_ERROR_CODES.pendingLimitReached) {
            this.submitError.set(pendingLimitMessage(this.page()?.maxPendingRequests));

            return;
        }

        if (code === PORTAL_ERROR_CODES.reasonNotFound) {
            this.reasonKey.set(null);
            this.selectedSlot.set(null);
            this.load();
        }

        this.submitError.set(portalErrorMessage(err));
    }

    private handleLoadError(err: unknown): void {
        if (this.isClosed(err)) {
            this.state.set('closed');

            return;
        }

        this.loadError.set(portalErrorMessage(err));
        this.state.set('error');
    }

    private isClosed(err: unknown): boolean {
        return err instanceof HttpErrorResponse && err.status === 404 && portalProblemCode(err) !== PORTAL_ERROR_CODES.reasonNotFound;
    }
}
