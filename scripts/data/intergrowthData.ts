import { ReferenceDataPoint, Sex } from '../../types';

// Dados de referência do INTERGROWTH-21 para prematuros.
// Fonte: Transcrito e convertido a partir de tabelas de referência.
// Os valores de peso estão em GRAMAS.
// z_pos_4 e z_neg_4 são nulos, pois não são fornecidos pelo padrão INTERGROWTH-21.

interface IntergrowthCurve {
  sex: Sex;
  measure: 'weight' | 'height' | 'cephalic';
  data: Omit<ReferenceDataPoint, 'z_pos_4' | 'z_neg_4'>[];
}

// Exemplo de dados para Peso Feminino, baseado na imagem fornecida.
// Para uma aplicação completa, todas as tabelas (peso, altura, cefálico para ambos os sexos)
// devem ser adicionadas aqui.
const weightFemaleData: Omit<ReferenceDataPoint, 'z_pos_4' | 'z_neg_4'>[] = [
  { age_days: 168, z_pos_3: 1070, z_pos_2: 890, z_pos_1: 730, z_0: 600, z_neg_1: 500, z_neg_2: 410, z_neg_3: 340 },
  { age_days: 169, z_pos_3: 1100, z_pos_2: 900, z_pos_1: 740, z_0: 610, z_neg_1: 510, z_neg_2: 420, z_neg_3: 340 },
  { age_days: 170, z_pos_3: 1120, z_pos_2: 920, z_pos_1: 760, z_0: 630, z_neg_1: 520, z_neg_2: 430, z_neg_3: 350 },
  { age_days: 171, z_pos_3: 1140, z_pos_2: 940, z_pos_1: 770, z_0: 640, z_neg_1: 530, z_neg_2: 430, z_neg_3: 360 },
  { age_days: 172, z_pos_3: 1160, z_pos_2: 960, z_pos_1: 790, z_0: 650, z_neg_1: 540, z_neg_2: 440, z_neg_3: 360 },
  // Para uma implementação completa, adicione o restante dos dados aqui.
];

export const INTERGROWTH_RAW_DATA: IntergrowthCurve[] = [
  {
    sex: 'Feminino',
    measure: 'weight',
    data: weightFemaleData
  },
  // {
  //   sex: 'Masculino',
  //   measure: 'weight',
  //   data: [...]
  // },
  // ... adicione outras medidas (height, cephalic) e sexos aqui.
];