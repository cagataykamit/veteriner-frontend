import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, inject, input, model, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { RecordDeletionService } from '@/app/entities/record-deletion/services/record-deletion.service';
import type { DeletableRecordKind } from '@/app/entities/record-deletion/models/record-deletion.model';
import { type DeleteBlockItem, deleteBlockReasonItems, RecordDeletionError } from '@/app/entities/record-deletion/utils/record-deletion-error.utils';
import { DialogFocusReturnDirective } from '@/app/shared/ui/dialog/dialog-focus-return.directive';

/**
 * Müşteri / hasta silme onayı (ADR-054). Ne olacağını söyler: kayıt listelerden ve hatırlatmalardan kalkar, geçmiş korunur,
 * "Silinenler"den geri yüklenir; müşteride hastaları da (sayıyla) silinir ve KVKK talebi için kullanılmadığı yazılır (K7).
 * 409 `*.DeleteBlocked` nedenleri pencerede madde madde, giderileceği ekrana bağlantıyla gösterilir (K5). Yetki çağıranda denetlenir.
 */
@Component({
    selector: 'app-record-delete-dialog',
    standalone: true,
    imports: [RouterLink, ButtonModule, DialogModule, DialogFocusReturnDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-dialog [header]="kind() === 'client' ? 'Müşteriyi sil' : 'Hastayı sil'" [modal]="true" [dismissableMask]="!submitting()" [closable]="!submitting()" [style]="{ width: 'min(520px, 95vw)' }" [(visible)]="visible">
            <p class="mt-0 mb-3" data-testid="delete-subject">
                <span class="font-semibold">{{ recordName() }}</span>
                @if (kind() === 'client' && petCount(); as n) {
                    ve {{ n }} hastası silinecek.
                } @else {
                    silinecek.
                }
            </p>
            <ul class="mt-0 mb-0 pl-5 text-sm text-muted-color space-y-1" data-testid="delete-effects">
                @if (kind() === 'client') {
                    <li>{{ petCount() === 0 ? 'Müşteri' : 'Müşteri ve hastaları' }} listelerden ve hatırlatmalardan kalkar.</li>
                    <li>Kayıtlar silinmez: muayene, ödeme ve belgeler korunur.</li>
                    <li>Yönetici "Silinenler"den geri yükleyebilir.</li>
                    <li>KVKK silme talebi için bu işlem kullanılmaz.</li>
                } @else {
                    <li>Hasta listelerden ve hatırlatmalardan kalkar.</li>
                    <li>Kayıt silinmez: geçmiş kayıtları korunur.</li>
                    <li>Yönetici "Silinenler"den geri yükleyebilir.</li>
                }
            </ul>
            @if (blockItems(); as items) {
                <div class="mt-4 rounded-border border border-red-200 bg-red-50 p-3 text-sm dark:border-red-800 dark:bg-red-900/20" role="alert" data-testid="delete-blocked">
                    <p class="m-0 mb-2 font-semibold text-red-700 dark:text-red-300">{{ kind() === 'client' ? 'Müşteri' : 'Hasta' }} şu an silinemez:</p>
                    <ul class="m-0 pl-5 list-disc space-y-1.5">
                        @for (item of items; track item.reason) {
                            <li [attr.data-testid]="'delete-blocked-' + item.reason">
                                {{ item.text }}
                                <a [routerLink]="item.link.route" [queryParams]="item.link.queryParams" class="text-primary font-medium no-underline whitespace-nowrap touch:touch-hit" (click)="visible.set(false)"
                                    >{{ item.link.label }} →</a
                                >
                            </li>
                        }
                    </ul>
                </div>
            } @else if (submitError(); as msg) {
                <p class="text-danger mt-3 mb-0" role="alert" data-testid="delete-error">{{ msg }}</p>
            }
            <ng-template #footer>
                <button pButton type="button" severity="secondary" (click)="visible.set(false)" [disabled]="submitting()"><i class="p-button-icon pi pi-times"></i>Vazgeç</button>
                <button pButton type="button" severity="danger" [disabled]="submitting()" (click)="onSubmit()" data-testid="delete-confirm">
                    <i class="p-button-icon" [class]="submitting() ? 'pi pi-spin pi-spinner' : 'pi pi-trash'"></i>Sil
                </button>
            </ng-template>
        </p-dialog>
    `
})
export class RecordDeleteDialogComponent {
    readonly visible = model(false);
    readonly kind = input.required<DeletableRecordKind>();
    readonly recordId = input.required<string>();
    readonly recordName = input.required<string>();
    /** Hastanın müşterisi (engel bağlantıları); müşteri silmede müşterinin kendisi. */
    readonly clientId = input<string | null>(null);
    /** Müşteriyle birlikte silinecek hasta sayısı; `null` = bilinmiyor (hasta okuma yetkisi yok ya da yüklenmedi). */
    readonly petCount = input<number | null>(null);
    readonly deleted = output<void>();

    private readonly deletion = inject(RecordDeletionService);
    private readonly destroyRef = inject(DestroyRef);

    readonly submitting = signal(false);
    readonly submitError = signal<string | null>(null);
    private readonly blocked = signal<RecordDeletionError['blocked']>(null);

    readonly blockItems = computed<DeleteBlockItem[] | null>(() => {
        const blocked = this.blocked();

        if (!blocked?.reasons.length) {
            return null;
        }

        const isClient = this.kind() === 'client';

        return deleteBlockReasonItems(blocked, { kind: this.kind(), clientId: isClient ? this.recordId() : this.clientId(), petId: isClient ? null : this.recordId() });
    });

    constructor() {
        effect(() => {
            if (this.visible()) {
                untracked(() => {
                    this.submitError.set(null);
                    this.blocked.set(null);
                });
            }
        });
    }

    onSubmit(): void {
        if (this.submitting()) {
            return;
        }

        const id = this.recordId();
        const request = this.deletion.delete(this.kind(), id);

        this.submitting.set(true);
        this.submitError.set(null);
        this.blocked.set(null);
        request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: () => {
                this.submitting.set(false);
                this.visible.set(false);
                this.deleted.emit();
            },
            error: (e: unknown) => {
                this.submitting.set(false);
                this.blocked.set(e instanceof RecordDeletionError ? e.blocked : null);
                this.submitError.set(e instanceof Error ? e.message : 'Kayıt silinemedi.');
            }
        });
    }
}
