import { Component, inject, input, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ExaminationAddendumDialogComponent } from '@/app/features/examinations/components/examination-addendum-dialog.component';
import type { ExaminationAddendumVm } from '@/app/entities/examination/models/examination-vm.model';
import { ExaminationsService } from '@/app/entities/examination/services/examinations.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Kesinleşmiş muayenenin ek notları (en eski önce) ve "Ek not ekle" eylemi.
 * Yalnızca `Finalized` muayenede kullanılır; ek not yazma izni (`canAdd`) çağıranda belirlenir.
 */
@Component({
    selector: 'app-examination-addenda-section',
    standalone: true,
    imports: [ButtonModule, AppEmptyStateComponent, AppErrorStateComponent, ExaminationAddendumDialogComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="card" data-testid="addenda-section">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
                <h4 class="mt-0 mb-0 text-xl font-semibold">Kesinleşme sonrası ek notlar</h4>
                @if (canAdd()) {
                    <button pButton type="button" class="p-button-secondary" data-testid="addendum-open" (click)="dialogVisible.set(true)"><i class="pi pi-plus"></i>Ek not ekle</button>
                }
            </div>
            @if (loading() && addenda().length === 0) {
                <p class="m-0 text-muted-color">Ek notlar yükleniyor…</p>
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (addenda().length === 0) {
                <app-empty-state message="Ek not yok." />
            } @else {
                <ul class="list-none m-0 p-0" [class.opacity-60]="loading()" [attr.aria-busy]="loading()">
                    @for (a of addenda(); track a.id) {
                        <li class="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700 last:mb-0 last:pb-0 last:border-b-0" data-testid="addendum-item">
                            <div class="text-muted-color text-sm mb-1">
                                {{ a.createdAtUtc | trDateTime }}
                                @if (a.createdByName) {
                                    · {{ a.createdByName }}
                                }
                            </div>
                            <div class="text-sm mb-1"><span class="text-muted-color">Gerekçe:</span> {{ a.reason }}</div>
                            <p class="m-0 whitespace-pre-wrap">{{ a.text }}</p>
                        </li>
                    }
                </ul>
            }
        </div>
        <app-examination-addendum-dialog [examinationId]="examinationId()" [(visible)]="dialogVisible" (added)="load()" />
    `
})
export class ExaminationAddendaSectionComponent implements OnInit {
    readonly examinationId = input.required<string>();
    readonly canAdd = input(false);

    private readonly examinationsService = inject(ExaminationsService);

    readonly addenda = signal<ExaminationAddendumVm[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);
    readonly dialogVisible = signal(false);

    ngOnInit(): void {
        this.load();
    }

    /** Listeyi sunucudan yeniler (yeni ek not sonrası ad ve sıra sunucudan gelir). */
    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.examinationsService.getAddenda(this.examinationId()).subscribe({
            next: (list) => {
                this.addenda.set(list);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(panelHttpFailureMessage(e, 'Ek notlar yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
