import { CommonModule } from '@angular/common';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { TenantInviteDetailVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/features/tenant-invites/services/tenant-invites.service';
import { buildPublicJoinInviteUrl } from '@/app/features/tenant-invites/utils/join-invite-link.utils';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { AppStatusTagComponent } from '@/app/shared/ui/status-tag/app-status-tag.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { tenantInviteDisplayStatusSeverity } from '@/app/features/tenant-invites/utils/tenant-invite-status.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';

@Component({
    selector: 'app-tenant-invite-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        RouterLink,
        ButtonModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppStatusTagComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <app-page-header title="Davet detayı" subtitle="Hesap" description="Davet bilgileri (salt okunur).">
            <a actions routerLink="/panel/settings/invites/list" pButton type="button" label="Listeye dön" icon="pi pi-arrow-left" class="p-button-secondary"></a>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="Davet yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state [detail]="err" (retry)="reload()" />
            </div>
        } @else if (item(); as d) {
            <div class="card mb-4">
                <div class="flex flex-wrap gap-2 mb-4">
                    @if (d.canCancel && canManageTenantAccess()) {
                        <p-button
                            label="Daveti iptal et"
                            icon="pi pi-times"
                            severity="danger"
                            [loading]="cancelBusy()"
                            [disabled]="resendBusy()"
                            (onClick)="onCancel(d.id)"
                        />
                    }
                    @if (d.canResend && canManageTenantAccess()) {
                        <p-button
                            label="Yeniden gönder"
                            icon="pi pi-send"
                            [loading]="resendBusy()"
                            [disabled]="cancelBusy()"
                            (onClick)="onResend(d.id)"
                        />
                    }
                    @if (ro.mutationBlocked()) {
                        <p class="text-sm text-muted-color m-0 self-center">Salt okunur kurumda iptal ve yeniden gönder kullanılamaz.</p>
                    }
                </div>
                @if (actionError()) {
                    <p class="text-red-500 text-sm mt-0 mb-4" role="alert">{{ actionError() }}</p>
                }
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 text-sm">
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">E-posta</dt>
                        <dd class="m-0 break-all">{{ d.email }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Durum</dt>
                        <dd class="m-0">
                            <app-status-tag [label]="d.statusLabel" [severity]="inviteStatusSeverity(d)" />
                        </dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Klinik</dt>
                        <dd class="m-0 break-words">{{ clinicLine(d) }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Rol / yetki</dt>
                        <dd class="m-0 break-words">{{ roleLine(d) }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Son geçerlilik</dt>
                        <dd class="m-0">{{ formatDt(d.expiresAtUtc) }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">Oluşturulma</dt>
                        <dd class="m-0">{{ formatDt(d.createdAtUtc) }}</dd>
                    </div>
                </dl>
            </div>
            @if (joinUrl()) {
                <div class="card">
                    <h5 class="mt-0 mb-2">Katılım bağlantısı</h5>
                    <p class="text-sm text-muted-color mt-0 mb-2">Davet hâlâ geçerliyse bu bağlantı kullanılabilir.</p>
                    <div
                        class="p-3 rounded-lg bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-700 break-all text-sm font-mono"
                    >
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

    readonly canManageTenantAccess = computed(
        () => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked()
    );

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly item = signal<TenantInviteDetailVm | null>(null);
    readonly actionError = signal<string | null>(null);
    readonly cancelBusy = signal(false);
    readonly resendBusy = signal(false);

    readonly joinUrl = signal<string>('');

    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);
    readonly inviteStatusSeverity = (d: TenantInviteDetailVm) =>
        tenantInviteDisplayStatusSeverity(d.statusLifecycle, d.isCurrentMember);

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
                this.actionError.set(e.message ?? 'İptal başarısız.');
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
                this.actionError.set(e.message ?? 'Yeniden gönderim başarısız.');
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
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }
}
