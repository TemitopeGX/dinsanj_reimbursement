import { create } from 'zustand'

export const useStore = create((set) => ({
  user: JSON.parse(localStorage.getItem('auth_user')) || null,
  token: localStorage.getItem('auth_token') || null,
  settings: {
    default_currency: 'NGN',
    company_name: 'DINSANJ VENTURES LIMITED',
    bank_name: 'UNION BANK PLC',
    account_number: '0118921942'
  },
  
  login: (userData, token) => {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(userData));
    set({ user: userData, token });
  },
  
  logout: () => {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    set({ user: null, token: null });
  },

  setSettings: (newSettings) => set((state) => ({
    settings: { ...state.settings, ...newSettings }
  }))
}))
