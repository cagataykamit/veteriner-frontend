import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';

/**
 * Boş liste iki ayrı durumdur (H5): filtre ya da arama varsa "uyan kayıt yok" ve "Filtreleri temizle";
 * yoksa listenin kendi "henüz yok" metni ve izin varsa ilk kaydı başlatan düğme. Örnek desen: hatırlatma geçmişi.
 * `createLabel` verilir de `createLink` verilmezse düğme `create` olayını yayar (diyalogla açılan kayıtlar).
 */
@Component({
    selector: 'app-list-empty-state',
    standalone: true,
    imports: [RouterLink, ButtonModule, AppEmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (filtered()) {
            <app-empty-state [message]="copy.listFilteredEmptyMessage" [hint]="copy.listFilteredEmptyHint" iconClass="pi pi-filter-slash">
                <button pButton type="button" size="small" severity="secondary" (click)="clear.emit()" data-testid="list-empty-clear"><i class="p-button-icon pi pi-times"></i>{{ copy.buttonClearFilters }}</button>
            </app-empty-state>
        } @else {
            <app-empty-state [message]="emptyMessage()" [hint]="emptyHint()">
                @if (createLabel(); as label) {
                    @if (createLink(); as link) {
                        <a pButton [routerLink]="link" size="small" data-testid="list-empty-create"><i class="p-button-icon pi pi-plus"></i>{{ label }}</a>
                    } @else {
                        <button pButton type="button" size="small" (click)="create.emit()" data-testid="list-empty-create"><i class="p-button-icon pi pi-plus"></i>{{ label }}</button>
                    }
                }
            </app-empty-state>
        }
    `
})
export class AppListEmptyStateComponent {
    readonly copy = PANEL_COPY;
    /** Arama ya da filtre uygulanmış mı. */
    readonly filtered = input.required<boolean>();
    /** Hiç kayıt yokken: "Henüz randevu yok." gibi. */
    readonly emptyMessage = input.required<string>();
    readonly emptyHint = input<string>();
    /** İlk kaydı başlatan düğme; izin yoksa `null` geçin. */
    readonly createLabel = input<string | null>(null);
    readonly createLink = input<string | null>(null);
    readonly clear = output<void>();
    readonly create = output<void>();
}
