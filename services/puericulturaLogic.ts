import { Sex, ReferenceDataPoint } from '../types';
import { getReferenceTable, getInterpolatedReference } from './referenceData';

// ================================================================
// UTILS
// ================================================================

export function calculateAgeInDays(birthDate: string, consultationDate: string): number {
  if (!birthDate || !consultationDate) return 0;
  const dtNasc = new Date(birthDate);
  const dtCons = new Date(consultationDate);
  const diffTime = dtCons.getTime() - dtNasc.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
}

export function calculatePostConceptualAgeDays(birthDate: string, consultationDate: string, gestationalAgeWeeks: number, gestationalAgeDays: number): number {
  if (!birthDate || !consultationDate || !gestationalAgeWeeks || gestationalAgeWeeks <= 0) return 0;
  const chronologicalAgeDays = calculateAgeInDays(birthDate, consultationDate);
  const totalGestationalAgeDays = (gestationalAgeWeeks * 7) + (gestationalAgeDays || 0);
  return totalGestationalAgeDays + chronologicalAgeDays;
}

export function calculateCorrectedAgeDays(birthDate: string, consultationDate: string, gestationalAgeWeeks: number, gestationalAgeDays: number): number {
    const gestAgeInWeeks = (gestationalAgeWeeks || 0) + ((gestationalAgeDays || 0) / 7);
    // Babies born at >= 37 weeks are considered term, so no correction needed.
    if (!birthDate || !consultationDate || !gestationalAgeWeeks || gestAgeInWeeks >= 37) {
        return calculateAgeInDays(birthDate, consultationDate);
    }

    const chronologicalAge = calculateAgeInDays(birthDate, consultationDate);
    
    // Total days of a 40-week term
    const termDays = 40 * 7;
    // Total days of baby's gestation
    const gestationDays = (gestationalAgeWeeks * 7) + (gestationalAgeDays || 0);

    // The correction factor is the difference
    const daysToCorrect = termDays - gestationDays;
    
    const correctedAge = chronologicalAge - daysToCorrect;
    
    // Corrected age cannot be negative.
    return Math.max(0, correctedAge);
}

export function formatAgeString(days: number): string {
  if (days < 0) return 'Data inválida';
  if (days < 30) return `${days} dias`;
  const months = Math.floor(days / 30.44);
  const remainingDays = Math.floor(days % 30.44);
  if (months >= 12) {
     const years = Math.floor(months / 12);
     const remMonths = months % 12;
     return `${years} anos e ${remMonths} meses`;
  }
  return `${months} meses e ${remainingDays} dias`;
}

export function getPrematurityClassification(weeks: number | string | undefined | ''): string {
    const weeksNum = Number(weeks);
    if (!weeksNum || weeksNum <= 0 || weeksNum >= 37) return '';

    if (weeksNum <= 27) return 'Pré-termo extremo';
    if (weeksNum >= 28 && weeksNum <= 31) return 'Muito prematuro';
    if (weeksNum >= 32 && weeksNum <= 33) return 'Pré-termo moderado';
    if (weeksNum >= 34 && weeksNum <= 36) return 'Pré-termo tardio';
    
    return '';
}


function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const userTimezoneOffset = d.getTimezoneOffset() * 60000;
  const adjustedDate = new Date(d.getTime() + userTimezoneOffset);
  
  const dia = adjustedDate.getDate().toString().padStart(2, '0');
  const mes = (adjustedDate.getMonth() + 1).toString().padStart(2, '0');
  const ano = adjustedDate.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

