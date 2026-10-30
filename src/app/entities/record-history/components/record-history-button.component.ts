import { Component, inject, input, signal, ChangeDetectionStrategy } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import type { RecordChangeVm, RecordHistoryResource } from '@/app/entities/record-history/models/record-history.model';
import { RecordHistoryService } from '@/app/entities/record-history/services/record-history.service';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * "Değişiklikleri gör" (RECORD-002): kim, ne zaman, hangi alanı neyden neye çevirdi. Geçmiş yalnız diyalog açılınca
 * yüklenir; okuma yetkisi kaydın kendi okuma iznidir (sayfayı görebilen geçmişi de görür).
 */
@Component({
    selector: 'app-record-history-button',
    standalone: true,
    imports: [ButtonModule, DialogModule, AppEmptyStateComponent, AppErrorStateComponent, AppLoadingStateComponent, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <button pButton type="button" class="p-button-secondary" data-testid="record-history-open" (click)="open()"><i class="pi pi-history"></i>Değişiklikleri gör</button>
        <p-dialog header="Değişiklik geçmişi" [modal]="true" [dismissableMask]="true" [style]="{ width: 'min(760px, 95vw)' }" [(visible)]="visible">
            @if (loading()) {
                <app-loading-state message="Geçmiş yükleniyor…" />
            } @else if (error()) {
                <app-error-state [detail]="error()!" (retry)="load()" />
            } @else if (rows().length === 0) {
                <app-empty-state message="Değişiklik kaydı yok." hint="Bu özellikten önceki değişiklikler ve sistemin yaptığı işlemler listede yer almaz." />
            } @else {
                <ol class="list-none m-0 p-0">
                    @for (r of rows(); track r.id) {
                        <li class="mb-4 pb-4 border-b border-surface-200 dark:border-surface-700 last:mb-0 last:pb-0 last:border-b-0" data-testid="record-history-item">
                            <div class="text-sm mb-2">
                                <span class="font-medium">{{ r.kindLabel }}</span>
                                <span class="text-muted-color"> · {{ r.occurredAtUtc | trDateTime }} · {{ r.actorName }}</span>
                            </div>
                            @if (r.changes.length > 0) {
                                <dl class="m-0 grid grid-cols-12 gap-x-3 gap-y-2 text-sm">
                                    @for (c of r.changes; track $index) {
                                        <dt class="col-span-12 sm:col-span-3 text-muted-color">{{ c.label }}</dt>
                                        <dd class="col-span-12 sm:col-span-9 m-0">
                                            <span class="line-through text-muted-color whitespace-pre-wrap">{{ c.oldText }}</span>
                                            <i class="pi pi-arrow-right mx-2 text-xs" aria-hidden="true"></i><span class="sr-only">yeni değer:</span>
                                            <span class="whitespace-pre-wrap">{{ c.newText }}</span>
                                        </dd>
                                    }
                                </dl>
                            }
                        </li>
                    }
                </ol>
            }
        </p-dialog>
    `
})
export class RecordHistoryButtonComponent {
    readonly resource = input.required<RecordHistoryResource>();
    readonly recordId = input.required<string>();

    private readonly service = inject(RecordHistoryService);

    readonly visible = signal(false);
    readonly rows = signal<RecordChangeVm[]>([]);
    readonly loading = signal(false);
    readonly error = signal<string | null>(null);

    open(): void {
        this.visible.set(true);
        this.load();
    }

    /** Her açılışta yeniden okunur: kayıt sayfada düzenlenmiş olabilir. */
    load(): void {
        this.loading.set(true);
        this.error.set(null);
        this.service.getHistory(this.resource(), this.recordId()).subscribe({
            next: (rows) => {
                this.rows.set(rows);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(panelHttpFailureMessage(e, 'Değişiklik geçmişi yüklenemedi.'));
                this.loading.set(false);
            }
        });
    }
}
