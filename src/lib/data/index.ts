import type { Api } from './api';
import { crearApiLocal } from './local';
import { crearApiSupabase } from './supabase';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Si existen las variables de Supabase, la app usa tu base real.
 * Si no, arranca en modo local con datos de ejemplo (ideal para probar).
 */
export const api: Api = url && key ? crearApiSupabase(url, key) : crearApiLocal();
