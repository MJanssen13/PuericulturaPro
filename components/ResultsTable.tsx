import React, { useEffect, useState } from 'react';
import { AssessmentData } from '../types';
import { 
  calculateAgeInDays, 
  evaluateWeightGain, 
  evaluateHeightGrowth, 
  evaluateZScore, 
  formatAgeString,
  getBMIDiagnosis,
  getRawReference
} from '../services/puericulturaLogic';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface Props {
  data: AssessmentData;
}

interface AnalysisItem {
  status: 'good' | 'warning' | 'bad' | 'neutral';
  text: React.ReactNode;
}

export const ResultsTable: React.FC<Props> = ({ data }) => {
  const showPrev = !data.isFirstConsultation;

  const [analysis, setAnalysis] = useState({
    prevAge: '',
    currAge: '',
    prevBMI: 0,
    currBMI: 0,
    zScore: {
      prevW: '', currW: '',
      prevH: '', currH: '',
      prevC: '', currC: '',
      prevB: '', currB: '',
    },
    diff: {
      days: 0,
      weight: 0,
      height: 0,
      cephalic: 0,
      bmi: 0
    },
    // Stores pre-calculated analysis blocks
    blocks: {
      weight: { status: 'neutral', text: '' } as AnalysisItem,
      height: { status: 'neutral', text: '' } as AnalysisItem,
      cephalic: { status: 'neutral', text: '' } as AnalysisItem,
      bmi: { status: 'neutral', text: '' } as AnalysisItem,
    }
  });

  useEffect(() => {
    const calculate = async () => {
      const prevAgeDays = calculateAgeInDays(data.birthDate, data.prev.date);
      const currAgeDays = calculateAgeInDays(data.birthDate, data.curr.date);
      
      const prevBMI = (Number(data.prev.weight) && Number(data.prev.height)) 
        ? (data.prev.weight as number / 1000) / Math.pow(data.prev.height as number / 100, 2) : 0;
      const currBMI = (Number(data.curr.weight) && Number(data.curr.height))
        ? (data.curr.weight as number / 1000) / Math.pow(data.curr.height as number / 100, 2) : 0;

      const getZ = (date: string, val: number | '', type: any) => {
         let v = Number(val);
         return evaluateZScore(data.birthDate, date, v, data.sex, type);
      };

      const [pW, cW, pH, cH, pC, cC, pB, cB] = await Promise.all([
        getZ(data.prev.date, data.prev.weight, 'weight'),
        getZ(data.curr.date, data.curr.weight, 'weight'),
        getZ(data.prev.date, data.prev.height, 'height'),
        getZ(data.curr.date, data.curr.height, 'height'),
        getZ(data.prev.date, data.prev.cephalic, 'cephalic'),
        getZ(data.curr.date, data.curr.cephalic, 'cephalic'),
        getZ(data.prev.date, prevBMI, 'bmi'),
        getZ(data.curr.date, currBMI, 'bmi')
      ]);

      // 1. Calculate Velocity Texts (Weight / Height)
      let wText = '';
      let hText = '';
      let wStatus = 'neutral';
      let hStatus = 'neutral';

      if (!data.isFirstConsultation) {
        wText = evaluateWeightGain(data.birthDate, data.prev.date, Number(data.prev.weight), data.curr.date, Number(data.curr.weight));
        hText = evaluateHeightGrowth(data.birthDate, data.prev.date, Number(data.prev.height), data.curr.date, Number(data.curr.height));
        wStatus = wText.includes('Adequado') ? 'good' : (wText.includes('Abaixo') || wText.includes('Acima') ? 'warning' : 'neutral');
        hStatus = hText.includes('Adequado') ? 'good' : (hText.includes('Abaixo') || hText.includes('Acima') ? 'warning' : 'neutral');
      }

      // 2. Calculate PC Analysis (Comparison against Range Z-2 to Z+2)
      const prevRefC = await getRawReference(data.birthDate, data.prev.date, data.sex, 'cephalic');
      const currRefC = await getRawReference(data.birthDate, data.curr.date, data.sex, 'cephalic');
      
      const getPCStatusText = (val: number | '', ref: any) => {
          if (!val || !ref) return { statusText: 'N/A', rangeText: '-', isGood: false };
          const min = ref.z_neg_2;
          const max = ref.z_pos_2;
          const valNum = Number(val);
          const isGood = valNum >= min && valNum <= max;
          const statusText = isGood ? 'Adequado' : (valNum < min ? 'Baixo' : 'Alto');
          const rangeText = `${min.toFixed(1).replace('.',',')}-${max.toFixed(1).replace('.',',')} cm`;
          return { statusText, rangeText, isGood };
      };

      const prevPCSt = getPCStatusText(data.prev.cephalic, prevRefC);
      const currPCSt = getPCStatusText(data.curr.cephalic, currRefC);

      const pcBlockStatus = (prevPCSt.isGood && currPCSt.isGood) ? 'good' : 'warning';
      
      // Helper for color class in text
      const getColor = (isGood: boolean, valStr: string) => {
         if (valStr === 'N/A') return 'text-slate-400';
         return isGood ? 'text-emerald-600' : 'text-amber-600';
      };

      const pcText = (
        <div className="flex flex-col gap-1">
          <span className={`${getColor(currPCSt.isGood, currPCSt.statusText)} text-sm`}>
             <span className="font-bold text-slate-600">Atual:</span> <span className="font-semibold text-sm">{currPCSt.statusText}</span> <span className="text-slate-500 font-normal ml-1">(Faixa: {currPCSt.rangeText})</span>
          </span>
          {!data.isFirstConsultation && (
            <span className={`${getColor(prevPCSt.isGood, prevPCSt.statusText)} text-sm`}>
               <span className="font-bold text-slate-600">Anterior:</span> <span className="font-semibold text-sm">{prevPCSt.statusText}</span> <span className="text-slate-500 font-normal ml-1">(Faixa: {prevPCSt.rangeText})</span>
            </span>
          )}
        </div>
      );

      // 3. Calculate BMI Analysis (Diagnosis)
      const prevDiag = getBMIDiagnosis(pB) || '-';
      const currDiag = getBMIDiagnosis(cB) || '-';
      
      const isEutrofia = (d: string) => d.includes('Eutrofia');
      const bmiBlockStatus = (isEutrofia(prevDiag) && isEutrofia(currDiag)) ? 'good' : (prevDiag === '-' ? 'neutral' : 'warning');
      
      const bmiText = (
        <div className="flex flex-col gap-1">
          <span className={`${isEutrofia(currDiag) ? 'text-emerald-600' : 'text-amber-600'} text-sm`}>
             <span className="font-bold text-slate-600">Atual:</span> <span className="font-semibold text-sm">{currDiag}</span>
          </span>
          {!data.isFirstConsultation && (
            <span className={`${isEutrofia(prevDiag) ? 'text-emerald-600' : 'text-amber-600'} text-sm`}>
               <span className="font-bold text-slate-600">Anterior:</span> <span className="font-semibold text-sm">{prevDiag}</span>
            </span>
          )}
        </div>
      );

      setAnalysis({
        prevAge: formatAgeString(prevAgeDays),
        currAge: formatAgeString(currAgeDays),
        prevBMI,
        currBMI,
        zScore: {
           prevW: pW, currW: cW,
           prevH: pH, currH: cH,
           prevC: pC, currC: cC,
           prevB: pB, currB: cB
        },
        diff: {
          days: currAgeDays - prevAgeDays,
          weight: (Number(data.curr.weight) - Number(data.prev.weight)),
          height: (Number(data.curr.height) - Number(data.prev.height)),
          cephalic: (Number(data.curr.cephalic) - Number(data.prev.cephalic)),
          bmi: currBMI - prevBMI
        },
        blocks: {
          weight: { status: wStatus as any, text: wText || '' },
          height: { status: hStatus as any, text: hText || '' },
          cephalic: { status: pcBlockStatus as any, text: pcText },
          bmi: { status: bmiBlockStatus as any, text: bmiText }
        }
      });
    };

    calculate();
  }, [data]);

  // Helper to colorize Z-score badges
  const getZBadgeClass = (z: string) => {
    if (!z || z === "N/A") return "bg-slate-100 text-slate-400";
    if (z.includes("Adequado") || z.includes("Eutrofia") || z.includes("Entre -1 e 0") || z.includes("Entre 0 e +1")) 
        return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (z.includes("Risco") || z.includes("Sobrepeso") || z.includes("Entre +1 e +2") || z.includes("Entre -2 e -1")) 
        return "bg-amber-100 text-amber-700 border border-amber-200";
    return "bg-rose-100 text-rose-700 border border-rose-200";
  };

  const formatNum = (val: number | string, decimals = 1) => {
    if (val === '' || val === undefined || val === null) return '-';
    const num = Number(val);
    if (isNaN(num)) return '-';
    if (Number.isInteger(num) && decimals === 0) return num.toString();
    return num.toFixed(decimals).replace('.', ',');
  };

  const formatDateShort = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '-';

  const renderTrendIcon = (val: number) => {
    if (val > 0) return <ArrowTrendingUpIcon className="w-4 h-4 text-emerald-500" />;
    if (val < 0) return <ArrowTrendingDownIcon className="w-4 h-4 text-rose-500" />;
    return <MinusIcon className="w-4 h-4 text-slate-300" />;
  };

  const renderZBadge = (zScore: string, isBMI = false) => {
    return (
      <div className="flex flex-col items-center">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getZBadgeClass(zScore)}`}>
          Z: {zScore || 'N/A'}
        </span>
      </div>
    );
  };

  // Returns CSS class for TEXT color based on status (instead of background)
  const getAnalysisTextClass = (status: 'good' | 'warning' | 'bad' | 'neutral') => {
    switch(status) {
      case 'good': return "text-emerald-600 font-semibold";
      case 'warning': return "text-amber-600 font-semibold";
      case 'bad': return "text-rose-600 font-semibold";
      default: return "text-slate-600";
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Indicador</th>
            {showPrev && (
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50/80 border-l border-slate-200/50">
                   Anterior <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{formatDateShort(data.prev.date)}</span>
                </th>
            )}
            <th className="py-3 px-4 text-xs font-bold text-teal-700 uppercase tracking-wider text-center bg-teal-50/30 border-l border-slate-200/50 border-r border-slate-200/50">
               Atual <span className="block text-[10px] font-normal text-teal-600/70 mt-0.5">{formatDateShort(data.curr.date)}</span>
            </th>
            {showPrev && (
                <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-28">
                   Diferença
                </th>
            )}
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">
               Análise / Velocidade
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          
          {/* WEIGHT */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-semibold text-slate-700">Peso (g)</td>
            
            {showPrev && (
                <td className="py-4 px-4 text-center border-l border-slate-50">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-600 tabular-nums text-base">{data.prev.weight}</span>
                    {renderZBadge(analysis.zScore.prevW)}
                </div>
                </td>
            )}

            <td className="py-4 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-lg">{data.curr.weight}</span>
                 {renderZBadge(analysis.zScore.currW)}
              </div>
            </td>

            {showPrev && (
                <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {renderTrendIcon(analysis.diff.weight)}
                    <span className={`font-medium tabular-nums text-sm ${analysis.diff.weight > 0 ? 'text-emerald-600' : analysis.diff.weight < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    {analysis.diff.weight > 0 ? '+' : ''}{analysis.diff.weight} g
                    </span>
                </div>
                </td>
            )}

            <td className="py-4 px-4">
               <span className={getAnalysisTextClass(analysis.blocks.weight.status)}>
                 {analysis.blocks.weight.text}
               </span>
            </td>
          </tr>

          {/* HEIGHT */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-semibold text-slate-700">Altura (cm)</td>
            
            {showPrev && (
                <td className="py-4 px-4 text-center border-l border-slate-50">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-600 tabular-nums text-base">{formatNum(data.prev.height)}</span>
                    {renderZBadge(analysis.zScore.prevH)}
                </div>
                </td>
            )}

            <td className="py-4 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-lg">{formatNum(data.curr.height)}</span>
                 {renderZBadge(analysis.zScore.currH)}
              </div>
            </td>

            {showPrev && (
                <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {renderTrendIcon(analysis.diff.height)}
                    <span className={`font-medium tabular-nums text-sm ${analysis.diff.height > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {analysis.diff.height > 0 ? '+' : ''}{formatNum(analysis.diff.height)} cm
                    </span>
                </div>
                </td>
            )}

            <td className="py-4 px-4">
               <span className={getAnalysisTextClass(analysis.blocks.height.status)}>
                 {analysis.blocks.height.text}
               </span>
            </td>
          </tr>

          {/* CEPHALIC */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-semibold text-slate-700">P. Cefálico (cm)</td>
            
            {showPrev && (
                <td className="py-4 px-4 text-center border-l border-slate-50">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-600 tabular-nums text-base">{formatNum(data.prev.cephalic)}</span>
                    {renderZBadge(analysis.zScore.prevC)}
                </div>
                </td>
            )}

            <td className="py-4 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-lg">{formatNum(data.curr.cephalic)}</span>
                 {renderZBadge(analysis.zScore.currC)}
              </div>
            </td>

            {showPrev && (
                <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {renderTrendIcon(analysis.diff.cephalic)}
                    <span className="text-slate-500 font-medium tabular-nums text-sm">
                    {formatNum(analysis.diff.cephalic)} cm
                    </span>
                </div>
                </td>
            )}

            <td className="py-4 px-4">
               {analysis.blocks.cephalic.text}
            </td>
          </tr>

          {/* BMI */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-4 px-4 font-semibold text-slate-700">IMC</td>
            
            {showPrev && (
                <td className="py-4 px-4 text-center border-l border-slate-50">
                <div className="flex flex-col items-center gap-1">
                    <span className="text-slate-600 tabular-nums text-base">{formatNum(analysis.prevBMI, 2)}</span>
                    {renderZBadge(analysis.zScore.prevB, true)}
                </div>
                </td>
            )}

            <td className="py-4 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-lg">{formatNum(analysis.currBMI, 2)}</span>
                 {renderZBadge(analysis.zScore.currB, true)}
              </div>
            </td>

            {showPrev && (
                <td className="py-4 px-4 text-center">
                <div className="flex items-center justify-center gap-1">
                    {renderTrendIcon(analysis.diff.bmi)}
                    <span className="text-slate-500 font-medium tabular-nums text-sm">
                    {formatNum(analysis.diff.bmi, 2)}
                    </span>
                </div>
                </td>
            )}

            <td className="py-4 px-4">
               {analysis.blocks.bmi.text}
            </td>
          </tr>

          {/* AGE ROW */}
          <tr className="bg-slate-50 text-xs border-t border-slate-200">
            <td className="py-3 px-4 font-bold text-slate-500 uppercase tracking-wider">Idade Calculada</td>
            {showPrev && <td className="py-3 px-4 text-center font-mono text-slate-600 border-l border-slate-200">{analysis.prevAge}</td>}
            <td className="py-3 px-4 text-center font-mono text-teal-700 font-medium border-l border-slate-200 bg-teal-50/30">{analysis.currAge}</td>
            {showPrev ? (
               <td className="py-3 px-4 text-center font-mono text-slate-500 border-l border-slate-200" colSpan={2}>
                  Intervalo: <span className="font-bold">{analysis.diff.days} dias</span>
               </td>
            ) : (
               <td className="py-3 px-4 border-l border-slate-200"></td>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};