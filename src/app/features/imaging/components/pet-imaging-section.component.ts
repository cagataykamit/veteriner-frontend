import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { IMAGING_CREATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import type { ImagingRecordListItemVm } from '@/app/features/imaging/models/imaging.model';
import { ImagingRecordsService } from '@/app/features/imaging/services/imaging-records.service';
import { imagingModalityLabel } from '@/app/features/imaging/utils/imaging.utils';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { TrDatePipe } from '@/app/shared/pipes/tr-date.pipe';

/** Hasta kartında son görüntülemeler (yalnız başlık; küçük resim yüklenmez). Okuma yetkisi denetimi çağırandadır. */
@Component({
    selector: 'app-pet-imaging-section',
    standalone: true,
    imports: [RouterLink, TrDatePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <section class="card mb-0" aria-labelledby="pet-imaging-title" data-testid="pet-imaging-section">
            <div class="flex items-center justify-between gap-2 mb-3">
                <h5 id="pet-imaging-title" class="m-0">Görüntüleme</h5>
                @if (canCreate && !ro.mutationBlocked()) {
                    <a routerLink="/panel/imaging/new" [queryParams]="{ clientId: clientId(), petId: petId() }" class="text-primary font-medium no-underline text-sm" data-testid="pet-imaging-new">+ Ekle</a>
                }
            </div>
            @if (loading()) {
                <p class="text-sm text-muted-color m-0">Yükleniyor…</p>
            } @else if (error()) {
                <p class="text-sm text-red-500 m-0" role="alert">{{ error() }}</p>
            } @else if (items().length === 0) {
                <p class="text-sm text-muted-color m-0">Görüntüleme kaydı yok.</p>
            } @else {
                <ul class="list-none m-0 p-0">
                    @for (item of items(); track item.id) {
                        <li class="py-2 border-b border-surface-200 dark:border-surface-700 last:border-b-0">
                            <a [routerLink]="['/panel/imaging', item.id]" class="text-primary font-medium no-underline">{{ modalityLabel(item.modality) }}</a>
                            <span class="text-sm text-muted-color"> · {{ item.performedAtUtc | trDate }} · {{ item.fileCount }} dosya</span>
                            @if (item.description) {
                                <span class="block text-sm text-muted-color break-words">{{ item.description }}</span>
                            }
                        </li>
                    }
                </ul>
                @if (total() > items().length) {
                    <a routerLink="/panel/imaging" [queryParams]="{ petId: petId() }" class="text-primary text-sm no-underline inline-block mt-2">Tümünü gör ({{ total() }})</a>
                }
            }
        </section>
    `
})
export class PetImagingSectionComponent implements OnInit {
    readonly petId = input.required<string>();
    readonly clientId = input.required<string>();

    private readonly imagingService = inject(ImagingRecordsService);
    readonly ro = inject(TenantReadOnlyContextService);
    readonly canCreate = inject(AuthService).hasOperationClaim(IMAGING_CREATE_CLAIM);

    readonly items = signal<ImagingRecordListItemVm[]>([]);
    readonly total = signal(0);
    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly modalityLabel = imagingModalityLabel;

    ngOnInit(): void {
        this.imagingService.list({ petId: this.petId(), page: 1, pageSize: 5 }).subscribe({
            next: (r) => {
                this.items.set(r.items);
                this.total.set(r.totalItems);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message);
                this.loading.set(false);
            }
        });
    }
}
