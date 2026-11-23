import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_REGISTERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { DEFINITIONS_ROUTE } from '@/app/core/routing/panel-navigation';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { CASH_REGISTER_CODE_MAX, CASH_REGISTER_NAME_MAX, type CashMovementCategoryDto, type CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { AppPageHeaderComponent } from '@/app/shared/ui/page-header/app-page-header.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/** Düzenlenen satır (bir anda biri); alanların taslağı `draftCode` / `draftName`. */
type Editing = { kind: 'register' | 'category'; id: string } | null;

/**
 * Ayarlar › Tanımlar › Kasalar ve gelir/gider türleri (S-05; TIER-008, `CashRegisters.Manage`). Satır başına "Kaydet" yok (S-05 A):
 * ad kalemle düzenlenir, Kaydet / Vazgeç yalnız o satırda; "Etkin" anahtarı hemen kaydeder. Kayıtlar silinmez; pasife alınan kasaya yeni
 * hareket girilmez, geçmişi raporda kalır. Ana kasa pasife alınamaz (kasa seçilmeyen nakit ona yazılır). Tek klinik: aktif klinik.
 */
@Component({
    selector: 'app-cash-register-definitions-page',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputTextModule, ToggleSwitchModule, AppPageHeaderComponent, AppPlanUpgradeNoticeComponent],
    template: `
        <app-page-header
            [categoryLink]="definitionsRoute"
            categoryLinkLabel="Tanımlar"
            title="Kasalar ve gelir/gider türleri"
            description="Kayıtlar silinmez; pasife alınanlar yeni harekette seçilemez, geçmişi raporda kalır."
        />

        @if (!clinicId) {
            <section class="card"><p class="text-sm text-muted-color m-0">Kasa tek klinik için tutulur. Bir klinik seçerek girin.</p></section>
        } @else if (planLocked()) {
            <section class="card"><app-plan-upgrade-notice feature="CashManagement" detail="Birden fazla kasa ve kasaya giriş/çıkışın gelir/gider türleri Profesyonel ve Kurumsal paketlerinde tanımlanır." /></section>
        } @else {
            @if (ro.mutationBlocked()) {
                <p class="text-amber-700 dark:text-amber-300 text-sm mb-4 m-0" role="status">Abonelik durumu nedeniyle tanımlar salt okunur.</p>
            } @else {
                <p class="text-sm text-muted-color mb-4 m-0"><i class="pi pi-info-circle !text-xs mr-1" aria-hidden="true"></i>Ad kalemle düzenlenir; "Etkin" anahtarı hemen kaydeder.</p>
            }
            @if (error(); as err) {
                <p class="text-danger text-sm mt-0 mb-4" role="alert">{{ err }}</p>
            }

            <div class="grid grid-cols-12 gap-4">
                <section class="card mb-0 col-span-12 lg:col-span-7" aria-labelledby="cashRegistersTitle" data-testid="cash-register-settings">
                    <h5 id="cashRegistersTitle" class="mt-0 mb-2">Kasalar</h5>
                    <ul class="list-none p-0 m-0" data-testid="cash-register-list">
                        @for (r of registers(); track r.id) {
                            <li class="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-12 py-2 border-b border-surface-100 dark:border-surface-800" [attr.data-testid]="'cash-register-row-' + r.id">
                                @if (isEditing('register', r.id)) {
                                    <input pInputText type="text" class="w-24" [attr.aria-label]="r.name + ' kodu'" [(ngModel)]="draftCode" [attr.maxlength]="codeMax" [disabled]="busy()" />
                                    <input pInputText type="text" class="flex-1 min-w-40" [attr.aria-label]="r.name + ' adı'" [(ngModel)]="draftName" [attr.maxlength]="nameMax" [disabled]="busy()" (keydown.enter)="saveEdit()" (keydown.escape)="cancelEdit()" />
                                    <span class="flex gap-2">
                                        <button pButton type="button" size="small" (click)="saveEdit()" [disabled]="busy() || !draftCode.trim() || !draftName.trim()" data-testid="cash-row-save">Kaydet</button>
                                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="cancelEdit()" [disabled]="busy()">Vazgeç</button>
                                    </span>
                                } @else {
                                    <span class="shrink-0 min-w-14 rounded bg-surface-100 dark:bg-surface-800 px-2 py-0.5 text-xs font-semibold tabular-nums text-center" [class.opacity-60]="!r.isActive">{{ r.code }}</span>
                                    <span class="flex-1 min-w-32 font-medium" [class.text-muted-color]="!r.isActive">{{ r.name }}</span>
                                    @if (r.isMain) {
                                        <span class="text-xs text-muted-color">Ana kasa</span>
                                    } @else {
                                        <label class="flex items-center gap-2 text-sm">
                                            <p-toggleswitch [ngModel]="r.isActive" (ngModelChange)="saveRegister(r, r.code, r.name, $event)" [disabled]="!canWrite() || busy()" [ariaLabel]="r.name + ' etkin'" />Etkin
                                        </label>
                                    }
                                    @if (canWrite()) {
                                        <button
                                            type="button"
                                            class="grid place-items-center w-9 h-9 rounded-md text-muted-color hover:text-primary hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer disabled:opacity-50"
                                            [attr.aria-label]="r.name + ' düzenle'"
                                            [disabled]="busy()"
                                            (click)="editRegister(r)"
                                            data-testid="cash-row-edit"
                                        >
                                            <i class="pi pi-pencil !text-sm" aria-hidden="true"></i>
                                        </button>
                                    }
                                }
                            </li>
                        }
                    </ul>
                    @if (canWrite()) {
                        <form class="flex flex-wrap items-end gap-2 mt-4" (ngSubmit)="addRegister()">
                            <div>
                                <label for="crNewCode" class="block text-sm font-medium text-muted-color mb-1">Kod</label>
                                <input pInputText id="crNewCode" name="code" type="text" class="w-24" [ngModel]="newCode()" (ngModelChange)="newCode.set($event)" [attr.maxlength]="codeMax" />
                            </div>
                            <div class="flex-1 min-w-40">
                                <label for="crNewName" class="block text-sm font-medium text-muted-color mb-1">Yeni kasa adı</label>
                                <input pInputText id="crNewName" name="name" type="text" class="w-full" [ngModel]="newName()" (ngModelChange)="newName.set($event)" [attr.maxlength]="nameMax" />
                            </div>
                            <button pButton type="submit" [disabled]="busy() || !newCode().trim() || !newName().trim()" data-testid="cash-register-add"><i class="p-button-icon pi pi-plus"></i>Kasa ekle</button>
                        </form>
                    }
                </section>

                <section class="card mb-0 col-span-12 lg:col-span-5" aria-labelledby="cashCategoriesTitle">
                    <h5 id="cashCategoriesTitle" class="mt-0 mb-2">Gelir/gider türleri</h5>
                    <ul class="list-none p-0 m-0" data-testid="cash-category-list">
                        @for (c of categories(); track c.id) {
                            <li class="flex flex-wrap items-center gap-x-3 gap-y-2 min-h-12 py-2 border-b border-surface-100 dark:border-surface-800" [attr.data-testid]="'cash-category-row-' + c.id">
                                @if (isEditing('category', c.id)) {
                                    <input pInputText type="text" class="flex-1 min-w-40" [attr.aria-label]="c.name + ' adı'" [(ngModel)]="draftName" [attr.maxlength]="nameMax" [disabled]="busy()" (keydown.enter)="saveEdit()" (keydown.escape)="cancelEdit()" />
                                    <span class="flex gap-2">
                                        <button pButton type="button" size="small" (click)="saveEdit()" [disabled]="busy() || !draftName.trim()" data-testid="cash-row-save">Kaydet</button>
                                        <button pButton type="button" size="small" severity="secondary" [text]="true" (click)="cancelEdit()" [disabled]="busy()">Vazgeç</button>
                                    </span>
                                } @else {
                                    <span class="flex-1 min-w-32 font-medium" [class.text-muted-color]="!c.isActive">{{ c.name }}</span>
                                    <label class="flex items-center gap-2 text-sm">
                                        <p-toggleswitch [ngModel]="c.isActive" (ngModelChange)="saveCategory(c, c.name, $event)" [disabled]="!canWrite() || busy()" [ariaLabel]="c.name + ' etkin'" />Etkin
                                    </label>
                                    @if (canWrite()) {
                                        <button
                                            type="button"
                                            class="grid place-items-center w-9 h-9 rounded-md text-muted-color hover:text-primary hover:bg-surface-100 dark:hover:bg-surface-800 cursor-pointer disabled:opacity-50"
                                            [attr.aria-label]="c.name + ' düzenle'"
                                            [disabled]="busy()"
                                            (click)="editCategory(c)"
                                            data-testid="cash-row-edit"
                                        >
                                            <i class="pi pi-pencil !text-sm" aria-hidden="true"></i>
                                        </button>
                                    }
                                }
                            </li>
                        } @empty {
                            <li class="py-2 text-sm text-muted-color">Henüz gelir/gider türü yok.</li>
                        }
                    </ul>
                    @if (canWrite()) {
                        <form class="flex flex-wrap items-end gap-2 mt-4" (ngSubmit)="addCategory()">
                            <div class="flex-1 min-w-40">
                                <label for="crNewCategory" class="block text-sm font-medium text-muted-color mb-1">Yeni tür</label>
                                <input pInputText id="crNewCategory" name="category" type="text" class="w-full" [ngModel]="newCategory()" (ngModelChange)="newCategory.set($event)" [attr.maxlength]="nameMax" />
                            </div>
                            <button pButton type="submit" [disabled]="busy() || !newCategory().trim()" data-testid="cash-category-add"><i class="p-button-icon pi pi-plus"></i>Tür ekle</button>
                        </form>
                    }
                </section>
            </div>
        }
    `
})
export class CashRegisterDefinitionsPageComponent implements OnInit {
    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    readonly ro = inject(TenantReadOnlyContextService);

