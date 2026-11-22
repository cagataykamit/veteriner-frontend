import { Component, computed, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import type { PetTimelineItemVm } from '@/app/entities/pet/models/pet-timeline-vm.model';
import { PetTimelineItemComponent } from '@/app/features/pets/components/pet-timeline-item.component';
import { groupPetTimelineByDay, petTimelineOtherClinicName, type PetTimelineActiveClinic } from '@/app/features/pets/utils/pet-timeline.utils';

/** Zaman çizelgesi gün başlıkları altında ("20 Kasım 2026 · Cuma · 2 gün önce"); hasta kartı ve tam sayfa aynı listeyi kullanır. */
@Component({
    selector: 'app-pet-timeline-list',
    standalone: true,
    imports: [PetTimelineItemComponent],
    host: { class: 'block' },
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @for (day of days(); track day.key; let first = $first) {
            <section [class.mt-5]="!first" [attr.aria-label]="day.title" data-testid="timeline-day">
                <div class="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5 pb-2 border-b-2 border-surface-200 dark:border-surface-700">
                    <h6 class="m-0 text-base font-semibold" data-testid="day-title">{{ day.title }}</h6>
                    @if (day.detail) {
                        <span class="text-sm text-muted-color">{{ day.detail }}</span>
                    }
                    <span class="ml-auto text-xs text-muted-color">{{ day.items.length }} kayıt</span>
                </div>
                <ol class="list-none m-0 p-0">
                    @for (item of day.items; track item.key) {
                        <li appPetTimelineItem [item]="item" [clinicName]="otherClinicName(item)"></li>
                    }
                </ol>
            </section>
        }
    `
})
export class PetTimelineListComponent {
    private readonly auth = inject(AuthService);

    readonly items = input.required<readonly PetTimelineItemVm[]>();

    readonly days = computed(() => groupPetTimelineByDay(this.items()));
    private readonly activeClinic = computed<PetTimelineActiveClinic>(() => ({ id: this.auth.getClinicId(), name: this.auth.getClinicName() }));

    otherClinicName(item: PetTimelineItemVm): string | null {
        return petTimelineOtherClinicName(item, this.activeClinic());
    }
}
