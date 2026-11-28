import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import { CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { AI_SETTINGS_ROUTE } from '@/app/core/routing/panel-navigation';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';
import { AI_USAGE_WARNING_PERCENT } from '@/app/entities/ai/utils/ai-error.utils';

/**
 * Klinik ayarlarında kliniğin kendi AI kullanımı (AI-007): bu ayın oranı ve yenilenme günü. Dolar ve kredi tutarı gösterilmez;
 * AI klinikte açık değilse hiç görünmez. Kural `aiClinicUsage`'da. Ayrıntı (kredi, aç/kapa) Yapay zekâ ayar sayfasında.
 */
@Component({
    selector: 'app-ai-clinic-usage-card',
    standalone: true,
    imports: [RouterLink],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (usage(); as u) {
            <div class="card mb-0 flex flex-col gap-2" data-testid="ai-clinic-usage">
                <div class="flex items-center justify-between gap-3 flex-wrap">
                    <span class="flex items-center gap-2 font-semibold"><i class="pi pi-sparkles text-ai" aria-hidden="true"></i>Yapay zekâ kullanımı</span>
                    <span class="text-sm text-muted-color" data-testid="ai-clinic-usage-text">
                        Bu ay <strong class="text-color">%{{ u.percent }}</strong> · {{ u.resetLabel }}
                        @if (canOpenSettings) {
                            · <a [routerLink]="settingsRoute" class="font-medium" data-testid="ai-clinic-usage-link">Ayrıntılar</a>
                        }
                    </span>
                </div>
                <div
                    class="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden"
                    role="progressbar"
                    aria-label="Bu ayki yapay zekâ kullanımı"
                    aria-valuemin="0"
                    aria-valuemax="100"
                    [attr.aria-valuenow]="u.percent"
                >
                    <div class="h-full rounded-full" [class]="u.percent >= warningPercent ? 'bg-amber-500' : 'bg-primary'" [style.width.%]="u.percent"></div>
                </div>
                @if (u.exhausted) {
                    <p class="m-0 text-sm text-muted-color" data-testid="ai-clinic-usage-exhausted">
                        Bu ayın kredisi bitti; yalnız yapay zekâ özellikleri durdu, diğer işler etkilenmez.
                    </p>
                }
            </div>
        }
    `
})
export class AiClinicUsageCardComponent implements OnInit {
    private readonly aiStatus = inject(AiStatusService);
    private readonly auth = inject(AuthService);

    protected readonly usage = this.aiStatus.clinicUsage;
    protected readonly warningPercent = AI_USAGE_WARNING_PERCENT;
    protected readonly settingsRoute = AI_SETTINGS_ROUTE;
    protected readonly canOpenSettings = [CLINICS_READ_CLAIM, CLINICS_UPDATE_CLAIM].some((c) => this.auth.hasOperationClaim(c));

    ngOnInit(): void {
        // Ayarlar sayfası açılınca güncel oran okunsun (panelden sonra harcanmış olabilir).
        this.aiStatus.refresh();
    }
}
