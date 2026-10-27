import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, input, model, output, signal, untracked, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { AppointmentsService } from '@/app/entities/appointment/services/appointments.service';
import { REASON_MAX, REASON_MIN, reasonLength } from '@/app/shared/forms/reason-length.validator';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Randevu "Gelmedi" (`Appointments.NoShow`): `mark` onayla (gerekçe opsiyonel, en çok 500), `revert` geri al (gerekçe zorunlu 5–500).
 * Yetki ve koşul denetimi çağıran bileşende yapılır; bu diyalog yalnızca uygun randevuya açılır.
 */
@Component({
    selector: 'app-appointment-no-show-dialog',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, DialogModule, ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <p-dialog [header]="reverting() ? 'Gelmedi işaretini geri al' : 'Gelmedi olarak işaretle'" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            @if (subject()) {
                <p class="mt-0 mb-4 font-medium">{{ subject() }}</p>
            }
            @if (!reverting()) {
                <p class="mt-0 mb-3 text-muted-color">Hasta randevuya gelmedi olarak işaretlenecek. Hasta sonradan gelirse geliş kaydı açıldığında randevu otomatik planlı duruma döner.</p>
            }
            <form [formGroup]="form" (ngSubmit)="onSubmit()" id="appointment-no-show-form">
                <label for="ns-reason" class="block text-sm font-medium text-muted-color mb-2">
                    {{ reverting() ? 'Gerekçe *' : 'Gerekçe (opsiyonel)' }}
                </label>
                <textarea id="ns-reason" rows="3" class="w-full p-inputtext p-component" formControlName="reason"></textarea>
                @if (form.controls.reason.invalid && form.controls.reason.touched) {
                    <small class="text-red-500">
                        {{ reverting() ? 'Gerekçe ' + reasonMin + '–' + reasonMax + ' karakter olmalıdır.' : 'Gerekçe en çok ' + reasonMax + ' karakter olabilir.' }}
                    </small>
                }
                @if (submitError()) {
                    <p class="text-red-500 mt-3 mb-0" role="alert">{{ submitError() }}</p>
                }
            </form>
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="close()" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" [disabled]="form.invalid || submitting()" (click)="onSubmit()"><i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ reverting() ? 'Geri al' : 'Gelmedi işaretle' }}</button>
            </ng-template>
        </p-dialog>
    `
})
export class AppointmentNoShowDialogComponent {
    readonly visible = model(false);
    readonly appointmentId = input<string | null>(null);
    /** Diyalogda gösterilen kısa tanım (hasta · sahip · saat). */
    readonly subject = input<string>('');
    readonly mode = input<'mark' | 'revert'>('mark');
    /** İşlem sunucuda başarılı oldu; çağıran bileşen listeyi/detayı yeniler. */
    readonly done = output<void>();

    private readonly fb = inject(FormBuilder);
    private readonly appointments = inject(AppointmentsService);

    protected readonly reasonMin = REASON_MIN;
    protected readonly reasonMax = REASON_MAX;
    protected readonly reverting = computed(() => this.mode() === 'revert');

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    readonly form = this.fb.nonNullable.group({ reason: '' });

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => this.prepareForm());
            }
        });
    }

    private prepareForm(): void {
        this.submitError.set(null);
        this.form.reset({ reason: '' });
        this.form.controls.reason.setValidators(this.reverting() ? reasonLength : Validators.maxLength(REASON_MAX));
        this.form.controls.reason.updateValueAndValidity({ emitEvent: false });
    }

    close(): void {
        this.visible.set(false);
    }

    onSubmit(): void {
        const id = this.appointmentId();

        if (this.submitting() || !id) {
            return;
        }

        if (this.form.invalid) {
            this.form.markAllAsTouched();

            return;
        }

        const reason = this.form.getRawValue().reason;

        this.submitError.set(null);
        this.submitting.set(true);
        const call$ = this.reverting() ? this.appointments.revertNoShow(id, reason) : this.appointments.markNoShow(id, reason);

        call$.subscribe({
            next: () => {
                this.submitting.set(false);
                this.visible.set(false);
                this.done.emit();
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.submitError.set(panelHttpFailureMessage(e, this.reverting() ? 'Gelmedi işareti geri alınamadı.' : 'Randevu gelmedi olarak işaretlenemedi.'));
            }
        });
    }
}
