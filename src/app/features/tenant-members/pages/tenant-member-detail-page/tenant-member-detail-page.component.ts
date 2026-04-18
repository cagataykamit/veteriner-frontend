import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { OperationClaimOptionVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/features/tenant-invites/services/tenant-invites.service';
import type { TenantMemberDetailVm } from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import {
    isMemberRoleAlreadyAssignedConflict,
    isMemberRoleAlreadyRemoved,
    memberRoleAssignRemoveMessage
} from '@/app/features/tenant-members/utils/tenant-member-role-mutation.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
    selector: 'app-tenant-member-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ButtonModule,
        ToastModule,
        AppPageHeaderComponent,
        AppLoadingStateComponent,
        AppErrorStateComponent,
        AppEmptyStateComponent
    ],
    providers: [MessageService],
    template: `
        <p-toast position="top-right" />
        <app-page-header
            title="Üye detayı"
            subtitle="Hesap"
            description="Kiracı üyeliği bilgileri. Salt okunur kiracıda rol değişikliği yapılamaz."
        >
            <a actions routerLink="/panel/settings/members" pButton type="button" label="Listeye dön" icon="pi pi-arrow-left" class="p-button-secondary"></a>
        </app-page-header>

        @if (loading()) {
            <app-loading-state message="Üye bilgileri yükleniyor…" />
        } @else if (error(); as err) {
            <div class="card">
                <app-error-state [detail]="err" (retry)="reload()" />
            </div>
        } @else if (member(); as m) {
            <div class="card mb-4">
                <h5 class="mt-0 mb-4">Genel</h5>
                <dl class="grid grid-cols-1 md:grid-cols-2 gap-3 m-0 text-sm">
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">E-posta</dt>
                        <dd class="m-0 break-all">{{ m.email }}</dd>
                    </div>
                    <div>
                        <dt class="text-muted-color font-medium m-0 mb-1">E-posta onayı</dt>
                        <dd class="m-0">{{ formatConfirmed(m.emailConfirmed) }}</dd>
                    </div>
                    <div class="md:col-span-2">
                        <dt class="text-muted-color font-medium m-0 mb-1">Kiracı üyeliği oluşturulma</dt>
                        <dd class="m-0">{{ formatDt(m.tenantMembershipCreatedAtUtc) }}</dd>
                    </div>
                </dl>
            </div>

            @if (m.claimsSectionPresent) {
                <div class="card mb-4">
                    <h5 class="mt-0 mb-3">Whitelist roller / yetkiler</h5>
                    @if (roleActionError()) {
                        <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ roleActionError() }}</p>
                    }
                    @if (claimsOptionsError()) {
                        <p class="text-orange-600 dark:text-orange-400 text-sm mb-3 m-0" role="status">{{ claimsOptionsError() }}</p>
                    }
                    @if (!ro.mutationBlocked()) {
                        <div
                            class="flex flex-col sm:flex-row flex-wrap gap-3 items-end pb-3 mb-3 border-b border-surface-200 dark:border-surface-700"
                        >
                            <div class="flex-1 min-w-[12rem] w-full sm:w-auto">
                                <label for="tmAddClaim" class="block text-xs font-medium text-muted-color mb-1">Rol ekle</label>
                                <select
                                    id="tmAddClaim"
                                    class="w-full p-inputtext p-component"
                                    style="min-height: 2.5rem"
                                    [ngModel]="selectedClaimId()"
                                    (ngModelChange)="selectedClaimId.set($event)"
                                    [disabled]="assignableFiltered().length === 0"
                                >
                                    <option value="">Atanabilir rol seçin</option>
                                    @for (opt of assignableFiltered(); track opt.id) {
                                        <option [value]="opt.id">{{ opt.name }}</option>
                                    }
                                </select>
                            </div>
                            <p-button
                                label="Ekle"
                                icon="pi pi-plus"
                                styleClass="shrink-0"
                                [loading]="busyAdd()"
                                [disabled]="
                                    !selectedClaimId() ||
                                    assignableFiltered().length === 0 ||
                                    busyRemoveClaimId() !== null
                                "
                                (onClick)="onAddRole()"
                            />
                        </div>
                    } @else {
                        <p class="text-sm text-muted-color mt-0 mb-3">Salt okunur kiracıda rol ekleyemezsiniz.</p>
                    }
                    @if (m.claims.length === 0) {
                        <app-empty-state
                            message="Bu üye için listelenen rol veya yetki yok."
                            hint="Backend bu koleksiyonu boş döndürdü."
                        />
                    } @else {
                        <ul class="list-none p-0 m-0 space-y-2">
                            @for (c of m.claims; track c.id + c.name) {
                                <li
                                    class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm flex flex-wrap items-center justify-between gap-2"
                                >
                                    <span class="font-medium break-words">{{ c.name }}</span>
                                    @if (!ro.mutationBlocked() && c.canRemove) {
                                        <p-button
                                            label="Kaldır"
                                            icon="pi pi-times"
                                            severity="danger"
                                            styleClass="p-button-sm p-button-text shrink-0"
                                            [loading]="busyRemoveClaimId() === c.id"
                                            [disabled]="busyAdd() || (busyRemoveClaimId() !== null && busyRemoveClaimId() !== c.id)"
                                            (onClick)="onRemoveRole(c.id)"
                                        />
                                    }
                                </li>
                            }
                        </ul>
                    }
                </div>
            }

            @if (m.clinicsSectionPresent) {
                <div class="card mb-4">
                    <h5 class="mt-0 mb-3">Klinik üyelikleri</h5>
                    @if (m.clinics.length === 0) {
                        <app-empty-state
                            message="Bu üye için listelenen klinik üyeliği yok."
                            hint="Backend bu koleksiyonu boş döndürdü."
                        />
                    } @else {
                        <ul class="list-none p-0 m-0 space-y-2">
                            @for (cl of m.clinics; track cl.id + cl.name) {
                                <li
                                    class="p-3 rounded-lg border border-surface-200 dark:border-surface-700 text-sm flex flex-wrap items-center justify-between gap-2"
                                >
                                    <span class="font-medium break-words">{{ cl.name }}</span>
                                    @if (cl.isActive === true) {
                                        <span class="text-xs text-green-700 dark:text-green-400 shrink-0">Aktif</span>
                                    } @else if (cl.isActive === false) {
                                        <span class="text-xs text-muted-color shrink-0">Pasif</span>
                                    }
                                </li>
                            }
                        </ul>
                    }
                </div>
            }
        }
    `
})
export class TenantMemberDetailPageComponent implements OnInit {
    private readonly route = inject(ActivatedRoute);
    private readonly destroyRef = inject(DestroyRef);
    private readonly tenantMembers = inject(TenantMembersService);
    private readonly tenantInvites = inject(TenantInvitesService);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly member = signal<TenantMemberDetailVm | null>(null);

