import { ChangeDetectionStrategy, Component, computed, effect, inject, input, model, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { AuthService } from '@/app/core/auth/auth.service';
import { CASH_REGISTERS_READ_CLAIM } from '@/app/core/auth/operation-claims.constants';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import type { CashRegisterDto } from '@/app/entities/cash-register/models/cash-register.model';
import { CashRegistersService } from '@/app/entities/cash-register/services/cash-registers.service';

/**
 * Nakit tahsilat ve iadede kasa seçimi (TIER-008, `CASH_REGISTERS_API_CONTRACT.md` §4). Yalnız nakitte, kasa yönetimi paketinde ve aktif
 * kasa birden fazlaysa görünür; aksi hâlde değer boştur ve sunucu Ana kasayı kullanır. Varsayılan seçim Ana kasadır.
 */
@Component({
    selector: 'app-cash-register-select',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule, SelectModule],
    host: { '[class]': "visible() ? fieldClass() : 'hidden'" },
    template: `
        @if (visible()) {
            <label [for]="inputId()" class="block text-sm font-medium text-muted-color mb-2">Kasa *</label>
            <p-select
                [inputId]="inputId()"
                [options]="registers()"
                optionLabel="name"
                optionValue="id"
                appendTo="body"
                [ngModel]="value()"
                (ngModelChange)="value.set($event)"
                [disabled]="disabled()"
                class="w-full"
                data-testid="cash-register-select"
            />
            <small class="text-muted-color block">{{ hint() }}</small>
        }
    `
})
export class CashRegisterSelectComponent {
    readonly clinicId = input<string | null>(null);
    /** Ödeme yöntemi (`cash`, `Cash`…); kasa yalnız nakitte sorulur. */
    readonly method = input<string | null>(null);
    readonly inputId = input('cashRegisterId');
    readonly disabled = input(false);
    /** Alan altı açıklaması; iadede nakit kasadan çıkar. */
    readonly hint = input('Nakit bu kasaya girer.');
    /** Görünürken yer aldığı ızgara hücresinin sınıfları; görünmezken bileşen yer kaplamaz. */
    readonly fieldClass = input('');
    /** Seçilen kasa; görünmüyorsa boş (Ana kasa). */
    readonly value = model<string | null>(null);

    private readonly service = inject(CashRegistersService);
    private readonly auth = inject(AuthService);
    private readonly ro = inject(TenantReadOnlyContextService);

    readonly registers = signal<CashRegisterDto[]>([]);
    private readonly allowed = computed(() => this.ro.lockedPlanFeature('CashManagement') === null && this.auth.hasOperationClaim(CASH_REGISTERS_READ_CLAIM));
    private readonly isCash = computed(() => (this.method() ?? '').toLowerCase() === 'cash');
    readonly visible = computed(() => this.allowed() && this.isCash() && this.registers().length > 1);
    private seq = 0;

    constructor() {
        effect(() => {
            const clinicId = this.clinicId()?.trim() || null;
            const allowed = this.allowed();

            untracked(() => this.load(clinicId, allowed));
        });

        effect(() => {
            const visible = this.visible();
            const main = this.registers().find((r) => r.isMain)?.id ?? null;

            untracked(() => {
                if (!visible) {
                    this.value.set(null);
                } else if (!this.registers().some((r) => r.id === this.value())) {
                    this.value.set(main);
                }
            });
        });
    }

    private load(clinicId: string | null, allowed: boolean): void {
        const seq = ++this.seq;

        this.registers.set([]);

        if (!clinicId || !allowed) {
            return;
        }

        this.service.list(clinicId).subscribe({
            next: (rows) => seq === this.seq && this.registers.set(rows),
            // Liste okunamazsa kasa sorulmaz; sunucu Ana kasayı kullanır.
            error: () => seq === this.seq && this.registers.set([])
        });
    }
}
