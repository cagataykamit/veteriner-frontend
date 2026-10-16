import { ChangeDetectionStrategy, Component, computed, effect, inject, input, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { portalPagedLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { appointmentStatus, appointmentTypeLabel } from '@portal/app/shared/format/portal-labels';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { PortalAppointment, PortalAppointmentScope, PortalAppointmentsApi } from './portal-appointments.api';

const TABS: readonly { readonly scope: PortalAppointmentScope; readonly label: string }[] = [
    { scope: 'upcoming', label: 'Yaklaşan' },
    { scope: 'past', label: 'Geçmiş' }
];

/**
 * Randevularım (sözleşme §6.4): yaklaşan ve geçmiş (son 12 ay) sekmeleri, "Daha fazla göster" ile sayfalama.
 * İptal edilen ve gelinmeyen randevular da durum rozetiyle listelenir. Sekme adres çubuğunda (`?scope=past`) tutulur.
 */
@Component({
    selector: 'portal-appointments',
    standalone: true,
    imports: [ButtonModule, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-appointments.component.html'
})
export class PortalAppointmentsComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly api = inject(PortalAppointmentsApi);
    private readonly router = inject(Router);

    readonly tabs = TABS;

    /** Sorgu parametresi `scope`; bilinmeyen değer "yaklaşan" sayılır. */
    readonly scope = input<string | undefined>(undefined);
    readonly activeScope = computed<PortalAppointmentScope>(() => (this.scope() === 'past' ? 'past' : 'upcoming'));

    readonly list = portalPagedLoad<PortalAppointment>();

    /** Randevular bağın kliniğinden farklı bir klinikteyse (aynı işletmenin şubesi) klinik adı her satırda yazılır. */
    readonly showClinic = computed(() => {
        const clinicId = this.session.activeLink()?.clinicId;

        return this.list.items().some((a) => a.clinicId !== clinicId);
    });

    constructor() {
        effect(() => {
            const link = this.session.activeLink();
            const scope = this.activeScope();

            untracked(() => {
                if (link) {
                    this.list.run((page) => this.api.appointments(link.linkId, scope, page));
                }
            });
        });
    }

    selectTab(scope: PortalAppointmentScope): void {
        if (scope !== this.activeScope()) {
            void this.router.navigate([], { queryParams: { scope: scope === 'past' ? 'past' : null }, replaceUrl: true });
        }
    }

    when(a: PortalAppointment): string {
        return `${formatPortalWeekday(a.scheduledAtUtc)}, ${formatPortalDay(a.scheduledAtUtc)} · ${formatPortalTime(a.scheduledAtUtc)}`;
    }

    detail(a: PortalAppointment): string {
        return [a.petName, appointmentTypeLabel(a.appointmentType), a.durationMinutes > 0 ? `${a.durationMinutes} dk` : ''].filter(Boolean).join(' · ');
    }

    status(a: PortalAppointment) {
        return appointmentStatus(a.status);
    }

    emptyMessage(): string {
        return this.activeScope() === 'past' ? 'Son 12 ayda geçmiş randevunuz yok.' : 'Yaklaşan randevunuz yok.';
    }
}
