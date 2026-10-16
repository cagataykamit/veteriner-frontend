import { ChangeDetectionStrategy, Component, computed, effect, inject, untracked } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { PortalSessionService } from '@portal/app/core/auth/portal-session.service';
import { PortalClinic, PortalClinicApi } from '@portal/app/features/clinic/portal-clinic.api';
import { portalLoad, portalPagedLoad } from '@portal/app/shared/data/portal-load';
import { formatPortalDay } from '@portal/app/shared/format/portal-date';
import { paymentMethodLabel, telHref } from '@portal/app/shared/format/portal-labels';
import { formatPortalMoney } from '@portal/app/shared/format/portal-money';
import { PortalEmptyState, PortalErrorState, PortalSkeleton } from '@portal/app/shared/ui/portal-states.component';
import { hasOutstanding, PortalBalance, PortalBalanceApi, PortalPayment } from './portal-balance.api';

/**
 * Bakiye ve ödemeler (sözleşme §6.5, AK-9): yalnız görüntüleme; online ödeme yok. Ödeme için kliniğin telefonu
 * gösterilir. Bakiye bağın kliniğiyle sınırlıdır.
 */
@Component({
    selector: 'portal-balance',
    standalone: true,
    imports: [RouterLink, ButtonModule, PortalEmptyState, PortalErrorState, PortalSkeleton],
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: './portal-balance.component.html',
    styles: `
        .portal-amount {
            font-size: 1.75rem;
            font-weight: 700;
            line-height: 1.2;
            color: var(--vetinity-navy);
            margin: 0;
        }
    `
})
export class PortalBalanceComponent {
    protected readonly session = inject(PortalSessionService);
    private readonly balanceApi = inject(PortalBalanceApi);
    private readonly clinicApi = inject(PortalClinicApi);

    readonly balance = portalLoad<PortalBalance>();
    readonly payments = portalPagedLoad<PortalPayment>();
    readonly clinic = portalLoad<PortalClinic>();

    readonly phoneHref = computed(() => telHref(this.clinic.data()?.phone));

    constructor() {
        effect(() => {
            const link = this.session.activeLink();

            untracked(() => {
                if (link) {
                    this.balance.run(() => this.balanceApi.balance(link.linkId));
                    this.payments.run((page) => this.balanceApi.payments(link.linkId, page));
                    this.clinic.run(() => this.clinicApi.clinic(link.linkId));
                }
            });
        });
    }

    hasOutstanding(balance: PortalBalance): boolean {
        return hasOutstanding(balance);
    }

    money(amount: number, currency: string): string {
        return formatPortalMoney(amount, currency);
    }

    day(utc: string | null): string {
        return formatPortalDay(utc);
    }

    method(payment: PortalPayment): string {
        return paymentMethodLabel(payment.method);
    }
}
