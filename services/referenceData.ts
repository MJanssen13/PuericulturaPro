
import { Sex, ReferenceDataPoint } from '../types';
import { supabase } from '../lib/supabase';

// DADOS DE EXEMPLO (MOCK)
// Usados APENAS se a conexão com Supabase falhar ou as chaves não forem preenchidas.
const WEIGHT_GIRLS_MOCK: ReferenceDataPoint[] = [
  { age_days: 0,  z_pos_4: 5356, z_pos_3: 4793, z_pos_2: 4230, z_pos_1: 3711, z_0: 3232, z_neg_1: 2794, z_neg_2: 2395, z_neg_3: 2033, z_neg_4: 1671 },
  { age_days: 365, z_pos_4: 12900, z_pos_3: 11500, z_pos_2: 10200, z_pos_1: 9000, z_0: 8000, z_neg_1: 7000, z_neg_2: 6000, z_neg_3: 5000, z_neg_4: 4000 },
];

const WEIGHT_BOYS_MOCK: ReferenceDataPoint[] = WEIGHT_GIRLS_MOCK.map(x => ({...x, z_0: x.z_0 * 1.05}));

// Cache simples para evitar chamar o banco toda hora
const tableCache: Record<string, ReferenceDataPoint[]> = {};

export async function getReferenceTable(measure: 'weight' | 'height' | 'bmi' | 'cephalic', sex: Sex): Promise<ReferenceDataPoint[]> {
  const cacheKey = `${measure}_${sex}`;
  
  // Se já temos em cache, retorna imediato
  if (tableCache[cacheKey]) return tableCache[cacheKey];

  console.log(`[Puericultura] Buscando tabela: ${measure} (${sex})...`);

  // 1. Tenta buscar do Supabase
  try {
    const { data, error } = await supabase
      .from('reference_curves')
      .select('*')
      .eq('sex', sex)
      .eq('measure', measure)
      .order('age_days', { ascending: true });

    if (error) {
      console.error("[Supabase Error]", error.message);
      throw error;
    }

    if (data && data.length > 0) {
      console.log(`[Supabase Success] ${data.length} registros encontrados para ${measure}.`);
      tableCache[cacheKey] = data;
      return data;
    } else {
      console.warn(`[Supabase Warning] Nenhum dado encontrado para ${measure} ${sex}. Verifique se importou o CSV corretamente.`);
    }
  } catch (e) {
    console.warn("Falha ao conectar com Supabase. Usando dados de exemplo (MOCK). Verifique lib/supabase.ts", e);
  }

  // 2. Fallback Local (apenas para não quebrar a tela se não tiver banco)
  console.log("Usando Mock Local de fallback.");
  if (measure === 'weight') {
    return sex === 'Masculino' ? WEIGHT_BOYS_MOCK : WEIGHT_GIRLS_MOCK;
  }
  
  // Retorna array vazio ou mock genérico se não tiver nada
  return sex === 'Masculino' ? WEIGHT_BOYS_MOCK : WEIGHT_GIRLS_MOCK;
}

/**
 * Interpolação linear para dias exatos entre os pontos da tabela
 */
export const getInterpolatedReference = (table: ReferenceDataPoint[], ageInDays: number): ReferenceDataPoint | null => {
  if (!table || table.length === 0) return null;
  
  if (ageInDays < table[0].age_days) return table[0];
  if (ageInDays > table[table.length - 1].age_days) return table[table.length - 1];

  let lower = table[0];
  let upper = table[table.length - 1];

  for (let i = 0; i < table.length - 1; i++) {
    if (ageInDays >= table[i].age_days && ageInDays <= table[i+1].age_days) {
      lower = table[i];
      upper = table[i+1];
      break;
    }
  }

  if (lower.age_days === upper.age_days) return lower;

  const ratio = (ageInDays - lower.age_days) / (upper.age_days - lower.age_days);
  
  const interpolate = (v1: number, v2: number) => v1 + (v2 - v1) * ratio;

  return {
    age_days: ageInDays,
    z_neg_4: interpolate(lower.z_neg_4, upper.z_neg_4),
    z_neg_3: interpolate(lower.z_neg_3, upper.z_neg_3),
    z_neg_2: interpolate(lower.z_neg_2, upper.z_neg_2),
    z_neg_1: interpolate(lower.z_neg_1, upper.z_neg_1),
    z_0:     interpolate(lower.z_0, upper.z_0),
    z_pos_1: interpolate(lower.z_pos_1, upper.z_pos_1),
    z_pos_2: interpolate(lower.z_pos_2, upper.z_pos_2),
    z_pos_3: interpolate(lower.z_pos_3, upper.z_pos_3),
    z_pos_4: interpolate(lower.z_pos_4, upper.z_pos_4),
  };
};
