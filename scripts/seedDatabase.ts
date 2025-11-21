import { supabase } from '../lib/supabase';
import { WHO_RAW_DATA } from './data/whoData';
import { INTERGROWTH_RAW_DATA } from './data/intergrowthData';

export async function seedDatabase() {
  let success = true;

  // 1. Seed WHO Data
  console.log('[SEED] Populando dados da OMS...');
  try {
    for (const curve of WHO_RAW_DATA) {
      console.log(`[SEED] Processando OMS: ${curve.measure} (${curve.sex})...`);
      const recordsToInsert = curve.data.map(point => ({
        sex: curve.sex,
        measure: curve.measure,
        ...point
      }));

      const { error } = await supabase.from('reference_curves').insert(recordsToInsert);
      if (error) {
        // Ignora erros de duplicidade se os dados já existirem
        if (error.code === '23505') { 
          console.warn(`[SEED] Dados da OMS para ${curve.measure} (${curve.sex}) já existem. Pulando.`);
        } else {
          throw error;
        }
      } else {
        console.log(`[SEED] ${recordsToInsert.length} registros da OMS inseridos para ${curve.measure} (${curve.sex}).`);
      }
    }
  } catch (error: any) {
    console.error('[SEED] Erro geral ao popular dados da OMS:', error.message);
    success = false;
  }

  // 2. Seed INTERGROWTH-21 Data
  console.log('[SEED] Populando dados INTERGROWTH-21...');
  try {
    for (const curve of INTERGROWTH_RAW_DATA) {
      console.log(`[SEED] Processando INTERGROWTH: ${curve.measure} (${curve.sex})...`);
      
      const recordsToInsert = curve.data.map(point => ({
        sex: curve.sex,
        measure: curve.measure,
        age_days: point.age_days,
        z_neg_3: point.z_neg_3,
        z_neg_2: point.z_neg_2,
        z_neg_1: point.z_neg_1,
        z_0: point.z_0,
        z_pos_1: point.z_pos_1,
        z_pos_2: point.z_pos_2,
        z_pos_3: point.z_pos_3,
      }));

      const { error } = await supabase.from('intergrowth_curves').insert(recordsToInsert);
      if (error) {
         if (error.code === '23505') {
            console.warn(`[SEED] Dados INTERGROWTH para ${curve.measure} (${curve.sex}) já existem. Pulando.`);
         } else {
            throw error;
         }
      } else {
         console.log(`[SEED] ${recordsToInsert.length} registros INTERGROWTH inseridos para ${curve.measure} (${curve.sex}).`);
      }
    }
  } catch (error: any) {
    console.error('[SEED] Erro geral ao popular dados INTERGROWTH:', error.message);
    success = false;
  }

  console.log('[SEED] Processo de seeding finalizado.');
  return success;
}
