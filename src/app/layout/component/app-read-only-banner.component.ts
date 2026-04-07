import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';

@Component({
    selector: 'app-read-only-banner',
    standalone: true,
    imports: [CommonModule, RouterLink, ButtonModule],
    template: `
        @if (ctx.summary(); as s) {
            @if (s.isReadOnly) {
                <div
                    class="mx-4 mt-4 mb-0 p-4 rounded-border border-l-4 border-amber-500 bg-amber-50 dark:bg-amber-950/25 border border-amber-200/80 dark:border-amber-800/60"
                    role="status"
                >
                    <div class="flex flex-col lg:flex-row lg:flex-wrap lg:items-center lg:justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="font-semibold text-amber-950 dark:text-amber-100">Salt okunur mod</div>
                            <p class="m-0 mt-1 text-sm text-color">
                                @if (s.canManageSubscription) {
                                    Deneme süreniz sona ermiş veya hesabınız yazma için kapalı. Verileri görüntüleyebilirsiniz;
                                    yazma işlemleri devre dışıdır. Aboneliği görüntüleyerek paket seçeneklerinizi inceleyin.
                                } @else {
                                    Bu işletme şu anda salt okunur moddadır; yeni kayıt veya düzenleme yapılamaz. Devam etmek için
                                    işletme yöneticinizin aboneliği güncellemesi gerekir.
                                }
                            </p>
                        </div>
                        @if (s.canManageSubscription) {
                            <div class="flex flex-wrap gap-2 shrink-0">
                                <a
                                    routerLink="/panel/settings/subscription"
                                    pButton
                                    type="button"
                                    label="Aboneliği görüntüle"
                                    icon="pi pi-wallet"
                                    class="p-button-sm"
                                ></a>
                                <a
                                    routerLink="/panel/settings/subscription"
                                    pButton
                                    type="button"
                                    label="Paketinizi yönetin"
                                    icon="pi pi-cog"
                                    severity="secondary"
                                    class="p-button-sm"
                                ></a>
                            </div>
                        }
                    </div>
                </div>
            }
        }
    `
})
export class AppReadOnlyBannerComponent {
    readonly ctx = inject(TenantReadOnlyContextService);
}