    readonly claimOptions = signal<OperationClaimOptionVm[]>([]);
    readonly claimsOptionsError = signal<string | null>(null);

    readonly selectedClaimId = signal('');
    readonly busyAdd = signal(false);
    readonly busyRemoveClaimId = signal<string | null>(null);
    readonly roleActionError = signal<string | null>(null);

    readonly assignableFiltered = computed(() => {
        const m = this.member();
        const opts = this.claimOptions();
        if (!m) {
            return opts;
        }
        const assigned = new Set(m.claims.map((c) => c.id));
        return opts.filter((o) => !assigned.has(o.id));
    });

    readonly formatDt = (v: string | null) => formatDateTimeDisplay(v);

    formatConfirmed(v: boolean | null): string {
        if (v === true) {
            return 'Evet';
        }
        if (v === false) {
            return 'Hayır';
        }
        return '—';
    }

    ngOnInit(): void {
        this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((pm) => {
            const id = pm.get('memberId')?.trim() ?? '';
            if (!id) {
                this.loading.set(false);
                this.error.set('Geçersiz üye.');
                this.member.set(null);
                return;
            }
            this.load(id);
        });
    }

    reload(): void {
        const id = this.member()?.id ?? this.route.snapshot.paramMap.get('memberId')?.trim();
        if (id) {
            this.load(id);
        }
    }

