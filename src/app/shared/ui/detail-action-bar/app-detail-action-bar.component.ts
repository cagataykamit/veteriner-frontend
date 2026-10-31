import { Component, inject, input, ChangeDetectionStrategy } from '@angular/core';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';

/**
 * Detay sayfası eylem şeridi (kimlik kartının altında, kart çerçevesiz): sayfa düğmelerini yansıtır; salt okunur kiracıda
 * kısa bilgi yazar (düğmeleri kilitlemek sayfanındır). Dar ekranda tek satır, yana kayar.
 */
@Component({
    selector: 'app-detail-action-bar',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="mb-4 py-2 flex flex-wrap gap-2 items-center max-sm:flex-nowrap max-sm:overflow-x-auto [&>*]:shrink-0" role="toolbar" [attr.aria-label]="ariaLabel()" data-testid="detail-action-bar">
            <ng-content />
            @if (ro.mutationBlocked()) {
                <span class="text-amber-700 dark:text-amber-300 text-sm max-sm:whitespace-nowrap" role="status">İşletme salt okunur moddadır; eylemler kapalı.</span>
            }
        </div>
    `
})
export class AppDetailActionBarComponent {
    readonly ro = inject(TenantReadOnlyContextService);
    readonly ariaLabel = input<string>('Eylemler');
}
