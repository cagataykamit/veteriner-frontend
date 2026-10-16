import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin, map, Observable, of } from 'rxjs';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalAppointment, PortalAppointmentsApi } from '@portal/app/features/appointments/portal-appointments.api';
import { hasOutstanding, PortalBalance, PortalBalanceApi } from '@portal/app/features/balance/portal-balance.api';
import { isDeceased, PortalPet, PortalPetsApi } from '@portal/app/features/pets/portal-pets.api';
import { portalLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDay, formatPortalTime, formatPortalWeekday } from '@portal/app/shared/format/portal-date';
import { appointmentTypeLabel } from '@portal/app/shared/format/portal-labels';
import { formatPortalMoney } from '@portal/app/shared/format/portal-money';
import { PortalEmptyState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { nextScheduledAppointment, PortalPetVaccinationsEntry, PortalVaccineSummary, summarizeVaccines } from './portal-home.summary';

/** Ana ekranda en yakın planlı randevuyu bulmak için bakılan ilk sayfa boyu. */
const HOME_APPOINTMENT_PAGE_SIZE = 20;

/**
 * Ana ekran (Dilim 2): seçili klinik, en yakın randevu, gecikmiş/yaklaşan aşı, bakiye özeti ve hayvan kartları.
 * Her kart kendi isteğiyle yüklenir; biri hata verirse yalnız o kart "Tekrar dene" gösterir. Kartlar ilgili sayfaya gider.
 * Müşteriye dönük dil: "hayvanınız/hayvanlarınız" (ADR-022 madde 5).
 */
@Component({
    selector: 'portal-home',
    standalone: true,
    imports: [RouterLink, PortalEmptyState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-home.component.html'
})
export class PortalHomeComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly petsApi = inject(PortalPetsApi);
    private readonly appointmentsApi = inject(PortalAppointmentsApi);
    private readonly balanceApi = inject(PortalBalanceApi);

    readonly pets = portalLoad<PortalPet[]>();
    readonly vaccines = portalLoad<PortalVaccineSummary>();
    readonly appointment = portalLoad<PortalAppointment | null>();
    readonly balance = portalLoad<PortalBalance>();

    /** Görünen ad; yoksa bağdaki müşteri adı; ikisi de boşsa yalnız "Merhaba". */
    readonly greeting = computed(() => {
        const name = this.session.me()?.displayName?.trim() || this.session.activeLink()?.clientFullName?.trim();

        return name ? `Merhaba, ${name}` : 'Merhaba';
    });

    readonly clinicInitial = computed(() => (this.session.activeLink()?.clinicName ?? '').trim().charAt(0).toLocaleUpperCase('tr-TR'));

    /** Aşı kartı: tek hayvanın aşısıysa doğrudan o hayvanın sayfası. */
    readonly vaccineLink = computed(() => {
        const summary = this.vaccines.data();
        const alerts = summary ? (summary.overdue.length > 0 ? summary.overdue : summary.next ? [summary.next] : []) : [];
        const petIds = new Set(alerts.map((a) => a.petId));

        return petIds.size === 1 ? ['/pets', alerts[0].petId] : ['/pets'];
    });

    constructor() {
        // Klinik değişince (çok klinikli hesap) tüm kartlar yeni bağla baştan yüklenir.
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.load(link.linkId);
                }
            });
        });

        // Aşı kartı hayvan listesi gelince yüklenir; liste ikinci kez istenmez.
        // Bağ değişimini izlemez: liste o bağ için yeniden geldiğinde tetiklenir (eski listeyle istek atılmaz).
        effect(() => {
            const pets = this.pets.data();

            untracked(() => {
                const link = this.session.activeLink();

                if (pets && link) {
                    this.loadVaccines(link.linkId, pets);
                }
            });
        });
    }

    load(linkId: string): void {
        this.pets.run(() => this.petsApi.pets(linkId));
        this.appointment.run(() =>
            this.appointmentsApi.appointments(linkId, 'upcoming', 1, HOME_APPOINTMENT_PAGE_SIZE).pipe(map((page) => nextScheduledAppointment(page.items)))
        );
        this.balance.run(() => this.balanceApi.balance(linkId));
    }

    /** Aşı kartında "Tekrar dene": hayvan listesi yoksa önce o yeniden istenir. */
    retryVaccines(): void {
        const pets = this.pets.data();
        const link = this.session.activeLink();

        if (pets && link) {
            this.loadVaccines(link.linkId, pets);
        } else {
            this.pets.retry();
        }
    }

    hasOutstanding(balance: PortalBalance): boolean {
        return hasOutstanding(balance);
    }

    isDeceased(pet: PortalPet): boolean {
        return isDeceased(pet);
    }

    money(amount: number, currency: string): string {
        return formatPortalMoney(amount, currency);
    }

    day(utc: string | null): string {
        return formatPortalDay(utc);
    }

    appointmentWhen(a: PortalAppointment): string {
        return `${formatPortalWeekday(a.scheduledAtUtc)}, ${formatPortalDay(a.scheduledAtUtc)} · ${formatPortalTime(a.scheduledAtUtc)}`;
    }

    appointmentType(a: PortalAppointment): string {
        return appointmentTypeLabel(a.appointmentType);
    }

    /** Yüklenmiş hayvan listesindeki her etkin hayvanın aşıları (müşteri başına küçük liste; vefat edenler istenmez). */
    private loadVaccines(linkId: string, pets: readonly PortalPet[]): void {
        const requests: Observable<PortalPetVaccinationsEntry>[] = pets
            .filter((pet) => !isDeceased(pet))
            .map((pet) => this.petsApi.vaccinations(linkId, pet.petId).pipe(map((vaccinations) => ({ pet, vaccinations }))));

        this.vaccines.run(() => (requests.length ? forkJoin(requests) : of([])).pipe(map(summarizeVaccines)));
    }
}
