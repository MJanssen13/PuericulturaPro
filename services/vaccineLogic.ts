
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
  { id: 'bcg', name: 'BCG', doseLabel: 'Dose única', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 30 },
  { id: 'hepb_birth', name: 'Hepatite B', doseLabel: 'Ao nascer', targetAgeDays: 0, minAgeDays: 0, maxAgeDays: 30 },

  // 2 MONTHS
  { id: 'penta_1', name: 'Penta (DTP+Hib+HB)', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M },
  { id: 'vip_1', name: 'VIP', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M },
  { id: 'pneumo_1', name: 'Pneumocócica 10V', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M },
  { id: 'rota_1', name: 'Rotavírus', doseLabel: '1ª Dose', targetAgeDays: 2 * M, minAgeDays: 45, maxAgeDays: 3 * M + 15 }, // Strict max age for Rota

  // 3 MONTHS
  { id: 'menc_1', name: 'Meningocócica C', doseLabel: '1ª Dose', targetAgeDays: 3 * M, minAgeDays: 75, maxAgeDays: 4 * M },

  // 4 MONTHS
  { id: 'penta_2', name: 'Penta (DTP+Hib+HB)', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M },
  { id: 'vip_2', name: 'VIP', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M },
  { id: 'pneumo_2', name: 'Pneumocócica 10V', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 5 * M },
  { id: 'rota_2', name: 'Rotavírus', doseLabel: '2ª Dose', targetAgeDays: 4 * M, minAgeDays: 105, maxAgeDays: 7 * M + 29 },

  // 5 MONTHS
  { id: 'menc_2', name: 'Meningocócica C', doseLabel: '2ª Dose', targetAgeDays: 5 * M, minAgeDays: 135, maxAgeDays: 6 * M },

  // 6 MONTHS
  { id: 'penta_3', name: 'Penta (DTP+Hib+HB)', doseLabel: '3ª Dose', targetAgeDays: 6 * M, minAgeDays: 165, maxAgeDays: 7 * M },
  { id: 'vip_3', name: 'VIP', doseLabel: '3ª Dose', targetAgeDays: 6 * M, minAgeDays: 165, maxAgeDays: 7 * M },
  { id: 'covid_1', name: 'Covid-19', doseLabel: '1ª Dose', targetAgeDays: 6 * M, minAgeDays: 180, maxAgeDays: 9999 },
  { id: 'influenza_1', name: 'Influenza trivalente', doseLabel: '1ª Dose', targetAgeDays: 6 * M, minAgeDays: 150, maxAgeDays: 12 * M },

  // 7 MONTHS
  { id: 'covid_2', name: 'Covid-19', doseLabel: '2ª Dose', targetAgeDays: 7 * M, minAgeDays: 210, maxAgeDays: 9999 },
  { id: 'influenza_2', name: 'Influenza trivalente', doseLabel: '2ª Dose', targetAgeDays: 7 * M, minAgeDays: 180, maxAgeDays: 12 * M },

  // 9 MONTHS
  { id: 'febre_amarela_1', name: 'Febre Amarela', doseLabel: 'Dose', targetAgeDays: 9 * M, minAgeDays: 255, maxAgeDays: 12 * M },
  { id: 'covid_3', name: 'Covid-19', doseLabel: '3ª Dose', targetAgeDays: 9 * M, minAgeDays: 270, maxAgeDays: 9999 },

  // 12 MONTHS (1 Year)
  { id: 'pneumo_ref', name: 'Pneumocócica 10V', doseLabel: 'Reforço', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M },
  { id: 'menc_ref', name: 'Meningocócica C', doseLabel: 'Reforço', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M },
  { id: 'triplice_1', name: 'Tríplice Viral', doseLabel: '1ª Dose', targetAgeDays: 12 * M, minAgeDays: 365, maxAgeDays: 15 * M },

  // 15 MONTHS
  { id: 'dtp_ref1', name: 'DTP', doseLabel: '1º Reforço', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 18 * M },
  { id: 'vop_ref1', name: 'VOP', doseLabel: '1º Reforço', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 18 * M },
  { id: 'hepa_1', name: 'Hepatite A', doseLabel: 'Uma dose', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 24 * M },
  { id: 'tetra_1', name: 'Tetraviral', doseLabel: 'Uma dose', targetAgeDays: 15 * M, minAgeDays: 440, maxAgeDays: 24 * M },

  // 4 YEARS
  { id: 'dtp_ref2', name: 'DTP', doseLabel: '2º Reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y },
  { id: 'vop_ref2', name: 'VOP', doseLabel: '2º Reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y },
  { id: 'fa_ref', name: 'Febre Amarela', doseLabel: 'Dose de reforço', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y },
  { id: 'varicela_2', name: 'Varicela', doseLabel: 'Uma dose', targetAgeDays: 4 * Y, minAgeDays: 4 * Y - 30, maxAgeDays: 7 * Y },

  // 5 YEARS
  { id: 'pneumo_23', name: 'Pneumocócica 23V', doseLabel: 'Uma dose', targetAgeDays: 5 * Y, minAgeDays: 5 * Y - 30, maxAgeDays: 6 * Y },

  // 9-14 YEARS
  { id: 'hpv_1', name: 'HPV', doseLabel: 'Dose', targetAgeDays: 9 * Y, minAgeDays: 9 * Y, maxAgeDays: 15 * Y },
  { id: 'hpv_2', name: 'HPV', doseLabel: 'Dose', targetAgeDays: 9.5 * Y, minAgeDays: 9 * Y, maxAgeDays: 15 * Y },
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
  const daysOverDue = ageDays - rule.maxAgeDays;

  // 1. Future / Upcoming
  if (ageDays < rule.minAgeDays) {
    let msg = "";
    if (daysUntilMin < 30) msg = `Faltam ${daysUntilMin} dias`;
    else {
       const months = Math.floor(daysUntilMin / 30.44);
       msg = `Faltam ~${months} meses`;
    }
    return { rule, status: 'FUTURE', message: msg, daysDiff: daysUntilMin };
  }

  // 2. Late (Overdue)
  if (ageDays > rule.maxAgeDays) {
    let msg = "";
    if (daysOverDue < 60) msg = `Atrasada há ${daysOverDue} dias`;
    else {
      const months = Math.floor(daysOverDue / 30.44);
      msg = `Atrasada há ~${months} meses`;
    }
    return { rule, status: 'LATE', message: msg, daysDiff: daysOverDue };
  }

  // 3. Open (Due Now)
  return { rule, status: 'DUE', message: 'No prazo ideal', daysDiff: 0 };
}