// ================================================================
// VELOCITY FUNCTIONS
// ================================================================
// These functions are based on chronological age and are generally applicable for follow-up.
// No changes needed for prematurity as they compare two points in time.
export function evaluateWeightGain(
  birthDate: string,
  prevDate: string,
  prevWeight: number,
  currDate: string,
  currWeight: number
): string {
  if (!prevDate || !prevWeight || !currDate || !currWeight) return "";
  
  const idadeDias = calculateAgeInDays(birthDate, currDate);
  const dtAnt = new Date(prevDate);
  const dtAtual = new Date(currDate);
  const intervaloDias = Math.floor((dtAtual.getTime() - dtAnt.getTime()) / (1000 * 3600 * 24));

  if (intervaloDias <= 0) return "Erro data";

  const ganhoGramas = currWeight - prevWeight;
  const ganhoDiario = ganhoGramas / intervaloDias;
  let interpretacao = "Adequado";

  // Parâmetros simplificados
  if (idadeDias <= 365) {
    if (idadeDias <= 90) { 
      if (ganhoDiario < 20) interpretacao = "Abaixo do esperado";
      else if (ganhoDiario > 30) interpretacao = "Acima do esperado";
    } else if (idadeDias <= 180) {
      if (ganhoDiario < 15) interpretacao = "Abaixo do esperado";
      else if (ganhoDiario > 25) interpretacao = "Acima do esperado";
    } else if (idadeDias <= 270) {
      if (ganhoDiario < 10) interpretacao = "Abaixo do esperado";
      else if (ganhoDiario > 20) interpretacao = "Acima do esperado";
    } else {
      if (ganhoDiario < 5) interpretacao = "Abaixo do esperado";
      else if (ganhoDiario > 15) interpretacao = "Acima do esperado";
    }
  }
  
  return `${ganhoDiario.toFixed(1).replace('.', ',')} g/dia (${interpretacao})`;
}

export function evaluateHeightGrowth(
  birthDate: string,
  prevDate: string,
  prevHeight: number,
  currDate: string,
  currHeight: number
): string {
  if (!prevDate || !prevHeight || !currDate || !currHeight) return "";

  const idadeDias = calculateAgeInDays(birthDate, currDate);
  const dtAnt = new Date(prevDate);
  const dtAtual = new Date(currDate);
  const intervaloDias = Math.floor((dtAtual.getTime() - dtAnt.getTime()) / (1000 * 3600 * 24));

  if (intervaloDias <= 0) return "Erro data";

  const crescimentoTotalCm = currHeight - prevHeight;
  const crescimentoDiarioCm = crescimentoTotalCm / intervaloDias;
  const diasNoMes = 30.44; 
  const crescimentoMensal = crescimentoDiarioCm * diasNoMes;

  let interpretacao = "Adequado";

  if (idadeDias <= 182) { 
    if (crescimentoMensal < 2) interpretacao = "Abaixo do esperado";
    else if (crescimentoMensal > 3) interpretacao = "Acima do esperado";
  } else if (idadeDias <= 365) {
    if (crescimentoMensal < 1) interpretacao = "Abaixo do esperado";
    else if (crescimentoMensal > 2) interpretacao = "Acima do esperado";
  }
  
  return `${crescimentoMensal.toFixed(1).replace('.', ',')} cm/mês (${interpretacao})`;
}

export function evaluateCephalicGrowth(
  birthDate: string,
  prevDate: string,
  prevCephalic: number,
  currDate: string,
  currCephalic: number
): string {
  if (!prevDate || !prevCephalic || !currDate || !currCephalic) return "";

  const idadeDias = calculateAgeInDays(birthDate, currDate);
  const dtAnt = new Date(prevDate);
  const dtAtual = new Date(currDate);
  const intervaloDias = Math.floor((dtAtual.getTime() - dtAnt.getTime()) / (1000 * 3600 * 24));

  if (intervaloDias <= 0) return "Erro data";

  const diffCm = currCephalic - prevCephalic;
  const diffMensal = (diffCm / intervaloDias) * 30.44;
  
  // Faixas esperadas aproximadas (referência prática)
  let min = 0, max = 0;
  if (idadeDias <= 90) { min = 1.5; max = 2.0; } // 0-3m: ~2cm/mês
  else if (idadeDias <= 180) { min = 0.5; max = 1.0; } // 3-6m: ~1cm/mês
  else if (idadeDias <= 365) { min = 0.3; max = 0.5; } // 6-12m: ~0.5cm/mês
  else { min = 0.1; max = 0.3; }

  const faixaStr = `${min.toString().replace('.',',')} a ${max.toString().replace('.',',')} cm/mês`;
  
  return `${diffMensal.toFixed(1).replace('.', ',')} cm/mês (Esperado: ${faixaStr})`;
}

