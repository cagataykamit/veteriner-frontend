import { readPendingRequestsView, writePendingRequestsView } from './pending-requests-view-preference';

describe('pending-requests-view-preference', () => {
    beforeEach(() => localStorage.clear());

    it('kayıt yoksa ya da kullanıcı yoksa varsayılan kutucuktur', () => {
        expect(readPendingRequestsView('u1')).toBe('tiles');
        expect(readPendingRequestsView(null)).toBe('tiles');
    });

    it('tercih kullanıcı başına saklanır', () => {
        writePendingRequestsView('u1', 'chip');

        expect(localStorage.getItem('vetinity.pendingRequestsView.u1')).toBe('chip');
        expect(readPendingRequestsView('u1')).toBe('chip');
        expect(readPendingRequestsView('u2')).toBe('tiles');

        writePendingRequestsView('u1', 'tiles');
        expect(readPendingRequestsView('u1')).toBe('tiles');
    });

    it('tanınmayan değer ya da erişilemeyen depo varsayılana düşer; kullanıcı yoksa yazılmaz', () => {
        localStorage.setItem('vetinity.pendingRequestsView.u1', 'bilinmeyen');
        expect(readPendingRequestsView('u1')).toBe('tiles');

        writePendingRequestsView(null, 'chip');
        expect(localStorage.length).toBe(1);

        const getItem = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('engelli');
        });

        expect(readPendingRequestsView('u1')).toBe('tiles');
        getItem.mockRestore();
    });
});
