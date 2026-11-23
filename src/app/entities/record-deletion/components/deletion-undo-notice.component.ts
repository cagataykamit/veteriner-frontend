import { ChangeDetectionStrategy, Component, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ButtonModule } from 'primeng/button';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import type { RecentDeletion } from '@/app/entities/record-deletion/services/recent-deletion.service';

/**
 * Karttan silip listeye dönünce "Silindi · Geri al" bildirimi (ADR-054). Liste bekleyen silmeyi `RecentDeletionService.take` ile
 * alır ve yalnız varsa bu bileşeni çizer. Geri al geri yükleme ucunu çağırır; süre sınırı yoktur (silme her zaman geri yüklenebilir),
 * bildirim kapatılana ya da sayfadan çıkılana kadar kalır.
 */
@Component({
    selector: 'app-deletion-undo-notice',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (!dismissed()) {
            <div class="flex flex-wrap items-center gap-3 rounded-border border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800 px-3 py-2 mb-4" role="status" aria-live="polite" data-testid="deletion-undo-notice">
                @if (state() === 'restored') {
                    <p class="m-0 text-sm flex-1 min-w-0"><i class="pi pi-check-circle mr-2 text-primary" aria-hidden="true"></i><span class="font-medium">{{ deletion().name }}</span> geri yüklendi.</p>
                } @else {
                    <p class="m-0 text-sm flex-1 min-w-0"><i class="pi pi-trash mr-2 text-muted-color" aria-hidden="true"></i><span class="font-medium">{{ deletion().name }}</span> silindi.</p>
                    <button pButton type="button" class="p-button-sm p-button-outlined" [disabled]="state() === 'restoring'" (click)="undo()" data-testid="deletion-undo-button">
                        <i [class]="state() === 'restoring' ? 'pi pi-spin pi-spinner' : 'pi pi-undo'"></i>Geri al
                    </button>
                }
                <button pButton type="button" class="p-button-sm p-button-text p-button-secondary" aria-label="Bildirimi kapat" (click)="dismissed.set(true)"><i class="pi pi-times"></i></button>
                @if (error(); as e) {
                    <p class="m-0 text-sm text-danger basis-full" role="alert" data-testid="deletion-undo-error">{{ e }}</p>
                }
            </div>
        }
    `
})
export class DeletionUndoNoticeComponent {
    readonly deletion = input.required<RecentDeletion>();
    /** Geri yüklendi: liste yeniden okunmalı. */
    readonly restored = output<void>();

    private readonly records = inject(RecordDeletionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly dismissed = signal(false);
    readonly state = signal<'deleted' | 'restoring' | 'restored'>('deleted');
    readonly error = signal<string | null>(null);

    undo(): void {
        if (this.state() !== 'deleted') {
            return;
        }

        const d = this.deletion();

        this.state.set('restoring');
        this.error.set(null);
        this.records
            .restore(d.kind, d.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: () => {
                    this.state.set('restored');
                    this.restored.emit();
                },
                error: (e: unknown) => {
                    this.state.set('deleted');
                    this.error.set(e instanceof Error ? e.message : 'Geri alınamadı.');
                }
            });
    }
}
