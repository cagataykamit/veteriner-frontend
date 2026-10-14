import type { ExaminationRelatedSummaryVm } from '@/app/features/examinations/models/examination-vm.model';
import {
    buildProcedureRows,
    FINALIZED_LOCK_MESSAGE,
    finalizeWarnings,
    procedureAddState,
    READ_ONLY_TENANT_MESSAGE,
    type ProcedureKind
} from './examination-procedures.utils';

const summary = (over: Partial<ExaminationRelatedSummaryVm> = {}): ExaminationRelatedSummaryVm => ({
    examinationId: 'e1',
    petId: 'p1',
    petName: 'Pamuk',
    clientId: 'c1',
    clientName: 'Ali',
    treatments: [],
    prescriptions: [],
    labResults: [],
    hospitalizations: [],
    payments: [],
    ...over
});

describe('procedureAddState', () => {
    const open = { finalized: false, mutationBlocked: false };

    it('taslakta tüm türler etkindir', () => {
        for (const kind of ['treatment', 'prescription', 'vaccination', 'lab', 'hospitalization'] as ProcedureKind[]) {
            expect(procedureAddState(kind, open)).toEqual({ disabled: false, reason: null, note: null });
        }
    });

    it('kesinleşmiş muayenede tedavi, reçete ve aşı kilit nedeniyle kapanır', () => {
        for (const kind of ['treatment', 'prescription', 'vaccination'] as ProcedureKind[]) {
            const s = procedureAddState(kind, { ...open, finalized: true });
            expect(s.disabled).withContext(kind).toBeTrue();
            expect(s.reason).withContext(kind).toBe(FINALIZED_LOCK_MESSAGE);
        }
    });

    it('kesinleşmiş muayenede lab açık, yatış açık ama muayeneye bağlanmaz notu taşır', () => {
        expect(procedureAddState('lab', { ...open, finalized: true }).disabled).toBeFalse();
        const h = procedureAddState('hospitalization', { ...open, finalized: true });
        expect(h.disabled).toBeFalse();
        expect(h.note).toContain('muayenesiz');
    });

    it('salt okunur kurumda her tür nedenle kapanır', () => {
        const s = procedureAddState('lab', { ...open, mutationBlocked: true });
        expect(s).toEqual({ disabled: true, reason: READ_ONLY_TENANT_MESSAGE, note: null });
    });
});

describe('buildProcedureRows', () => {
    it('özeti tek listede tarihe göre eskiden yeniye sıralar; tarihsiz sona gider', () => {
        const rows = buildProcedureRows(
            summary({
                treatments: [{ id: 't1', treatmentDateUtc: '2026-10-08T11:00:00Z', clinicId: null, clinicName: null, title: 'Serum' }],
                prescriptions: [{ id: 'r1', prescribedAtUtc: '2026-10-08T10:00:00Z', clinicId: null, clinicName: null, title: 'Reçete', treatmentId: null }],
                labResults: [{ id: 'l1', resultDateUtc: null, requestedAtUtc: null, clinicId: null, clinicName: null, testName: 'Kan', status: null, awaitingInterpretation: true }]
            })
        );
        expect(rows.map((r) => r.id)).toEqual(['r1', 't1', 'l1']);
        expect(rows[2].detail).toBe('Yorum bekliyor');
    });

    it('özette olmayan ek satırları (oturum aşısı) listeye katar', () => {
        const rows = buildProcedureRows(summary(), [{ kind: 'vaccination', id: 'v1', atUtc: '2026-10-08T09:00:00Z', title: 'Kuduz', detail: null }]);
        expect(rows.map((r) => r.kind)).toEqual(['vaccination']);
    });

    it('özet yokken boş liste döner', () => {
        expect(buildProcedureRows(null)).toEqual([]);
    });
});

describe('finalizeWarnings', () => {
    it('tanı, plan ve işlem eksikse üç uyarı verir', () => {
        const w = finalizeWarnings({ assessment: '—', plan: '' }, summary());
        expect(w.length).toBe(3);
    });

    it('tanı ve plan doluysa ve işlem varsa uyarı yoktur', () => {
        const w = finalizeWarnings(
            { assessment: 'Gastrit', plan: '3 gün kontrol' },
            summary({ treatments: [{ id: 't1', treatmentDateUtc: null, clinicId: null, clinicName: null, title: 'T' }] })
        );
        expect(w).toEqual([]);
    });

    it('bu oturumda aşı eklendiyse "işlem yok" uyarısı verilmez', () => {
        const w = finalizeWarnings({ assessment: 'x', plan: 'y' }, summary(), 1);
        expect(w).toEqual([]);
    });

    it('özet henüz yüklenmediyse işlem uyarısı verilmez', () => {
        const w = finalizeWarnings({ assessment: 'x', plan: 'y' }, null);
        expect(w).toEqual([]);
    });
});
