
import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Consultation, Sex, ReferenceDataPoint } from '../types';
import { getReferenceTable, getInterpolatedReference } from '../services/referenceData';
import { calculateAgeInDays } from '../services/puericulturaLogic';

interface Props {
  birthDate: string;
  sex: Sex;
  consultations: Consultation[];
  measure: 'weight' | 'height' | 'bmi' | 'cephalic';
  maxAgeDays?: number | null;
}

export const GrowthChart: React.FC<Props> = ({ birthDate, sex, consultations, measure, maxAgeDays }) => {
  const [refTable, setRefTable] = useState<ReferenceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    getReferenceTable(measure, sex).then(data => {
      if (isMounted) {
        setRefTable(data);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, [measure, sex]);
  
  if (loading) {
    return (
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm flex items-center justify-center text-gray-400">
        Carregando dados de referência...
      </div>
    );
  }

  // Generate chart data based on reference points
  const chartData = refTable.map(point => {
    const day = point.age_days;
    return {
      day,
      z_neg_4: point.z_neg_4,
      z_neg_3: point.z_neg_3,
      z_neg_2: point.z_neg_2,
      z_neg_1: point.z_neg_1,
      z_0: point.z_0,
      z_pos_1: point.z_pos_1,
      z_pos_2: point.z_pos_2,
      z_pos_3: point.z_pos_3,
      z_pos_4: point.z_pos_4,
    };
  });

  // Patient points interpolation
  const patientPoints = consultations.map(c => {
    const ageDays = calculateAgeInDays(birthDate, c.date);
    let val = 0;
    
    if (measure === 'weight') val = c.weight_grams; 
    else if (measure === 'height') val = c.height_cm;
    else if (measure === 'cephalic') val = c.cephalic_cm;
    else if (measure === 'bmi') {
         if (c.weight_grams && c.height_cm) {
             val = (c.weight_grams / 1000) / Math.pow(c.height_cm / 100, 2);
         }
    }
    
    // Skip if val is invalid
    if (!val) return null;

    const ref = getInterpolatedReference(refTable, ageDays);
    
    return {
      day: ageDays,
      patientVal: val,
      z_neg_3: ref?.z_neg_3,
      z_0: ref?.z_0,
      z_pos_3: ref?.z_pos_3,
      isPatient: true
    };
  }).filter(Boolean);

  // Combine data
  const combinedData = [...chartData, ...patientPoints].sort((a: any, b: any) => a.day - b.day);

  // Filter duplicates to avoid React keys issues or rendering glitches
  const uniqueData = combinedData.reduce((acc: any[], current) => {
    const x = acc.find((item: any) => item.day === current.day);
    if (!x) {
      return acc.concat([current]);
    } else {
      if (current.isPatient) {
        x.patientVal = current.patientVal;
      }
      return acc;
    }
  }, []);

  // Filtra os dados para o período visível para que o eixo Y se adapte automaticamente (Auto Scale)
  const displayedData = maxAgeDays 
    ? uniqueData.filter((d: any) => d.day <= maxAgeDays)
    : uniqueData;

  const getTitle = () => {
    switch(measure) {
      case 'weight': return 'Peso x Idade';
      case 'height': return 'Estatura x Idade';
      case 'cephalic': return 'Perímetro Cefálico x Idade';
      case 'bmi': return 'IMC x Idade';
      default: return '';
    }
  };

  return (
    <div className="w-full h-[500px] bg-white p-4 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
          <h4 className="font-bold text-gray-700 uppercase">{getTitle()}</h4>
          <div className="flex items-center gap-2 text-xs">
            <span className="w-3 h-3 bg-emerald-500 rounded-full"></span> <span className="text-gray-500">Média</span>
            <span className="w-3 h-3 bg-rose-300 rounded-full ml-2"></span> <span className="text-gray-500">Desvios</span>
            <span className="w-3 h-3 bg-slate-900 rounded-full ml-2"></span> <span className="text-gray-500 font-bold">Paciente</span>
          </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={displayedData} margin={{ top: 10, right: 30, bottom: 20, left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            type="number" 
            domain={[0, maxAgeDays || 'auto']}
            allowDataOverflow={!!maxAgeDays}
            tickFormatter={(val) => {
               const months = Math.floor(val / 30.44);
               const years = Math.floor(months / 12);
               if (years >= 1 && months % 12 === 0) return `${years}a`;
               return `${months}m`;
            }}
            label={{ value: 'Idade', position: 'insideBottomRight', offset: -10 }}
          />
          <YAxis domain={['auto', 'auto']} width={40} />
          <Tooltip 
            labelFormatter={(val) => {
                const days = Number(val);
                const months = Math.floor(days / 30.44);
                if (months >= 12) {
                    const y = Math.floor(months / 12);
                    const m = months % 12;
                    return `${y}a ${m}m (${days}d)`;
                }
                return `${months} meses (${days}d)`;
            }}
          />
          
          <Line type="monotone" dataKey="z_pos_4" stroke="#fecaca" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_pos_3" stroke="#fca5a5" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_pos_2" stroke="#fda4af" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_pos_1" stroke="#ffe4e6" strokeWidth={1} dot={false} isAnimationActive={false} />
          
          <Line type="monotone" dataKey="z_0"     stroke="#22c55e" strokeWidth={2} dot={false} isAnimationActive={false} />
          
          <Line type="monotone" dataKey="z_neg_1" stroke="#ffe4e6" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_neg_2" stroke="#fda4af" strokeWidth={2} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_neg_3" stroke="#fca5a5" strokeWidth={1} dot={false} isAnimationActive={false} />
          <Line type="monotone" dataKey="z_neg_4" stroke="#fecaca" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />

          <Line 
            type="linear" 
            dataKey="patientVal" 
            stroke="#0f172a" 
            strokeWidth={3} 
            dot={{ r: 5, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} 
            activeDot={{ r: 7 }}
            connectNulls 
            name="Paciente"
            isAnimationActive={true}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
