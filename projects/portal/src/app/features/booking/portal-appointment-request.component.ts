import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { MessageModule } from 'primeng/message';
import { TextareaModule } from 'primeng/textarea';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PORTAL_ERROR_CODES, portalErrorMessage, portalProblemCode } from '@portal/app/core/errors/portal-errors';
import { isDeceased, PortalPet, PortalPetsApi } from '@portal/app/features/pets/portal-pets.api';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { PortalEmptyState, PortalErrorState, PortalLoadingState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PortalBookingApi, PortalBookingDay, PortalBookingPage, PortalBookingReason } from './portal-booking.api';
import { PORTAL_BOOKING_LIMITS, pendingLimitMessage } from './portal-booking.rules';
import { PortalSlotPicker } from './portal-slot-picker.component';

type PageState = 'loading' | 'closed' | 'error' | 'ready' | 'done';
type AvailabilityState = 'idle' | 'loading' | 'ready' | 'error';

/** Hayvan seçiminde "listede yok" değeri; serbest metin hayvan (APPT-004). */
export const NEW_PET_OPTION = 'new';

/**
 * Oturumlu randevu talebi (`/appointments/requests/new`, ADR-042 K1; sözleşme §6): bağın kliniğinde neden → saat → hayvan
 * (kendi hayvanı ya da listede olmayan hayvan için ad/tür/ırk) → isteğe bağlı telefon ve not. İletişim adı ve e-posta klinik
 * kaydından ve hesaptan gelir. Klinik online talep almıyorsa boş durum gösterilir.
 */
@Component({
    selector: 'portal-appointment-request',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, MessageModule, TextareaModule, PortalEmptyState, PortalErrorState, PortalLoadingState, PortalSkeleton, PortalSlotPicker],
    changeDetection: ChangeDetectionStrategy.OnPush,
    styles: `
        .portal-field textarea {
            width: 100%;
            font-size: 1rem;
        }
    `,
    templateUrl: './portal-appointment-request.component.html'
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

    readonly reasonId = signal<string | null>(null);
    readonly availabilityState = signal<AvailabilityState>('idle');
    readonly days = signal<readonly PortalBookingDay[]>([]);
    readonly selectedSlot = signal<string | null>(null);
    readonly slotMessage = signal<string | null>(null);

    readonly submitting = signal(false);
    readonly submitted = signal(false);
    readonly submitError = signal<string | null>(null);

    readonly selectedReason = computed<PortalBookingReason | null>(() => this.page()?.reasons.find((r) => r.id === this.reasonId()) ?? null);
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
        phone: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.phone)] }),
        note: new FormControl('', { nonNullable: true, validators: [Validators.maxLength(PORTAL_BOOKING_LIMITS.note)] })
    });

    readonly isNewPet = signal(false);

    constructor() {
        this.form.controls.pet.valueChanges.subscribe((value) => {
            const isNew = value === NEW_PET_OPTION;

            this.isNewPet.set(isNew);
            this.form.controls.petName.setValidators(isNew ? [Validators.required, Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)] : [Validators.maxLength(PORTAL_BOOKING_LIMITS.petName)]);
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
        this.reasonId.set(null);
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

    selectReason(reasonId: string): void {
        if (this.reasonId() === reasonId) {
            return;
        }

        this.reasonId.set(reasonId);
        this.selectedSlot.set(null);
        this.slotMessage.set(null);
        this.loadAvailability();
    }

    loadAvailability(): void {
        const linkId = this.session.activeLink()?.linkId;
        const reasonId = this.reasonId();

        if (!linkId || !reasonId) {
            return;
        }

        this.availabilityState.set('loading');
        this.api.linkAvailability(linkId, reasonId).subscribe({
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
        const reasonId = this.reasonId();
        const slot = this.selectedSlot();

        if (this.form.invalid || !linkId || !reasonId || !slot || this.submitting()) {
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
                reasonId,
                requestedStartUtc: slot,
                phone: v.phone.trim() || null,
                note: v.note.trim() || null
            })
            .subscribe({
                next: () => {
                    this.submitting.set(false);
                    this.state.set('done');
                },
                error: (err: unknown) => {
                    this.submitting.set(false);
                    this.handleSubmitError(err);
                }
            });
    }

    fieldError(name: 'pet' | 'petName'): string | null {
        const control = this.form.controls[name];

        if (!this.submitted() && !control.touched) {
            return null;
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
