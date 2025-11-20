
import { Sex } from '../types';
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

export function formatAgeString(days: number): string {
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

  // Parâmetros simplificados para demonstração
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

// ================================================================
// Z-SCORE EVALUATION
// ================================================================

export async function evaluateZScore(
  birthDate: string,
  currDate: string,
  value: number,
  sex: Sex,
  measure: 'weight' | 'height' | 'bmi' | 'cephalic'
): Promise<string> {
  if (!value || isNaN(value) || !birthDate || !currDate) return "";
  
  const ageDays = calculateAgeInDays(birthDate, currDate);
  const table = await getReferenceTable(measure, sex);
  const ref = getInterpolatedReference(table, ageDays);

  if (!ref) return "N/A";

  // Lógica de Classificação baseada nas faixas Z (Padronizada para todos os indicadores)
  if (value < ref.z_neg_3) return "< -3 (Muito Baixo)";
  if (value < ref.z_neg_2) return "Entre -3 e -2";
  if (value < ref.z_neg_1) return "Entre -2 e -1";
  if (value < ref.z_0)     return "Entre -1 e 0";
  if (value < ref.z_pos_1) return "Entre 0 e +1";
  if (value < ref.z_pos_2) return "Entre +1 e +2";
  if (value < ref.z_pos_3) return "Entre +2 e +3";
  return "> +3";
}

// ================================================================
// SUMMARY GENERATOR (PRONTUÁRIO)
// ================================================================

export async function generateSummary(
  birthDate: string,
  sex: Sex,
  prev: { date: string, weight: number, height: number, cephalic: number, bmi: number },
  curr: { date: string, weight: number, height: number, cephalic: number, bmi: number }
): Promise<string> {
  
  const dataAtualF = formatDate(curr.date);
  const dataAntF = prev.date ? formatDate(prev.date) : "N/A";

  // Helper to get Z-score text safely
  const getZ = async (date: string, val: number, type: 'weight'|'height'|'cephalic'|'bmi') => {
     if (!date || !val) return "N/A";
     // Note: We no longer convert weight to KG here because the DB table is in Grams (e.g. 5356)
     // and the input is in Grams.
     return await evaluateZScore(birthDate, date, val, sex, type);
  };

  // 1. Weight
  const pZ_uc = await getZ(prev.date, prev.weight, 'weight');
  const pZ_at = await getZ(curr.date, curr.weight, 'weight');
  const deltaPeso = (curr.weight && prev.weight) ? (curr.weight - prev.weight) : 0;
  const deltaPesoSign = deltaPeso > 0 ? '+' : '';
  const ganhoPeso = evaluateWeightGain(birthDate, prev.date, prev.weight, curr.date, curr.weight);
  
  const linhaPeso = `Peso: UC: ${prev.weight}g (Z: ${pZ_uc}). Atual: ${curr.weight}g (Z: ${pZ_at}). ${deltaPesoSign}${deltaPeso}g (${ganhoPeso})`;

  // 2. Height
  const aZ_uc = await getZ(prev.date, prev.height, 'height');
  const aZ_at = await getZ(curr.date, curr.height, 'height');
  const deltaAlt = (curr.height && prev.height) ? (curr.height - prev.height).toFixed(1).replace('.', ',') : 0;
  const ganhoAlt = evaluateHeightGrowth(birthDate, prev.date, prev.height, curr.date, curr.height);

  const linhaAltura = `Altura: UC: ${prev.height}cm (Z: ${aZ_uc}). Atual: ${curr.height}cm (Z: ${aZ_at}). +${deltaAlt}cm (${ganhoAlt})`;

  // 3. Cephalic
  const cZ_uc = await getZ(prev.date, prev.cephalic, 'cephalic');
  const cZ_at = await getZ(curr.date, curr.cephalic, 'cephalic');
  const linhaCeph = `C. Cefálico: UC: ${prev.cephalic}cm (Z: ${cZ_uc}). Atual: ${curr.cephalic}cm (Z: ${cZ_at})`;

  // 4. BMI
  const iZ_uc = await getZ(prev.date, prev.bmi, 'bmi');
  const iZ_at = await getZ(curr.date, curr.bmi, 'bmi');
  const bmiUC = prev.bmi ? prev.bmi.toFixed(2).replace('.', ',') : 'N/A';
  const bmiAt = curr.bmi ? curr.bmi.toFixed(2).replace('.', ',') : 'N/A';

  const linhaIMC = `IMC: UC: ${bmiUC} (Z: ${iZ_uc}). Atual: ${bmiAt} (Z: ${iZ_at})`;

  return `Dados Antropométricos:
Última consulta (UC): ${dataAntF}
Atual: ${dataAtualF}
${linhaPeso}
${linhaAltura}
${linhaCeph}
${linhaIMC}`;
}
