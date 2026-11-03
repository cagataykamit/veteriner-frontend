import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { isDeceased, PortalPet, PortalPetsApi } from '@portal/app/features/pets/portal-pets.api';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PORTAL_PHONE_INVALID_MESSAGE, portalRequiredText, portalTurkishMobileValidator } from '@portal/app/shared/validation/portal-form-rules';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PortalBookingApi, PortalBookingDay, PortalBookingPage, PortalBookingReason } from './portal-booking.api';
import { PortalBookingReasonStep } from './portal-booking-reason-step.component';
import { PortalBookingDone, PortalBookingHow, PortalBookingStep, PortalBookingSummaryItem } from './portal-booking-ui.component';
import { bookingNoteValidators, NOTE_REQUIRED_MESSAGE, PORTAL_BOOKING_LIMITS, pendingLimitMessage, reasonKey } from './portal-booking.rules';
import { PortalSlotPicker } from './portal-slot-picker.component';

type PageState = 'loading' | 'closed' | 'error' | 'ready' | 'done';
type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error';

/** Hayvan seçiminde "listede yok" değeri; serbest metin hayvan (APPT-004). */
export const NEW_PET_OPTION = 'new';

/**
 * Oturumlu randevu talebi (`/appointments/requests/new`, ADR-042 K1 ve eki; sözleşme §6): bağın kliniğinde neden ve not →
 * saat → hayvan (kendi hayvanı ya da listede olmayan hayvan için ad/tür/ırk) → isteğe bağlı telefon. İletişim adı ve e-posta
 * klinik kaydından ve hesaptan gelir. Klinik online talep almıyorsa boş durum gösterilir.
 */