export function getBMIDiagnosis(zScore: string): string {
  if (!zScore || zScore === 'N/A') return "";
  
  if (zScore.includes("> +3")) return "Obesidade";
  if (zScore.includes("Entre +2 e +3")) return "Sobrepeso";
  if (zScore.includes("Entre +1 e +2")) return "Risco de Sobrepeso";
  if (zScore.includes("Entre 0 e +1")) return "Eutrofia";
  if (zScore.includes("Entre -1 e 0")) return "Eutrofia";
  if (zScore.includes("Entre -2 e -1")) return "Eutrofia";
  if (zScore.includes("Entre -3 e -2")) return "Magreza";
  if (zScore.includes("< -3")) return "Magreza Acentuada";
  return "";
}

export function getCephalicDiagnosis(zScore: string): string {
  if (!zScore || zScore === 'N/A') return "";
  
  if (zScore.includes("> +3") || zScore.includes("Entre +2 e +3")) return "Macrocefalia";
  if (zScore.includes("< -3") || zScore.includes("Entre -3 e -2")) return "Microcefalia";
  
  // All other cases between -2 and +2 are considered normal.
  if (zScore.includes("Entre -2 e -1") || 
      zScore.includes("Entre -1 e 0") || 
      zScore.includes("Entre 0 e +1") || 
      zScore.includes("Entre +1 e +2")) {
    return "Normocefalia";
  }
  
  return "";
}

// ================================================================
// Z-SCORE EVALUATION
// ================================================================

export async function evaluateZScore(
  birthDate: string,
  currDate: string,
  value: number,
  sex: Sex,
  measure: 'weight' | 'height' | 'bmi' | 'cephalic',
  isPremature?: boolean,
  gestationalAgeWeeks?: number | '',
  gestationalAgeDays?: number | ''
): Promise<string> {
  if (!value || isNaN(value) || !birthDate || !currDate) return "";
  
  const ref = await getRawReference(birthDate, currDate, sex, measure, isPremature, gestationalAgeWeeks, gestationalAgeDays);

  if (!ref) return "N/A";

  // Lógica de Classificação (funciona para OMS e Intergrowth)
  if (value < ref.z_neg_3) return "< -3 (Muito Baixo)";
  if (value < ref.z_neg_2) return "Entre -3 e -2";
  if (value < ref.z_neg_1) return "Entre -2 e -1";
  if (value < ref.z_0)     return "Entre -1 e 0";
  if (value < ref.z_pos_1) return "Entre 0 e +1";
  if (value < ref.z_pos_2) return "Entre +1 e +2";
  if (value < ref.z_pos_3) return "Entre +2 e +3";
  return "> +3";
}

export async function getRawReference(
  birthDate: string,
  date: string,
  sex: Sex,
  measure: 'weight' | 'height' | 'cephalic' | 'bmi',
  isPremature?: boolean,
  gestationalAgeWeeks?: number | '',
  gestationalAgeDays?: number | ''
): Promise<ReferenceDataPoint | null> {
  const gestAgeWeeksNum = Number(gestationalAgeWeeks);
  const gestAgeDaysNum = Number(gestationalAgeDays);
  const PRETERM_CHART_PCA_LIMIT_DAYS = 40 * 7; // 40 weeks

  if (isPremature && gestAgeWeeksNum > 0) {
    const pcaDays = calculatePostConceptualAgeDays(birthDate, date, gestAgeWeeksNum, gestAgeDaysNum);
    
    // Se prematuro e dentro da janela de idade do INTERGROWTH, usa a curva de prematuro
    if (pcaDays > 0 && pcaDays <= PRETERM_CHART_PCA_LIMIT_DAYS) {
      // IMC não é aplicável para Intergrowth
      if (measure === 'bmi') return null;

      const measureToFetch = `preterm_${measure}` as any;
      const { data: table } = await getReferenceTable(measureToFetch, sex); 
      return getInterpolatedReference(table, pcaDays);
    } else {
       // Após o limite do Intergrowth, usa a idade corrigida na curva da OMS
       const correctedAge = calculateCorrectedAgeDays(birthDate, date, gestAgeWeeksNum, gestAgeDaysNum);
       const { data: table } = await getReferenceTable(measure, sex);
       return getInterpolatedReference(table, correctedAge);
    }
  }
  
  // Curvas da OMS para bebês a termo (usa idade cronológica)
  const ageDays = calculateAgeInDays(birthDate, date);
  const { data: table } = await getReferenceTable(measure, sex);
  return getInterpolatedReference(table, ageDays);
}

