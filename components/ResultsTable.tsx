import React, { useEffect, useState } from 'react';
import { AssessmentData } from '../types';
import { 
  calculateAgeInDays, 
  calculatePostConceptualAgeDays,
  calculateCorrectedAgeDays,
  evaluateWeightGain, 
  evaluateHeightGrowth, 
  evaluateZScore, 
  formatAgeString,
  getBMIDiagnosis,
  getCephalicDiagnosis
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
    blocks: {
      weight: { status: 'neutral', text: '' } as AnalysisItem,
      height: { status: 'neutral', text: '' } as AnalysisItem,
      cephalic: { status: 'neutral', text: '' } as AnalysisItem,
      bmi: { status: 'neutral', text: '' } as AnalysisItem,
    },
    isPrematureMode: false,
  });

  useEffect(() => {
    const calculate = async () => {
      const { birthDate, sex, isPremature, gestationalAgeWeeks, gestationalAgeDays } = data;
      
      const gestAgeWeeksNum = Number(gestationalAgeWeeks);
      const gestAgeDaysNum = Number(gestationalAgeDays);
      
      const prevChronologicalAgeDays = calculateAgeInDays(birthDate, data.prev.date);
      const currChronologicalAgeDays = calculateAgeInDays(birthDate, data.curr.date);

      const prevPCADays = calculatePostConceptualAgeDays(birthDate, data.prev.date, gestAgeWeeksNum, gestAgeDaysNum);
      const currPCADays = calculatePostConceptualAgeDays(birthDate, data.curr.date, gestAgeWeeksNum, gestAgeDaysNum);
      
      const isPrematureMode = isPremature && gestAgeWeeksNum > 0 && currPCADays > 0 && currPCADays <= (40 * 7);

      const prevBMI = (Number(data.prev.weight) && Number(data.prev.height)) 
        ? (data.prev.weight as number / 1000) / Math.pow(data.prev.height as number / 100, 2) : 0;
      const currBMI = (Number(data.curr.weight) && Number(data.curr.height))
        ? (data.curr.weight as number / 1000) / Math.pow(data.curr.height as number / 100, 2) : 0;

      const getZ = (date: string, val: number | '', type: any) => {
         let v = Number(val);
         return evaluateZScore(birthDate, date, v, sex, type, isPremature, gestationalAgeWeeks, gestationalAgeDays);
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

      let wText = '', hText = '', wStatus = 'neutral', hStatus = 'neutral';
      if (!data.isFirstConsultation) {
        wText = evaluateWeightGain(birthDate, data.prev.date, Number(data.prev.weight), data.curr.date, Number(data.curr.weight));
        hText = evaluateHeightGrowth(birthDate, data.prev.date, Number(data.prev.height), data.curr.date, Number(data.curr.height));
        wStatus = wText.includes('Adequado') ? 'good' : (wText.includes('Abaixo') || wText.includes('Acima') ? 'warning' : 'neutral');
        hStatus = hText.includes('Adequado') ? 'good' : (hText.includes('Abaixo') || hText.includes('Acima') ? 'warning' : 'neutral');
      }

      const prevPCDiag = getCephalicDiagnosis(pC);
      const currPCDiag = getCephalicDiagnosis(cC);
      const isNormocefalia = (d: string) => d.includes('Normocefalia');
      const pcBlockStatus = (isNormocefalia(prevPCDiag) && isNormocefalia(currPCDiag)) ? 'good' : 'warning';
      
      const getColor = (diag: string) => {
          if (diag === 'Normocefalia') return 'text-emerald-600';
          if (diag === '') return 'text-slate-400';
          return 'text-amber-600';
      }

      const pcText = (
        <div className="flex flex-col gap-1">
          <span className={`${getColor(currPCDiag)} text-sm`}>
             <span className="font-bold text-slate-600">Atual:</span> <span className="font-semibold text-sm">{currPCDiag || '-'}</span>
          </span>
          {!data.isFirstConsultation && (
            <span className={`${getColor(prevPCDiag)} text-sm`}>
               <span className="font-bold text-slate-600">Anterior:</span> <span className="font-semibold text-sm">{prevPCDiag || '-'}</span>
            </span>
          )}
        </div>
      );

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

      const formatPCA = (d: number) => d > 0 ? `${Math.floor(d/7)}s ${d % 7}d` : '-';
      
      const getAgeDisplay = (pca: number, chronological: number) => {
          if (isPrematureMode) return formatPCA(pca);
          if (isPremature) return formatAgeString(calculateCorrectedAgeDays(birthDate, data.curr.date, gestAgeWeeksNum, gestAgeDaysNum));
          return formatAgeString(chronological);
      };
      
      const getPrevAgeDisplay = (pca: number, chronological: number) => {
          if (isPremature) {
             const prevIsPrematureMode = prevPCADays > 0 && prevPCADays <= (40*7);
             if (prevIsPrematureMode) return formatPCA(pca);
             return formatAgeString(calculateCorrectedAgeDays(birthDate, data.prev.date, gestAgeWeeksNum, gestAgeDaysNum));
          }
          return formatAgeString(chronological);
      };

      setAnalysis({
        prevAge: getPrevAgeDisplay(prevPCADays, prevChronologicalAgeDays),
        currAge: getAgeDisplay(currPCADays, currChronologicalAgeDays),
        prevBMI, currBMI,
        zScore: { prevW: pW, currW: cW, prevH: pH, currH: cH, prevC: pC, currC: cC, prevB: pB, currB: cB },
        diff: {
          days: currChronologicalAgeDays - prevChronologicalAgeDays,
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
        },
        isPrematureMode,
      });
    };

    calculate();
  }, [data]);

  const getZBadgeClass = (z: string) => {
    if (!z || z === "N/A") return "bg-slate-100 text-slate-400";
    if (z.includes("Adequado") || z.includes("Eutrofia") || z.includes("Normocefalia") || z.includes("Entre -1 e 0") || z.includes("Entre 0 e +1") || z.includes("Entre -2 e -1") || z.includes("Entre +1 e +2")) return "bg-emerald-100 text-emerald-700 border border-emerald-200";
    if (z.includes("Risco") || z.includes("Sobrepeso")) return "bg-amber-100 text-amber-700 border border-amber-200";
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

  const renderZBadge = (zScore: string) => {
    return (
      <div className="flex flex-col items-center">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getZBadgeClass(zScore)}`}>
          Z: {zScore || 'N/A'}
        </span>
      </div>
    );
  };

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
            {showPrev && ( <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center bg-slate-50/80 border-l border-slate-200/50"> Anterior <span className="block text-[10px] font-normal text-slate-400 mt-0.5">{formatDateShort(data.prev.date)}</span> </th> )}
            <th className="py-3 px-4 text-xs font-bold text-teal-700 uppercase tracking-wider text-center bg-teal-50/30 border-l border-slate-200/50 border-r border-slate-200/50"> Atual <span className="block text-[10px] font-normal text-teal-600/70 mt-0.5">{formatDateShort(data.curr.date)}</span> </th>
            {showPrev && ( <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-28"> Diferença </th> )}
            <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-64"> Análise & Velocidade </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {/* Idade */}
          <tr className="hover:bg-slate-50/50">
            <td className="font-bold text-slate-700 py-3 px-4">Idade {analysis.isPrematureMode ? '(Pós-Conceptual)' : (data.isPremature ? '(Corrigida)' : '')}</td>
            {showPrev && <td className="font-semibold text-slate-600 py-3 px-4 text-center">{analysis.prevAge}</td>}
            <td className="font-bold text-teal-800 bg-teal-50/30 py-3 px-4 text-center">{analysis.currAge}</td>
            {showPrev && <td className="py-3 px-4 text-center text-slate-500">{analysis.diff.days} dias</td>}
            <td className="py-3 px-4"></td>
          </tr>

          {/* Peso */}
          <tr className="hover:bg-slate-50/50">
            <td className="font-bold text-slate-700 py-3 px-4">Peso (g)</td>
            {showPrev && <td className="py-3 px-4 text-center"> <span className="font-semibold">{formatNum(data.prev.weight, 0)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.prevW)}</div> </td>}
            <td className="py-3 px-4 text-center bg-teal-50/30"> <span className="font-bold text-teal-800">{formatNum(data.curr.weight, 0)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.currW)}</div> </td>
            {showPrev && <td className="py-3 px-4 text-center"> <div className="flex items-center justify-center gap-1 font-semibold text-slate-600">{renderTrendIcon(analysis.diff.weight)} {analysis.diff.weight > 0 ? '+' : ''}{formatNum(analysis.diff.weight, 0)}g</div> </td>}
            <td className={`py-3 px-4 text-sm ${getAnalysisTextClass(analysis.blocks.weight.status)}`}>{analysis.blocks.weight.text}</td>
          </tr>

          {/* Altura */}
          <tr className="hover:bg-slate-50/50">
            <td className="font-bold text-slate-700 py-3 px-4">Altura (cm)</td>
            {showPrev && <td className="py-3 px-4 text-center"> <span className="font-semibold">{formatNum(data.prev.height)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.prevH)}</div> </td>}
            <td className="py-3 px-4 text-center bg-teal-50/30"> <span className="font-bold text-teal-800">{formatNum(data.curr.height)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.currH)}</div> </td>
            {showPrev && <td className="py-3 px-4 text-center"> <div className="flex items-center justify-center gap-1 font-semibold text-slate-600">{renderTrendIcon(analysis.diff.height)} +{formatNum(analysis.diff.height, 1)}cm</div> </td>}
            <td className={`py-3 px-4 text-sm ${getAnalysisTextClass(analysis.blocks.height.status)}`}>{analysis.blocks.height.text}</td>
          </tr>

          {/* Perímetro Cefálico */}
          <tr className="hover:bg-slate-50/50">
            <td className="font-bold text-slate-700 py-3 px-4">PC (cm)</td>
            {showPrev && <td className="py-3 px-4 text-center"> <span className="font-semibold">{formatNum(data.prev.cephalic)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.prevC)}</div> </td>}
            <td className="py-3 px-4 text-center bg-teal-50/30"> <span className="font-bold text-teal-800">{formatNum(data.curr.cephalic)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.currC)}</div> </td>
            {showPrev && <td className="py-3 px-4 text-center"> <div className="flex items-center justify-center gap-1 font-semibold text-slate-600">{renderTrendIcon(analysis.diff.cephalic)} +{formatNum(analysis.diff.cephalic, 1)}cm</div> </td>}
            <td className={`py-3 px-4`}>{analysis.blocks.cephalic.text}</td>
          </tr>

          {/* IMC */}
          <tr className="hover:bg-slate-50/50">
            <td className="font-bold text-slate-700 py-3 px-4">IMC</td>
            {analysis.isPrematureMode ? (
              <td colSpan={showPrev ? 4 : 3} className="text-center text-slate-400 py-3 px-4 italic text-xs">
                Cálculo de IMC não aplicável para prematuros nesta faixa de idade (INTERGROWTH-21).
              </td>
            ) : (
              <>
                {showPrev && <td className="py-3 px-4 text-center"> <span className="font-semibold">{formatNum(analysis.prevBMI)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.prevB)}</div> </td>}
                <td className="py-3 px-4 text-center bg-teal-50/30"> <span className="font-bold text-teal-800">{formatNum(analysis.currBMI)}</span> <div className="mt-1">{renderZBadge(analysis.zScore.currB)}</div> </td>
                {showPrev && <td className="py-3 px-4 text-center"> <div className="flex items-center justify-center gap-1 font-semibold text-slate-600">{renderTrendIcon(analysis.diff.bmi)} {analysis.diff.bmi > 0 ? '+' : ''}{formatNum(analysis.diff.bmi, 1)}</div> </td>}
                <td className={`py-3 px-4`}>{analysis.blocks.bmi.text}</td>
              </>
            )}
          </tr>
        </tbody>
      </table>
    </div>
  );
};