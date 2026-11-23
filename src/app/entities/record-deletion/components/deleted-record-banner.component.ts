import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import type { DeletableRecordKind } from '@/app/entities/record-deletion/models/record-deletion.model';
import { type DeleteBlockLink, restoreErrorLink } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';

/**
 * Silinmiş kaydın kartı kimlikle açılınca üstteki uyarı bandı (ADR-054 K2): "Bu kayıt silindi · tarih · kim" ve "Geri yükle" (izin varsa).
 * Müşterisiyle birlikte silinen hasta tek başına geri yüklenmez; bant müşteri kartına yönlendirir (K6). Geri yükleme hatasında
 * sunucu metni ve gerekirse bağlantı (müşterisi silinmiş hasta → müşteri kartı, çakışan müşteri → o kart) gösterilir.
 */
@Component({
    selector: 'app-deleted-record-banner',
    standalone: true,
    imports: [RouterLink, ButtonModule, TrDateTimePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: { class: 'block mb-4' },
    template: `
        <div class="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-border border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-900/25" role="status" data-testid="deleted-record-banner">
            <i class="pi pi-trash text-amber-700 dark:text-amber-300" aria-hidden="true"></i>
            <div class="min-w-0 flex-1 basis-64 text-sm">
                <p class="m-0 font-semibold text-surface-900 dark:text-surface-0" data-testid="deleted-record-when">
                    Bu kayıt silindi · {{ deletedAtUtc() | trDateTime }}
                    @if (deletedByName(); as by) {
                        · <span data-testid="deleted-record-by">{{ by }}</span>
                    }
                </p>
                <p class="m-0 mt-0.5 text-muted-color">
                    {{ deletedWithClient() ? 'Müşterisiyle birlikte silindi. ' : '' }}Listelerde ve hatırlatmalarda görünmez; geçmiş kayıtları korunur. Yeni işlem yapılamaz.
                </p>
                @if (error(); as e) {
                    <p class="m-0 mt-2 text-danger" role="alert" data-testid="deleted-record-restore-error">
                        {{ e.message }}
                        @if (e.link; as link) {
                            <a [routerLink]="link.route" class="text-primary font-medium no-underline whitespace-nowrap ml-1">{{ link.label }} →</a>
                        }
                    </p>
                }
            </div>
            @if (canRestore()) {
                @if (clientCardLink(); as link) {
                    <a [routerLink]="link" pButton type="button" class="p-button-outlined p-button-secondary" data-testid="deleted-record-client-link"><i class="pi pi-user"></i>Müşteri kartından geri yükle</a>
                } @else {
                    <button pButton type="button" class="p-button-outlined" [disabled]="restoring()" (click)="restore()" data-testid="deleted-record-restore">
                        <i [class]="restoring() ? 'pi pi-spin pi-spinner' : 'pi pi-undo'"></i>Geri yükle
                    </button>
                }
            }
        </div>
    `
})
export class DeletedRecordBannerComponent {
    readonly kind = input.required<DeletableRecordKind>();
    readonly recordId = input.required<string>();
    readonly deletedAtUtc = input.required<string>();
    /** Silen kullanıcının adı; bilinmiyorsa yalnız tarih yazılır. */
    readonly deletedByName = input<string | null>(null);
    /** `Clients.Delete` / `Pets.Delete` ve yazılabilir kiracı; çağıran belirler. */
    readonly canRestore = input(false);
    readonly deletedWithClient = input(false);
    /** Hastanın müşterisi (bağlantılar için). */
    readonly clientId = input<string | null>(null);
    readonly restored = output<void>();

    private readonly deletion = inject(RecordDeletionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly restoring = signal(false);
    readonly error = signal<{ message: string; link: DeleteBlockLink | null } | null>(null);

    /** Birlikte silinen hasta müşteriyle geri gelir: düğme müşteri kartına gider. */
    readonly clientCardLink = computed(() => (this.kind() === 'pet' && this.deletedWithClient() && this.clientId() ? ['/panel/clients', this.clientId()!] : null));

    restore(): void {
        if (this.restoring()) {
            return;
        }

        const id = this.recordId();
        const request = this.deletion.restore(this.kind(), id);

        this.restoring.set(true);
        this.error.set(null);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.restoring.set(false);
                this.restored.emit();
            },
            error: (e: unknown) => {
                this.restoring.set(false);
                this.error.set({ message: e instanceof Error ? e.message : 'Kayıt geri yüklenemedi.', link: restoreErrorLink(e, this.clientId()) });
            }
        });
    }
}
