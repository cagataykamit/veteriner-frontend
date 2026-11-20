import type { MockedObject } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AuthService } from '@/app/core/auth/auth.service';
import type { AiStatusVm } from '@/app/entities/ai/models/ai-vm.model';
import { AiService } from '@/app/entities/ai/services/ai.service';
import { AiStatusService } from '@/app/entities/ai/services/ai-status.service';

const available: AiStatusVm = { isAvailable: true, unavailableCode: null, clinicMonthUsedPercent: 84 };

describe('AiStatusService', () => {
    let ai: MockedObject<AiService>;
    let claims: Set<string>;
    let clinicId: string | null;

    const create = () => {
        TestBed.configureTestingModule({
            providers: [
                { provide: AiService, useValue: ai },
                { provide: AuthService, useValue: { hasOperationClaim: (c: string) => claims.has(c), getClinicId: () => clinicId } }
            ]
        });

        return TestBed.inject(AiStatusService);
    };

    beforeEach(() => {
        ai = { getStatus: vi.fn().mockReturnValue(of(available)) } as unknown as MockedObject<AiService>;
        claims = new Set(['Ai.Use']);
        clinicId = 'c1';
    });

    it('Ai.Use yoksa hiç sormaz ve giriş görünmez', () => {
        claims.clear();
        const s = create();

        s.ensureLoaded();
        expect(ai.getStatus).not.toHaveBeenCalled();
        expect(s.entry()).toEqual({ kind: 'hidden' });
    });

    it('klinik başına bir kez sorar; klinik değişince yeniden sorar', () => {
        const s = create();

        s.ensureLoaded();
        s.ensureLoaded();
        expect(ai.getStatus).toHaveBeenCalledTimes(1);
        expect(s.entry()).toEqual({ kind: 'available' });
        expect(s.usageWarning()).toContain('%84');

        clinicId = 'c2';
        s.ensureLoaded();
        expect(ai.getStatus).toHaveBeenCalledTimes(2);
    });

    it('durum okunamazsa (uç yok, 403) giriş görünmez', () => {
        ai.getStatus.mockReturnValue(throwError(() => new Error('404')));
        const s = create();

        s.ensureLoaded();
        expect(s.entry()).toEqual({ kind: 'hidden' });
    });

    it('tazeleme aynı klinikte eski durumu yanıt gelene kadar korur, sonra günceller', () => {
        const s = create();

        s.ensureLoaded();
        const pending = new Subject<AiStatusVm>();

        ai.getStatus.mockReturnValue(pending);
        s.refresh();
        expect(s.entry()).toEqual({ kind: 'available' });
        pending.next({ isAvailable: false, unavailableCode: 'Ai.SystemBudgetExhausted', clinicMonthUsedPercent: 100 });
        expect(s.entry()).toEqual({ kind: 'disabled', reason: 'Yapay zekâ şu an kullanılamıyor' });
    });
});
