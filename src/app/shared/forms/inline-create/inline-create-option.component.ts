import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { InlineCreateDirective } from '@/app/shared/forms/inline-create/inline-create.directive';

/** Yetkisiz kullanıcıya tek cümle (O1). */
export const INLINE_CREATE_NO_PERMISSION = 'Eklemek için yöneticinize başvurun.';

/**
 * Seçicinin boş durumu (O1): aranan yoksa "+ ‘Mama’ ekle", liste tamamen boşsa "Adını yazıp ekleyin".
 * `p-select[appInlineCreate]` içindeki `#emptyfilter` / `#empty` şablonunda kullanılır.
 */
@Component({
    selector: 'app-inline-create-option',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
        <div class="py-1" data-testid="inline-create">
            @if (name()) {
                <span>‘{{ name() }}’ bulunamadı.</span>
            } @else {
                <span>{{ emptyText() }}</span>
            }
            @if (inline.canCreate) {
                @if (name()) {
                    <div>
                        <button
                            pButton
                            type="button"
                            [text]="true"
                            size="small"
                            class="p-0"
                            [disabled]="inline.busy()"
                            data-testid="inline-create-add"
                            (mousedown)="$event.preventDefault()"
                            (click)="inline.createFromQuery()"
                        ><i class="p-button-icon" [class]="inline.busy() ? 'pi pi-spin pi-spinner' : 'pi pi-plus'"></i>‘{{ name() }}’ ekle</button>
                    </div>
                } @else {
                    <small class="block text-muted-color">Arama kutusuna adını yazıp ekleyebilirsiniz.</small>
                }
            } @else {
                <small class="block text-muted-color">{{ inline.appInlineCreate().unavailableReason ?? noPermission }}</small>
            }
            @if (inline.error(); as message) {
                <small class="block text-danger" role="alert">{{ message }}</small>
            }
        </div>
    `
})
export class InlineCreateOptionComponent {
    /** Liste tamamen boşken gösterilecek metin. */
    readonly emptyText = input('Henüz kayıt yok.');

    protected readonly inline = inject(InlineCreateDirective);
    protected readonly name = computed(() => this.inline.query().trim());
    protected readonly noPermission = INLINE_CREATE_NO_PERMISSION;
}
