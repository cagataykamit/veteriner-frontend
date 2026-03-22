/**
 * Backend Veteriner API (OpenAPI 3) — Swagger ile uyumlu tam path'ler.
 * @see https://localhost:7173/swagger/index.html
 */
export const ApiEndpoints = {
    auth: {
        login: () => `/api/v1/Auth/login`,
        refresh: () => `/api/v1/Auth/refresh`,
        logout: () => `/api/v1/Auth/logout`,
        logoutAll: () => `/api/v1/Auth/logout-all`
    },
    dashboard: {
        summary: () => `/api/v1/dashboard/summary`
    },
    clients: {
        list: () => `/api/v1/clients`,
        byId: (id: string) => `/api/v1/clients/${encodeURIComponent(id)}`
    },
    pets: {
        list: () => `/api/v1/pets`,
        byId: (id: string) => `/api/v1/pets/${encodeURIComponent(id)}`
    }
} as const;
