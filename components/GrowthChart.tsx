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
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
        Carregando dados de referência...
      </div>
    );
  }

  // Helper to transform a ReferenceDataPoint into the chart format (with ranges)
  const transformPoint = (point: ReferenceDataPoint) => {
    const isBMI = measure === 'bmi';

    // Range Areas (Floating bands)
    // Instead of stacking from 0, we define [min, max] for each band
    
    // Red Negative: Z-4 to Z-3
    const range_red_neg = [point.z_neg_4, point.z_neg_3];
    
    // Yellow Negative: Z-3 to Z-2
    const range_yellow_neg = [point.z_neg_3, point.z_neg_2];
    
    // Green: Z-2 to Z+2 (or Z+1 for BMI)
    // BMI Exception: Green is Z-2 to Z+1
    const range_green = isBMI 
      ? [point.z_neg_2, point.z_pos_1]
      : [point.z_neg_2, point.z_pos_2];

    // Yellow Positive: 
    // Standard: Z+2 to Z+3
    // BMI: Z+1 to Z+3 (Risk + Overweight merged for visual simplicity in yellow)
    const range_yellow_pos = isBMI
      ? [point.z_pos_1, point.z_pos_3]
      : [point.z_pos_2, point.z_pos_3];

    // Red Positive: Z+3 to Z+4
    const range_red_pos = [point.z_pos_3, point.z_pos_4];

    return {
      day: point.age_days,
      z_neg_4: point.z_neg_4,
      z_neg_3: point.z_neg_3,
      z_neg_2: point.z_neg_2,
      z_neg_1: point.z_neg_1,
      z_0: point.z_0,
      z_pos_1: point.z_pos_1,
      z_pos_2: point.z_pos_2,
      z_pos_3: point.z_pos_3,
      z_pos_4: point.z_pos_4,
      
      range_red_neg,
      range_yellow_neg,
      range_green,
      range_yellow_pos,
      range_red_pos
    };
  };

  // 1. Base Reference Data
  const chartData = refTable.map(transformPoint);

  // 2. Patient Data (Interpolated)
  // We map patient points to the same structure so the background bands are continuous
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

    // Get reference data for this exact day to fill the background
    const refPoint = getInterpolatedReference(refTable, ageDays);
    const baseData = refPoint ? transformPoint(refPoint) : {};

    return {
      ...baseData,
      day: ageDays, // Ensure exact day is used
      patientVal: val,
      isPatient: true
    };
  }).filter(Boolean);

  // 3. Combine and Sort
  // We prioritize patient points if they exist on the same day to show the dot
  const allPoints = [...chartData, ...patientPoints].sort((a: any, b: any) => a.day - b.day);
  
  // Deduplicate by day (preferring patient data)
  const uniqueData = allPoints.reduce((acc: any[], current) => {
    const existingIndex = acc.findIndex((item: any) => item.day === current.day);
    if (existingIndex === -1) {
      return acc.concat([current]);
    } else {
      // If current has patient data, overwrite/merge
      if (current.isPatient) {
        acc[existingIndex] = { ...acc[existingIndex], ...current };
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

  // Fill Colors (lighter)
  const FILL_RED = "#fee2e2";
  const FILL_AMBER = "#fef3c7";
  const FILL_GREEN = "#dcfce7";

  const getLineColor = (zType: string) => {
     if (measure === 'bmi' && zType === 'pos_2') return C_AMBER;
     switch (zType) {
        case 'pos_4': case 'neg_4': return C_RED;
        case 'pos_3': case 'neg_3': return C_AMBER;
        case 'pos_2': case 'neg_2': return C_GREEN;
        case 'pos_1': case 'neg_1': return C_GREEN;
        case 'zero': return "#15803d";
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

  // Custom Label Component for Patient Data
  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === null || value === undefined) return null;
    
    let text = String(value);
    if (measure === 'bmi') text = Number(value).toFixed(2).replace('.', ',');
    else if (measure === 'weight') text = Math.round(Number(value)).toString();
    else text = Number(value).toFixed(1).replace('.', ',');

    return (
      <g>
        <rect x={x - 16} y={y - 22} width={32} height={16} rx={4} fill="white" fillOpacity={0.8} />
        <text x={x} y={y} dy={-10} fill="#0f172a" fontSize={11} fontWeight={700} textAnchor="middle" style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
          {text}
        </text>
      </g>
    );
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
        <ComposedChart data={displayedData} margin={{ top: 20, right: 20, bottom: 10, left: 0 }}>
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
          {/* 
            Using dataMin / dataMax allows the chart to scale to the data range 
            (e.g. Height starting at 45cm instead of 0) 
          */}
          <YAxis 
             domain={['dataMin', 'dataMax']} 
             width={35} 
             tick={{fontSize: 10}} 
          />
          <Tooltip 
            contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '8px' }}
            formatter={(value: any, name: string) => {
                // Hide range arrays and z_0 (Mean) from tooltip
                if (Array.isArray(value) || String(name).includes('range') || name === 'z_0') return [null, null];
                const valNum = Number(value);
                return [valNum && valNum.toFixed ? valNum.toFixed(2) : value, nameMap[name] || name];
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
          
          {/* RANGE AREAS (Floating bands) */}
          <Area type="monotone" dataKey="range_red_neg" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_yellow_neg" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_green" stroke="none" fill={FILL_GREEN} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_yellow_pos" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_red_pos" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />

          {/* REFERENCE LINES */}
          <Line type="monotone" dataKey="z_pos_4" stroke={getLineColor('pos_4')} strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="z_pos_4" />
          <Line type="monotone" dataKey="z_pos_3" stroke={getLineColor('pos_3')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_pos_3" />
          <Line type="monotone" dataKey="z_pos_2" stroke={getLineColor('pos_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_pos_2" />
          <Line type="monotone" dataKey="z_pos_1" stroke={getLineColor('pos_1')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_pos_1" />
          
          {/* Mean Line - Hidden from Tooltip via formatter, but visible on chart */}
          <Line type="monotone" dataKey="z_0"     stroke={getLineColor('zero')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_0" />
          
          <Line type="monotone" dataKey="z_neg_1" stroke={getLineColor('neg_1')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_neg_1" />
          <Line type="monotone" dataKey="z_neg_2" stroke={getLineColor('neg_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_neg_2" />
          <Line type="monotone" dataKey="z_neg_3" stroke={getLineColor('neg_3')} strokeWidth={1} dot={false} isAnimationActive={false} name="z_neg_3" />
          <Line type="monotone" dataKey="z_neg_4" stroke={getLineColor('neg_4')} strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} name="z_neg_4" />

          {/* PATIENT LINE */}
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
            label={<CustomLabel />}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};
