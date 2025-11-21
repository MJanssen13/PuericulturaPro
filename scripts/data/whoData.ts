import { ReferenceDataPoint, Sex } from '../../types';

interface WhoCurve {
  sex: Sex;
  measure: 'weight' | 'height' | 'bmi' | 'cephalic';
  data: ReferenceDataPoint[];
}

// Estes são dados de exemplo para o seeding.
// Para uma aplicação completa, as tabelas de dados da OMS devem ser usadas.
const WEIGHT_GIRLS_DATA: ReferenceDataPoint[] = [
  { age_days: 0,  z_pos_4: 5356, z_pos_3: 4793, z_pos_2: 4230, z_pos_1: 3711, z_0: 3232, z_neg_1: 2794, z_neg_2: 2395, z_neg_3: 2033, z_neg_4: 1671 },
  { age_days: 30, z_pos_4: 6356, z_pos_3: 5793, z_pos_2: 5230, z_pos_1: 4711, z_0: 4232, z_neg_1: 3794, z_neg_2: 3395, z_neg_3: 3033, z_neg_4: 2671 },
  { age_days: 365, z_pos_4: 12900, z_pos_3: 11500, z_pos_2: 10200, z_pos_1: 9000, z_0: 8000, z_neg_1: 7000, z_neg_2: 6000, z_neg_3: 5000, z_neg_4: 4000 },
];
const WEIGHT_BOYS_DATA: ReferenceDataPoint[] = WEIGHT_GIRLS_DATA.map(x => ({
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

export const WHO_RAW_DATA: WhoCurve[] = [
  { sex: 'Feminino', measure: 'weight', data: WEIGHT_GIRLS_DATA },
  { sex: 'Masculino', measure: 'weight', data: WEIGHT_BOYS_DATA },
  // Adicionar outras medidas (height, cephalic, bmi) aqui para um seeder completo
];
