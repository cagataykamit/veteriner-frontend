import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import type { AppointmentRequestDetailVm } from '@/app/entities/online-booking/models/online-booking.model';
import type { TagSeverity } from '@/app/entities/online-booking/utils/appointment-request-labels.utils';
import { appointmentRequestTimeline, appointmentRequestTimelineAppointment } from '@/app/entities/online-booking/utils/appointment-request-timeline.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';

const DOT: Record<TagSeverity, string> = {
    success: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
    danger: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    warn: 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
    info: 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300',
    secondary: 'bg-surface-100 text-muted-color dark:bg-surface-800'
};

/**
 * Talep geçmişi zaman çizelgesi (APPT-024): her olayda ne oldu, hangi durumdan hangisine, kim, ne zaman ve gerekçe; onaylı talepte
 * sonda oluşan randevunun güncel hali ve bağlantısı. Randevu yeni sekmede açılır, talep penceresi kaybolmaz.
 */
@Component({
    selector: 'app-appointment-request-timeline',
    standalone: true,
    imports: [RouterLink, TrDateTimePipe, AppStatusTagComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <section aria-labelledby="request-timeline-title" data-testid="request-timeline">
            <h6 id="request-timeline-title" class="m-0 mb-3">Geçmiş</h6>
            <ol class="list-none m-0 p-0">
                @for (e of events(); track $index; let last = $last) {
                    <li class="relative flex gap-3 pb-4" data-testid="request-timeline-event">
                        @if (!last || appointment()) {
                            <span class="absolute left-[0.875rem] top-7 bottom-0 w-px bg-surface-200 dark:bg-surface-700" aria-hidden="true"></span>
                        }
                        <span class="grid place-items-center w-7 h-7 rounded-full shrink-0 {{ dot[e.severity] }}" aria-hidden="true"><i class="pi {{ e.icon }} text-xs"></i></span>
                        <div class="min-w-0 flex-1 text-sm">
                            <div class="flex flex-wrap items-baseline gap-x-2">
                                <span class="font-medium" data-testid="event-title">{{ e.title }}</span>
                                <span class="text-muted-color">{{ e.atUtc | trDateTime }}</span>
                            </div>
                            <div class="text-muted-color" data-testid="event-meta">
                                <span data-testid="event-actor">{{ e.actor }}</span> ·
                                @if (e.fromLabel) {
                                    <span data-testid="event-transition">{{ e.fromLabel }} <i class="pi pi-arrow-right text-xs mx-1" aria-hidden="true"></i><span class="sr-only">sonra </span>{{ e.toLabel }}</span>
                                } @else {
                                    <span data-testid="event-transition">{{ e.toLabel }}</span>
                                }
                            </div>
                            @for (line of e.details; track $index) {
                                <div class="whitespace-pre-wrap break-words" data-testid="event-detail">{{ line }}</div>
                            }
                        </div>
                    </li>
                }
                @if (appointment(); as a) {
                    <li class="relative flex gap-3" data-testid="request-timeline-appointment">
                        <span class="grid place-items-center w-7 h-7 rounded-full shrink-0 bg-primary-50 dark:bg-primary-950 text-primary" aria-hidden="true"><i class="pi pi-calendar text-xs"></i></span>
                        <div class="min-w-0 flex-1 text-sm">
                            <div class="flex flex-wrap items-center gap-2">
                                <span class="font-medium">Oluşan randevu</span>
                                @if (a.statusLabel) {
                                    <app-status-tag [label]="a.statusLabel" [severity]="a.statusSeverity" data-testid="appointment-status" />
                                }
                            </div>
                            @if (a.whenText) {
                                <div>{{ a.whenText }}</div>
                            }
                            @if (a.movedAfterApproval) {
                                <div class="text-amber-700 dark:text-amber-300" data-testid="appointment-moved">Onaydan sonra taşındı.</div>
                            }
                            <a class="font-medium" [routerLink]="['/panel/appointments', a.id]" target="_blank" data-testid="request-appointment-link"
                                >Randevuyu aç <i class="pi pi-external-link text-xs" aria-hidden="true"></i
                            ></a>
                        </div>
                    </li>
                }
            </ol>
        </section>
    `
})
export class AppointmentRequestTimelineComponent {
    readonly detail = input.required<AppointmentRequestDetailVm>();

    readonly dot = DOT;
    readonly events = computed(() => appointmentRequestTimeline(this.detail()));
    readonly appointment = computed(() => appointmentRequestTimelineAppointment(this.detail()));
}
