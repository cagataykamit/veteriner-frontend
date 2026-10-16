import { ChangeDetectionStrategy, Component, inject, input, model, output } from '@angular/core';
import { AppointmentsService } from '@/app/features/appointments/services/appointments.service';
import { ReasonConfirmDialogComponent } from '@/app/shared/ui/reason-confirm-dialog/reason-confirm-dialog.component';
import { formatUtcIsoAsLocalDateDisplay, formatUtcIsoAsLocalTimeDisplay } from '@/app/shared/utils/date.utils';

/** İptal edilecek randevu (liste satırından yeterli alanlar). */
export interface AppointmentCancelTarget {
    id: string;
    petName: string;
    clientName: string;
    scheduledAtUtc: string | null;
}

/**
 * Randevu iptali (`Appointments.Cancel`, `POST …/cancel`); gerekçe opsiyonel (en çok 500), yazılırsa sunucu randevu notuna ekler.
 * Sunucuda iptalden geri dönüş ucu yoktur. Yetki ve durum (`canCancelAppointment`) denetimi çağıran bileşende yapılır.
 */
@Component({
    selector: 'app-appointment-cancel-dialog',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ReasonConfirmDialogComponent],
    template: `
        <app-reason-confirm-dialog
            [(visible)]="visible"
            header="Randevuyu iptal et"
            [summary]="summary()"
            description="Randevu iptal edilecek; iptal geri alınamaz. Gerekçe yazarsanız randevu notlarına eklenir."
            confirmLabel="Randevuyu iptal et"
            failureFallback="Randevu iptal edilemedi."
            [reasonOptional]="true"
            [execute]="execute"
            (confirmed)="cancelled.emit()"
        />
    `
})
export class AppointmentCancelDialogComponent {
    readonly visible = model(false);
    readonly target = input<AppointmentCancelTarget | null>(null);
    readonly cancelled = output<void>();

    private readonly appointmentsService = inject(AppointmentsService);

    protected summary(): string | null {
        const t = this.target();

        if (!t) {
            return null;
        }

        const when = t.scheduledAtUtc ? `${formatUtcIsoAsLocalDateDisplay(t.scheduledAtUtc)} ${formatUtcIsoAsLocalTimeDisplay(t.scheduledAtUtc)}` : null;

        return [t.petName, t.clientName, when].filter((x) => !!x).join(' · ');
    }

    protected readonly execute = (reason: string) => this.appointmentsService.cancelAppointment(this.target()!.id, reason);
}