// ================================================================
// SUMMARY GENERATOR (PRONTUÁRIO)
// ================================================================

export async function generateSummary(
  birthDate: string,
  sex: Sex,
  prev: { date: string, weight: number, height: number, cephalic: number, bmi: number },
  curr: { date: string, weight: number, height: number, cephalic: number, bmi: number },
  isFirstConsultation: boolean = false,
  isPremature?: boolean,
  gestationalAgeWeeks?: number | '',
  gestationalAgeDays?: number | ''
): Promise<string> {
  
  const dataAtualF = formatDate(curr.date);
  
  const getZ = async (date: string, val: number, type: 'weight'|'height'|'cephalic'|'bmi') => {
     if (!date || !val) return "N/A";
     return await evaluateZScore(birthDate, date, val, sex, type, isPremature, gestationalAgeWeeks, gestationalAgeDays);
  };

  const pZ_at = await getZ(curr.date, curr.weight, 'weight');
  const aZ_at = await getZ(curr.date, curr.height, 'height');
  const cZ_at = await getZ(curr.date, curr.cephalic, 'cephalic');
  const iZ_at = await getZ(curr.date, curr.bmi, 'bmi');
  const bmiAt = curr.bmi ? curr.bmi.toFixed(2).replace('.', ',') : 'N/A';

  if (isFirstConsultation) {
    return `Dados Antropométricos:
Data: ${dataAtualF}
Peso: ${curr.weight}g (Z: ${pZ_at})
Altura: ${curr.height}cm (Z: ${aZ_at})
C. Cefálico: ${curr.cephalic}cm (Z: ${cZ_at})
IMC: ${bmiAt} (Z: ${iZ_at})`;
  }

  const dataAntF = prev.date ? formatDate(prev.date) : "N/A";

  const pZ_uc = await getZ(prev.date, prev.weight, 'weight');
  const deltaPeso = (curr.weight && prev.weight) ? (curr.weight - prev.weight) : 0;
  const deltaPesoSign = deltaPeso > 0 ? '+' : '';
  const ganhoPeso = evaluateWeightGain(birthDate, prev.date, prev.weight, curr.date, curr.weight);
  
  const linhaPeso = `Peso: UC: ${prev.weight}g (Z: ${pZ_uc}). Atual: ${curr.weight}g (Z: ${pZ_at}). ${deltaPesoSign}${deltaPeso}g (${ganhoPeso})`;

  const aZ_uc = await getZ(prev.date, prev.height, 'height');
  const deltaAlt = (curr.height && prev.height) ? (curr.height - prev.height).toFixed(1).replace('.', ',') : 0;
  const ganhoAlt = evaluateHeightGrowth(birthDate, prev.date, prev.height, curr.date, curr.height);

  const linhaAltura = `Altura: UC: ${prev.height}cm (Z: ${aZ_uc}). Atual: ${curr.height}cm (Z: ${aZ_at}). +${deltaAlt}cm (${ganhoAlt})`;

  const cZ_uc = await getZ(prev.date, prev.cephalic, 'cephalic');
  const linhaCeph = `C. Cefálico: UC: ${prev.cephalic}cm (Z: ${cZ_uc}). Atual: ${curr.cephalic}cm (Z: ${cZ_at})`;

  const iZ_uc = await getZ(prev.date, prev.bmi, 'bmi');
  const bmiUC = prev.bmi ? prev.bmi.toFixed(2).replace('.', ',') : 'N/A';

  const linhaIMC = `IMC: UC: ${bmiUC} (Z: ${iZ_uc}). Atual: ${bmiAt} (Z: ${iZ_at})`;

  return `Dados Antropométricos:
Última consulta (UC): ${dataAntF}
Atual: ${dataAtualF}
${linhaPeso}
${linhaAltura}
${linhaCeph}
${linhaIMC}`;
}