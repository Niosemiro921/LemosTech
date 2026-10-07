/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_REALTIME_URL?: string;
  readonly VITE_DRIVER_OFFER_RADIUS_KM?: string;
  readonly VITE_AUTH_LOGOUT_PATH?: string;
  readonly VITE_DRIVER_WITHDRAWAL_PATH?: string;
  readonly VITE_DRIVER_WITHDRAWALS_PATH?: string;
  readonly VITE_ADMIN_WALLET_TOPUPS_PATH?: string;
  readonly VITE_ADMIN_WALLET_TOPUP_CONFIRM_PATH_TEMPLATE?: string;
  readonly VITE_ADMIN_WALLET_TOPUP_REJECT_PATH_TEMPLATE?: string;
}

interface ImportMeta { readonly env: ImportMetaEnv; }
declare module '*.css';