    onAddRole(): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const memberId = this.route.snapshot.paramMap.get('memberId')?.trim() ?? '';
        const claimId = this.selectedClaimId().trim();
        if (!memberId || !claimId) {
            return;
        }
        this.roleActionError.set(null);
        this.busyAdd.set(true);
        this.tenantMembers.assignMemberClaim(memberId, claimId).subscribe({
            next: () => {
                this.busyAdd.set(false);
                this.selectedClaimId.set('');
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Rol eklendi.' });
                this.refreshMember(memberId);
            },
            error: (e: unknown) => {
                this.busyAdd.set(false);
                this.handleAssignError(e, memberId);
            }
        });
    }

    onRemoveRole(operationClaimId: string): void {
        if (this.ro.mutationBlocked()) {
            return;
        }
        const memberId = this.route.snapshot.paramMap.get('memberId')?.trim() ?? '';
        const cid = operationClaimId.trim();
        if (!memberId || !cid) {
            return;
        }
        this.roleActionError.set(null);
        this.busyRemoveClaimId.set(cid);
        this.tenantMembers.removeMemberClaim(memberId, cid).subscribe({
            next: () => {
                this.busyRemoveClaimId.set(null);
                this.messages.add({ severity: 'success', summary: 'Tamam', detail: 'Rol kaldırıldı.' });
                this.refreshMember(memberId);
            },
            error: (e: unknown) => {
                this.busyRemoveClaimId.set(null);
                this.handleRemoveError(e, memberId);
            }
        });
    }

    private handleAssignError(e: unknown, memberId: string): void {
        if (e instanceof HttpErrorResponse) {
            if (isMemberRoleAlreadyAssignedConflict(e)) {
                this.selectedClaimId.set('');
                this.refreshMember(memberId);
                this.messages.add({
                    severity: 'info',
                    summary: 'Bilgi',
                    detail: 'Bu rol zaten atanmış; liste güncellendi.'
                });
                return;
            }
            this.roleActionError.set(memberRoleAssignRemoveMessage(e, 'Rol eklenemedi.'));
            return;
        }
        this.roleActionError.set('Rol eklenemedi.');
    }

    private handleRemoveError(e: unknown, memberId: string): void {
        if (e instanceof HttpErrorResponse) {
            if (isMemberRoleAlreadyRemoved(e) || e.status === 404) {
                this.refreshMember(memberId);
                this.messages.add({
                    severity: 'info',
                    summary: 'Bilgi',
                    detail: 'Bu rol zaten kaldırılmış veya bulunamadı; liste güncellendi.'
                });
                return;
            }
            this.roleActionError.set(memberRoleAssignRemoveMessage(e, 'Rol kaldırılamadı.'));
            return;
        }
        this.roleActionError.set('Rol kaldırılamadı.');
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.member.set(null);
        this.roleActionError.set(null);
        this.claimsOptionsError.set(null);
        this.selectedClaimId.set('');
        this.claimOptions.set([]);

        forkJoin({
            member: this.tenantMembers.getMemberById(id),
            claims: this.tenantInvites.listOperationClaims().pipe(
                catchError(() => {
                    this.claimsOptionsError.set('Atanabilir rol listesi yüklenemedi; rol ekleyemeyebilirsiniz.');
                    return of([] as OperationClaimOptionVm[]);
                })
            )
        }).subscribe({
            next: ({ member: vm, claims }) => {
                this.member.set(vm);
                this.claimOptions.set(claims);
                this.loading.set(false);
            },
            error: (e: Error) => {
                this.error.set(e.message ?? 'Yükleme hatası');
                this.loading.set(false);
            }
        });
    }

    private refreshMember(memberId: string): void {
        this.roleActionError.set(null);
        this.tenantMembers.getMemberById(memberId).subscribe({
            next: (vm) => this.member.set(vm),
            error: (e: Error) => {
                this.roleActionError.set(e.message ?? 'Liste yenilenemedi.');
            }
        });
    }
}
