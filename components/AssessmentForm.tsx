
import React, { useState, useEffect } from 'react';
import { AssessmentData, Sex } from '../types';
import { CalendarDaysIcon, UserIcon } from '@heroicons/react/24/outline';
import { evaluateZScore, calculateAgeInDays, formatAgeString } from '../services/puericulturaLogic';

interface Props {
  data: AssessmentData;
  onChange: (data: AssessmentData) => void;
}

export const AssessmentForm: React.FC<Props> = ({ data, onChange }) => {
  
  const [zScores, setZScores] = useState({
    prev: { weight: '', height: '', cephalic: '', bmi: '' },
    curr: { weight: '', height: '', cephalic: '', bmi: '' }
  });

  const prevAge = formatAgeString(calculateAgeInDays(data.birthDate, data.prev.date));
  const currAge = formatAgeString(calculateAgeInDays(data.birthDate, data.curr.date));

  useEffect(() => {
    const updateData = async () => {
        const calcBMI = (w: number | '', h: number | '') => (Number(w) && Number(h)) ? (Number(w) / 1000) / Math.pow(Number(h) / 100, 2) : 0;
        const prevBMI = calcBMI(data.prev.weight, data.prev.height);
        const currBMI = calcBMI(data.curr.weight, data.curr.height);

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
    };
    updateData();
  }, [data]);

  const handleChange = (section: 'prev' | 'curr' | 'root', field: string, value: any) => {
    if (section === 'root') {
      onChange({ ...data, [field]: value });
    } else {
      onChange({ ...data, [section]: { ...data[section], [field]: value } });
    }
  };

  const calculateBMI = (weight: number | '', height: number | '') => {
    const w = Number(weight);
    const h = Number(height);
    if (!w || !h) return '-';
    const bmi = (w / 1000) / Math.pow(h / 100, 2);
    return bmi.toFixed(2).replace('.', ',');
  };

  // Compact Input Styles
  const cleanInputClass = `
    block w-full rounded-md border-gray-300 bg-white 
    py-1.5 px-2.5 text-sm text-gray-900 
    border shadow-sm
    placeholder:text-gray-300
    focus:border-teal-500 focus:ring-1 focus:ring-teal-500 focus:outline-none
    [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none
  `;

  const labelClass = "block text-[10px] font-bold text-slate-500 uppercase mb-1 ml-0.5";

  const renderZ = (val: string) => {
    if (!val || val === 'N/A') return null;

    let colorStyles = "border-gray-200 bg-gray-50 text-gray-600";
    
    if (val.includes("Adequado") || val.includes("Eutrofia") || val.includes("Entre -1 e 0") || val.includes("Entre 0 e +1")) {
        colorStyles = "border-emerald-200 bg-emerald-50 text-emerald-700";
    } else if (val.includes("Risco") || val.includes("Sobrepeso") || val.includes("Entre +1 e +2") || val.includes("Entre -2 e -1")) {
        colorStyles = "border-amber-200 bg-amber-50 text-amber-700";
    } else {
        colorStyles = "border-rose-200 bg-rose-50 text-rose-700";
    }

    return (
      <div className={`mt-1 w-full rounded border py-1 px-2 text-xs font-bold shadow-sm ${colorStyles}`}>
        Z: {val}
      </div>
    );
  };

  return (
    <div className="space-y-4 font-inter">
      
      {/* CARD PACIENTE */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
           <div className="p-1 bg-slate-100 rounded">
             <UserIcon className="w-3.5 h-3.5 text-slate-600" />
           </div>
           <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Dados do Paciente</h3>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className={labelClass}>Data de Nascimento</label>
            <input 
              type="date"
              className={cleanInputClass}
              value={data.birthDate}
              onChange={(e) => handleChange('root', 'birthDate', e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Sexo</label>
            <div className="flex gap-2">
              <button 
                onClick={() => handleChange('root', 'sex', 'Masculino')}
                className={`flex-1 py-1.5 rounded-md border text-xs font-semibold transition-all ${data.sex === 'Masculino' ? 'bg-blue-50 border-blue-200 text-blue-700 ring-1 ring-blue-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                Masculino
              </button>
              <button 
                 onClick={() => handleChange('root', 'sex', 'Feminino')}
                 className={`flex-1 py-1.5 rounded-md border text-xs font-semibold transition-all ${data.sex === 'Feminino' ? 'bg-pink-50 border-pink-200 text-pink-700 ring-1 ring-pink-200' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                Feminino
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="firstConsult"
              className="h-3.5 w-3.5 text-teal-600 focus:ring-teal-500 border-gray-300 rounded cursor-pointer"
              checked={!!data.isFirstConsultation}
              onChange={(e) => handleChange('root', 'isFirstConsultation', e.target.checked)}
            />
            <label htmlFor="firstConsult" className="text-xs text-gray-600 font-medium cursor-pointer select-none">
              É a primeira consulta
            </label>
          </div>
        </div>
      </div>

      {/* CONSULTA ANTERIOR */}
      {!data.isFirstConsultation && (
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
           <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100">
              <div className="p-1 bg-slate-100 rounded">
                <CalendarDaysIcon className="w-3.5 h-3.5 text-slate-600" />
              </div>
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Última Consulta</h3>
           </div>

           <div className="space-y-3">
              {/* ROW 1: DATE | AGE */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Data</label>
                  <input 
                    type="date"
                    className={cleanInputClass}
                    value={data.prev.date}
                    onChange={(e) => handleChange('prev', 'date', e.target.value)}
                  />
                </div>
                <div>
                  <label className={labelClass}>Idade</label>
                  <div className="block w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-sm text-slate-500 cursor-default shadow-sm">
                    {prevAge}
                  </div>
                </div>
              </div>
              
              {/* ROW 2: WEIGHT | HEIGHT */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>Peso (g)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 3500"
                    className={cleanInputClass}
                    value={data.prev.weight}
                    onChange={(e) => handleChange('prev', 'weight', Number(e.target.value))}
                  />
                  {renderZ(zScores.prev.weight)}
                </div>
                <div>
                  <label className={labelClass}>Altura (cm)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 50" step="0.1"
                    className={cleanInputClass}
                    value={data.prev.height}
                    onChange={(e) => handleChange('prev', 'height', Number(e.target.value))}
                  />
                  {renderZ(zScores.prev.height)}
                </div>
              </div>

              {/* ROW 3: CEPHALIC | BMI */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>PC (cm)</label>
                  <input 
                    type="number" 
                    placeholder="ex: 35" step="0.1"
                    className={cleanInputClass}
                    value={data.prev.cephalic}
                    onChange={(e) => handleChange('prev', 'cephalic', Number(e.target.value))}
                  />
                  {renderZ(zScores.prev.cephalic)}
                </div>
                <div>
                   <label className={labelClass}>IMC</label>
                   <div className="block w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-sm text-slate-600 cursor-default shadow-sm">
                     {calculateBMI(data.prev.weight, data.prev.height)}
                   </div>
                   {renderZ(zScores.prev.bmi)}
                </div>
              </div>
           </div>
        </div>
      )}

      {/* CONSULTA ATUAL */}
      <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-[0_2px_8px_rgba(20,184,166,0.1)] ring-1 ring-teal-500/20">
        <div className="flex items-center gap-2 mb-3 pb-2 border-b border-teal-100">
          <div className="p-1 bg-teal-100 rounded">
            <CalendarDaysIcon className="w-3.5 h-3.5 text-teal-700" />
          </div>
          <h3 className="text-xs font-bold text-teal-800 uppercase tracking-wide">Consulta Atual</h3>
        </div>

        <div className="space-y-3">
            {/* ROW 1: DATE | AGE */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Data</label>
                <input 
                  type="date"
                  className={cleanInputClass}
                  value={data.curr.date}
                  onChange={(e) => handleChange('curr', 'date', e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Idade</label>
                <div className="block w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-sm text-slate-500 cursor-default shadow-sm">
                  {currAge}
                </div>
              </div>
            </div>
            
            {/* ROW 2: WEIGHT | HEIGHT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Peso (g)</label>
                <input 
                  type="number" 
                  placeholder="ex: 4000"
                  className={cleanInputClass}
                  value={data.curr.weight}
                  onChange={(e) => handleChange('curr', 'weight', Number(e.target.value))}
                />
                {renderZ(zScores.curr.weight)}
              </div>
              <div>
                <label className={labelClass}>Altura (cm)</label>
                <input 
                  type="number" 
                  placeholder="ex: 52" step="0.1"
                  className={cleanInputClass}
                  value={data.curr.height}
                  onChange={(e) => handleChange('curr', 'height', Number(e.target.value))}
                />
                {renderZ(zScores.curr.height)}
              </div>
            </div>

            {/* ROW 3: CEPHALIC | BMI */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>PC (cm)</label>
                <input 
                  type="number" 
                  placeholder="ex: 37" step="0.1"
                  className={cleanInputClass}
                  value={data.curr.cephalic}
                  onChange={(e) => handleChange('curr', 'cephalic', Number(e.target.value))}
                />
                {renderZ(zScores.curr.cephalic)}
              </div>
              <div>
                   <label className={labelClass}>IMC</label>
                   <div className="block w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 px-2.5 text-sm text-slate-600 cursor-default shadow-sm">
                     {calculateBMI(data.curr.weight, data.curr.height)}
                   </div>
                   {renderZ(zScores.curr.bmi)}
              </div>
            </div>
        </div>
      </div>

    </div>
  );
};
