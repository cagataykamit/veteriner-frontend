import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import type { ClinicSummary } from '@/app/core/auth/auth.models';
import { AuthService } from '@/app/core/auth/auth.service';
import { TENANT_MANAGEMENT_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/features/subscriptions/services/tenant-read-only-context.service';
import type { OperationClaimOptionVm } from '@/app/features/tenant-invites/models/tenant-invite-vm.model';
import { TenantInvitesService } from '@/app/features/tenant-invites/services/tenant-invites.service';
import type {
    TenantMemberDetailVm,
    TenantRolePermissionMatrixRowVm
} from '@/app/features/tenant-members/models/tenant-members-vm.model';
import { TenantMembersService } from '@/app/features/tenant-members/services/tenant-members.service';
import { buildTenantMemberEffectivePermissionSummary } from '@/app/features/tenant-members/utils/tenant-member-effective-permission.utils';
import {
    buildPermissionGroupPanels,
    filterTenantFacingMatrixPermissions,
    permissionDisplayLabel,
    permissionTooltipText
} from '@/app/features/tenant-members/utils/tenant-role-permission-display.utils';
import {
    isMemberClinicAlreadyAssignedConflict,
    isMemberClinicAlreadyRemoved,
    memberClinicAssignRemoveMessage
} from '@/app/features/tenant-members/utils/tenant-member-clinic-mutation.utils';
import {
    isMemberRoleAlreadyAssignedConflict,
    isMemberRoleAlreadyRemoved,
    memberRoleAssignRemoveMessage
} from '@/app/features/tenant-members/utils/tenant-member-role-mutation.utils';
import { AppEmptyStateComponent } from '@/app/shared/ui/empty-state/app-empty-state.component';
import { AppErrorStateComponent } from '@/app/shared/ui/error-state/app-error-state.component';
import { AppLoadingStateComponent } from '@/app/shared/ui/loading-state/app-loading-state.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { PANEL_COPY } from '@/app/shared/copy/panel-tr';
import { formatDateTimeDisplay } from '@/app/shared/utils/date.utils';
import { addTracedToast } from '@/app/shared/utils/toast-trace.utils';
import { catchError, forkJoin, of } from 'rxjs';

@Component({
    selector: 'app-tenant-member-detail-page',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule,
        RouterLink,
        ButtonModule,
        DialogModule,
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
            description="Kurum üyeliği bilgileri. Salt okunur kurumda rol değişikliği yapılamaz."
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
            @if (m.isCurrentUser) {
                <div class="card mb-4 border-blue-200 dark:border-blue-800 bg-blue-50/30 dark:bg-blue-950/20">
                    <p class="text-sm m-0 text-surface-700 dark:text-surface-200">{{ copy.tenantMemberSelfProfileHint }}</p>
                </div>
            }
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
                        <dt class="text-muted-color font-medium m-0 mb-1">Kurum üyeliği oluşturulma</dt>
                        <dd class="m-0">{{ formatDt(m.tenantMembershipCreatedAtUtc) }}</dd>
                    </div>
                </dl>
            </div>

            @if (m.claimsSectionPresent) {
                <div class="card mb-4">
                    <h5 class="mt-0 mb-3">{{ copy.tenantMemberRolesSectionTitle }}</h5>
                    @if (roleActionError()) {
                        <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ roleActionError() }}</p>
                    }
                    @if (claimsOptionsError()) {
                        <p class="text-orange-600 dark:text-orange-400 text-sm mb-3 m-0" role="status">{{ claimsOptionsError() }}</p>
                    }
                    @if (canManageTenantAccess() && !m.isCurrentUser) {
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
                                    [disabled]="
                                        assignableFiltered().length === 0 ||
                                        busyAddClinic() ||
                                        busyRemoveClinicId() !== null
                                    "
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
                                    busyRemoveClaimId() !== null ||
                                    busyAddClinic() ||
                                    busyRemoveClinicId() !== null
                                "
                                (onClick)="onAddRole()"
                            />
                        </div>
                    } @else if (ro.mutationBlocked()) {
                        <p class="text-sm text-muted-color mt-0 mb-3">Salt okunur kurumda rol ekleyemezsiniz.</p>
                    } @else if (m.isCurrentUser) {
                        <p class="text-sm text-muted-color mt-0 mb-3">Kendi hesabınız için rol ekleyemezsiniz.</p>
                    }
                    @if (m.claims.length === 0) {
                        <app-empty-state
                            message="Bu üye için listelenen rol veya yetki yok."
                            hint="Backend bu koleksiyonu boş döndürdü."
                        />
                    } @else {
                        <div class="flex flex-wrap gap-2 mb-3">
                            @for (c of m.claims; track c.id + c.name) {
                                <div
                                    class="inline-flex flex-wrap items-center gap-2 max-w-full rounded-full border border-surface-200 dark:border-surface-600 bg-surface-50 dark:bg-surface-800/40 px-3 py-1.5 text-sm"
                                >
                                    <span class="font-medium break-words">{{ c.name }}</span>
                                    @if (canManageTenantAccess() && !m.isCurrentUser && c.canRemove) {
                                        <p-button
                                            label="Kaldır"
                                            icon="pi pi-times"
                                            severity="danger"
                                            styleClass="p-button-sm p-button-text shrink-0"
                                            [loading]="busyRemoveClaimId() === c.id"
                                            [disabled]="
                                                busyAdd() ||
                                                busyAddClinic() ||
                                                busyRemoveClinicId() !== null ||
                                                (busyRemoveClaimId() !== null && busyRemoveClaimId() !== c.id)
                                            "
                                            (onClick)="onRemoveRole(c.id)"
                                        />
                                    }
                                </div>
                            }
                        </div>
                        <p class="text-sm text-muted-color m-0 mb-2">
                            {{ effectivePermissionSummary().assignedRoleCount }} {{ copy.tenantMemberSummaryRolesPart }}
                            · {{ effectivePermissionSummary().uniquePermissionCount }}
                            {{ copy.tenantMemberSummaryUniquePermsPart }}
                            · {{ effectivePermissionSummary().groupCount }} {{ copy.tenantMemberSummaryGroupsPart }}
                        </p>
                        @if (matrixLoadError(); as mxErr) {
                            <p class="text-xs text-orange-600 dark:text-orange-400 m-0 mb-2" role="status">{{ mxErr }}</p>
                        }
                        @if (canManageTenantAccess()) {
                            <p-button
                                [label]="copy.tenantMemberViewPermissionSummaryButton"
                                icon="pi pi-list"
                                styleClass="p-button-outlined"
                                (onClick)="openPermissionSummary()"
                            />
                        }
                        <p-dialog
                            [header]="copy.tenantMemberPermissionDialogTitle"
                            [modal]="true"
                            [draggable]="false"
                            [dismissableMask]="true"
                            [style]="{ width: 'min(40rem, 96vw)' }"
                            [visible]="permissionSummaryOpen()"
                            (visibleChange)="onPermissionSummaryVisible($event)"
                        >
                            <p class="text-sm text-muted-color m-0 mb-3">{{ copy.tenantMemberPermissionDialogHint }}</p>
                            <div
                                class="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-3 p-3 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/40"
                            >
                                <div class="text-sm">
                                    <p class="m-0 text-muted-color">{{ copy.tenantMemberSummaryRolesPart }}</p>
                                    <p class="m-0 font-semibold">{{ effectivePermissionSummary().assignedRoleCount }}</p>
                                </div>
                                <div class="text-sm">
                                    <p class="m-0 text-muted-color">{{ copy.tenantMemberSummaryUniquePermsPart }}</p>
                                    <p class="m-0 font-semibold">{{ effectivePermissionSummary().uniquePermissionCount }}</p>
                                </div>
                                <div class="text-sm">
                                    <p class="m-0 text-muted-color">{{ copy.tenantMemberSummaryGroupsPart }}</p>
                                    <p class="m-0 font-semibold">{{ effectivePermissionSummary().groupCount }}</p>
                                </div>
                            </div>
                            <p class="text-xs font-semibold text-muted-color m-0 mb-2">
                                {{ copy.tenantMemberPermissionDialogAssignedRoles }}
                            </p>
                            <div class="flex flex-wrap gap-2 mb-4">
                                @for (rc of m.claims; track rc.id + rc.name) {
                                    <span
                                        class="text-xs sm:text-sm px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600"
                                    >
                                        {{ rc.name }}
                                    </span>
                                }
                            </div>
                            @if (effectivePermissionSummary().permissions.length === 0) {
                                <p class="text-sm text-muted-color m-0">{{ copy.tenantMemberPermissionDialogEmpty }}</p>
                            } @else {
                                <p class="text-xs font-semibold text-muted-color m-0 mb-1">{{ copy.tenantMemberPermissionDialogGroupsTitle }}</p>
                                <p class="text-xs text-muted-color m-0 mb-3">{{ copy.tenantMemberPermissionDialogAccordionHint }}</p>
                                <div class="max-h-[min(28rem,70vh)] overflow-y-auto pr-1 space-y-2">
                                    @for (g of effectivePermissionGroups(); track g.rawKey) {
                                        <details class="rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800/30 px-3 py-2">
                                            <summary class="cursor-pointer list-none flex items-center justify-between gap-2">
                                                <span class="text-sm font-semibold">{{ g.title }}</span>
                                                <span class="text-xs text-muted-color">({{ g.items.length }})</span>
                                            </summary>
                                            <ul class="list-none p-0 m-0 mt-3 flex flex-wrap gap-2">
                                                @for (p of g.items; track p.id + permissionDisplayLabel(p)) {
                                                    <li
                                                        class="text-xs sm:text-sm max-w-[18rem] truncate px-2 py-1 rounded-md bg-surface-100 dark:bg-surface-800 border border-surface-200 dark:border-surface-600"
                                                        [attr.title]="permissionTooltipText(p)"
                                                    >
                                                        {{ permissionDisplayLabel(p) }}
                                                    </li>
                                                }
                                            </ul>
                                        </details>
                                    }
                                </div>
                            }
                        </p-dialog>
                    }
                </div>
            }

            @if (m.clinicsSectionPresent) {
                <div class="card mb-4">
                    <h5 class="mt-0 mb-3">Klinik üyelikleri</h5>
                    @if (clinicActionError()) {
                        <p class="text-red-500 text-sm mb-3 m-0" role="alert">{{ clinicActionError() }}</p>
                    }
                    @if (clinicsPickerError()) {
                        <p class="text-orange-600 dark:text-orange-400 text-sm mb-3 m-0" role="status">{{ clinicsPickerError() }}</p>
                    }
                    @if (canManageTenantAccess() && !m.isCurrentUser) {
                        <div
                            class="flex flex-col sm:flex-row flex-wrap gap-3 items-end pb-3 mb-3 border-b border-surface-200 dark:border-surface-700"
                        >
                            <div class="flex-1 min-w-[12rem] w-full sm:w-auto">
                                <label for="tmAddClinic" class="block text-xs font-medium text-muted-color mb-1">Klinik ekle</label>
                                <p class="text-xs text-muted-color m-0 mb-2">
                                    Kurum kapsamındaki klinikler listelenir (kişisel klinik listeniz değil); bu üyede zaten olanlar seçenekte gösterilmez.
                                </p>
                                <select
                                    id="tmAddClinic"
                                    class="w-full p-inputtext p-component"
                                    style="min-height: 2.5rem"
                                    [ngModel]="selectedClinicId()"
                                    (ngModelChange)="selectedClinicId.set($event)"
                                    [disabled]="assignableClinicsFiltered().length === 0"
                                >
                                    <option value="">Eklenebilir klinik seçin</option>
                                    @for (opt of assignableClinicsFiltered(); track opt.id) {
                                        <option [value]="opt.id">{{ opt.name }}</option>
                                    }
                                </select>
                            </div>
                            <p-button
                                label="Ekle"
                                icon="pi pi-plus"
                                styleClass="shrink-0"
                                [loading]="busyAddClinic()"
                                [disabled]="
                                    !selectedClinicId() ||
                                    assignableClinicsFiltered().length === 0 ||
                                    busyAdd() ||
                                    busyRemoveClaimId() !== null ||
                                    busyRemoveClinicId() !== null
                                "
                                (onClick)="onAddClinic()"
                            />
                        </div>
                    } @else if (ro.mutationBlocked()) {
                        <p class="text-sm text-muted-color mt-0 mb-3">Salt okunur kurumda klinik üyeliği ekleyemez veya kaldıramazsınız.</p>
                    } @else if (m.isCurrentUser) {
                        <p class="text-sm text-muted-color mt-0 mb-3">Kendi hesabınız için klinik üyeliği ekleyemez veya kaldıramazsınız.</p>
                    }
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
                                    <div class="flex flex-wrap items-center gap-2 shrink-0">
                                        @if (cl.isActive === true) {
                                            <span class="text-xs text-green-700 dark:text-green-400">Aktif</span>
                                        } @else if (cl.isActive === false) {
                                            <span class="text-xs text-muted-color">Pasif</span>
                                        }
                                        @if (canManageTenantAccess() && !m.isCurrentUser && cl.canRemove) {
                                            <p-button
                                                label="Kaldır"
                                                icon="pi pi-times"
                                                severity="danger"
                                                styleClass="p-button-sm p-button-text shrink-0"
                                                [loading]="busyRemoveClinicId() === cl.id"
                                                [disabled]="
                                                    busyAddClinic() ||
                                                    busyAdd() ||
                                                    busyRemoveClaimId() !== null ||
                                                    (busyRemoveClinicId() !== null && busyRemoveClinicId() !== cl.id)
                                                "
                                                (onClick)="onRemoveClinic(cl.id)"
                                            />
                                        }
                                    </div>
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
    readonly copy = PANEL_COPY;
    /** Şablonda pipe olmadan kullanım. */
    readonly permissionDisplayLabel = permissionDisplayLabel;
    readonly permissionTooltipText = permissionTooltipText;
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly destroyRef = inject(DestroyRef);
    private readonly tenantMembers = inject(TenantMembersService);
    private readonly tenantInvites = inject(TenantInvitesService);
    private readonly auth = inject(AuthService);
    private readonly messages = inject(MessageService);
    readonly ro = inject(TenantReadOnlyContextService);

    /** `Tenants.InviteCreate` ve salt okunur değil — rol/klinik mutasyonları. */
    readonly canManageTenantAccess = computed(
        () => this.auth.hasOperationClaim(TENANT_MANAGEMENT_CLAIM) && !this.ro.mutationBlocked()
    );

    readonly loading = signal(true);
    readonly error = signal<string | null>(null);
    readonly member = signal<TenantMemberDetailVm | null>(null);

    readonly claimOptions = signal<OperationClaimOptionVm[]>([]);
    readonly claimsOptionsError = signal<string | null>(null);

    /** Üye atama: `GET /api/v1/clinics` (panel kapsamı; kişisel `/me/clinics` değil). */
    readonly tenantClinicOptions = signal<ClinicSummary[]>([]);
    readonly clinicsPickerError = signal<string | null>(null);

    readonly selectedClaimId = signal('');
    readonly selectedClinicId = signal('');
    readonly busyAdd = signal(false);
    readonly busyRemoveClaimId = signal<string | null>(null);
    readonly roleActionError = signal<string | null>(null);

    readonly busyAddClinic = signal(false);
    readonly busyRemoveClinicId = signal<string | null>(null);
    readonly clinicActionError = signal<string | null>(null);

    /** `GET .../assignable-role-permission-matrix` — üye özetinde birleşik yetki için. */
    readonly matrixRows = signal<TenantRolePermissionMatrixRowVm[]>([]);
    readonly matrixLoadError = signal<string | null>(null);
    readonly permissionSummaryOpen = signal(false);

    readonly effectivePermissionSummary = computed(() => {
        const m = this.member();
        const rows = this.matrixRows();
        const claims = m?.claims ?? [];
        const other = this.copy.tenantRoleMatrixGroupOther;
        const base = buildTenantMemberEffectivePermissionSummary(rows, claims, other);
        const permissions = filterTenantFacingMatrixPermissions(base.permissions);
        const groupKeys = new Set<string>();
        for (const p of permissions) {
            groupKeys.add(p.group?.trim() || other);
        }
        return {
            assignedRoleCount: base.assignedRoleCount,
            uniquePermissionCount: permissions.length,
            groupCount: groupKeys.size,
            permissions
        };
    });

    readonly effectivePermissionGroups = computed(() =>
        buildPermissionGroupPanels(
            this.effectivePermissionSummary().permissions,
            this.copy.tenantRoleMatrixGroupOther
        )
    );

    readonly assignableFiltered = computed(() => {
        const m = this.member();
        const opts = this.claimOptions();
        if (!m) {
            return opts;
        }
        const assigned = new Set(m.claims.map((c) => c.id));
        return opts.filter((o) => !assigned.has(o.id));
    });

    readonly assignableClinicsFiltered = computed(() => {
        const m = this.member();
        const list = this.tenantClinicOptions();
        if (!m) {
            return list;
        }
        const assigned = new Set(m.clinics.map((c) => c.id));
        return list.filter((c) => !assigned.has(c.id));
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

    openPermissionSummary(): void {
        this.permissionSummaryOpen.set(true);
    }

    onPermissionSummaryVisible(open: boolean): void {
        this.permissionSummaryOpen.set(!!open);
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
        if (this.member()?.isCurrentUser || !this.canManageTenantAccess()) {
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
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Rol eklendi.'
                });
                this.refreshMember(memberId);
            },
            error: (e: unknown) => {
                this.busyAdd.set(false);
                this.handleAssignError(e, memberId);
            }
        });
    }

    onRemoveRole(operationClaimId: string): void {
        if (this.member()?.isCurrentUser || !this.canManageTenantAccess()) {
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
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Rol kaldırıldı.'
                });
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
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
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
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
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

    onAddClinic(): void {
        if (this.member()?.isCurrentUser || !this.canManageTenantAccess()) {
            return;
        }
        const memberId = this.route.snapshot.paramMap.get('memberId')?.trim() ?? '';
        const clinicId = this.selectedClinicId().trim();
        if (!memberId || !clinicId) {
            return;
        }
        this.clinicActionError.set(null);
        this.busyAddClinic.set(true);
        this.tenantMembers.assignMemberClinic(memberId, clinicId).subscribe({
            next: () => {
                this.busyAddClinic.set(false);
                this.selectedClinicId.set('');
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Klinik üyeliği eklendi.'
                });
                this.refreshMember(memberId);
            },
            error: (e: unknown) => {
                this.busyAddClinic.set(false);
                this.handleAddClinicError(e, memberId);
            }
        });
    }

    onRemoveClinic(clinicId: string): void {
        if (this.member()?.isCurrentUser || !this.canManageTenantAccess()) {
            return;
        }
        const memberId = this.route.snapshot.paramMap.get('memberId')?.trim() ?? '';
        const cid = clinicId.trim();
        if (!memberId || !cid) {
            return;
        }
        this.clinicActionError.set(null);
        this.busyRemoveClinicId.set(cid);
        this.tenantMembers.removeMemberClinic(memberId, cid).subscribe({
            next: () => {
                this.busyRemoveClinicId.set(null);
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'success',
                    summary: 'Tamam',
                    detail: 'Klinik üyeliği kaldırıldı.'
                });
                this.refreshMember(memberId);
            },
            error: (e: unknown) => {
                this.busyRemoveClinicId.set(null);
                this.handleRemoveClinicError(e, memberId);
            }
        });
    }

    private handleAddClinicError(e: unknown, memberId: string): void {
        if (e instanceof HttpErrorResponse) {
            if (isMemberClinicAlreadyAssignedConflict(e)) {
                this.selectedClinicId.set('');
                this.refreshMember(memberId);
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'info',
                    summary: 'Bilgi',
                    detail: 'Bu klinik üyeliği zaten mevcut; liste güncellendi.'
                });
                return;
            }
            this.clinicActionError.set(memberClinicAssignRemoveMessage(e, 'Klinik üyeliği eklenemedi.'));
            return;
        }
        this.clinicActionError.set('Klinik üyeliği eklenemedi.');
    }

    private handleRemoveClinicError(e: unknown, memberId: string): void {
        if (e instanceof HttpErrorResponse) {
            if (isMemberClinicAlreadyRemoved(e) || e.status === 404) {
                this.refreshMember(memberId);
                addTracedToast(this.messages, 'TenantMemberDetailPage', this.router.url, {
                    severity: 'info',
                    summary: 'Bilgi',
                    detail: 'Bu klinik üyeliği zaten kaldırılmış veya bulunamadı; liste güncellendi.'
                });
                return;
            }
            this.clinicActionError.set(memberClinicAssignRemoveMessage(e, 'Klinik üyeliği kaldırılamadı.'));
            return;
        }
        this.clinicActionError.set('Klinik üyeliği kaldırılamadı.');
    }

    private load(id: string): void {
        this.loading.set(true);
        this.error.set(null);
        this.member.set(null);
        this.roleActionError.set(null);
        this.clinicActionError.set(null);
        this.claimsOptionsError.set(null);
        this.clinicsPickerError.set(null);
        this.selectedClaimId.set('');
        this.selectedClinicId.set('');
        this.claimOptions.set([]);
        this.tenantClinicOptions.set([]);
        this.matrixRows.set([]);
        this.matrixLoadError.set(null);
        this.permissionSummaryOpen.set(false);

        forkJoin({
            member: this.tenantMembers.getMemberById(id),
            claims: this.tenantInvites.listOperationClaims().pipe(
                catchError(() => {
                    this.claimsOptionsError.set('Atanabilir rol listesi yüklenemedi; rol ekleyemeyebilirsiniz.');
                    return of([] as OperationClaimOptionVm[]);
                })
            ),
            tenantClinics: this.tenantMembers.listTenantClinics().pipe(
                catchError(() => {
                    this.clinicsPickerError.set('Klinik listesi yüklenemedi; klinik ekleyemeyebilirsiniz.');
                    return of([] as ClinicSummary[]);
                })
            ),
            roleMatrix: this.tenantMembers.getAssignableRolePermissionMatrix().pipe(
                catchError(() => {
                    this.matrixLoadError.set(this.copy.tenantMemberMatrixForSummaryError);
                    return of([] as TenantRolePermissionMatrixRowVm[]);
                })
            )
        }).subscribe({
            next: ({ member: vm, claims, tenantClinics: clinics, roleMatrix }) => {
                this.member.set(vm);
                this.claimOptions.set(claims);
                this.tenantClinicOptions.set(clinics);
                this.matrixRows.set(roleMatrix);
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
        this.clinicActionError.set(null);
        this.tenantMembers.getMemberById(memberId).subscribe({
            next: (vm) => this.member.set(vm),
            error: (e: Error) => {
                const msg = e.message ?? 'Liste yenilenemedi.';
                this.roleActionError.set(msg);
                this.clinicActionError.set(msg);
            }
        });
    }
}
