import { Injectable } from '@angular/core';
import type { DeletableRecordKind } from '@/app/entities/record-deletion/models/record-deletion.model';

/** Kartta az önce silinen kayıt; listeye dönüldüğünde "Silindi · Geri al" bildirimi gösterilir. */
export interface RecentDeletion {
    readonly kind: DeletableRecordKind;
    readonly id: string;
    readonly name: string;
}

/**
 * Kart silmeden sonra listeye döner; sayfaya özgü bildirim kutusu gezinmede kaybolduğundan son silme burada bekler.
 * Liste bildirimi `take` ile bir kez alır (geri gelişte ya da yenilemede tekrar çıkmaz).
 */
@Injectable({ providedIn: 'root' })
export class RecentDeletionService {
    private pending: RecentDeletion | null = null;

    remember(deletion: RecentDeletion): void {
        this.pending = deletion;
    }

    take(kind: DeletableRecordKind): RecentDeletion | null {
        const pending = this.pending?.kind === kind ? this.pending : null;

        if (pending) {
            this.pending = null;
        }

        return pending;
    }
}
