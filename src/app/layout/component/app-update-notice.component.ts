import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PanelAppUpdates } from '@/app/core/pwa/panel-service-worker';

/** Yeni sürüm hazır ama kullanıcı aynı sayfada: yenilemeyi kendisi seçer, kapatırsa ilk sayfa geçişinde yenilenir. */
@Component({
    selector: 'app-update-notice',
    standalone: true,
    imports: [ButtonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (appUpdates.updateNoticeVisible()) {
            <div
                class="fixed z-[1100] bottom-4 left-1/2 -translate-x-1/2 max-w-[calc(100vw-2rem)] flex items-center gap-3 pl-4 pr-2 py-2 rounded-border border border-surface bg-surface-0 dark:bg-surface-900 shadow-md text-sm"
                role="status"
                data-testid="app-update-notice"
            >
                <i class="pi pi-refresh text-muted-color" aria-hidden="true"></i>
                <span class="font-medium text-color whitespace-nowrap">Yeni sürüm hazır</span>
                <button pButton type="button" size="small" data-testid="app-update-reload" (click)="appUpdates.reloadNow()">Yenile</button>
                <button pButton type="button" iconOnly size="small" [text]="true" severity="secondary" aria-label="Kapat" data-testid="app-update-dismiss" (click)="appUpdates.dismissUpdateNotice()">
                    <i class="p-button-icon pi pi-times"></i>
                </button>
            </div>
        }
    `
})
export class AppUpdateNoticeComponent {
    protected readonly appUpdates = inject(PanelAppUpdates);
}
