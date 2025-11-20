
import React, { useState, useEffect } from 'react';
import { AssessmentData, Sex } from '../types';
import { CalendarDaysIcon, ChartBarIcon, ArrowTrendingUpIcon, MinusIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';
import { evaluateZScore, calculateAgeInDays, formatAgeString, evaluateWeightGain, evaluateHeightGrowth } from '../services/puericulturaLogic';

interface Props {
  data: AssessmentData;
  onChange: (data: AssessmentData) => void;
}

export const AssessmentForm: React.FC<Props> = ({ data, onChange }) => {
  
  const [zScores, setZScores] = useState({
    prev: { weight: '', height: '', cephalic: '', bmi: '' },
    curr: { weight: '', height: '', cephalic: '', bmi: '' }
  });

  const [growthAnalysis, setGrowthAnalysis] = useState({
    weightDiff: 0,
    heightDiff: 0,
    cephalicDiff: 0,
    bmiDiff: 0,
    weightText: '',
    heightText: ''
  });

  // Calculate Ages for display
  const prevAge = formatAgeString(calculateAgeInDays(data.birthDate, data.prev.date));
  const currAge = formatAgeString(calculateAgeInDays(data.birthDate, data.curr.date));

  // Calcula Z-Scores e Análise de Crescimento sempre que os dados mudam
  useEffect(() => {
    const updateData = async () => {
        const calcBMI = (w: number | '', h: number | '') => (Number(w) && Number(h)) ? (Number(w) / 1000) / Math.pow(Number(h) / 100, 2) : 0;
        
        const prevBMI = calcBMI(data.prev.weight, data.prev.height);
        const currBMI = calcBMI(data.curr.weight, data.curr.height);

        // Executa cálculos de Z-Score em paralelo
        const [pW, pH, pC, pB, cW, cH, cC, cB] = await Promise.all([
            evaluateZScore(data.birthDate, data.prev.date, Number(data.prev.weight), data.sex, 'weight'),
            evaluateZScore(data.birthDate, data.prev.date, Number(data.prev.height), data.sex, 'height'),
            evaluateZScore(data.birthDate, data.prev.date, Number(data.prev.cephalic), data.sex, 'cephalic'),
            evaluateZScore(data.birthDate, data.prev.date, prevBMI, data.sex, 'bmi'),
            
            evaluateZScore(data.birthDate, data.curr.date, Number(data.curr.weight), data.sex, 'weight'),
            evaluateZScore(data.birthDate, data.curr.date, Number(data.curr.height), data.sex, 'height'),
            evaluateZScore(data.birthDate, data.curr.date, Number(data.curr.cephalic), data.sex, 'cephalic'),
            evaluateZScore(data.birthDate, data.curr.date, currBMI, data.sex, 'bmi'),
        ]);

        setZScores({
            prev: { weight: pW, height: pH, cephalic: pC, bmi: pB },
            curr: { weight: cW, height: cH, cephalic: cC, bmi: cB }
        });

        // Cálculos de Crescimento (Deltas e Interpretação)
        if (!data.isFirstConsultation && data.prev.date && data.curr.date) {
          const wDiff = (Number(data.curr.weight) || 0) - (Number(data.prev.weight) || 0);
          const hDiff = (Number(data.curr.height) || 0) - (Number(data.prev.height) || 0);
          const cDiff = (Number(data.curr.cephalic) || 0) - (Number(data.prev.cephalic) || 0);
          const bDiff = currBMI - prevBMI;

          const wText = evaluateWeightGain(data.birthDate, data.prev.date, Number(data.prev.weight), data.curr.date, Number(data.curr.weight));
          const hText = evaluateHeightGrowth(data.birthDate, data.prev.date, Number(data.prev.height), data.curr.date, Number(data.curr.height));

          setGrowthAnalysis({
            weightDiff: wDiff,
            heightDiff: hDiff,
            cephalicDiff: cDiff,
            bmiDiff: bDiff,
            weightText: wText,
            heightText: hText
          });
        }
    };
    updateData();
  }, [data]);

  const handleChange = (section: 'prev' | 'curr' | 'root', field: string, value: any) => {
    if (section === 'root') {
      onChange({ ...data, [field]: value });
    } else {
      onChange({
        ...data,
        [section]: { ...data[section], [field]: value }
      });
    }
  };

  const calculateBMI = (weight: number | '', height: number | '') => {
    const w = Number(weight);
    const h = Number(height);
    if (!w || !h) return '';
    const bmi = (w / 1000) / Math.pow(h / 100, 2);
    return bmi.toFixed(2).replace('.', ',');
  };

  const getZInputClass = (z: string) => {
    let textColor = "text-gray-400";
    if (z && z !== "N/A") {
      if (z.includes("Adequado") || z.includes("Eutrofia") || z.includes("Entre -1 e 0") || z.includes("Entre 0 e +1")) textColor = "text-emerald-600";
      else if (z.includes("Risco") || z.includes("Sobrepeso") || z.includes("Entre +1 e +2") || z.includes("Entre -2 e -1")) textColor = "text-yellow-600";
      else textColor = "text-rose-600";
    }
    return `mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 text-xs font-bold p-2 border focus:ring-0 focus:border-gray-200 select-none ${textColor}`;
  };

  const renderZScore = (z: string) => (
    <input 
      type="text"
      readOnly
      value={z ? `Z: ${z}` : ''}
      className={getZInputClass(z)}
      placeholder="-"
      tabIndex={-1}
    />
  );

  // Estilos base para inputs
  const inputBaseClass = "mt-1 block w-full rounded-lg border-gray-300 shadow-sm focus:border-teal-500 focus:ring-teal-500 text-sm p-2 border bg-white text-gray-900 placeholder-gray-400 transition-all duration-200";
  const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1";
  
  const readOnlyClass = "mt-1 block w-full rounded-lg border-gray-200 bg-gray-50 text-gray-500 text-sm p-2 border cursor-default font-medium";
  const readOnlyClassTeal = "mt-1 block w-full rounded-lg border-teal-100 bg-teal-50/50 text-teal-700 text-sm p-2 border cursor-default font-medium";

  const handleDateClick = (e: React.MouseEvent<HTMLInputElement>) => {
    try {
      if ('showPicker' in e.currentTarget) {
        e.currentTarget.showPicker();
      }
    } catch (err) {}
  };
  const dateInputClass = inputBaseClass + " cursor-pointer";

  // Helper para colorir o texto de análise
  const getAnalysisColor = (text: string) => {
    if (!text) return "text-gray-400";
    if (text.includes("Abaixo") || text.includes("Acima")) return "text-amber-600";
    if (text.includes("Adequado")) return "text-emerald-600";
    return "text-gray-600";
  };

  return (
    <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 space-y-6">
      
      {/* Cabeçalho: Dados do Paciente */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100">
        <div>
          <label className={labelClass}>Data de Nascimento</label>
          <input 
            type="date"
            className={dateInputClass}
            onClick={handleDateClick}
            value={data.birthDate}
            onChange={(e) => handleChange('root', 'birthDate', e.target.value)}
          />
          {/* Checkbox Primeira Consulta */}
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              id="firstConsult"
              className="h-4 w-4 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
              checked={!!data.isFirstConsultation}
              onChange={(e) => handleChange('root', 'isFirstConsultation', e.target.checked)}
            />
            <label htmlFor="firstConsult" className="text-sm text-gray-600 select-none cursor-pointer font-medium">
              Primeira consulta
            </label>
          </div>
        </div>
        <div>
          <label className={labelClass}>Sexo</label>
          <div className="relative">
            <select
              className={inputBaseClass + " appearance-none pr-8"}
              value={data.sex}
              onChange={(e) => handleChange('root', 'sex', e.target.value as Sex)}
            >
              <option value="Masculino">Masculino</option>
              <option value="Feminino">Feminino</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-500">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Grid Principal de Consultas - EMPILHADO (grid-cols-1) */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Coluna 1: Última Consulta (Anterior) */}
        {!data.isFirstConsultation && (
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200 to-slate-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
            <div className="relative bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-200">
                <div className="bg-slate-200 p-1 rounded-md">
                  <CalendarDaysIcon className="h-4 w-4 text-slate-600" />
                </div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Última Consulta</h3>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                  <div>
                    <label className={labelClass}>Data</label>
                    <input 
                      type="date"
                      className={dateInputClass}
                      onClick={handleDateClick}
                      value={data.prev.date}
                      onChange={(e) => handleChange('prev', 'date', e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Idade</label>
                    <input 
                      type="text" 
                      readOnly
                      className={readOnlyClass}
                      value={prevAge} 
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                   <div>
                     <label className={labelClass}>Peso (g)</label>
                     <input 
                       type="number" placeholder="0000"
                       className={inputBaseClass}
                       value={data.prev.weight}
                       onChange={(e) => handleChange('prev', 'weight', Number(e.target.value))}
                     />
                     {renderZScore(zScores.prev.weight)}
                   </div>
                   <div>
                     <label className={labelClass}>Altura (cm)</label>
                     <input 
                       type="number" placeholder="00.0" step="0.1"
                       className={inputBaseClass}
                       value={data.prev.height}
                       onChange={(e) => handleChange('prev', 'height', Number(e.target.value))}
                     />
                     {renderZScore(zScores.prev.height)}
                   </div>
                   <div>
                     <label className={labelClass}>PC (cm)</label>
                     <input 
                       type="number" placeholder="00.0" step="0.1"
                       className={inputBaseClass}
                       value={data.prev.cephalic}
                       onChange={(e) => handleChange('prev', 'cephalic', Number(e.target.value))}
                     />
                     {renderZScore(zScores.prev.cephalic)}
                   </div>
                   <div>
                     <label className={labelClass}>IMC</label>
                     <div className="relative">
                        <input 
                          type="text" 
                          readOnly
                          className={readOnlyClass}
                          value={calculateBMI(data.prev.weight, data.prev.height)}
                          placeholder="-"
                        />
                     </div>
                     {renderZScore(zScores.prev.bmi)}
                   </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Coluna 2: Consulta Atual */}
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-teal-300 to-emerald-300 rounded-2xl blur opacity-30 group-hover:opacity-50 transition duration-200"></div>
          <div className="relative bg-teal-50/60 p-4 rounded-xl border border-teal-100">
             <div className="flex items-center gap-2 mb-4 pb-2 border-b border-teal-200">
              <div className="bg-teal-100 p-1 rounded-md">
                <CalendarDaysIcon className="h-4 w-4 text-teal-700" />
              </div>
              <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wider">Consulta Atual</h3>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-[1.5fr_1fr] gap-3">
                <div>
                  <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Data</label>
                  <input 
                    type="date"
                    className={dateInputClass + " border-teal-200 focus:border-teal-500 focus:ring-teal-500"}
                    onClick={handleDateClick}
                    value={data.curr.date}
                    onChange={(e) => handleChange('curr', 'date', e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Idade</label>
                  <input 
                    type="text" 
                    readOnly
                    className={readOnlyClassTeal}
                    value={currAge} 
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                 <div>
                   <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Peso (g)</label>
                   <input 
                     type="number" placeholder="0000"
                     className={inputBaseClass + " border-teal-200 focus:border-teal-500 focus:ring-teal-500 font-medium text-teal-900"}
                     value={data.curr.weight}
                     onChange={(e) => handleChange('curr', 'weight', Number(e.target.value))}
                   />
                   {renderZScore(zScores.curr.weight)}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">Altura (cm)</label>
                   <input 
                     type="number" placeholder="00.0" step="0.1"
                     className={inputBaseClass + " border-teal-200 focus:border-teal-500 focus:ring-teal-500 font-medium text-teal-900"}
                     value={data.curr.height}
                     onChange={(e) => handleChange('curr', 'height', Number(e.target.value))}
                   />
                   {renderZScore(zScores.curr.height)}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">PC (cm)</label>
                   <input 
                     type="number" placeholder="00.0" step="0.1"
                     className={inputBaseClass + " border-teal-200 focus:border-teal-500 focus:ring-teal-500 font-medium text-teal-900"}
                     value={data.curr.cephalic}
                     onChange={(e) => handleChange('curr', 'cephalic', Number(e.target.value))}
                   />
                   {renderZScore(zScores.curr.cephalic)}
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-teal-800 uppercase tracking-wide mb-1">IMC</label>
                   <div className="relative">
                     <input 
                       type="text" 
                       readOnly
                       className={readOnlyClassTeal}
                       value={calculateBMI(data.curr.weight, data.curr.height)}
                       placeholder="-"
                     />
                   </div>
                   {renderZScore(zScores.curr.bmi)}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Novo Quadro de Resumo de Crescimento (Deltas) */}
      {!data.isFirstConsultation && (
        <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-200 to-blue-200 rounded-2xl blur opacity-20 group-hover:opacity-40 transition duration-200"></div>
            <div className="relative bg-indigo-50/40 p-4 rounded-xl border border-indigo-100">
              <div className="flex items-center gap-2 mb-4 pb-2 border-b border-indigo-200/60">
                <div className="bg-indigo-100 p-1 rounded-md">
                  <ChartBarIcon className="h-4 w-4 text-indigo-600" />
                </div>
                <h3 className="text-xs font-bold text-indigo-800 uppercase tracking-wider">Resumo (Deltas)</h3>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Card Peso */}
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between">
                   <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Ganho de Peso</span>
                   <div className="flex items-center gap-1">
                     {growthAnalysis.weightDiff >= 0 ? 
                       <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" /> : 
                       <ArrowTrendingDownIcon className="h-4 w-4 text-rose-500" />
                     }
                     <span className={`text-sm font-bold ${growthAnalysis.weightDiff >= 0 ? 'text-gray-900' : 'text-rose-600'}`}>
                       {growthAnalysis.weightDiff > 0 ? '+' : ''}{growthAnalysis.weightDiff}g
                     </span>
                   </div>
                </div>

                {/* Card Altura */}
                <div className="bg-white p-3 rounded-lg border border-indigo-100 shadow-sm flex flex-col justify-between">
                   <span className="text-[10px] font-bold text-gray-500 uppercase mb-1">Crescimento</span>
                   <div className="flex items-center gap-1">
                     {growthAnalysis.heightDiff >= 0 ? 
                       <ArrowTrendingUpIcon className="h-4 w-4 text-emerald-500" /> : 
                       <MinusIcon className="h-4 w-4 text-gray-400" />
                     }
                     <span className="text-sm font-bold text-gray-900">
                       {growthAnalysis.heightDiff > 0 ? '+' : ''}{growthAnalysis.heightDiff.toFixed(1).replace('.', ',')} cm
                     </span>
                   </div>
                </div>

                {/* Texto de Análise Completa */}
                <div className="col-span-2 bg-white/50 p-2 rounded border border-indigo-50 text-[10px] text-gray-600">
                    <p>{growthAnalysis.weightText}</p>
                </div>
              </div>
            </div>
        </div>
      )}
    </div>
  );
};
