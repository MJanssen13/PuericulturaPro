
import React, { useEffect, useState } from 'react';
import { AssessmentData } from '../types';
import { calculateAgeInDays, evaluateWeightGain, evaluateHeightGrowth, evaluateZScore, formatAgeString } from '../services/puericulturaLogic';

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
         // Removida a conversão /1000 para peso, pois a DB está em gramas
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
          cephalic: `Atual: ${cC || '-'}`, // Simplified for demo
          bmi: `Atual: ${cB || '-'}`
        }
      });
    };

    calculate();
  }, [data]);

  // Helper to colorize Z-score cells
  const getZColor = (z: string) => {
    if (!z || z === "N/A") return "bg-gray-50";
    if (z.includes("Adequado") || z.includes("Eutrofia") || z.includes("Entre -1 e 0") || z.includes("Entre 0 e +1")) return "bg-green-100 text-green-800";
    if (z.includes("Risco") || z.includes("Sobrepeso") || z.includes("Entre +1 e +2") || z.includes("Entre -2 e -1")) return "bg-yellow-100 text-yellow-800";
    return "bg-red-50 text-red-800"; // extremes
  };

  // Helper: Formata número para PT-BR (vírgula)
  const formatNum = (val: number | string, decimals = 1) => {
    if (val === '' || val === undefined || val === null) return '-';
    const num = Number(val);
    if (isNaN(num)) return '-';
    // Se for inteiro, não mostra decimais desnecessários, a menos que forçado
    if (Number.isInteger(num) && decimals === 0) return num.toString();
    return num.toFixed(decimals).replace('.', ',');
  };

  const formatDateShort = (d: string) => d ? new Date(d).toLocaleDateString('pt-BR') : '-';

  return (
    <div className="overflow-hidden border border-gray-300 rounded-lg">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-gray-100 text-gray-700 font-semibold border-b border-gray-300">
          <tr>
            <th className="p-3 border-r border-gray-300 w-32">Dados</th>
            <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Última consulta</th>
            <th className="p-3 border-r border-gray-300 text-center" colSpan={2}>Consulta atual</th>
            <th className="p-3 border-r border-gray-300 w-20 text-center">Diferença</th>
            <th className="p-3 w-1/3">Análise</th>
          </tr>
          <tr className="bg-gray-50 text-xs">
            <th className="p-2 border-r border-gray-300">Data</th>
            <th className="p-2 border-r border-gray-300">{formatDateShort(data.prev.date)}</th>
            <th className="p-2 border-r border-gray-300">Z score</th>
            <th className="p-2 border-r border-gray-300">{formatDateShort(data.curr.date)}</th>
            <th className="p-2 border-r border-gray-300">Z score</th>
            <th className="p-2 border-r border-gray-300 text-center">{analysis.diff.days} dias</th>
            <th className="p-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {/* Weight */}
          <tr>
            <td className="p-2 font-medium border-r border-gray-300">Peso (g)</td>
            <td className="p-2 border-r border-gray-300">{data.prev.weight}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.prevW)}`}>{analysis.zScore.prevW}</td>
            <td className="p-2 border-r border-gray-300">{data.curr.weight}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.currW)}`}>{analysis.zScore.currW}</td>
            <td className="p-2 border-r border-gray-300 text-center">{analysis.diff.weight > 0 ? '+' : ''}{analysis.diff.weight}</td>
            <td className={`p-2 ${analysis.text.weight.includes("Abaixo") ? 'bg-yellow-50' : 'bg-green-50'}`}>{analysis.text.weight}</td>
          </tr>
          {/* Height */}
          <tr>
            <td className="p-2 font-medium border-r border-gray-300">Altura (cm)</td>
            <td className="p-2 border-r border-gray-300">{formatNum(data.prev.height)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.prevH)}`}>{analysis.zScore.prevH}</td>
            <td className="p-2 border-r border-gray-300">{formatNum(data.curr.height)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.currH)}`}>{analysis.zScore.currH}</td>
            <td className="p-2 border-r border-gray-300 text-center">{analysis.diff.height > 0 ? '+' : ''}{formatNum(analysis.diff.height)}</td>
            <td className={`p-2 ${analysis.text.height.includes("Abaixo") ? 'bg-yellow-50' : 'bg-green-50'}`}>{analysis.text.height}</td>
          </tr>
          {/* Cephalic */}
          <tr>
            <td className="p-2 font-medium border-r border-gray-300">C. cefálico (cm)</td>
            <td className="p-2 border-r border-gray-300">{formatNum(data.prev.cephalic)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.prevC)}`}>{analysis.zScore.prevC}</td>
            <td className="p-2 border-r border-gray-300">{formatNum(data.curr.cephalic)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.currC)}`}>{analysis.zScore.currC}</td>
            <td className="p-2 border-r border-gray-300 text-center">{formatNum(analysis.diff.cephalic)}</td>
            <td className="p-2 bg-green-50">{analysis.text.cephalic}</td>
          </tr>
          {/* BMI */}
          <tr>
            <td className="p-2 font-medium border-r border-gray-300">IMC</td>
            <td className="p-2 border-r border-gray-300">{formatNum(analysis.prevBMI, 2)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.prevB)}`}>{analysis.zScore.prevB}</td>
            <td className="p-2 border-r border-gray-300">{formatNum(analysis.currBMI, 2)}</td>
            <td className={`p-2 border-r border-gray-300 ${getZColor(analysis.zScore.currB)}`}>{analysis.zScore.currB}</td>
            <td className="p-2 border-r border-gray-300 text-center">{formatNum(analysis.diff.bmi, 2)}</td>
            <td className={`p-2 ${analysis.text.bmi.includes("Sobrepeso") ? 'bg-yellow-50' : 'bg-green-50'}`}>{analysis.text.bmi}</td>
          </tr>
          {/* Age */}
          <tr className="bg-gray-50">
            <td className="p-2 font-medium border-r border-gray-300">Idade</td>
            <td className="p-2 border-r border-gray-300" colSpan={2}>{analysis.prevAge}</td>
            <td className="p-2 border-r border-gray-300" colSpan={2}>{analysis.currAge}</td>
            <td className="p-2 border-r border-gray-300 text-center">{analysis.diff.days}</td>
            <td className="p-2"></td>
          </tr>
        </tbody>
      </table>
    </div>
  );
};
