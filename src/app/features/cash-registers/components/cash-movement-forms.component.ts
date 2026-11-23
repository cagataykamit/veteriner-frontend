import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { map } from 'rxjs';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { CASH_MOVEMENT_DESCRIPTION_MAX, CASH_MOVEMENT_MAX_AMOUNT, type CashMovementCategoryDto, type CashMovementDirection, type CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_REGISTERS_MANAGE_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { type InlineCreateConfig, InlineCreateDirective } from '@/app/shared/forms/inline-create/inline-create.directive';
import { InlineCreateOptionComponent } from '@/app/shared/forms/inline-create/inline-create-option.component';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';

export type CashFormKind = 'movement' | 'transfer';

/**
 * Para girişi / çıkışı ve kasalar arası aktarım formu (TIER-008, `CASH_REGISTERS_API_CONTRACT.md` §3.2–3.3). Para › Kasa sekmesinde
 * pencerede açılır (S-05); tür ve yön açan düğmeden gelir. Pasif kasa listede yoktur; tutar ve tarih kuralları sunucudadır. Düzeltme
 * kaydı ezmez: hatalı hareket gerekçeyle iptal edilip yeniden girilir.
 */
@Component({
    selector: 'app-cash-movement-forms',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputNumberModule, SelectModule, DateInputComponent, InlineCreateDirective, InlineCreateOptionComponent],
    template: `
        <form (ngSubmit)="submit()" class="grid grid-cols-12 gap-4" data-testid="cash-movement-forms">
            @if (kind() === 'movement') {
                <div class="col-span-12 sm:col-span-6">
                    <label for="cmRegister" class="block text-sm font-medium text-muted-color mb-2">Kasa *</label>
                    <p-select inputId="cmRegister" name="register" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="effectiveRegisterId()" (ngModelChange)="registerId.set($event)" appendTo="body" class="w-full" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <label for="cmCategory" class="block text-sm font-medium text-muted-color mb-2">Gelir/gider türü *</label>
                    <p-select
                        inputId="cmCategory"
                        name="category"
                        [options]="activeCategories()"
                        optionLabel="name"
                        optionValue="id"
                        [ngModel]="effectiveCategoryId()"
                        (ngModelChange)="categoryId.set($event)"
                        placeholder="Seçin"
                        [filter]="true"
                        filterBy="name"
                        filterPlaceholder="Ara…"
                        [appInlineCreate]="categoryCreate()"
                        appendTo="body"
                        class="w-full"
                    >
                        <ng-template #emptyfilter><app-inline-create-option /></ng-template>
                        <ng-template #empty><app-inline-create-option emptyText="Henüz gelir/gider türü yok." /></ng-template>
                    </p-select>
                </div>
            } @else {
                <div class="col-span-12 sm:col-span-6">
                    <label for="cmSource" class="block text-sm font-medium text-muted-color mb-2">Kaynak kasa *</label>
                    <p-select inputId="cmSource" name="source" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="effectiveRegisterId()" (ngModelChange)="registerId.set($event)" appendTo="body" class="w-full" />
                </div>
                <div class="col-span-12 sm:col-span-6">
                    <label for="cmTarget" class="block text-sm font-medium text-muted-color mb-2">Hedef kasa *</label>
                    <p-select inputId="cmTarget" name="target" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="targetId()" (ngModelChange)="targetId.set($event)" placeholder="Seçin" appendTo="body" class="w-full" />
                    @if (sameRegister()) {
                        <small class="text-danger">Kaynak ve hedef aynı olamaz.</small>
                    }
                </div>
            }
            <div class="col-span-12 sm:col-span-6">
                <label for="cmDate" class="block text-sm font-medium text-muted-color mb-2">Tarih *</label>
                <app-date-input inputId="cmDate" name="date" [ngModel]="date()" (ngModelChange)="date.set($event)" limit="past" />
            </div>
            <div class="col-span-12 sm:col-span-6">
                <label for="cmAmount" class="block text-sm font-medium text-muted-color mb-2">Tutar *</label>
                <p-inputnumber
                    inputId="cmAmount"
                    name="amount"
                    [ngModel]="amount()"
                    (ngModelChange)="amount.set($event)"
                    mode="decimal"
                    locale="tr-TR"
                    [minFractionDigits]="2"
                    [maxFractionDigits]="2"
                    [min]="0"
                    [max]="maxAmount"
                    [fluid]="true"
                />
            </div>
            <div class="col-span-12">
                <label for="cmDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                <input id="cmDescription" name="description" type="text" class="w-full p-inputtext p-component" [ngModel]="description()" (ngModelChange)="description.set($event)" [attr.maxlength]="descriptionMax" />
            </div>
            <div class="col-span-12 flex flex-wrap items-center justify-end gap-3">
                @if (error(); as err) {
                    <span class="text-danger text-sm mr-auto" role="alert">{{ err }}</span>
                }
                <button pButton type="button" severity="secondary" [text]="true" (click)="cancelled.emit()">Vazgeç</button>
                <button pButton type="submit" [disabled]="!canSubmit()" data-testid="cash-movement-save">
                    <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ kind() === 'movement' ? 'Kaydet' : 'Aktar' }}
                </button>
            </div>
        </form>
    `
})
export class CashMovementFormsComponent {
    readonly clinicId = input.required<string>();
    readonly registers = input.required<readonly CashRegisterDto[]>();
    readonly categories = input.required<readonly CashMovementCategoryDto[]>();
    /** Giriş/çıkış ya da aktarım; açan düğme belirler. */
    readonly kind = input<CashFormKind>('movement');
    readonly direction = input<CashMovementDirection>('Out');
    /** Önerilen kaynak kasa (sekmede seçili kasa); yoksa Ana kasa. */
    readonly preferredRegisterId = input<string | null>(null);
    /** Kayıt sonrası bakiye ve hareketler yenilenir; metin sayfada gösterilir. */
    readonly saved = output<string>();
    readonly cancelled = output<void>();

    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);
    /** Yerinde eklenen türler; üst sayfa listeyi yenileyince aynı kayıt bir kez görünür. */
    private readonly createdCategories = signal<CashMovementCategoryDto[]>([]);

    protected readonly maxAmount = CASH_MOVEMENT_MAX_AMOUNT;
    protected readonly descriptionMax = CASH_MOVEMENT_DESCRIPTION_MAX;

    readonly registerId = signal<string | null>(null);
    readonly targetId = signal<string | null>(null);
    readonly categoryId = signal<string | null>(null);
    readonly date = signal(localDateYyyyMmDd());
    readonly amount = signal<number | null>(null);
    readonly description = signal('');
    readonly saving = signal(false);
    readonly error = signal<string | null>(null);

    readonly activeRegisters = computed(() => this.registers().filter((r) => r.isActive));
    readonly activeCategories = computed(() => {
        const given = this.categories();
        const extra = this.createdCategories().filter((c) => !given.some((g) => g.id === c.id));

        return [...given, ...extra].filter((c) => c.isActive);
    });
    /** Aranan gelir/gider türü yoksa adıyla eklenir ve seçilir (O1). */
    readonly categoryCreate = computed<InlineCreateConfig>(() => ({
        canCreate: this.auth.hasOperationClaim(CASH_REGISTERS_MANAGE_CLAIM) && !this.ro.mutationBlocked(),
        create: (name) =>
            this.service.createCategory(name.trim()).pipe(
                map((category) => {
                    this.createdCategories.update((c) => [...c, category]);
                    this.categoryId.set(category.id);

                    return category.id;
                })
            )
    }));
    readonly sameRegister = computed(() => !!this.targetId() && this.effectiveRegisterId() === this.targetId());
    readonly effectiveRegisterId = computed(() => {
        const active = this.activeRegisters();
        const preferred = this.preferredRegisterId();

        return this.registerId() ?? (active.some((r) => r.id === preferred) ? preferred : (active.find((r) => r.isMain)?.id ?? null));
    });
    /** Tek gelir/gider türü varsa o seçili gelir (H1). */
    readonly effectiveCategoryId = computed(() => {
        const active = this.activeCategories();

        return this.categoryId() ?? (active.length === 1 ? active[0].id : null);
    });

    readonly canSubmit = computed(() => {
        const amount = this.amount();
        const base = !this.saving() && !!this.effectiveRegisterId() && !!this.date() && amount !== null && amount > 0;

        return this.kind() === 'movement' ? base && !!this.effectiveCategoryId() : base && !!this.targetId() && this.targetId() !== this.effectiveRegisterId();
    });

    submit(): void {
        if (!this.canSubmit()) {
            return;
        }

        const description = this.description().trim() || null;
        const registerId = this.effectiveRegisterId()!;
        const movement = this.kind() === 'movement';
        const request = movement
            ? this.service.createMovement({
                  clinicId: this.clinicId(),
                  cashRegisterId: registerId,
                  direction: this.direction(),
                  businessDate: this.date(),
                  amount: this.amount()!,
                  categoryId: this.effectiveCategoryId()!,
                  description
              })
            : this.service.createTransfer({
                  clinicId: this.clinicId(),
                  sourceCashRegisterId: registerId,
                  targetCashRegisterId: this.targetId()!,
                  businessDate: this.date(),
                  amount: this.amount()!,
                  description
              });

        this.saving.set(true);
        this.error.set(null);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.amount.set(null);
                this.description.set('');
                this.saved.emit(movement ? (this.direction() === 'In' ? 'Para girişi kaydedildi.' : 'Para çıkışı kaydedildi.') : 'Aktarım kaydedildi.');
            },
            error: (err: unknown) => {
                this.saving.set(false);
                this.error.set(panelHttpFailureMessage(err, 'Kasa hareketi kaydedilemedi.'));
            }
        });
    }
}
