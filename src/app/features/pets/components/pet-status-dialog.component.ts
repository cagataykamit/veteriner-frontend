import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { PetDetailVm, PetHistoryAppointmentItemVm, PetStatusUpdateResult } from '@/app/features/pets/models/pet-vm.model';
import { PetsService } from '@/app/features/pets/services/pets.service';
import { panelHttpFailureMessage, problemCodeFromHttpError } from '@/app/shared/utils/api-error.utils';
import { formatUtcIsoAsLocalDateTimeDisplay, toIstanbulDateInputValue } from '@/app/shared/utils/date.utils';

/**
 * Hayvanı vefat olarak işaretleme veya aktife alma onayı (`PUT /pets/{id}/status`). Mevcut duruma göre tek yön sunulur.
 * Vefat tarihi opsiyoneldir (K6): bugünden ileri ve doğum tarihinden önce olamaz. Planlı randevu otomatik iptal edilmez (K4); varsa uyarılır.
 * Yetki denetimi çağıranda yapılır. 409 `Pets.ConcurrencyConflict` → `stale` yayılır, çağıran detayı yeniler, kullanıcı yeniden onaylar.
 */
@Component({
    selector: 'app-pet-status-dialog',
    standalone: true,
    imports: [ReactiveFormsModule, RouterLink, DialogModule, ButtonModule],
    template: `
        <p-dialog
            [header]="markingDeceased() ? 'Vefat olarak işaretle' : 'Aktife al'"
            [modal]="true"
            [dismissableMask]="!submitting()"
            [closable]="!submitting()"
            [style]="{ width: 'min(520px, 95vw)' }"
            [(visible)]="visible"
        >
            @if (pet(); as p) {
                @if (markingDeceased()) {
                    <p class="mt-0 mb-3"><span class="font-semibold">{{ p.name }}</span> vefat etti olarak işaretlenecek.</p>
                    <ul class="mt-0 mb-4 pl-5 text-sm text-muted-color space-y-1" data-testid="deceased-effects">
                        <li>Yeni randevu, geliş ve muayene açılamaz.</li>
                        <li>Otomatik aşı ve randevu hatırlatmaları gönderilmez.</li>
                        <li>Geçmiş kayıtlar görünür ve düzenlenebilir kalır; ücret ve ödeme alınabilir.</li>
                        <li>Yanlış işaretlenirse "Aktife al" ile geri alınır.</li>
                    </ul>
                    @if (nextAppointment(); as a) {
                        <p class="mt-0 mb-4 text-sm text-amber-700 dark:text-amber-300" role="note" data-testid="open-appointment-warning">
                            <i class="pi pi-calendar mr-1" aria-hidden="true"></i>Planlı randevusu var ({{ formatDt(a.scheduledAtUtc) }}). Otomatik iptal edilmez;
                            gerekiyorsa <a [routerLink]="['/panel/appointments', a.id]" class="text-primary font-medium no-underline">randevuyu açıp</a> iptal edin.
                        </p>
                    }
                    <label for="pet-deceased-on" class="block text-sm font-medium text-muted-color mb-2">Vefat tarihi (biliniyorsa)</label>
                    <input
                        id="pet-deceased-on"
                        type="date"
                        class="w-full p-inputtext p-component"
                        [formControl]="deceasedOn"
                        [attr.max]="today()"
                        [attr.min]="minDate()"
                    />
                    @if (dateError(); as msg) {
                        <small class="text-red-500" role="alert">{{ msg }}</small>
                    }
                } @else {
                    <p class="mt-0 mb-0">
                        <span class="font-semibold">{{ p.name }}</span> yeniden aktif olacak: vefat tarihi silinir, hayvan listelere ve otomatik hatırlatmalara geri döner.
                    </p>
                }
                @if (!p.rowVersion) {
                    <p class="text-sm text-muted-color mt-3 mb-0" role="note">Kayıt sürümü okunamadı; sayfayı yenileyip tekrar deneyin.</p>
                }
            }
            @if (submitError()) {
                <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
            }
            <ng-template pTemplate="footer">
                <p-button type="button" label="Vazgeç" icon="pi pi-times" severity="secondary" (onClick)="visible.set(false)" [disabled]="submitting()" />
                <p-button
                    type="button"
                    [label]="markingDeceased() ? 'Vefat olarak işaretle' : 'Aktife al'"
                    icon="pi pi-check"
                    [severity]="markingDeceased() ? 'danger' : 'primary'"
                    [loading]="submitting()"
                    [disabled]="submitting() || !pet()?.rowVersion || (markingDeceased() && !!dateError())"
                    (onClick)="onSubmit()"
                />
            </ng-template>
        </p-dialog>
    `
})
export class PetStatusDialogComponent {
    readonly visible = model(false);
    readonly pet = input<PetDetailVm | null>(null);
    /** Hasta geçmişinden en yakın planlı randevu; vefat işaretinde uyarı için. */
    readonly nextAppointment = input<PetHistoryAppointmentItemVm | null>(null);
    readonly changed = output<PetStatusUpdateResult>();
    /** Kayıt arada değişti (409); çağıran detayı yenilemeli. */
    readonly stale = output<void>();

    private readonly petsService = inject(PetsService);

    readonly deceasedOn = new FormControl('', { nonNullable: true });
    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    private readonly dateValue = signal('');

    readonly markingDeceased = computed(() => this.pet()?.status !== 'Deceased');
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

    readonly formatDt = (v: string | null) => formatUtcIsoAsLocalDateTimeDisplay(v);

    constructor() {
        this.deceasedOn.valueChanges.pipe(takeUntilDestroyed()).subscribe((v) => {
            this.dateValue.set(v);
            this.submitError.set(null);
        });
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.today.set(toIstanbulDateInputValue(new Date().toISOString()));
                    this.deceasedOn.setValue(this.pet()?.deceasedOn ?? this.today());
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
        this.submitError.set(null);
        this.submitting.set(true);
        this.petsService.updatePetStatus(p.id, { status, deceasedOn: status === 'Deceased' ? this.deceasedOn.value.trim() || null : null, rowVersion: p.rowVersion }).subscribe({
            next: (result) => {
                this.submitting.set(false);
                this.visible.set(false);
                this.changed.emit(result);
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, 'Hayvan durumu değiştirilemedi.'));
                if (e instanceof HttpErrorResponse && problemCodeFromHttpError(e) === 'Pets.ConcurrencyConflict') {
                    this.stale.emit();
                }
            }
        });
    }
}
