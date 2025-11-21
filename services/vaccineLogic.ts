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
  status: 'Atrasado' | 'Aplicar agora' | 'Aguardar' | 'Próxima aplicação';
  daysDiff: number;
}

// Precise day constants for clarity and accuracy
const M2 = 60;
const M3 = 90;
const M4 = 120;
const M5 = 150;
const M6 = 180;
const M7 = 210;
const M9 = 270;
const M12 = 365;
const M15 = 450;
const Y4 = 4 * 365;
const Y5 = 5 * 365;
const Y7 = 7 * 365;
const Y9 = 9 * 365;
const Y15 = 15 * 365;

// Absolute maximum age for most childhood vaccines before they are considered missed or require a different scheme.
const MAX_AGE_CHILDHOOD = Y5 - 1; // 4 anos, 11 meses, 29 dias

// Brazilian National Vaccination Calendar Rules (Revised for accuracy)
export const VACCINE_CALENDAR: VaccineRule[] = [
  // BIRTH
  { id: 'bcg', name: 'BCG', doseLabel: 'Dose única', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: MAX_AGE_CHILDHOOD, description: 'Ao nascer' },
  { id: 'hepb_birth', name: 'Hepatite B', doseLabel: 'Dose ao nascer', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 30, description: 'Ao nascer' },

  // 2 MONTHS
  { id: 'penta_1', name: 'Penta', doseLabel: '1ª Dose', targetAgeDays: M2, minAgeDays: M2, maxAgeDays: MAX_AGE_CHILDHOOD, description: '2 meses' },
  { id: 'vip_1', name: 'VIP', doseLabel: '1ª Dose', targetAgeDays: M2, minAgeDays: M2, maxAgeDays: MAX_AGE_CHILDHOOD, description: '2 meses' },
  { id: 'pneumo_1', name: 'Pneumocócica 10V', doseLabel: '1ª Dose', targetAgeDays: M2, minAgeDays: M2, maxAgeDays: MAX_AGE_CHILDHOOD, description: '2 meses' },
  { id: 'rota_1', name: 'Rotavírus', doseLabel: '1ª Dose', targetAgeDays: M2, minAgeDays: 45, maxAgeDays: 105, description: '2 meses' }, // Strict max age: 3m e 15d

  // 3 MONTHS
  { id: 'menc_1', name: 'Meningocócica C', doseLabel: '1ª Dose', targetAgeDays: M3, minAgeDays: M3, maxAgeDays: MAX_AGE_CHILDHOOD, description: '3 meses' },

  // 4 MONTHS
  { id: 'penta_2', name: 'Penta', doseLabel: '2ª Dose', targetAgeDays: M4, minAgeDays: M4, maxAgeDays: MAX_AGE_CHILDHOOD, description: '4 meses' },
  { id: 'vip_2', name: 'VIP', doseLabel: '2ª Dose', targetAgeDays: M4, minAgeDays: M4, maxAgeDays: MAX_AGE_CHILDHOOD, description: '4 meses' },
  { id: 'pneumo_2', name: 'Pneumocócica 10V', doseLabel: '2ª Dose', targetAgeDays: M4, minAgeDays: M4, maxAgeDays: MAX_AGE_CHILDHOOD, description: '4 meses' },
  { id: 'rota_2', name: 'Rotavírus', doseLabel: '2ª Dose', targetAgeDays: M4, minAgeDays: M4, maxAgeDays: 240, description: '4 meses' }, // Strict max age: 7m e 29d

  // 5 MONTHS
  { id: 'menc_2', name: 'Meningocócica C', doseLabel: '2ª Dose', targetAgeDays: M5, minAgeDays: M5, maxAgeDays: MAX_AGE_CHILDHOOD, description: '5 meses' },

  // 6 MONTHS
  { id: 'penta_3', name: 'Penta', doseLabel: '3ª Dose', targetAgeDays: M6, minAgeDays: M6, maxAgeDays: MAX_AGE_CHILDHOOD, description: '6 meses' },
  { id: 'vip_3', name: 'VIP', doseLabel: '3ª Dose', targetAgeDays: M6, minAgeDays: M6, maxAgeDays: MAX_AGE_CHILDHOOD, description: '6 meses' },
  { id: 'covid_1', name: 'Covid-19', doseLabel: '1ª Dose', targetAgeDays: M6, minAgeDays: M6, maxAgeDays: 9999, description: '6 meses' },
  { id: 'influenza_1', name: 'Influenza trivalente', doseLabel: '1ª Dose', targetAgeDays: M6, minAgeDays: M6, maxAgeDays: 9999, description: '6 meses' },

  // 7 MONTHS
  { id: 'covid_2', name: 'Covid-19', doseLabel: '2ª Dose', targetAgeDays: M7, minAgeDays: M7, maxAgeDays: 9999, description: '7 meses' },
  { id: 'influenza_2', name: 'Influenza trivalente', doseLabel: '2ª Dose', targetAgeDays: M7, minAgeDays: M7, maxAgeDays: 9999, description: '7 meses' },

  // 9 MONTHS
  { id: 'febre_amarela_1', name: 'Febre Amarela', doseLabel: 'Dose', targetAgeDays: M9, minAgeDays: M9, maxAgeDays: 9999, description: '9 meses' },
  { id: 'covid_3', name: 'Covid-19', doseLabel: '3ª Dose', targetAgeDays: M9, minAgeDays: M9, maxAgeDays: 9999, description: '9 meses' },

  // 12 MONTHS (1 Year)
  { id: 'pneumo_ref', name: 'Pneumocócica 10V', doseLabel: 'Reforço', targetAgeDays: M12, minAgeDays: M12, maxAgeDays: MAX_AGE_CHILDHOOD, description: '12 meses' },
  { id: 'menc_ref', name: 'Meningocócica C (ACWY)', doseLabel: 'Reforço', targetAgeDays: M12, minAgeDays: M12, maxAgeDays: MAX_AGE_CHILDHOOD, description: '12 meses' },
  { id: 'triplice_1', name: 'Tríplice Viral', doseLabel: '1ª Dose', targetAgeDays: M12, minAgeDays: M12, maxAgeDays: 9999, description: '12 meses' },

  // 15 MONTHS
  { id: 'dtp_ref1', name: 'DTP', doseLabel: '1º Reforço', targetAgeDays: M15, minAgeDays: M15, maxAgeDays: MAX_AGE_CHILDHOOD, description: '15 meses' },
  { id: 'vop_ref1', name: 'VOP', doseLabel: '1º Reforço', targetAgeDays: M15, minAgeDays: M15, maxAgeDays: MAX_AGE_CHILDHOOD, description: '15 meses' },
  { id: 'hepa_1', name: 'Hepatite A', doseLabel: 'Uma dose', targetAgeDays: M15, minAgeDays: M15, maxAgeDays: MAX_AGE_CHILDHOOD, description: '15 meses' },
  { id: 'tetra_1', name: 'Tetraviral', doseLabel: 'Uma dose', targetAgeDays: M15, minAgeDays: M15, maxAgeDays: MAX_AGE_CHILDHOOD, description: '15 meses' },

  // 4 YEARS
  { id: 'dtp_ref2', name: 'DTP', doseLabel: '2º Reforço', targetAgeDays: Y4, minAgeDays: Y4, maxAgeDays: Y7-1, description: '4 anos' },
  { id: 'vop_ref2', name: 'VOP', doseLabel: '2º Reforço', targetAgeDays: Y4, minAgeDays: Y4, maxAgeDays: Y7-1, description: '4 anos' },
  { id: 'fa_ref', name: 'Febre Amarela', doseLabel: 'Dose de reforço', targetAgeDays: Y4, minAgeDays: Y4, maxAgeDays: 9999, description: '4 anos' },
  { id: 'varicela_2', name: 'Varicela', doseLabel: 'Uma dose', targetAgeDays: Y4, minAgeDays: Y4, maxAgeDays: Y7-1, description: '4 anos' },

  // 5 YEARS
  { id: 'pneumo_23', name: 'Pneumocócica 23V', doseLabel: 'Uma dose', targetAgeDays: Y5, minAgeDays: Y5, maxAgeDays: 9999, description: '5 anos' },

  // 9-14 YEARS
  { id: 'hpv_1', name: 'HPV', doseLabel: 'Dose', targetAgeDays: Y9, minAgeDays: Y9, maxAgeDays: Y15, description: '9 a 14 anos' },
  { id: 'hpv_2', name: 'HPV', doseLabel: 'Dose', targetAgeDays: Y9 + 180, minAgeDays: Y9, maxAgeDays: Y15, description: '(6 meses após a 1ª)' },
];

