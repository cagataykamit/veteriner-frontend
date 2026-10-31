import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { TenantInviteDetailVm } from '@/app/entities/tenant-invite/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/entities/tenant-invite/services/tenant-invites.service';
import { buildPublicJoinInviteUrl } from '@/app/features/tenant-invites/utils/join-invite-link.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppDetailActionBarComponent } from '@/app/shared/ui/detail-action-bar/app-detail-action-bar.component';
import { AppDetailIdentityCardComponent } from '@/app/shared/ui/detail-identity-card/app-detail-identity-card.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { tenantInviteDisplayStatusSeverity } from '@/app/entities/tenant-invite/utils/tenant-invite-status.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { TrDateTimePipe } from '@/app/shared/pipes/tr-date.pipe';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

@Component({
    selector: 'app-tenant-invite-detail-page',
    standalone: true,
    imports: [CommonModule, ButtonModule, ToastModule, AppPageHeaderComponent, AppDetailIdentityCardComponent, AppDetailActionBarComponent, AppLoadingStateComponent, AppErrorStateComponent, AppStatusTagComponent, TrDateTimePipe],
    providers: [MessageService],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <p-toast position="bottom-right" />
        <app-page-header categoryLink="/panel/settings/invites/list" categoryLinkLabel="Davet listesine dön" />

        @if (loading()) {
            <app-loading-state message="Davet yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state [detail]="err" (retry)="reload()" />
            </div>
        } @else if (item(); as d) {
            <!-- Kimlik kartı: e-posta + durum rozeti, rol, klinik satırı; gösterge şeridi (klinik, rol, son geçerlilik, oluşturulma). Davet salt okunur; eylemler şeritte. -->
            <app-detail-identity-card icon="pi pi-envelope" [title]="d.email" [subtitle]="roleLine(d)" [meta]="'Klinik: ' + clinicLine(d)" ariaLabel="Davet kimliği" testId="tenant-invite-identity-card">
                <app-status-tag badges [label]="d.statusLabel" [severity]="inviteStatusSeverity(d)" />
                <div stat>
                    <dt>Klinik</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 break-words">{{ clinicLine(d) }}</dd>
                </div>
                <div stat>
                    <dt>Rol / yetki</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 break-words">{{ roleLine(d) }}</dd>
                </div>
                <div stat>
                    <dt>Son geçerlilik</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ d.expiresAtUtc | trDateTime }}</dd>
                </div>
                <div stat>
                    <dt>Oluşturulma</dt>
                    <dd class="font-semibold text-surface-900 dark:text-surface-0 tabular-nums">{{ d.createdAtUtc | trDateTime }}</dd>
                </div>
            </app-detail-identity-card>

            @if (actionError()) {
                <p class="text-red-500 text-sm mt-0 mb-4" role="alert">{{ actionError() }}</p>
            }

            <!-- Eylem şeridi: yeniden gönder ve iptal (yetki + salt okunur değilken); salt okunur notu şeritten gelir. -->
            @if ((d.canCancel || d.canResend) && (canManageTenantAccess() || ro.mutationBlocked())) {
                <app-detail-action-bar ariaLabel="Davet eylemleri">
                    @if (d.canResend && canManageTenantAccess()) {
                        <button pButton type="button" [disabled]="cancelBusy() || resendBusy()" (click)="onResend(d.id)"><i class="p-button-icon" [class]="resendBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-send'"></i>Yeniden gönder</button>
                    }
                    @if (d.canCancel && canManageTenantAccess()) {
                        <button pButton type="button" severity="danger" [outlined]="true" [disabled]="resendBusy() || cancelBusy()" (click)="onCancel(d.id)"><i class="p-button-icon" [class]="cancelBusy() ? 'pi pi-spin pi-spinner' : 'pi pi-times'"></i>Daveti iptal et</button>
                    }
                </app-detail-action-bar>
            }

            @if (joinUrl()) {
                <div class="card mb-0">
                    <h5 class="mt-0 mb-2">Katılım bağlantısı</h5>
                    <p class="text-sm text-muted-color mt-0 mb-2">Davet hâlâ geçerliyse bu bağlantı kullanılabilir.</p>
                    <div class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 break-all text-sm font-mono">
                        {{ joinUrl() }}
                    </div>
                </div>
            }
        }
    `
})
export class TenantInviteDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly auth = inject(AuthService);
    private readonly tenantInvites = inject(TenantInvitesService);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly canManageTenantAccess = computed(() => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked());

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly item = signal<TenantInviteDetailVm | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly cancelBusy = signal(false);
    readonly resendBusy = signal(false);

    readonly joinUrl = signal<string>('');

    readonly inviteStatusSeverity = (d: TenantInviteDetailVm) => tenantInviteDisplayStatusSeverity(d.statusLifecycle, d.isCurrentMember);

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
            const id = pm.get('inviteId')?.trim() ?? '';

            if (!id) {
                this.loading.set(false);
                this.error.set('Geçersiz davet.');
                this.item.set(null);

                return;
            }

            this.load(id);
        });
    }

    clinicLine(d: TenantInviteDetailVm): string {
        if (d.clinicName?.trim()) {
            return d.clinicName;
        }

        if (d.clinicId?.trim()) {
            return d.clinicId;
        }

        return '—';
    }

    roleLine(d: TenantInviteDetailVm): string {
        if (d.operationClaimName?.trim()) {
            return d.operationClaimName;
        }

        if (d.operationClaimId?.trim()) {
            return d.operationClaimId;
        }

        return '—';
    }

    reload(): void {
        const id = this.item()?.id ?? this.route.snapshot.paramMap.get('inviteId')?.trim();

        if (id) {
            this.load(id);
        }
    }

    onCancel(id: string): void {
        if (!this.canManageTenantAccess()) {
            return;
        }

        this.actionError.set(null);
        this.cancelBusy.set(true);
        this.tenantInvites.cancelInvite(id).subscribe({
            next: () => {
                this.cancelBusy.set(false);
                addTracedToast(this.messages, 'TenantInviteDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Davet iptal edildi.'
                });
                this.load(id);
            },
            error: (e: Error) => {
                this.cancelBusy.set(false);
                this.actionError.set(panelHttpFailureMessage(e, 'İptal başarısız.'));
            }
        });
    }

    onResend(id: string): void {
        if (!this.canManageTenantAccess()) {
            return;
        }

        this.actionError.set(null);
        this.resendBusy.set(true);
        this.tenantInvites.resendInvite(id).subscribe({
            next: () => {
                this.resendBusy.set(false);
                addTracedToast(this.messages, 'TenantInviteDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Davet yeniden gönderildi.'
                });
                this.load(id);
            },
            error: (e: Error) => {
                this.resendBusy.set(false);
                this.actionError.set(panelHttpFailureMessage(e, 'Yeniden gönderim başarısız.'));
            }
        });
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.actionError.set(null);
        this.joinUrl.set('');
        this.tenantInvites.getInviteById(id).subscribe({
            next: (vm) => {
                this.item.set(vm);
                const t = vm.token?.trim();

                this.joinUrl.set(t ? buildPublicJoinInviteUrl(t) : '');
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.item.set(null);
                this.error.set(panelHttpFailureMessage(e, 'Yükleme hatası'));
                this.loading.set(false);
            }
        });
    }
}
