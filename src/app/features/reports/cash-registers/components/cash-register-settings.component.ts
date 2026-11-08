import { ChangeDetectionStrategy, Component, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { CASH_REGISTER_CODE_MAX, CASH_REGISTER_NAME_MAX, type CashMovementCategoryDto, type CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';

/**
 * Kasa ve gelir/gider türü tanımları (TIER-008, `CashRegisters.Manage`). Kayıtlar silinmez; pasife alınan kasaya yeni hareket girilmez,
 * geçmişi raporda kalır. Ana kasa pasife alınamaz (kasa seçilmeyen nakit ona yazılır).
 */
@Component({
    selector: 'app-cash-register-settings',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, ToggleSwitchModule],
    template: `
        <section class="card mb-4" aria-labelledby="cashSettingsTitle" data-testid="cash-register-settings">
            <h5 id="cashSettingsTitle" class="mt-0 mb-1">Kasalar ve türler</h5>
            <p class="text-sm text-muted-color mt-0 mb-4">Kayıtlar silinmez; pasife alınanlar yeni harekette seçilemez, geçmişi raporda kalır.</p>

            <div class="grid grid-cols-12 gap-6">
                <div class="col-span-12 lg:col-span-7">
                    <h6 class="mt-0 mb-2">Kasalar</h6>
                    <ul class="list-none p-0 m-0 flex flex-col gap-2" data-testid="cash-register-list">
                        @for (r of registers(); track r.id) {
                            <li class="flex flex-wrap items-center gap-2">
                                <input type="text" class="p-inputtext p-component w-24" [attr.aria-label]="r.name + ' kodu'" [ngModel]="r.code" #code [attr.maxlength]="codeMax" [disabled]="busy()" />
                                <input type="text" class="p-inputtext p-component flex-1 min-w-40" [attr.aria-label]="r.name + ' adı'" [ngModel]="r.name" #name [attr.maxlength]="nameMax" [disabled]="busy()" />
                                @if (r.isMain) {
                                    <span class="text-xs text-muted-color">Ana kasa</span>
                                } @else {
                                    <label class="flex items-center gap-2 text-sm">
                                        <p-toggleswitch [ngModel]="r.isActive" (ngModelChange)="saveRegister(r, code.value, name.value, $event)" [disabled]="busy()" [ariaLabel]="r.name + ' etkin'" />Etkin
                                    </label>
                                }
                                <button pButton type="button" severity="secondary" [outlined]="true" size="small" (click)="saveRegister(r, code.value, name.value, r.isActive)" [disabled]="busy()">Kaydet</button>
                            </li>
                        }
                    </ul>
                    <form class="flex flex-wrap items-end gap-2 mt-3" (ngSubmit)="addRegister()">
                        <div>
                            <label for="crNewCode" class="block text-xs font-medium text-muted-color mb-1">Kod</label>
                            <input id="crNewCode" name="code" type="text" class="p-inputtext p-component w-24" [ngModel]="newCode()" (ngModelChange)="newCode.set($event)" [attr.maxlength]="codeMax" />
                        </div>
                        <div class="flex-1 min-w-40">
                            <label for="crNewName" class="block text-xs font-medium text-muted-color mb-1">Yeni kasa adı</label>
                            <input id="crNewName" name="name" type="text" class="p-inputtext p-component w-full" [ngModel]="newName()" (ngModelChange)="newName.set($event)" [attr.maxlength]="nameMax" />
                        </div>
                        <button pButton type="submit" [disabled]="busy() || !newCode().trim() || !newName().trim()" data-testid="cash-register-add"><i class="p-button-icon pi pi-plus"></i>Kasa ekle</button>
                    </form>
                </div>

                <div class="col-span-12 lg:col-span-5">
                    <h6 class="mt-0 mb-2">Gelir/gider türleri</h6>
                    <ul class="list-none p-0 m-0 flex flex-col gap-2" data-testid="cash-category-list">
                        @for (c of categories(); track c.id) {
                            <li class="flex flex-wrap items-center gap-2">
                                <input type="text" class="p-inputtext p-component flex-1 min-w-40" [attr.aria-label]="c.name + ' adı'" [ngModel]="c.name" #catName [attr.maxlength]="nameMax" [disabled]="busy()" />
                                <label class="flex items-center gap-2 text-sm"> <p-toggleswitch [ngModel]="c.isActive" (ngModelChange)="saveCategory(c, catName.value, $event)" [disabled]="busy()" [ariaLabel]="c.name + ' etkin'" />Etkin </label>
                                <button pButton type="button" severity="secondary" [outlined]="true" size="small" (click)="saveCategory(c, catName.value, c.isActive)" [disabled]="busy()">Kaydet</button>
                            </li>
                        }
                    </ul>
                    <form class="flex flex-wrap items-end gap-2 mt-3" (ngSubmit)="addCategory()">
                        <div class="flex-1 min-w-40">
                            <label for="crNewCategory" class="block text-xs font-medium text-muted-color mb-1">Yeni tür</label>
                            <input id="crNewCategory" name="category" type="text" class="p-inputtext p-component w-full" [ngModel]="newCategory()" (ngModelChange)="newCategory.set($event)" [attr.maxlength]="nameMax" />
                        </div>
                        <button pButton type="submit" [disabled]="busy() || !newCategory().trim()" data-testid="cash-category-add"><i class="p-button-icon pi pi-plus"></i>Tür ekle</button>
                    </form>
                </div>
            </div>

            @if (error(); as err) {
                <p class="text-red-500 text-sm mt-3 mb-0" role="alert">{{ err }}</p>
            }
        </section>
    `
})
export class CashRegisterSettingsComponent {
    readonly clinicId = input.required<string>();
    /** Pasifler dahil. */
    readonly registers = input.required<readonly CashRegisterDto[]>();
    readonly categories = input.required<readonly CashMovementCategoryDto[]>();
    readonly changed = output<void>();

    private readonly service = inject(CashRegistersService);

    protected readonly codeMax = CASH_REGISTER_CODE_MAX;
    protected readonly nameMax = CASH_REGISTER_NAME_MAX;

    readonly newCode = signal('');
    readonly newName = signal('');
    readonly newCategory = signal('');
    readonly busy = signal(false);
    readonly error = signal<string | null>(null);

    addRegister(): void {
        this.run(this.service.create(this.clinicId(), this.newCode().trim(), this.newName().trim()), () => {
            this.newCode.set('');
            this.newName.set('');
        });
    }

    saveRegister(r: CashRegisterDto, code: string, name: string, isActive: boolean): void {
        this.run(this.service.update(r.id, code.trim(), name.trim(), isActive));
    }

    addCategory(): void {
        this.run(this.service.createCategory(this.newCategory().trim()), () => this.newCategory.set(''));
    }

    saveCategory(c: CashMovementCategoryDto, name: string, isActive: boolean): void {
        this.run(this.service.updateCategory(c.id, name.trim(), isActive));
    }

    private run(request: Observable<unknown>, done?: () => void): void {
        this.busy.set(true);
        this.error.set(null);
        request.subscribe({
            next: () => {
                this.busy.set(false);
                done?.();
                this.changed.emit();
            },
            error: (err: unknown) => {
                this.busy.set(false);
                this.error.set(panelHttpFailureMessage(err, 'Değişiklik kaydedilemedi.'));
                // Sunucu reddettiyse ekranda gösterilen değer yeniden okunur.
                this.changed.emit();
            }
        });
    }
}
