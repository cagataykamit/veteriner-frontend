import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '@/app/core/auth/auth.service';
import type { TenantPlanFeatureVm } from '@/app/core/tenant/models/tenant-access-state-vm.model';
import { TenantReadOnlyContextService } from '@/app/core/tenant/tenant-read-only-context.service';
import { BarcodeScanButtonComponent } from './barcode-scan-button.component';

describe('BarcodeScanButtonComponent', () => {
    const locked = signal<TenantPlanFeatureVm | null>(null);
    let asked: string[];

    function create(label = ''): HTMLElement {
        const fixture = TestBed.createComponent(BarcodeScanButtonComponent);

        fixture.componentRef.setInput('label', label);
        fixture.detectChanges();

        return fixture.nativeElement as HTMLElement;
    }

    beforeEach(() => {
        asked = [];
        locked.set(null);
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: AuthService, useValue: { hasOperationClaim: () => true } },
                {
                    provide: TenantReadOnlyContextService,
                    useValue: {
                        lockedPlanFeature: (f: string) => {
                            asked.push(f);

                            return locked();
                        }
                    }
                }
            ]
        });
    });

    it('pakette varsa kamera düğmesini gösterir', () => {
        const el = create();

        expect(asked).toContain('MobileBarcode');
        expect(el.querySelector('[data-testid="barcode-scan-button"]')?.getAttribute('aria-label')).toBe('Kamerayla barkod okut');
        expect(el.querySelector('[data-testid="barcode-scan-locked"]')).toBeNull();
    });

    it('pakette yoksa kilitli düğme üst paket kutusunu açar', async () => {
        locked.set({ feature: 'MobileBarcode', isEnabled: false, requiredPlanCode: 'Pro' });
        const el = create('Barkod okut');
        const button = el.querySelector<HTMLButtonElement>('[data-testid="barcode-scan-locked"]')!;

        expect(el.querySelector('[data-testid="barcode-scan-button"]')).toBeNull();
        expect(button.textContent).toContain('Barkod okut');
        button.click();
        await new Promise((r) => setTimeout(r));

        expect(document.body.querySelector('[data-testid="plan-upgrade-notice"]')?.textContent).toContain('Kamerayla barkod okutma Profesyonel ve Kurumsal paketlerinde var.');
    });
});
