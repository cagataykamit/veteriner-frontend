import { Component, computed, input, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TagModule } from 'primeng/tag';
import { ADMINISTRATION_LATE_ENTRY_LABEL } from '@/app/entities/administration/utils/administration-labels';
import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import {
    PET_TIMELINE_VOIDED_LABEL,
    petTimelineAppointmentLink,
    petTimelineEventLink,
    petTimelineExaminationLink,
    petTimelineIsDateOnly,
    petTimelineRowTypeLabel,
    petTimelineStatus,
    petTimelineTreatmentLink,
    petTimelineTypeIcon,
    petTimelineTypeLabel,
    petTimelineTypeTone
} from '@/app/features/pets/utils/pet-timeline.utils';
import { formatTimeDisplay } from '@/app/shared/utils/date.utils';

/**
 * Zaman çizelgesinin tek satırı (gün başlığı altında): saat, renkli tür simgesi, başlık ve durum tek hizada.
 * Telefon genişliğinde saat tür etiketinin yanına, durum başlığın altına iner. Olağan durum soluk; bekleyen, sonradan eklenen ve iptal renkli.
 */
@Component({
    selector: 'li[appPetTimelineItem]',
    standalone: true,
    imports: [RouterLink, TagModule],
    host: {
        class: 'grid grid-cols-[2rem_minmax(0,1fr)] sm:grid-cols-[3rem_2rem_minmax(0,1fr)_auto] items-start sm:items-center gap-x-3 gap-y-1.5 py-2.5 border-b border-surface-200 dark:border-surface-700 last:border-b-0'
    },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <span class="hidden sm:block text-sm text-muted-color text-right tabular-nums" data-testid="time">{{ time() }}</span>
        <span class="grid place-items-center w-8 h-8 rounded-lg {{ tone().text }} {{ tone().tile }}" role="img" [attr.title]="typeLabel()" [attr.aria-label]="typeLabel()" data-testid="type-icon">
            <i class="pi {{ icon() }}" aria-hidden="true"></i>
        </span>
        <div class="min-w-0">
            <div class="font-semibold break-words" [class.line-through]="item().isVoided" [class.text-muted-color]="item().isVoided" data-testid="title">
                @if (eventLink(); as link) {
                    <a [routerLink]="link" class="no-underline hover:text-primary hover:underline" [class.text-color]="!item().isVoided" data-testid="event-link">{{ item().title }}</a>
                } @else {
                    {{ item().title }}
                }
            </div>
            <div class="flex flex-wrap items-baseline gap-x-1.5 text-sm text-muted-color">
                <span class="font-semibold {{ tone().text }}" data-testid="type-label">{{ rowTypeLabel() }}</span>
                @if (!dateOnly()) {
                    <span class="sm:hidden tabular-nums">· {{ time() }}</span>
                }
                @if (item().summary) {
                    <span [class]="item().type === 'Visit' ? 'font-semibold text-danger' : 'text-muted-color'" data-testid="summary">· {{ item().summary }}</span>
                }
                @if (clinicName()) {
                    <span data-testid="clinic-name">· {{ clinicName() }}</span>
                }
                @if (appointmentLink(); as appointment) {
                    <span>· <a [routerLink]="appointment" class="text-primary no-underline touch:touch-hit" data-testid="appointment-link">Randevu →</a></span>
                }
                @if (examinationLink(); as exam) {
                    <span>· <a [routerLink]="exam" class="text-primary no-underline touch:touch-hit" data-testid="examination-link">Bağlı muayene →</a></span>
                }
                @if (treatmentLink(); as treatment) {
                    <span>· <a [routerLink]="treatment" class="text-primary no-underline touch:touch-hit" data-testid="treatment-link">Bağlı tedavi →</a></span>
                }
            </div>
        </div>
        @if (item().isVoided || status() || item().addedAfterFinalization) {
            <div class="col-start-2 sm:col-start-auto flex flex-wrap items-center gap-1.5 sm:justify-end">
                @if (item().isVoided) {
                    <p-tag severity="danger" [value]="voidedLabel" data-testid="voided" />
                } @else if (status(); as s) {
                    @if (s.tone === 'quiet') {
                        <span class="inline-flex items-center gap-1 text-sm text-muted-color" data-testid="status"><i class="pi pi-check text-xs" aria-hidden="true"></i>{{ s.label }}</span>
                    } @else {
                        <p-tag [severity]="s.tone === 'danger' ? 'danger' : 'warn'" [value]="s.label" data-testid="status" />
                    }
                }
                @if (item().addedAfterFinalization) {
                    <p-tag severity="warn" [value]="lateEntryLabel" data-testid="late-entry" />
                }
            </div>
        }
    `
})
export class PetTimelineItemComponent {
    readonly item = input.required<PetTimelineItemVm>();
    /** Yalnız kayıt aktif klinikten başkasındaysa dolu (karar listededir). */
    readonly clinicName = input<string | null>(null);

    readonly voidedLabel = PET_TIMELINE_VOIDED_LABEL;
    readonly lateEntryLabel = ADMINISTRATION_LATE_ENTRY_LABEL;

    readonly typeLabel = computed(() => petTimelineTypeLabel(this.item().type));
    readonly rowTypeLabel = computed(() => petTimelineRowTypeLabel(this.item().type));
    readonly icon = computed(() => petTimelineTypeIcon(this.item().type));
    readonly tone = computed(() => petTimelineTypeTone(this.item().type));
    readonly dateOnly = computed(() => petTimelineIsDateOnly(this.item().type));
    /** Yalnız tarihli kayıtta saat sütunu "—". */
    readonly time = computed(() => (this.dateOnly() ? '—' : formatTimeDisplay(this.item().eventAtUtc)));
    /** İptal etiketi durumun yerini alır. */
    readonly status = computed(() => (this.item().isVoided ? null : petTimelineStatus(this.item())));
    readonly eventLink = computed(() => petTimelineEventLink(this.item()));
    readonly examinationLink = computed(() => petTimelineExaminationLink(this.item()));
    readonly treatmentLink = computed(() => petTimelineTreatmentLink(this.item()));
    readonly appointmentLink = computed(() => petTimelineAppointmentLink(this.item()));
}