@Component({
    selector: 'portal-appointment-request',
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
        PortalEmptyState,
        PortalErrorState,
        PortalLoadingState,
        PortalSkeleton,
        PortalSlotPicker
    ],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-appointment-request.component.html',
    styleUrl: './portal-appointment-request.component.scss'
})
export class PortalAppointmentRequestComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalBookingApi);
    private readonly petsApi = inject(PortalPetsApi);

    readonly limits = PORTAL_BOOKING_LIMITS;
    readonly newPetOption = NEW_PET_OPTION;
    readonly state = signal<PageState>('loading');
    readonly loadError = signal('');
    readonly page = signal<PortalBookingPage | null>(null);
    readonly pets = signal<readonly PortalPet[]>([]);

    readonly reasonKey = signal<string | null>(null);
    readonly availabilityState = signal<AvailabilityState>('idle');
    readonly days = signal<readonly PortalBookingDay[]>([]);
    readonly selectedSlot = signal<string | null>(null);
    readonly slotMessage = signal<string | null>(null);

    readonly submitting = signal(false);
    readonly submitted = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly doneItems = signal<readonly PortalBookingSummaryItem[]>([]);

    readonly selectedReason = computed<PortalBookingReason | null>(() => this.page()?.reasons.find((r) => reasonKey(r) === this.reasonKey()) ?? null);
    readonly activePets = computed(() => this.pets().filter((p) => !isDeceased(p)));
    readonly slotText = computed(() => {
        const slot = this.selectedSlot();

        return slot ? `${formatPortalWeekday(slot)}, ${formatPortalDay(slot)} · ${formatPortalTime(slot)}` : '';
    });

    readonly form = new FormGroup({
        pet: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
        petName: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)] }),
        petSpecies: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.petSpecies)] }),
        petBreed: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.petBreed)] }),
        phone: new FormControl('', { nonNullable: true, validators: [portalTurkishMobileValidator(), Validators.maxLength(PORTAL_BOOKING_LIMITS.phone)] }),
        note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.note)] })
    });

    readonly isNewPet = signal(false);

    constructor() {
        this.form.controls.pet.valueChanges.subscribe((value) => {
            const isNew = value === NEW_PET_OPTION;

            this.isNewPet.set(isNew);
            this.form.controls.petName.setValidators(isNew ? [portalRequiredText, Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)] : [Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)]);
            this.form.controls.petName.updateValueAndValidity();
        });

        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.load();
                }
            });
        });
    }

    load(): void {
        const linkId = this.session.activeLink()?.linkId;

        if (!linkId) {
            return;
        }

        this.state.set('loading');
        this.reasonKey.set(null);
        this.selectedSlot.set(null);
        forkJoin({ page: this.api.linkPage(linkId), pets: this.petsApi.pets(linkId) }).subscribe({
            next: ({ page, pets }) => {
                this.page.set(page);
                this.pets.set(pets);
                this.state.set('ready');
            },
            error: (err: unknown) => {
                if (isBookingClosed(err)) {
                    this.state.set('closed');

                    return;
                }

                this.loadError.set(portalErrorMessage(err));
                this.state.set('error');
            }
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
        const linkId = this.session.activeLink()?.linkId;
        const reason = this.selectedReason();

        if (!linkId || !reason) {
            return;
        }

        this.availabilityState.set('loading');
        this.api.linkAvailability(linkId, reason.id).subscribe({
            next: (days) => {
                this.days.set(days);
                this.availabilityState.set('ready');
            },
            error: (err: unknown) => {
                if (isBookingClosed(err)) {
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

    submit(): void {
        this.submitted.set(true);
        this.form.markAllAsTouched();
        const linkId = this.session.activeLink()?.linkId;
        const reason = this.selectedReason();
        const slot = this.selectedSlot();

        // Not 1. adımda; gönder düğmesinin yanında da söylenir, yoksa kullanıcı neden gönderemediğini görmez.
        this.submitError.set(this.form.controls.note.errors?.['noteRequired'] ? `${NOTE_REQUIRED_MESSAGE} (1. adım)` : null);

        if (this.form.invalid || !linkId || !reason || !slot || this.submitting()) {
            return;
        }

        const v = this.form.getRawValue();
        const isNew = v.pet === NEW_PET_OPTION;

        this.submitting.set(true);
        this.submitError.set(null);
        this.api
            .createLinkRequest(linkId, {
                petId: isNew ? null : v.pet,
                petName: isNew ? v.petName.trim() : null,
                petSpecies: isNew ? v.petSpecies.trim() || null : null,
                petBreed: isNew ? v.petBreed.trim() || null : null,
                reasonId: reason.id,
                requestedStartUtc: slot,
                phone: v.phone.trim() || null,
                note: v.note.trim() || null
            })
            .subscribe({
                next: () => {
                    this.submitting.set(false);
                    this.doneItems.set([
                        { icon: 'fa-stethoscope', label: 'Neden', value: reason.name },
                        { icon: 'fa-calendar-day', label: 'İstenen saat', value: this.slotText() },
                        { icon: 'fa-paw', label: 'Hayvan', value: this.petSummary() ?? '' }
                    ]);
                    this.state.set('done');
                },
                error: (err: unknown) => {
                    this.submitting.set(false);
                    this.handleSubmitError(err);
                }
            });
    }

    /** 3. adım özeti: seçilen hayvanın adı ya da "listede yok" için yazılan ad. */
    petSummary(): string | null {
        const v = this.form.getRawValue();

        if (v.pet === NEW_PET_OPTION) {
            return v.petName.trim() || null;
        }

        return this.activePets().find((p) => p.petId === v.pet)?.name ?? null;
    }

    fieldError(name: 'pet' | 'petName' | 'phone'): string | null {
        const control = this.form.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
        }

        if (control.errors?.['phone']) {
            return PORTAL_PHONE_INVALID_MESSAGE;
        }

        if (control.errors?.['required']) {
            return name === 'pet' ? 'Talep hangi hayvan için? Birini seçin.' : 'Hayvanınızın adını girin.';
        }

        return control.errors?.['maxlength'] ? 'Bu alan çok uzun.' : null;
    }

    private handleSubmitError(err: unknown): void {
        if (isBookingClosed(err)) {
            this.state.set('closed');

            return;
        }

        const code = portalProblemCode(err);

        if (code === PORTAL_ERROR_CODES.slotUnavailable) {
            this.selectedSlot.set(null);
            this.slotMessage.set(portalErrorMessage(err));
            this.loadAvailability();

            return;
        }

        this.submitError.set(code === PORTAL_ERROR_CODES.pendingLimitReached ? pendingLimitMessage(this.page()?.maxPendingRequests) : portalErrorMessage(err));
    }
}

/** Klinik online talep almıyor (404 `OnlineBooking.NotFound`). */
export function isBookingClosed(err: unknown): boolean {
    return err instanceof HttpErrorResponse && err.status === 404 && portalProblemCode(err) === PORTAL_ERROR_CODES.onlineBookingNotFound;
}
