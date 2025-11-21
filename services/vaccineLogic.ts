
import { calculateAgeInDays } from './puericulturaLogic';

export interface VaccineRule {
  id: string;
  name: string;
  doseLabel: string; // "1ª Dose", "Reforço", etc.
  targetAgeDays: number; // The ideal age
  minAgeDays: number; // Earliest valid age
  maxAgeDays: number; // Latest age before it's considered "Late"
  description?: string;
}

// Status of a specific vaccine dose
export interface VaccineStatus {
  rule: VaccineRule;
  status: 'LATE' | 'DUE' | 'FUTURE';
  message: string;
  daysDiff: number;
}

// 30.44 days per month approximation
const M = 30.44;
const Y = 365.25;

// Brazilian National Vaccination Calendar Rules (Approximate for calculation)
export const VACCINE_CALENDAR: VaccineRule[] = [
  // BIRTH
  { id: 'bcg', name: 'BCG', doseLabel: 'Dose única', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 30, description: 'Ao nascer' },
  { id: 'hepb_birth', name: 'Hepatite B', doseLabel: 'Dose ao nascer', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 30, description: 'Ao nascer' },

  // 2 MONTHS
  { id: 'penta_1', name: 'Penta', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M, description: '2 meses' },
  { id: 'vip_1', name: 'VIP', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M, description: '2 meses' },
  { id: 'pneumo_1', name: 'Pneumocócica 10V', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M, description: '2 meses' },
  { id: 'rota_1', name: 'Rotavírus', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M + 15, description: '2 meses' }, // Strict max age for Rota

  // 3 MONTHS
  { id: 'menc_1', name: 'Meningocócica C', doseLabel: '1ª Dose', targetAgeDays: 3 * M, minAgeDays: 75, maxAgeDays: 4 * M, description: '3 meses' },

  // 4 MONTHS
  { id: 'penta_2', name: 'Penta', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M, description: '4 meses' },
  { id: 'vip_2', name: 'VIP', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M, description: '4 meses' },
  { id: 'pneumo_2', name: 'Pneumocócica 10V', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M, description: '4 meses' },
  { id: 'rota_2', name: 'Rotavírus', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 7 * M + 29, description: '4 meses' },

  // 5 MONTHS
  { id: 'menc_2', name: 'Meningocócica C', doseLabel: '2ª Dose', targetAgeDays: 5 * M, minAgeDays: 135, maxAgeDays: 6 * M, description: '5 meses' },

  // 6 MONTHS
  { id: 'penta_3', name: 'Penta', doseLabel: '3ª Dose', targetAgeDays: 6 * M, minAgeDays: 165, maxAgeDays: 7 * M, description: '6 meses' },
  { id: 'vip_3', name: 'VIP', doseLabel: '3ª Dose', targetAgeDays: 6 * M, minAgeDays: 165, maxAgeDays: 7 * M, description: '6 meses' },
  { id: 'covid_1', name: 'Covid-19', doseLabel: '1ª Dose', targetAgeDays: 6 * M, minAgeDays: 180, maxAgeDays: 9999, description: '6 meses' },
  { id: 'influenza_1', name: 'Influenza trivalente', doseLabel: '1ª Dose', targetAgeDays: 6 * M, minAgeDays: 150, maxAgeDays: 12 * M, description: '6 meses' },

  // 7 MONTHS
  { id: 'covid_2', name: 'Covid-19', doseLabel: '2ª Dose', targetAgeDays: 7 * M, minAgeDays: 210, maxAgeDays: 9999, description: '7 meses' },
  { id: 'influenza_2', name: 'Influenza trivalente', doseLabel: '2ª Dose', targetAgeDays: 7 * M, minAgeDays: 180, maxAgeDays: 12 * M, description: '7 meses' },

  // 9 MONTHS
  { id: 'febre_amarela_1', name: 'Febre Amarela', doseLabel: 'Dose', targetAgeDays: 9 * M, minAgeDays: 255, maxAgeDays: 12 * M, description: '9 meses (6 a 8 se alto risco)' },
  { id: 'covid_3', name: 'Covid-19', doseLabel: '3ª Dose', targetAgeDays: 9 * M, minAgeDays: 270, maxAgeDays: 9999, description: '9 meses' },

  // 12 MONTHS (1 Year)
  { id: 'pneumo_ref', name: 'Pneumocócica 10V', doseLabel: 'Reforço', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M, description: '12 meses' },
  { id: 'menc_ref', name: 'Meningocócica C (ACWY)', doseLabel: 'Reforço', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M, description: '12 meses' },
  { id: 'triplice_1', name: 'Tríplice Viral', doseLabel: '1ª Dose', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M, description: '12 meses' },

  // 15 MONTHS
  { id: 'dtp_ref1', name: 'DTP', doseLabel: '1º Reforço', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 18 * M, description: '15 meses' },
  { id: 'vop_ref1', name: 'VOP', doseLabel: '1º Reforço', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 18 * M, description: '15 meses' },
  { id: 'hepa_1', name: 'Hepatite A', doseLabel: 'Uma dose', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 24 * M, description: '15 meses' },
  { id: 'tetra_1', name: 'Tetraviral', doseLabel: 'Uma dose', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 24 * M, description: '15 meses' },

  // 4 YEARS
  { id: 'dtp_ref2', name: 'DTP', doseLabel: '2º Reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y, description: '4 anos' },
  { id: 'vop_ref2', name: 'VOP', doseLabel: '2º Reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y, description: '4 anos' },
  { id: 'fa_ref', name: 'Febre Amarela', doseLabel: 'Dose de reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y, description: '4 anos' },
  { id: 'varicela_2', name: 'Varicela', doseLabel: 'Uma dose', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y, description: '4 anos' },

  // 5 YEARS
  { id: 'pneumo_23', name: 'Pneumocócica 23V', doseLabel: 'Uma dose', targetAgeDays: 5 * Y, minAgeDays: 5 * Y - 30, maxAgeDays: 6 * Y, description: '5 anos' },

  // 9-14 YEARS
  { id: 'hpv_1', name: 'HPV', doseLabel: 'Dose', targetAgeDays: 9 * Y, minAgeDays: 9 * Y, maxAgeDays: 15 * Y, description: '9 a 14 anos' },
  { id: 'hpv_2', name: 'HPV', doseLabel: 'Dose', targetAgeDays: 9.5 * Y, minAgeDays: 9 * Y, maxAgeDays: 15 * Y, description: '(6 meses após a 1ª)' },
];

export function getVaccineStatus(ruleId: string, birthDate: string): VaccineStatus {
  const rule = VACCINE_CALENDAR.find(r => r.id === ruleId);
  if (!rule) {
    return {
      rule: { id: ruleId, name: 'Desconhecida', doseLabel: '?', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 0 },
      status: 'FUTURE',
      message: 'Vacina não encontrada',
      daysDiff: 0
    };
  }

  const ageDays = calculateAgeInDays(birthDate, new Date().toISOString().split('T')[0]);
  const daysUntilMin = rule.minAgeDays - ageDays;
  const daysOverMax = ageDays - rule.maxAgeDays;

  // 1. Future: Patient is too young
  if (ageDays < rule.minAgeDays) {
    const message = daysUntilMin <= 30 ? "Próxima aplicação" : "Aguardar";
    return { rule, status: 'FUTURE', message, daysDiff: daysUntilMin };
  }

  // 2. Medically Late: Patient is too old
  if (ageDays > rule.maxAgeDays) {
    return { rule, status: 'LATE', message: 'Atrasado', daysDiff: daysOverMax };
  }

  // 3. Due Window: Patient is in the correct age range
  // Apply user's custom "late" rule: >30 days after the TARGET date.
  // This rule should only apply for vaccines with a relatively short application window to avoid incorrect flagging on long-term vaccines like HPV.
  const windowIsShort = (rule.maxAgeDays - rule.minAgeDays) < (365 * 2); // Heuristic: window is less than 2 years.
  if (windowIsShort && ageDays > rule.targetAgeDays + 30) {
    return { rule, status: 'LATE', message: 'Atrasado', daysDiff: ageDays - (rule.targetAgeDays + 30) };
  }
  
  // Otherwise, it's considered on time.
  return { rule, status: 'DUE', message: 'Aplicar agora', daysDiff: 0 };
}