export function getVaccineStatus(ruleId: string, birthDate: string, consultationDate: string): VaccineStatus {
  const rule = VACCINE_CALENDAR.find(r => r.id === ruleId);
  if (!rule) {
    return {
      rule: { id: ruleId, name: 'Desconhecida', doseLabel: '?', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 0 },
      status: 'Aguardar',
      daysDiff: 0
    };
  }

  const ageDays = calculateAgeInDays(birthDate, consultationDate);

  // 1. Future: Patient is too young
  if (ageDays < rule.minAgeDays) {
    const daysUntilMin = rule.minAgeDays - ageDays;
    const status = daysUntilMin <= 30 ? "Próxima aplicação" : "Aguardar";
    return { rule, status, daysDiff: daysUntilMin };
  }

  // 2. Medically Late: Patient is too old (strict limit)
  if (ageDays > rule.maxAgeDays) {
    const daysOverMax = ageDays - rule.maxAgeDays;
    return { rule, status: 'Atrasado', daysDiff: daysOverMax };
  }

  // 3. Due Window: Patient is in the correct age range. Now, check if it's administratively late.
  
  // We exempt vaccines that are given over a very wide period OR have very strict windows from the "30-day late" rule.
  const isWideRangeVaccine = rule.id.includes('hpv') || rule.id.includes('pneumo_23') || rule.id.includes('rota');
  
  // Special case for Hepatitis B at birth: late after 3 days
  if (rule.id === 'hepb_birth' && ageDays > 3) {
      return { rule, status: 'Atrasado', daysDiff: ageDays - 3 };
  }
  
  // If it's more than 30 days past the IDEAL date, it's considered late.
  if (!isWideRangeVaccine && ageDays > rule.targetAgeDays + 30) {
    return { rule, status: 'Atrasado', daysDiff: ageDays - (rule.targetAgeDays + 30) };
  }
  
  // Otherwise, it's considered on time to apply.
  return { rule, status: 'Aplicar agora', daysDiff: 0 };
}