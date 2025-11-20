
import React, { useEffect, useState } from 'react';
import { AssessmentData } from '../types';
import { calculateAgeInDays, evaluateWeightGain, evaluateHeightGrowth, evaluateZScore, formatAgeString } from '../services/puericulturaLogic';
import { ArrowTrendingUpIcon, ArrowTrendingDownIcon, MinusIcon } from '@heroicons/react/24/outline';

interface Props {
  data: AssessmentData;
}

export const ResultsTable: React.FC<Props> = ({ data }) => {
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
    text: {
      weight: '',
      height: '',
      cephalic: '',
      bmi: ''
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

      // Async Z-score calculations
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
        text: {
          weight: evaluateWeightGain(data.birthDate, data.prev.date, Number(data.prev.weight), data.curr.date, Number(data.curr.weight)),
          height: evaluateHeightGrowth(data.birthDate, data.prev.date, Number(data.prev.height), data.curr.date, Number(data.curr.height)),
          cephalic: `Atual: ${cC || '-'}`, 
          bmi: `Atual: ${cB || '-'}`
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
    return "bg-rose-100 text-rose-700 border border-rose-200"; // extremes
  };

  // Helper: Formata número para PT-BR (vírgula)
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

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 border-b border-slate-200">
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-32">Indicador</th>
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50/80 border-l border-slate-200/50">
               Anterior <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{formatDateShort(data.prev.date)}</span>
            </th>
            <th className="py-3 px-4 text-xs font-bold text-teal-700 uppercase tracking-wider text-center bg-teal-50/30 border-l border-slate-200/50 border-r border-slate-200/50">
               Atual <span className="block text-[10px] font-normal text-teal-600/70 mt-0.5">{formatDateShort(data.curr.date)}</span>
            </th>
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-24">
               Diferença
            </th>
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-1/3">
               Análise / Velocidade
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          
          {/* WEIGHT */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-3 px-4 font-semibold text-slate-700">Peso (g)</td>
            
            {/* Anterior */}
            <td className="py-3 px-4 text-center border-l border-slate-50">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-600 tabular-nums">{data.prev.weight}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getZBadgeClass(analysis.zScore.prevW)}`}>
                   {analysis.zScore.prevW || 'N/A'}
                 </span>
              </div>
            </td>

            {/* Atual */}
            <td className="py-3 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-base">{data.curr.weight}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${getZBadgeClass(analysis.zScore.currW)}`}>
                   {analysis.zScore.currW || 'N/A'}
                 </span>
              </div>
            </td>

            {/* Diferença */}
            <td className="py-3 px-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {renderTrendIcon(analysis.diff.weight)}
                <span className={`font-medium tabular-nums ${analysis.diff.weight > 0 ? 'text-emerald-600' : analysis.diff.weight < 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                  {analysis.diff.weight > 0 ? '+' : ''}{analysis.diff.weight}
                </span>
              </div>
            </td>

            {/* Análise */}
            <td className="py-3 px-4">
              <p className={`text-xs font-medium ${analysis.text.weight.includes("Abaixo") ? 'text-amber-600' : 'text-slate-600'}`}>
                 {analysis.text.weight || '-'}
              </p>
            </td>
          </tr>

          {/* HEIGHT */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-3 px-4 font-semibold text-slate-700">Altura (cm)</td>
            
            <td className="py-3 px-4 text-center border-l border-slate-50">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-600 tabular-nums">{formatNum(data.prev.height)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getZBadgeClass(analysis.zScore.prevH)}`}>
                   {analysis.zScore.prevH || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-base">{formatNum(data.curr.height)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${getZBadgeClass(analysis.zScore.currH)}`}>
                   {analysis.zScore.currH || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center">
               <div className="flex items-center justify-center gap-1">
                {renderTrendIcon(analysis.diff.height)}
                <span className={`font-medium tabular-nums ${analysis.diff.height > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {analysis.diff.height > 0 ? '+' : ''}{formatNum(analysis.diff.height)}
                </span>
              </div>
            </td>

            <td className="py-3 px-4">
              <p className={`text-xs font-medium ${analysis.text.height.includes("Abaixo") ? 'text-amber-600' : 'text-slate-600'}`}>
                 {analysis.text.height || '-'}
              </p>
            </td>
          </tr>

          {/* CEPHALIC */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-3 px-4 font-semibold text-slate-700">P. Cefálico (cm)</td>
            
            <td className="py-3 px-4 text-center border-l border-slate-50">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-600 tabular-nums">{formatNum(data.prev.cephalic)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getZBadgeClass(analysis.zScore.prevC)}`}>
                   {analysis.zScore.prevC || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-base">{formatNum(data.curr.cephalic)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${getZBadgeClass(analysis.zScore.currC)}`}>
                   {analysis.zScore.currC || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center">
              <div className="flex items-center justify-center gap-1">
                {renderTrendIcon(analysis.diff.cephalic)}
                <span className="text-slate-500 font-medium tabular-nums">
                  {formatNum(analysis.diff.cephalic)}
                </span>
              </div>
            </td>

            <td className="py-3 px-4">
              <span className="text-xs text-slate-400 italic">Acompanhar gráfico</span>
            </td>
          </tr>

          {/* BMI */}
          <tr className="hover:bg-slate-50/50 transition-colors">
            <td className="py-3 px-4 font-semibold text-slate-700">IMC</td>
            
            <td className="py-3 px-4 text-center border-l border-slate-50">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-600 tabular-nums">{formatNum(analysis.prevBMI, 2)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getZBadgeClass(analysis.zScore.prevB)}`}>
                   {analysis.zScore.prevB || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center bg-teal-50/10 border-x border-slate-100">
              <div className="flex flex-col items-center gap-1">
                 <span className="text-slate-900 font-bold tabular-nums text-base">{formatNum(analysis.currBMI, 2)}</span>
                 <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm ${getZBadgeClass(analysis.zScore.currB)}`}>
                   {analysis.zScore.currB || 'N/A'}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4 text-center">
              <div className="flex items-center justify-center gap-1">
                 {renderTrendIcon(analysis.diff.bmi)}
                 <span className="text-slate-500 font-medium tabular-nums">
                   {formatNum(analysis.diff.bmi, 2)}
                 </span>
              </div>
            </td>

            <td className="py-3 px-4">
               <span className="text-xs text-slate-400 italic">Acompanhar gráfico</span>
            </td>
          </tr>

          {/* AGE ROW */}
          <tr className="bg-slate-50 text-xs border-t border-slate-200">
            <td className="py-2 px-4 font-bold text-slate-500 uppercase tracking-wider">Idade Calculada</td>
            <td className="py-2 px-4 text-center font-mono text-slate-600 border-l border-slate-200">{analysis.prevAge}</td>
            <td className="py-2 px-4 text-center font-mono text-teal-700 font-medium border-l border-slate-200 bg-teal-50/30">{analysis.currAge}</td>
            <td className="py-2 px-4 text-center font-mono text-slate-500 border-l border-slate-200" colSpan={2}>
               Intervalo: <span className="font-bold">{analysis.diff.days} dias</span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
