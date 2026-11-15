import { DestroyRef, Directive, inject, input, signal } from '@angular/core';
import { type AbstractControl, NgControl } from '@angular/forms';
import type { Observable } from 'rxjs';
import { AutoComplete } from 'primeng/autocomplete';
import { Select } from 'primeng/select';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Seçicide yerinde ekleme ayarı (O1).
 * - Tek alanlı kayıt: `create(ad)` kaydı oluşturur, seçenek listesine ekler ve seçilecek değeri döndürür.
 * - Çok alanlı kayıt: `openDialog(ad)` küçük diyaloğu açar; seçim diyalog kaydında sayfanın işidir.
 */
export interface InlineCreateConfig {
    canCreate: boolean;
    create?: (name: string) => Observable<unknown>;
    /** `control`: seçicinin kontrolü; satır satır seçicilerde (ör. mal kabul) seçim o satıra yazılır. */
    openDialog?: (name: string, control: AbstractControl | null) => void;
    /** Bu akışta ekleme anlamsızsa (ör. stoksuz ürün stoktan düşülemez) yetki cümlesi yerine yazılacak neden ve yol. */
    unavailableReason?: string;
}

/**
 * Seçici (`p-select` ya da `p-autocomplete`) aranan kaydı bulamazsa "+ ‘Mama’ ekle" sunar (O1).
 * Görünüm `app-inline-create-option` ile seçicinin `#emptyfilter` / `#empty` şablonuna konur; yetkisiz kullanıcıya
 * "Eklemek için yöneticinize başvurun." yazar. Filtre kutusunda Enter da ekler.
 *
 * ```html
 * <p-select [filter]="true" [appInlineCreate]="categoryCreate" ...>
 *     <ng-template #emptyfilter><app-inline-create-option /></ng-template>
 *     <ng-template #empty><app-inline-create-option /></ng-template>
 * </p-select>
 * ```
 */
@Directive({ selector: 'p-select[appInlineCreate], p-autocomplete[appInlineCreate]', standalone: true, exportAs: 'appInlineCreate' })
export class InlineCreateDirective {
    readonly appInlineCreate = input.required<InlineCreateConfig>();

    private readonly select = inject(Select, { optional: true, self: true });
    private readonly autoComplete = inject(AutoComplete, { optional: true, self: true });
    private readonly ngControl = inject(NgControl, { optional: true, self: true });

    readonly query = signal('');
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    constructor() {
        const destroyRef = inject(DestroyRef);
        const subscriptions = [
            this.select?.onFilter.subscribe((e: { filter?: string | null }) => {
                this.setQuery(e.filter);
                this.bindFilterEnter();
            }),
            this.autoComplete?.completeMethod.subscribe((e: { query?: string | null }) => this.setQuery(e.query))
        ];

        destroyRef.onDestroy(() => subscriptions.forEach((s) => s?.unsubscribe()));
    }

    get canCreate(): boolean {
        const config = this.appInlineCreate();

        return config.canCreate && (!!config.create || !!config.openDialog);
    }

    /** Yazılan ad ile ekler. Çok alanlı kayıtta diyalog açılır. */
    createFromQuery(): void {
        const name = this.query().trim();
        const config = this.appInlineCreate();

        if (!name || !this.canCreate || this.busy()) {
            return;
        }

        if (config.openDialog) {
            this.closePanel();
            config.openDialog(name, this.ngControl?.control ?? null);

            return;
        }

        this.busy.set(true);
        this.error.set(null);
        config.create!(name).subscribe({
            next: (value) => {
                this.busy.set(false);
                this.ngControl?.control?.setValue(value);
                this.ngControl?.control?.markAsDirty();
                this.closePanel();
            },
            error: (e: unknown) => {
                this.busy.set(false);
                this.error.set(panelHttpFailureMessage(e, 'Kayıt eklenemedi.'));
            }
        });
    }

    private setQuery(value: string | null | undefined): void {
        this.query.set(value ?? '');
        this.error.set(null);
    }

    private closePanel(): void {
        this.select?.resetFilter();
        this.select?.hide();
        this.autoComplete?.hide();
        this.query.set('');
    }

    /** Filtre kutusunda sonuç yokken Enter: klavyeyle çalışan kullanıcı ekleme düğmesine inmek zorunda kalmaz. */
    private bindFilterEnter(): void {
        const input = this.select?.filterViewChild()?.nativeElement as HTMLInputElement | undefined;

        if (!input || input.dataset['inlineCreateBound']) {
            return;
        }

        input.dataset['inlineCreateBound'] = '1';
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && this.select!.visibleOptions().length === 0 && this.query().trim()) {
                event.preventDefault();
                this.createFromQuery();
            }
        });
    }
}
