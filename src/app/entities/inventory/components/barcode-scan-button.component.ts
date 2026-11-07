import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { AppPlanUpgradeNoticeComponent } from '@/app/entities/subscription/components/app-plan-upgrade-notice.component';
import { BarcodeCameraDialogComponent } from '@/app/shared/barcode/barcode-camera-dialog.component';

/**
 * Kamerayla barkod okutma düğmesi (TIER-006, `MOBILE_BARCODE_API_CONTRACT.md`). Paket kararı backend'dedir (`MobileBarcode`,
 * `access-state`); pakette yoksa kilitli düğme "üst pakete geç" kutusunu açar. Elle ya da okuyucuyla barkod girişi her pakette açıktır
 * ve bu düğmenin dışındadır. Okunan barkod `scanned` ile döner; ürünü bulmak çağıranın işidir.
 */
@Component({
    selector: 'app-barcode-scan-button',
    standalone: true,
    imports: [ButtonModule, PopoverModule, AppPlanUpgradeNoticeComponent, BarcodeCameraDialogComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        @if (locked()) {
            <button
                pButton
                type="button"
                severity="secondary"
                [outlined]="true"
                [iconOnly]="!label()"
                [attr.aria-label]="label() ? null : 'Kamerayla barkod okut (üst pakette)'"
                [attr.title]="label() ? null : 'Kamerayla barkod okut'"
                (click)="notice.toggle($event)"
                data-testid="barcode-scan-locked"
            >
                <i class="p-button-icon pi pi-lock"></i>{{ label() }}
            </button>
            <p-popover #notice styleClass="w-[22rem] max-w-[calc(100vw-2rem)]">
                <app-plan-upgrade-notice feature="MobileBarcode" detail="Telefon kamerasıyla barkodu okutun; ürün stok girişinde ve satışta kendiliğinden bulunur. Barkodu elle yazmak her pakette açıktır." />
            </p-popover>
        } @else {
            <button
                pButton
                type="button"
                severity="secondary"
                [outlined]="true"
                [iconOnly]="!label()"
                [attr.aria-label]="label() ? null : 'Kamerayla barkod okut'"
                [attr.title]="label() ? null : 'Kamerayla barkod okut'"
                [disabled]="disabled()"
                (click)="open.set(true)"
                data-testid="barcode-scan-button"
            >
                <i class="p-button-icon pi pi-camera"></i>{{ label() }}
            </button>
            <app-barcode-camera-dialog [(visible)]="open" (detected)="scanned.emit($event)" />
        }
    `
})
export class BarcodeScanButtonComponent {
    private readonly ro = inject(TenantReadOnlyContextService);

    /** Boşsa yalnız simge (dar alanlarda arama kutusunun yanında). */
    readonly label = input('');
    readonly disabled = input(false);
    readonly scanned = output<string>();

    protected readonly open = signal(false);
    protected readonly locked = computed(() => this.ro.lockedPlanFeature('MobileBarcode') !== null);
}
