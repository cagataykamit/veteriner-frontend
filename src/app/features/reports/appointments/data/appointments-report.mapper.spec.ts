import { mapAppointmentsReportDtoToVm } from '@/app/features/reports/appointments/data/appointments-report.mapper';

describe('appointments report mapper — Gelmedi sayısı', () => {
    it('statusCounts.noShow okunur; yoksa null', () => {
        expect(mapAppointmentsReportDtoToVm({ totalCount: 4, items: [], statusCounts: { noShow: 2 } }, { page: 1, pageSize: 20 }).noShowCount).toBe(2);
        expect(mapAppointmentsReportDtoToVm({ totalCount: 4, items: [] }, { page: 1, pageSize: 20 }).noShowCount).toBeNull();
    });
});
