import { Sex, ReferenceDataPoint } from '../types';
import { supabase } from '../lib/supabase';

// ================================================================
// DADOS DE DEMONSTRAÇÃO (FALLBACK)
// Usados se o banco de dados estiver offline ou vazio.
// ================================================================
const MOCK_WEIGHT_GIRLS: ReferenceDataPoint[] = [
  { age_days: 0,  z_pos_4: 5356, z_pos_3: 4793, z_pos_2: 4230, z_pos_1: 3711, z_0: 3232, z_neg_1: 2794, z_neg_2: 2395, z_neg_3: 2033, z_neg_4: 1671 },
  { age_days: 30, z_pos_4: 6356, z_pos_3: 5793, z_pos_2: 5230, z_pos_1: 4711, z_0: 4232, z_neg_1: 3794, z_neg_2: 3395, z_neg_3: 3033, z_neg_4: 2671 },
  { age_days: 365, z_pos_4: 12900, z_pos_3: 11500, z_pos_2: 10200, z_pos_1: 9000, z_0: 8000, z_neg_1: 7000, z_neg_2: 6000, z_neg_3: 5000, z_neg_4: 4000 },
];
const MOCK_WEIGHT_BOYS: ReferenceDataPoint[] = MOCK_WEIGHT_GIRLS.map(x => ({
    ...x, 
    z_pos_4: Math.round(x.z_pos_4 * 1.05),
    z_pos_3: Math.round(x.z_pos_3 * 1.05),
    z_pos_2: Math.round(x.z_pos_2 * 1.05),
    z_pos_1: Math.round(x.z_pos_1 * 1.05),
    z_0: Math.round(x.z_0 * 1.05),
    z_neg_1: Math.round(x.z_neg_1 * 1.05),
    z_neg_2: Math.round(x.z_neg_2 * 1.05),
    z_neg_3: Math.round(x.z_neg_3 * 1.05),
    z_neg_4: Math.round(x.z_neg_4 * 1.05),
}));

const MOCK_INTERGROWTH_WEIGHT_GIRLS: ReferenceDataPoint[] = [
  { age_days: 168, z_pos_3: 1070, z_pos_2: 890, z_pos_1: 730, z_0: 600, z_neg_1: 500, z_neg_2: 410, z_neg_3: 340, z_pos_4: 0, z_neg_4: 0 },
  { age_days: 169, z_pos_3: 1100, z_pos_2: 900, z_pos_1: 740, z_0: 610, z_neg_1: 510, z_neg_2: 420, z_neg_3: 340, z_pos_4: 0, z_neg_4: 0 },
  { age_days: 170, z_pos_3: 1120, z_pos_2: 920, z_pos_1: 760, z_0: 630, z_neg_1: 520, z_neg_2: 430, z_neg_3: 350, z_pos_4: 0, z_neg_4: 0 },
  { age_days: 171, z_pos_3: 1140, z_pos_2: 940, z_pos_1: 770, z_0: 640, z_neg_1: 530, z_neg_2: 430, z_neg_3: 360, z_pos_4: 0, z_neg_4: 0 },
  { age_days: 172, z_pos_3: 1160, z_pos_2: 960, z_pos_1: 790, z_0: 650, z_neg_1: 540, z_neg_2: 440, z_neg_3: 360, z_pos_4: 0, z_neg_4: 0 },
];

const getMockData = (measure: string, sex: Sex) => {
    if (measure === 'weight' && sex === 'Feminino') return MOCK_WEIGHT_GIRLS;
    if (measure === 'weight' && sex === 'Masculino') return MOCK_WEIGHT_BOYS;
    if (measure === 'preterm_weight' && sex === 'Feminino') return MOCK_INTERGROWTH_WEIGHT_GIRLS;
    return []; // Sem mock para outras medidas
}


// Cache simples para evitar chamar o banco toda hora
const tableCache: Record<string, { data: ReferenceDataPoint[], source: 'supabase' | 'mock' }> = {};

type ReferenceMeasure = 'weight' | 'height' | 'bmi' | 'cephalic' | 'preterm_weight' | 'preterm_height' | 'preterm_cephalic';

export async function getReferenceTable(
  measure: ReferenceMeasure,
  sex: Sex
): Promise<{ data: ReferenceDataPoint[], source: 'supabase' | 'mock' }> {
  const cacheKey = `${measure}_${sex}`;
  
  // Se já temos em cache, retorna imediato
  if (tableCache[cacheKey]) return tableCache[cacheKey];

  console.log(`[Puericultura] Buscando tabela: ${measure} (${sex})...`);

  // Busca do Supabase
  try {
    const tableName = measure.startsWith('preterm') ? 'intergrowth_curves' : 'reference_curves';
    const measureName = measure.startsWith('preterm') ? measure.replace('preterm_', '') : measure;

    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('sex', sex)
      .eq('measure', measureName)
      .order('age_days', { ascending: true });

    if (error) {
      console.error("[Supabase Error]", error.message);
      throw error; // Lança o erro para usar o fallback
    }

    if (data && data.length > 0) {
      console.log(`[Supabase Success] ${data.length} registros encontrados para ${measure}.`);
      const result = { data, source: 'supabase' as const };
      tableCache[cacheKey] = result;
      return result;
    } else {
      console.warn(`[Supabase Warning] Nenhum dado encontrado para ${measure} ${sex}. Usando dados de demonstração.`);
      // Não armazena em cache se o Supabase não tiver dados, para permitir nova tentativa.
      return { data: getMockData(measure, sex), source: 'mock' };
    }
  } catch (e: any) {
    console.error("Falha ao buscar dados do Supabase. Usando dados de demonstração:", e.message);
    const result = { data: getMockData(measure, sex), source: 'mock' as const };
    // Armazena em cache o fallback em caso de erro para não sobrecarregar o servidor.
    tableCache[cacheKey] = result;
    return result;
  }
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
  
  const interpolate = (v1: number, v2: number) => {
     // Handle cases where one value might be null/0 in preterm data
     if (v1 === null || v1 === undefined) v1 = v2;
     if (v2 === null || v2 === undefined) v2 = v1;
     return v1 + (v2 - v1) * ratio;
  }

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