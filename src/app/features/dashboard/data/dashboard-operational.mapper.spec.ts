import { buildOperationalActionItems, mapDashboardOperationalAlertsDtoToVm } from './dashboard-operational.mapper';

describe('buildOperationalActionItems — aşı uyarıları', () => {
    const alerts = mapDashboardOperationalAlertsDtoToVm({ overdueVaccinationsCount: 2, upcomingVaccinationsNext7DaysCount: 5 });

    it('"Yaklaşan aşılar" uyarısı sayının tanımıyla aynı süzgeçle listeye gider (planlı, 7 gün, vefat edenler hariç)', () => {
        const item = buildOperationalActionItems(alerts, new Date('2026-10-16T09:00:00Z')).find((x) => x.key === 'upcoming7dVaccinations');

        expect(item?.route).toBe('/panel/vaccinations');
        expect(item?.queryParams).toEqual({ status: '0', fromDate: '2026-10-16', toDate: '2026-10-23', onlyReceivingCare: 'true' });
    });

    it('"Geciken aşı takipleri" gecikmiş derin bağlantısını korur', () => {
        const item = buildOperationalActionItems(alerts).find((x) => x.key === 'overdueVaccinations');

        expect(item?.queryParams).toEqual({ overdue: 'true' });
    });
});
