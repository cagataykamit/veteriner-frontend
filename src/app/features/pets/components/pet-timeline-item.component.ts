import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ADMINISTRATION_LATE_ENTRY_LABEL } from '@/app/features/administrations/utils/administration-labels';
import type { PetTimelineItemVm } from '@/app/features/pets/models/pet-timeline-vm.model';
import { PET_TIMELINE_VOIDED_LABEL, petTimelineEventLink, petTimelineExaminationLink, petTimelineStatusLabel, petTimelineTypeIcon, petTimelineTypeLabel } from '@/app/features/pets/utils/pet-timeline.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Zaman çizelgesinin tek satırı: tam sayfa ve hasta kartı aynı görünümü kullanır. */
@Component({
    selector: 'li[appPetTimelineItem]',
    standalone: true,
    imports: [RouterLink, TrDateTimePipe],
    host: {
        class: 'flex gap-3 py-3 border-b border-surface-200 dark:border-surface-700 last:border-b-0',
        '[class.opacity-60]': 'item().isVoided'
    },
    template: `
        <i class="pi {{ icon(item().type) }} text-xl text-primary mt-1" [attr.title]="typeLabel(item().type)" [attr.aria-label]="typeLabel(item().type)" data-testid="type-icon"></i>
        <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-baseline gap-x-2">
                <span class="text-muted-color text-sm">{{ item().eventAtUtc | trDateTime }}</span>
                <span class="text-muted-color text-sm">· {{ typeLabel(item().type) }}</span>
                @if (statusLabel(item()); as status) {
                    <span class="text-sm" data-testid="status">· {{ status }}</span>
                }
                @if (item().addedAfterFinalization) {
                    <span class="text-sm font-medium text-amber-700 dark:text-amber-400" data-testid="late-entry">· {{ lateEntryLabel }}</span>
                }
                @if (item().isVoided) {
                    <span class="text-sm font-medium text-red-600 dark:text-red-400" data-testid="voided">· {{ voidedLabel }}</span>
                }
            </div>
            <div class="font-medium break-words">
                @if (eventLink(item()); as link) {
                    <a [routerLink]="link" class="text-primary no-underline" data-testid="event-link">{{ item().title }}</a>
                } @else {
                    {{ item().title }}
                }
                @if (item().summary) {
                    <span class="text-sm font-normal" [class]="item().type === 'Visit' ? 'text-red-600 dark:text-red-400' : 'text-muted-color'" data-testid="summary"> · {{ item().summary }}</span>
                }
            </div>
            <div class="flex flex-wrap gap-x-3 text-sm text-muted-color">
                @if (item().clinicName) {
                    <span>{{ item().clinicName }}</span>
                }
                @if (examinationLink(item()); as exam) {
                    <a [routerLink]="exam" class="text-primary no-underline" data-testid="examination-link">Bağlı muayene →</a>
                }
            </div>
        </div>
    `
})
export class PetTimelineItemComponent {
    readonly item = input.required<PetTimelineItemVm>();

    readonly voidedLabel = PET_TIMELINE_VOIDED_LABEL;
    readonly lateEntryLabel = ADMINISTRATION_LATE_ENTRY_LABEL;
    readonly icon = petTimelineTypeIcon;
    readonly typeLabel = petTimelineTypeLabel;
    readonly statusLabel = petTimelineStatusLabel;
    readonly eventLink = petTimelineEventLink;
    readonly examinationLink = petTimelineExaminationLink;
}
