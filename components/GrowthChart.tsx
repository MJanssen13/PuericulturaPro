import React, { useEffect, useState } from 'react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { Consultation, Sex, ReferenceDataPoint } from '../types';
import { getReferenceTable } from '../services/referenceData';
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
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
        Carregando dados de referência...
      </div>
    );
  }

  // Generate chart data based on reference points
  // We calculate DELTAS for Stacked Areas to create bands between lines
  const chartData = refTable.map(point => {
    const day = point.age_days;
    
    // Logic for Bands:
    // Standard: 
    // Red: < Z-3 and > Z+3
    // Yellow: Z-3 to Z-2 and Z+2 to Z+3
    // Green: Z-2 to Z+2
    
    // BMI Exception:
    // Green: Z-2 to Z+1
    // Yellow: Z+1 to Z+2 (Risk) AND Z+2 to Z+3 (Overweight)
    
    const isBMI = measure === 'bmi';

    // Base: From 0 (or very low) to Z-4. Using Z-4 as bottom line visible.
    // Stack order: 
    // 1. Invisible Base (up to Z-4)
    // 2. Red Band (Z-4 to Z-3)
    // 3. Yellow Band (Z-3 to Z-2)
    // 4. Green Band (Z-2 to Z+2 OR Z-2 to Z+1 for BMI)
    // 5. Yellow Band (Z+2 to Z+3 OR Z+1 to Z+3 for BMI)
    // 6. Red Band (Z+3 to Z+4)
    
    const diff = (high: number, low: number) => high - low;

    // Calculate band heights (deltas)
    const band_red_neg = diff(point.z_neg_3, point.z_neg_4);
    const band_yellow_neg = diff(point.z_neg_2, point.z_neg_3);
    
    let band_green = 0;
    let band_yellow_pos = 0;
    
    if (isBMI) {
        // BMI Green: Z-2 to Z+1
        band_green = diff(point.z_pos_1, point.z_neg_2);
        // BMI Yellow: Z+1 to Z+3 (Combines Risk + Overweight zones)
        band_yellow_pos = diff(point.z_pos_3, point.z_pos_1);
    } else {
        // Standard Green: Z-2 to Z+2
        band_green = diff(point.z_pos_2, point.z_neg_2);
        // Standard Yellow: Z+2 to Z+3
        band_yellow_pos = diff(point.z_pos_3, point.z_pos_2);
    }

    const band_red_pos = diff(point.z_pos_4, point.z_pos_3);

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
      
      // Stacked Area Deltas
      area_base: point.z_neg_4, // Invisible spacer
      area_red_neg: band_red_neg,
      area_yellow_neg: band_yellow_neg,
      area_green: band_green,
      area_yellow_pos: band_yellow_pos,
      area_red_pos: band_red_pos
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

    return {
      day: ageDays,
      patientVal: val,
      isPatient: true
    };
  }).filter(Boolean);

  // Combine data
  const combinedData = [...chartData, ...patientPoints].sort((a: any, b: any) => a.day - b.day);

  // Filter duplicates
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

  // COLORS CONFIGURATION
  const C_RED = "#ef4444";    // Z 4
  const C_AMBER = "#f59e0b";  // Z 3
  const C_GREEN = "#22c55e";  // Z 0, 1, 2
  const C_LIGHT_GREEN = "#86efac"; // Z 1

  // Fill Colors (lighter)
  const FILL_RED = "#fee2e2";
  const FILL_AMBER = "#fef3c7";
  const FILL_GREEN = "#dcfce7";

  const getLineColor = (zType: string) => {
     // Exception: BMI Z+2 is Yellow (Overweight boundary)
     if (measure === 'bmi' && zType === 'pos_2') return C_AMBER;
     
     switch (zType) {
        case 'pos_4': case 'neg_4': return C_RED;
        case 'pos_3': case 'neg_3': return C_AMBER;
        case 'pos_2': case 'neg_2': return C_GREEN;
        case 'pos_1': case 'neg_1': return C_GREEN;
        case 'zero': return "#15803d"; // Darker green for mean
        default: return "#ccc";
     }
  };

  // TOOLTIP NAMES MAPPING
  const nameMap: Record<string, string> = {
    z_neg_4: 'Z -4', z_neg_3: 'Z -3', z_neg_2: 'Z -2', z_neg_1: 'Z -1',
    z_0: 'Média (0)',
    z_pos_1: 'Z +1', z_pos_2: 'Z +2', z_pos_3: 'Z +3', z_pos_4: 'Z +4',
    patientVal: 'Paciente'
  };

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-2">
          <h4 className="font-bold text-gray-700 uppercase text-sm">{getTitle()}</h4>
          <div className="flex items-center gap-2 text-[10px]">
            <span className="w-3 h-3 bg-green-100 border border-green-400 rounded-sm"></span> <span className="text-gray-500">Adequado</span>
            <span className="w-3 h-3 bg-amber-100 border border-amber-400 rounded-sm ml-1"></span> <span className="text-gray-500">Alerta</span>
            <span className="w-3 h-3 bg-red-100 border border-red-400 rounded-sm ml-1"></span> <span className="text-gray-500">Crítico</span>
          </div>
      </div>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={displayedData} margin={{ top: 10, right: 10, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            type="number" 
            domain={[0, maxAgeDays || 'auto']}
            allowDataOverflow={!!maxAgeDays}
            tick={{fontSize: 10}}
            tickFormatter={(val) => {
               const months = Math.floor(val / 30.44);
               const years = Math.floor(months / 12);
               if (years >= 1 && months % 12 === 0) return `${years}a`;
               return `${months}m`;
            }}
          />
          <YAxis domain={['auto', 'auto']} width={35} tick={{fontSize: 10}} />
          <Tooltip 
            contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '8px' }}
            formatter={(value: number, name: string) => {
                // Hide areas and z_0 (Média)
                if (String(name).includes('area') || name === 'z_0') return [null, null];
                return [value && value.toFixed ? value.toFixed(2) : value, nameMap[name] || name];
            }}
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
            itemSorter={(item: any) => {
                const order = [
                    'patientVal',
                    'z_pos_4', 'z_pos_3', 'z_pos_2', 'z_pos_1',
                    'z_neg_1', 'z_neg_2', 'z_neg_3', 'z_neg_4'
                ];
                const idx = order.indexOf(item.name as string);
                return idx === -1 ? 100 : idx;
            }}
            filterNull={true}
          />
          
          {/* STACKED AREAS FOR BACKGROUND COLOR BANDS */}
          <Area type="monotone" dataKey="area_base" stackId="bands" stroke="none" fill="none" isAnimationActive={false} />
          
          {/* Red Band (Z-4 to Z-3) */}
          <Area type="monotone" dataKey="area_red_neg" stackId="bands" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />
          
          {/* Yellow Band (Z-3 to Z-2) */}
          <Area type="monotone" dataKey="area_yellow_neg" stackId="bands" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          
          {/* Green Band (Z-2 to Z+2 OR Z+1 for BMI) */}
          <Area type="monotone" dataKey="area_green" stackId="bands" stroke="none" fill={FILL_GREEN} fillOpacity={0.6} isAnimationActive={false} />
          
          {/* Yellow Band (Z+2 to Z+3 OR Z+1 to Z+3 for BMI) */}
          <Area type="monotone" dataKey="area_yellow_pos" stackId="bands" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          
          {/* Red Band (Z+3 to Z+4) */}
          <Area type="monotone" dataKey="area_red_pos" stackId="bands" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />

          {/* LINES */}
          <Line type="monotone" dataKey="z_pos_4" stroke={getLineColor('pos_4')} strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="z_pos_4" />
          <Line type="monotone" dataKey="z_pos_3" stroke={getLineColor('pos_3')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_pos_3" />
          <Line type="monotone" dataKey="z_pos_2" stroke={getLineColor('pos_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_pos_2" />
          <Line type="monotone" dataKey="z_pos_1" stroke={getLineColor('pos_1')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_pos_1" />
          
          <Line type="monotone" dataKey="z_0"     stroke={getLineColor('zero')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_0" />
          
          <Line type="monotone" dataKey="z_neg_1" stroke={getLineColor('neg_1')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_neg_1" />
          <Line type="monotone" dataKey="z_neg_2" stroke={getLineColor('neg_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_neg_2" />
          <Line type="monotone" dataKey="z_neg_3" stroke={getLineColor('neg_3')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_neg_3" />
          <Line type="monotone" dataKey="z_neg_4" stroke={getLineColor('neg_4')} strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="z_neg_4" />

          <Line 
            type="linear" 
            dataKey="patientVal" 
            stroke="#0f172a" 
            strokeWidth={3} 
            dot={{ r: 4, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} 
            activeDot={{ r: 6 }}
            connectNulls 
            name="patientVal"
            isAnimationActive={true}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};