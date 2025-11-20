
export type Sex = 'Masculino' | 'Feminino';

export interface AssessmentData {
  birthDate: string; // YYYY-MM-DD
  sex: Sex;
  isFirstConsultation?: boolean;
  prev: VisitData;
  curr: VisitData;
}

export interface VisitData {
  date: string;
  weight: number | ''; // grams
  height: number | ''; // cm
  cephalic: number | ''; // cm
}

// Estrutura exata da tabela da OMS (Z-4 a Z+4)
export interface ReferenceDataPoint {
  age_days: number;
  z_neg_4: number; // Z -4
  z_neg_3: number; // Z -3
  z_neg_2: number; // Z -2
  z_neg_1: number; // Z -1
  z_0: number;     // Z 0 (Média)
  z_pos_1: number; // Z +1
  z_pos_2: number; // Z +2
  z_pos_3: number; // Z +3
  z_pos_4: number; // Z +4
}

export interface CalculationResult {
  ageDays: number;
  ageString: string;
  bmi: number;
  zWeight: string;
  zHeight: string;
  zCephalic: string;
  zBMI: string;
}

export interface Consultation {
  id: string;
  patient_id: string;
  date: string;
  weight_grams: number;
  height_cm: number;
  cephalic_cm: number;
  bmi: number;
  notes?: string;
  created_at?: string;
}