    protected readonly definitionsRoute = DEFINITIONS_ROUTE;
    protected readonly codeMax = CASH_REGISTER_CODE_MAX;
    protected readonly nameMax = CASH_REGISTER_NAME_MAX;
    readonly clinicId = this.auth.getClinicId()?.trim() || null;

    readonly registers = signal<CashRegisterDto[]>([]);
    readonly categories = signal<CashMovementCategoryDto[]>([]);
    readonly newCode = signal('');
    readonly newName = signal('');
    readonly newCategory = signal('');
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);
    readonly editing = signal<Editing>(null);
    draftCode = '';
    draftName = '';

    readonly planLocked = computed(() => this.ro.lockedPlanFeature('CashManagement') !== null);
    readonly canWrite = computed(() => !this.ro.mutationBlocked() && this.auth.hasOperationClaim(CASH_REGISTERS_MANAGE_CLAIM));

    ngOnInit(): void {
        this.load();
    }

    load(): void {
        if (!this.clinicId) {
            return;
        }

        this.service.list(this.clinicId, true).subscribe({ next: (rows) => this.registers.set(rows), error: () => this.registers.set([]) });
        this.service.listCategories(true).subscribe({ next: (rows) => this.categories.set(rows), error: () => this.categories.set([]) });
    }

    isEditing(kind: 'register' | 'category', id: string): boolean {
        const e = this.editing();

        return !!e && e.kind === kind && e.id === id;
    }

    editRegister(r: CashRegisterDto): void {
        this.draftCode = r.code;
        this.draftName = r.name;
        this.editing.set({ kind: 'register', id: r.id });
    }

    editCategory(c: CashMovementCategoryDto): void {
        this.draftName = c.name;
        this.editing.set({ kind: 'category', id: c.id });
    }

    cancelEdit(): void {
        this.editing.set(null);
    }

    saveEdit(): void {
        const e = this.editing();

        if (!e || this.busy()) {
            return;
        }

        if (e.kind === 'register') {
            const r = this.registers().find((x) => x.id === e.id);

            if (r && this.draftCode.trim() && this.draftName.trim()) {
                this.saveRegister(r, this.draftCode, this.draftName, r.isActive);
            }

            return;
        }

        const c = this.categories().find((x) => x.id === e.id);

        if (c && this.draftName.trim()) {
            this.saveCategory(c, this.draftName, c.isActive);
        }
    }

    addRegister(): void {
        this.run(this.service.create(this.clinicId!, this.newCode().trim(), this.newName().trim()), () => {
            this.newCode.set('');
            this.newName.set('');
        });
    }

    saveRegister(r: CashRegisterDto, code: string, name: string, isActive: boolean): void {
        this.run(this.service.update(r.id, code.trim(), name.trim(), isActive), () => this.editing.set(null));
    }

    addCategory(): void {
        this.run(this.service.createCategory(this.newCategory().trim()), () => this.newCategory.set(''));
    }

    saveCategory(c: CashMovementCategoryDto, name: string, isActive: boolean): void {
        this.run(this.service.updateCategory(c.id, name.trim(), isActive), () => this.editing.set(null));
    }

    private run(request: Observable<unknown>, done?: () => void): void {
        this.busy.set(true);
        this.error.set(null);
        request.subscribe({
            next: () => {
                this.busy.set(false);
                done?.();
                this.load();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(panelHttpFailureMessage(err, 'Değişiklik kaydedilemedi.'));
                // Sunucu reddettiyse ekranda gösterilen değer yeniden okunur; açık satır taslağıyla kalır.
                this.load();
            }
        });
    }
}
