import { createClient } from '@supabase/supabase-js';

// ==============================================================================
// CONFIGURAÇÃO DO SUPABASE
// ==============================================================================
// Para conectar ao seu banco de dados:
// 1. Vá ao painel do Supabase (Settings -> API).
// 2. Copie a "Project URL" e cole na variável abaixo (substituindo o placeholder).
// 3. Copie a chave "anon public" e cole na variável abaixo.
// ==============================================================================

// Tenta ler do .env (se existir), senão usa as strings abaixo (para teste rápido)
const supabaseUrl = (import.meta as any).env?.VITE_SUPABASE_URL || 'https://ieqivcdepnlfmxyrfzbt.supabase.co';
const supabaseAnonKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ju08TKRFtBN6UGhyiYz6lw_zUjLIU7x';

// Cria o cliente de conexão
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Função para testar se a conexão está ativa e a tabela existe
export async function checkSupabaseConnection(): Promise<boolean> {
  try {
    // Tenta buscar apenas 1 linha da tabela para ver se responde
    const { data, error } = await supabase
      .from('reference_curves')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Erro ao testar conexão Supabase:', error.message);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Exceção ao conectar Supabase:', e);
    return false;
  }
}