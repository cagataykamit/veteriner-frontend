import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { SelectButtonModule } from 'primeng/selectbutton';
import { CASH_MOVEMENT_DESCRIPTION_MAX, CASH_MOVEMENT_MAX_AMOUNT, type CashMovementCategoryDto, type CashMovementDirection, type CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';
import { DateInputComponent } from '@/app/shared/forms/date-input/date-input.component';
import { panelHttpFailureMessage } from '@/app/shared/utils/api-error.utils';
import { localDateYyyyMmDd } from '@/app/shared/utils/date.utils';

type FormKind = 'movement' | 'transfer';

/**
 * Kasa giriş/çıkışı ve kasalar arası aktarım formu (TIER-008, `CASH_REGISTERS_API_CONTRACT.md` §3.2–3.3). Pasif kasa listede yoktur;
 * tutar ve tarih kuralları sunucudadır. Düzeltme kaydı ezmez: hatalı hareket rapordan gerekçeyle iptal edilip yeniden girilir.
 */
@Component({
    selector: 'app-cash-movement-forms',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, ButtonModule, InputNumberModule, SelectModule, SelectButtonModule, DateInputComponent],
    template: `
        <section class="card mb-4" aria-labelledby="cashMovementTitle" data-testid="cash-movement-forms">
            <div class="flex flex-wrap items-center gap-3 mb-3">
                <h5 id="cashMovementTitle" class="m-0">Kasaya para gir / çıkar</h5>
                <p-selectbutton [options]="kindOptions" [ngModel]="kind()" (ngModelChange)="switchKind($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="cashMovementTitle" />
            </div>

            <form (ngSubmit)="submit()" class="grid grid-cols-12 gap-4">
                @if (kind() === 'movement') {
                    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                        <span id="cmDirectionLabel" class="block text-sm font-medium text-muted-color mb-2">Hareket *</span>
                        <p-selectbutton name="direction" [options]="directionOptions" [ngModel]="direction()" (ngModelChange)="direction.set($event)" optionLabel="label" optionValue="value" [allowEmpty]="false" ariaLabelledBy="cmDirectionLabel" />
                    </div>
                    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                        <label for="cmRegister" class="block text-sm font-medium text-muted-color mb-2">Kasa *</label>
                        <p-select inputId="cmRegister" name="register" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="effectiveRegisterId()" (ngModelChange)="registerId.set($event)" class="w-full" />
                    </div>
                    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                        <label for="cmCategory" class="block text-sm font-medium text-muted-color mb-2">Gelir/gider türü *</label>
                        <p-select inputId="cmCategory" name="category" [options]="activeCategories()" optionLabel="name" optionValue="id" [ngModel]="categoryId()" (ngModelChange)="categoryId.set($event)" placeholder="Seçin" class="w-full" />
                        @if (activeCategories().length === 0) {
                            <small class="text-muted-color">Önce Kasa ayarlarından bir tür ekleyin.</small>
                        }
                    </div>
                } @else {
                    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                        <label for="cmSource" class="block text-sm font-medium text-muted-color mb-2">Kaynak kasa *</label>
                        <p-select inputId="cmSource" name="source" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="effectiveRegisterId()" (ngModelChange)="registerId.set($event)" class="w-full" />
                    </div>
                    <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                        <label for="cmTarget" class="block text-sm font-medium text-muted-color mb-2">Hedef kasa *</label>
                        <p-select inputId="cmTarget" name="target" [options]="activeRegisters()" optionLabel="name" optionValue="id" [ngModel]="targetId()" (ngModelChange)="targetId.set($event)" placeholder="Seçin" class="w-full" />
                        @if (sameRegister()) {
                            <small class="text-red-500">Kaynak ve hedef aynı olamaz.</small>
                        }
                    </div>
                }
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
                    <label for="cmDate" class="block text-sm font-medium text-muted-color mb-2">Tarih *</label>
                    <app-date-input inputId="cmDate" name="date" [ngModel]="date()" (ngModelChange)="date.set($event)" limit="past" />
                </div>
                <div class="col-span-12 sm:col-span-6 lg:col-span-3">
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
                        styleClass="w-full"
                        inputStyleClass="w-full"
                    />
                </div>
                <div class="col-span-12 lg:col-span-6">
                    <label for="cmDescription" class="block text-sm font-medium text-muted-color mb-2">Açıklama</label>
                    <input id="cmDescription" name="description" type="text" class="w-full p-inputtext p-component" [ngModel]="description()" (ngModelChange)="description.set($event)" [attr.maxlength]="descriptionMax" />
                </div>
                <div class="col-span-12 flex flex-wrap items-center gap-3">
                    <button pButton type="submit" [disabled]="!canSubmit()" data-testid="cash-movement-save">
                        <i class="p-button-icon" [class]="saving() ? 'pi pi-spin pi-spinner' : 'pi pi-check'"></i>{{ kind() === 'movement' ? 'Kaydet' : 'Aktar' }}
                    </button>
                    @if (saved(); as msg) {
                        <span class="text-sm" role="status">{{ msg }}</span>
                    }
                    @if (error(); as err) {
                        <span class="text-red-500 text-sm" role="alert">{{ err }}</span>
                    }
                </div>
            </form>
        </section>
    `
})
export class CashMovementFormsComponent {
    readonly clinicId = input.required<string>();
    readonly registers = input.required<readonly CashRegisterDto[]>();
    readonly categories = input.required<readonly CashMovementCategoryDto[]>();
    /** Kayıt sonrası rapor yenilenir. */
    readonly changed = output<void>();

