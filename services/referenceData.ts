import { Sex, ReferenceDataPoint } from '../types';

// Importa os arquivos JSON compilados a partir das tabelas da OMS
import weight_Feminino from './oms-data/weight_Feminino.json';
import weight_Masculino from './oms-data/weight_Masculino.json';
import height_Feminino from './oms-data/height_Feminino.json';
import height_Masculino from './oms-data/height_Masculino.json';
import bmi_Feminino from './oms-data/bmi_Feminino.json';
import bmi_Masculino from './oms-data/bmi_Masculino.json';
import cephalic_Feminino from './oms-data/cephalic_Feminino.json';
import cephalic_Masculino from './oms-data/cephalic_Masculino.json';

// Importa os arquivos JSON compilados a partir de curvas Intergrowth-21 de Prematuro
import preterm_weight_Feminino from './oms-data/preterm_weight_Feminino.json';
import preterm_weight_Masculino from './oms-data/preterm_weight_Masculino.json';
import preterm_height_Feminino from './oms-data/preterm_height_Feminino.json';
import preterm_height_Masculino from './oms-data/preterm_height_Masculino.json';
import preterm_cephalic_Feminino from './oms-data/preterm_cephalic_Feminino.json';
import preterm_cephalic_Masculino from './oms-data/preterm_cephalic_Masculino.json';

const LOCAL_OMS_DATA: Record<string, ReferenceDataPoint[]> = {
  weight_Feminino: weight_Feminino as ReferenceDataPoint[],
  weight_Masculino: weight_Masculino as ReferenceDataPoint[],
  height_Feminino: height_Feminino as ReferenceDataPoint[],
  height_Masculino: height_Masculino as ReferenceDataPoint[],
  bmi_Feminino: bmi_Feminino as ReferenceDataPoint[],
  bmi_Masculino: bmi_Masculino as ReferenceDataPoint[],
  cephalic_Feminino: cephalic_Feminino as ReferenceDataPoint[],
  cephalic_Masculino: cephalic_Masculino as ReferenceDataPoint[],

  // Prematuros (Intergrowth-21)
  preterm_weight_Feminino: preterm_weight_Feminino as ReferenceDataPoint[],
  preterm_weight_Masculino: preterm_weight_Masculino as ReferenceDataPoint[],
  preterm_height_Feminino: preterm_height_Feminino as ReferenceDataPoint[],
  preterm_height_Masculino: preterm_height_Masculino as ReferenceDataPoint[],
  preterm_cephalic_Feminino: preterm_cephalic_Feminino as ReferenceDataPoint[],
  preterm_cephalic_Masculino: preterm_cephalic_Masculino as ReferenceDataPoint[],
};

// Cache simples para evitar leituras repetidas
const tableCache: Record<string, { data: ReferenceDataPoint[], source: 'local' }> = {};

type ReferenceMeasure = 'weight' | 'height' | 'bmi' | 'cephalic' | 'preterm_weight' | 'preterm_height' | 'preterm_cephalic';

export async function getReferenceTable(
  measure: ReferenceMeasure,
  sex: Sex
): Promise<{ data: ReferenceDataPoint[], source: 'local' }> {
  const cacheKey = `${measure}_${sex}`;
  
  // Se já temos em cache, retorna imediato
  if (tableCache[cacheKey]) return tableCache[cacheKey];

  console.log(`[Puericultura] Buscando tabela local: ${measure} (${sex})...`);

  // 1ª PRIORIDADE: Dados salvos localmente no navegador (localStorage) via upload ou sincronização do GitHub do usuário
  try {
    const storageKey = `puericultura_oms_${measure}_${sex}`;
    const stored = localStorage.getItem(storageKey);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        console.log(`[LocalStorage Success] Usando dados salvos localmente com ${parsed.length} registros para ${measure} (${sex})`);
        const result = { data: parsed, source: 'local' as const };
        tableCache[cacheKey] = result;
        return result;
      }
    }
  } catch (err) {
    console.warn('[LocalStorage Read Error]', err);
  }

  // 1.5ª PRIORIDADE: Buscar do nosso servidor dinâmico que lê em tempo real da pasta física pública ou /Dados-OMS
  try {
    const response = await fetch(`/api/get-oms-json?measure=${measure}&sex=${sex}`);
    if (response.ok) {
      const serverPoints = await response.json();
      if (Array.isArray(serverPoints) && serverPoints.length > 0) {
        console.log(`[Server API Success] Obtidos dados dinâmicos da pasta física do servidor com ${serverPoints.length} pontos para ${measure} (${sex})`);
        try {
          localStorage.setItem(`puericultura_oms_${measure}_${sex}`, JSON.stringify(serverPoints));
        } catch (_) {}
        const result = { data: serverPoints, source: 'local' as const };
        tableCache[cacheKey] = result;
        return result;
      }
    }
  } catch (err: any) {
    console.warn('[Server API Fetch Error] Falha de fetch do servidor, usando fallback embutido:', err.message);
  }

  // 2ª PRIORIDADE: Banco de Dados pré-compilado local de arquivos JSON do repositório (services/oms-data)
  const localData = LOCAL_OMS_DATA[cacheKey];
  if (localData && localData.length > 0) {
    console.log(`[Local Files Success] Usando dados locais com ${localData.length} registros para ${measure} (${sex})`);
    const result = { data: localData, source: 'local' as const };
    tableCache[cacheKey] = result;
    return result;
  }

  // Caso não existam dados locais em nenhuma das fontes, retornamos lista vazia
  const fallbackResult = { data: [] as ReferenceDataPoint[], source: 'local' as const };
  tableCache[cacheKey] = fallbackResult;
  return fallbackResult;
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