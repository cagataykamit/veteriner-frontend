import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { DialogModule } from 'primeng/dialog';
import { catchError, concatMap, from, map, type Observable, of, type Subscription, switchMap, toArray } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import { APPOINTMENTS_CANCEL_CLAIM, APPOINTMENTS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { AppointmentListItemVm } from '@/app/entities/appointment/models/appointment-vm.model';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { appointmentTypeDisplayLabel } from '@/app/entities/appointment/utils/appointment-type.utils';
import type { PetDetailVm, PetStatusUpdateResult } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { upcomingScheduledAppointments } from '@/app/features/pets/utils/pet-card.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/** Vefat işaretiyle birlikte iptal edilen randevulara yazılan gerekçe. */
const DECEASED_CANCEL_REASON = 'Hasta vefat etti';

interface AppointmentCancelFailure {
    readonly appointment: AppointmentListItemVm;
    readonly message: string;
}

/**
 * Hayvanı vefat olarak işaretleme veya aktife alma onayı (`PUT /pets/{id}/status`). Mevcut duruma göre tek yön sunulur.
 * Vefat tarihi opsiyoneldir (K6): bugünden ileri ve doğum tarihinden önce olamaz.
 * Planlı randevu otomatik iptal edilmez (K4): ileri tarihli açık randevular listelenir; randevu iptal izni varsa ve kullanıcı
 * kutuyu işaretlerse durum kaydından sonra tek tek iptal edilir. Durum kaydedildiyse geri alınmaz; iptal edilemeyenler pencerede kalır.
 * Durum yetkisi çağıranda denetlenir. 409 `Pets.ConcurrencyConflict` → `stale` yayılır, çağıran detayı yeniler, kullanıcı yeniden onaylar.
 */
@Component({
    selector: 'app-pet-status-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, DialogModule, ButtonModule, CheckboxModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog [header]="cancelOutcome() || markingDeceased() ? 'Vefat olarak işaretle' : 'Aktife al'" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            @if (cancelOutcome(); as o) {
                <p class="mt-0 mb-2">Hasta vefat olarak işaretlendi.</p>
                <p class="mt-0 mb-2 text-red-500" role="alert" data-testid="cancel-failures">{{ o.total }} randevudan {{ o.failures.length }} tanesi iptal edilemedi:</p>
                <ul class="mt-0 mb-0 pl-5 text-sm space-y-1">
                    @for (f of o.failures; track f.appointment.id) {
                        <li>
                            <a [routerLink]="['/panel/appointments', f.appointment.id]" class="text-primary font-medium no-underline">{{ appointmentLine(f.appointment) }}</a>
                            — {{ f.message }}
                        </li>
                    }
                </ul>
            } @else if (pet(); as p) {
                @if (markingDeceased()) {
                    <p class="mt-0 mb-3">
                        <span class="font-semibold">{{ p.name }}</span> vefat etti olarak işaretlenecek.
                    </p>
                    <ul class="mt-0 mb-4 pl-5 text-sm text-muted-color space-y-1" data-testid="deceased-effects">
                        <li>Yeni randevu, geliş ve muayene açılamaz.</li>
                        <li>Otomatik aşı ve randevu hatırlatmaları gönderilmez.</li>
                        <li>Geçmiş kayıtlar görünür ve düzenlenebilir kalır; ücret ve ödeme alınabilir.</li>
                        <li>Yanlış işaretlenirse "Aktife al" ile geri alınır.</li>
                    </ul>
                    @if (openAppointments().length > 0) {
                        <div class="mb-4 text-sm" role="note" data-testid="open-appointments">
                            <p class="mt-0 mb-2 text-amber-700 dark:text-amber-300"><i class="pi pi-calendar mr-1" aria-hidden="true"></i>Bu hastanın {{ openAppointments().length }} açık randevusu var.</p>
                            <ul class="mt-0 mb-2 pl-5 space-y-1">
                                @for (a of openAppointments(); track a.id) {
                                    <li>
                                        <a [routerLink]="['/panel/appointments', a.id]" class="text-primary font-medium no-underline">{{ appointmentLine(a) }}</a>
                                    </li>
                                }
                            </ul>
                            @if (canCancelAppointments()) {
                                <div class="flex items-center gap-2">
                                    <p-checkbox inputId="pet-cancel-open-appointments" [binary]="true" [formControl]="cancelOpenAppointments" />
                                    <label for="pet-cancel-open-appointments" class="cursor-pointer mb-0">Açık randevuları da iptal et</label>
                                </div>
                                <small class="text-muted-color">İşaretlenmezse randevular açık kalır.</small>
                            } @else {
                                <p class="m-0 text-muted-color">Randevular otomatik iptal edilmez.</p>
                            }
                        </div>
                    }
                    @if (appointmentsError(); as msg) {
                        <p class="mt-0 mb-4 text-sm text-muted-color" role="note" data-testid="open-appointments-error">Açık randevular yüklenemedi: {{ msg }}</p>
                    }
                    <label for="pet-deceased-on" class="block text-sm font-medium text-muted-color mb-2">Vefat tarihi (biliniyorsa)</label>
                    <input id="pet-deceased-on" type="date" class="w-full p-inputtext p-component" [formControl]="deceasedOn" [attr.max]="today()" [attr.min]="minDate()" />
                    @if (dateError(); as msg) {
                        <small class="text-red-500" role="alert">{{ msg }}</small>
                    }
                } @else {
                    <p class="mt-0 mb-0">
                        <span class="font-semibold">{{ p.name }}</span> yeniden aktif olacak: vefat tarihi silinir, hasta listelere ve otomatik hatırlatmalara geri döner.
                    </p>
                }
                @if (!p.rowVersion) {
                    <p class="text-sm text-muted-color mt-3 mb-0" role="note">Kayıt sürümü okunamadı; sayfayı yenileyip tekrar deneyin.</p>
                }
            }
            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
            }
            <ng-template #footer>
                @if (cancelOutcome()) {
                    <button pButton type="button" severity="secondary" (click)="visible.set(false)"><i class="p-button-icon pi pi-times"></i>Kapat</button>
                } @else {
                    <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                    <button
                        pButton
                        type="button"
                        [severity]="markingDeceased() ? 'danger' : 'primary'"
                        [disabled]="submitting() || !pet()?.rowVersion || (markingDeceased() && !!dateError())"
                        (click)="onSubmit()"
                    ><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ markingDeceased() ? 'Vefat olarak işaretle' : 'Aktife al' }}</button>
                }
            </ng-template>
        </p-dialog>
    `
})
export class PetStatusDialogComponent {
    readonly visible = model(false);
    readonly pet = input<PetDetailVm | null>(null);
    readonly changed = output<PetStatusUpdateResult>();
    /** Kayıt arada değişti (409); çağıran detayı yenilemeli. */
    readonly stale = output<void>();
    /** Vefat işaretiyle en az bir randevu iptal edildi; çağıran randevu özetini yenileyebilir. */
    readonly appointmentsCancelled = output<void>();

    private readonly petsService = inject(PetsService);
    private readonly appointmentsService = inject(AppointmentsService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    private readonly destroyRef = inject(DestroyRef);

    readonly deceasedOn = new FormControl('', { nonNullable: true });
    /** Varsayılan işaretsiz: randevular açık kalır (K4). */
    readonly cancelOpenAppointments = new FormControl(false, { nonNullable: true });
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    /** Hastanın ileri tarihli açık (`Planlandı`) randevuları, en yakın önce. */
    readonly openAppointments = signal<AppointmentListItemVm[]>([]);
    readonly appointmentsError = signal<string | null>(null);
    /** Durum kaydedildi ama bazı randevular iptal edilemedi. */
    readonly cancelOutcome = signal<{ total: number; failures: AppointmentCancelFailure[] } | null>(null);
    private readonly dateValue = signal('');
    private appointmentsLoad: Subscription | null = null;

    readonly markingDeceased = computed(() => this.pet()?.status !== 'Deceased');
    readonly canCancelAppointments = computed(() => this.auth.hasOperationClaim(APPOINTMENTS_CANCEL_CLAIM) && !this.ro.mutationBlocked());
    /** "Bugün" İstanbul takvim günü (sözleşme K6). */
    readonly today = signal(toIstanbulDateInputValue(new Date().toISOString()));
    readonly minDate = computed(() => this.pet()?.birthDate?.slice(0, 10) || null);
    readonly dateError = computed(() => {
        const v = this.dateValue();

        if (!v) {
            return null;
        }

        if (v > this.today()) {
            return 'Vefat tarihi bugünden ileri olamaz.';
        }

        const min = this.minDate();

        return min && v < min ? 'Vefat tarihi doğum tarihinden önce olamaz.' : null;
    });

    readonly appointmentLine = (a: AppointmentListItemVm) => `${formatUtcIsoAsLocalDateTimeDisplay(a.scheduledAtUtc)} · ${appointmentTypeDisplayLabel(a.appointmentType, a.appointmentTypeName)}`;

    constructor() {
        this.deceasedOn.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
            this.dateValue.set(v);
            this.submitError.set(null);
        });
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.cancelOutcome.set(null);
                    this.cancelOpenAppointments.setValue(false);
                    this.today.set(toIstanbulDateInputValue(new Date().toISOString()));
                    this.deceasedOn.setValue(this.pet()?.deceasedOn ?? this.today());
                    this.loadOpenAppointments();
                });
            }
        });
    }

    onSubmit(): void {
        const p = this.pet();

        if (this.submitting() || !p?.rowVersion || (this.markingDeceased() && this.dateError())) {
            return;
        }

        const status = this.markingDeceased() ? 'Deceased' : 'Active';
        const toCancel = status === 'Deceased' && this.canCancelAppointments() && this.cancelOpenAppointments.value ? this.openAppointments() : [];

        this.submitError.set(null);
        this.submitting.set(true);
        this.petsService
            .updatePetStatus(p.id, { status, deceasedOn: status === 'Deceased' ? this.deceasedOn.value.trim() || null : null, rowVersion: p.rowVersion })
            .pipe(switchMap((result) => this.cancelAll(toCancel).pipe(map((failures) => ({ result, failures })))))
            .subscribe({
                next: ({ result, failures }) => {
                    this.submitting.set(false);
                    this.changed.emit(result);

                    if (failures.length < toCancel.length) {
                        this.appointmentsCancelled.emit();
                    }

                    if (failures.length > 0) {
                        this.cancelOutcome.set({ total: toCancel.length, failures });
                    } else {
                        this.visible.set(false);
                    }
                },
                error: (e: unknown) => {
                    this.submitting.set(false);
                    this.submitError.set(panelHttpFailureMessage(e, 'Hasta durumu değiştirilemedi.'));

                    if (e instanceof HttpErrorResponse && problemCodeFromHttpError(e) === 'Pets.ConcurrencyConflict') {
                        this.stale.emit();
                    }
                }
            });
    }

    /** Yalnız vefat işaretlenirken ve randevu okuma izni varken; liste ucu `petId` + `status=0` (Planlandı), ileri tarih istemcide süzülür. */
    private loadOpenAppointments(): void {
        this.appointmentsLoad?.unsubscribe();
        this.openAppointments.set([]);
        this.appointmentsError.set(null);
        const p = this.pet();

        if (!p || !this.markingDeceased() || !this.auth.hasOperationClaim(APPOINTMENTS_READ_CLAIM)) {
            return;
        }

        this.appointmentsLoad = this.appointmentsService
            .getAppointments({ page: 1, pageSize: 200, petId: p.id, status: '0', sort: 'scheduledAtUtc', order: 'asc' })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (r) => this.openAppointments.set(upcomingScheduledAppointments(r.items)),
                error: (e: unknown) => this.appointmentsError.set(e instanceof Error ? e.message : 'Randevu listesi yüklenemedi.')
            });
    }

    /** Sırayla iptal eder; hata zinciri kesmez, iptal edilemeyenler döner. */
    private cancelAll(rows: readonly AppointmentListItemVm[]): Observable<AppointmentCancelFailure[]> {
        if (rows.length === 0) {
            return of([]);
        }

        return from(rows).pipe(
            concatMap((appointment) =>
                this.appointmentsService.cancelAppointment(appointment.id, DECEASED_CANCEL_REASON).pipe(
                    map((): AppointmentCancelFailure | null => null),
                    catchError((e: unknown) => of({ appointment, message: e instanceof Error ? e.message : 'Randevu iptal edilemedi.' }))
                )
            ),
            toArray(),
            map((results) => results.filter((f): f is AppointmentCancelFailure => f !== null))
        );
    }
}