    private readonly service = inject(CashRegistersService);

    protected readonly maxAmount = CASH_MOVEMENT_MAX_AMOUNT;
    protected readonly descriptionMax = CASH_MOVEMENT_DESCRIPTION_MAX;
    protected readonly kindOptions = [
        { label: 'Giriş / çıkış', value: 'movement' as FormKind },
        { label: 'Kasalar arası aktarım', value: 'transfer' as FormKind }
    ];
    protected readonly directionOptions = [
        { label: 'Çıkış', value: 'Out' as CashMovementDirection },
        { label: 'Giriş', value: 'In' as CashMovementDirection }
    ];

    readonly kind = signal<FormKind>('movement');
    readonly direction = signal<CashMovementDirection>('Out');
    readonly registerId = signal<string | null>(null);
    readonly targetId = signal<string | null>(null);
    readonly categoryId = signal<string | null>(null);
    readonly date = signal(localDateYyyyMmDd());
    readonly amount = signal<number | null>(null);
    readonly description = signal('');
    readonly saving = signal(false);
    readonly saved = signal<string | null>(null);
    readonly error = signal<string | null>(null);

    readonly activeRegisters = computed(() => this.registers().filter((r) => r.isActive));
    readonly activeCategories = computed(() => this.categories().filter((c) => c.isActive));
    readonly sameRegister = computed(() => !!this.targetId() && this.effectiveRegisterId() === this.targetId());
    readonly effectiveRegisterId = computed(() => this.registerId() ?? this.activeRegisters().find((r) => r.isMain)?.id ?? null);

    readonly canSubmit = computed(() => {
        const amount = this.amount();
        const base = !this.saving() && !!this.effectiveRegisterId() && !!this.date() && amount !== null && amount > 0;

        return this.kind() === 'movement' ? base && !!this.categoryId() : base && !!this.targetId() && this.targetId() !== this.effectiveRegisterId();
    });

    switchKind(kind: FormKind): void {
        this.kind.set(kind);
        this.error.set(null);
        this.saved.set(null);
    }

    submit(): void {
        if (!this.canSubmit()) {
            return;
        }

        const description = this.description().trim() || null;
        const registerId = this.effectiveRegisterId()!;
        const request =
            this.kind() === 'movement'
                ? this.service.createMovement({
                      clinicId: this.clinicId(),
                      cashRegisterId: registerId,
                      direction: this.direction(),
                      businessDate: this.date(),
                      amount: this.amount()!,
                      categoryId: this.categoryId()!,
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
        this.saved.set(null);
        request.subscribe({
            next: () => {
                this.saving.set(false);
                this.saved.set(this.kind() === 'movement' ? 'Kasa hareketi kaydedildi.' : 'Aktarım kaydedildi.');
                this.amount.set(null);
                this.description.set('');
                this.changed.emit();
            },
            error: (err: unknown) => {
                this.saving.set(false);
                this.error.set(panelHttpFailureMessage(err, 'Kasa hareketi kaydedilemedi.'));
            }
        });
    }
}
