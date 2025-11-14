export const API_URL = 'https://incredible-success-production.up.railway.app';

export const config = {
  apiUrl: API_URL,
  endpoints: {
    extract: `${API_URL}/api/extract`,
    health: `${API_URL}/health`,
  }
};
