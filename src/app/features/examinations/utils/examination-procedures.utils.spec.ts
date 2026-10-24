import type { ExaminationRelatedSummaryVm } from '@/app/features/examinations/models/examination-vm.model';
import {
    buildProcedureRows,
    FINALIZED_IMAGING_NOTE,
    FINALIZED_LOCK_MESSAGE,
    finalizeChecklist,
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
    vaccinations: [],
    imaging: [],
    payments: [],
    pendingChargeCount: null,
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

    it('kesinleşmiş muayenede görüntüleme açıktır; yeni (ek) kayıt olarak eklendiği söylenir (ADR-013 uyumu)', () => {
        expect(procedureAddState('imaging', open)).toEqual({ disabled: false, reason: null, note: null });
        const s = procedureAddState('imaging', { ...open, finalized: true });

        expect(s.disabled).toBeFalse();
        expect(s.note).toBe(FINALIZED_IMAGING_NOTE);
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

    it('aşıları özetten okur: uygulanan etiketsiz, planlı Planlı, iptal İptal (gizlenmez)', () => {
        const rows = buildProcedureRows(
            summary({
                vaccinations: [
                    { id: 'v1', vaccineName: 'Kuduz', status: 'Applied', appliedAtUtc: '2026-10-08T09:00:00Z', dueAtUtc: null, clinicId: null, clinicName: null },
                    { id: 'v2', vaccineName: 'Karma', status: 'Scheduled', appliedAtUtc: null, dueAtUtc: '2026-11-08T09:00:00Z', clinicId: null, clinicName: null },
                    { id: 'v3', vaccineName: 'Lösemi', status: 'Cancelled', appliedAtUtc: null, dueAtUtc: '2026-10-09T09:00:00Z', clinicId: null, clinicName: null }
                ]
            })
        );

        expect(rows.map((r) => [r.id, r.stateLabel ?? null, !!r.cancelled])).toEqual([
            ['v1', null, false],
            ['v3', 'İptal', true],
            ['v2', 'Planlı', false]
        ]);
    });

    it('görüntülemeyi özetten okur: tür adı başlık, açıklama ayrıntı; iptal silik, ek kayıt işaretli', () => {
        const rows = buildProcedureRows(
            summary({
                imaging: [
                    { id: 'i1', performedAtUtc: '2026-10-08T09:00:00Z', modality: 'XRay', description: 'Sol arka bacak', cancelled: false, addedAfterFinalization: true, clinicId: null, clinicName: null },
                    { id: 'i2', performedAtUtc: '2026-10-08T08:00:00Z', modality: 'Ultrasound', description: null, cancelled: true, addedAfterFinalization: false, clinicId: null, clinicName: null }
                ]
            })
        );

        expect(rows.map((r) => [r.kind, r.id, r.title, r.detail, r.stateLabel ?? null, !!r.cancelled, !!r.addedAfterFinalization])).toEqual([
            ['imaging', 'i2', 'Ultrason', null, 'İptal', true, false],
            ['imaging', 'i1', 'Röntgen', 'Sol arka bacak', null, false, true]
        ]);
    });

    it('kesinleştirme kontrolünde etkin görüntüleme işlem sayılır, iptal edilen sayılmaz', () => {
        const done = { assessment: 'x', plan: 'y' };
        const img = (cancelled: boolean) => ({ id: 'i1', performedAtUtc: null, modality: 'XRay', description: null, cancelled, addedAfterFinalization: false, clinicId: null, clinicName: null });

        expect(finalizeWarnings(done, summary({ imaging: [img(false)] }))).toEqual([]);
        expect(finalizeWarnings(done, summary({ imaging: [img(true)] })).length).toBe(1);
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

    it('ücret bekleyen kalem varsa uyarı verilir (engel değil); 0 veya null ise verilmez', () => {
        const done = { assessment: 'x', plan: 'y' };
        const withTreatment = { treatments: [{ id: 't1', treatmentDateUtc: null, clinicId: null, clinicName: null, title: 'T' }] };

        expect(finalizeWarnings(done, summary({ ...withTreatment, pendingChargeCount: 2 }))).toEqual(['2 ücret bekliyor (resepsiyon ücrete çevirmedi veya ücretsiz saymadı).']);
        expect(finalizeWarnings(done, summary({ ...withTreatment, pendingChargeCount: 0 }))).toEqual([]);
        expect(finalizeWarnings(done, summary({ ...withTreatment, pendingChargeCount: null }))).toEqual([]);
    });

    it('özette yalnız aktif aşı varsa "işlem yok" uyarısı verilmez; yalnız iptal aşı varsa verilir', () => {
        const v = (status: 'Applied' | 'Cancelled') => ({ id: 'v1', vaccineName: 'Kuduz', status, appliedAtUtc: null, dueAtUtc: null, clinicId: null, clinicName: null });

        expect(finalizeWarnings({ assessment: 'x', plan: 'y' }, summary({ vaccinations: [v('Applied')] }))).toEqual([]);
        expect(finalizeWarnings({ assessment: 'x', plan: 'y' }, summary({ vaccinations: [v('Cancelled')] })).length).toBe(1);
    });

    it('özet henüz yüklenmediyse işlem uyarısı verilmez', () => {
        const w = finalizeWarnings({ assessment: 'x', plan: 'y' }, null);

        expect(w).toEqual([]);
    });
});

describe('finalizeChecklist', () => {
    it('tamam ve eksik maddeleri birlikte döner; uyarılar eksik maddelerle aynıdır', () => {
        const items = finalizeChecklist({ assessment: 'Gastrit', plan: '—' }, summary({ pendingChargeCount: 1 }));

        expect(items.map((i) => [i.key, i.ok])).toEqual([
            ['assessment', true],
            ['plan', false],
            ['procedures', false],
            ['pendingCharges', false]
        ]);
        expect(finalizeWarnings({ assessment: 'Gastrit', plan: '—' }, summary({ pendingChargeCount: 1 }))).toEqual(
            items.filter((i) => !i.ok).map((i) => i.warning)
        );
    });

    it('özet yokken yalnız tanı ve plan maddeleri; ücret sayısı bilinmiyorsa ücret maddesi yok', () => {
        expect(finalizeChecklist({ assessment: 'x', plan: 'y' }, null).map((i) => i.key)).toEqual(['assessment', 'plan']);
        expect(finalizeChecklist({ assessment: 'x', plan: 'y' }, summary({ pendingChargeCount: null })).map((i) => i.key)).toEqual([
            'assessment',
            'plan',
            'procedures'
        ]);
    });
});
