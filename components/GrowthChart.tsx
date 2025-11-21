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
import { calculateAgeInDays, calculatePostConceptualAgeDays, calculateCorrectedAgeDays, formatAgeString } from '../services/puericulturaLogic';

interface Props {
  birthDate: string;
  sex: Sex;
  consultations: Consultation[];
  measure: 'weight' | 'height' | 'bmi' | 'cephalic';
  maxAgeDays?: number | null;
  isPremature?: boolean;
  gestationalAgeWeeks?: number | '';
  gestationalAgeDays?: number | '';
}

export const GrowthChart: React.FC<Props> = ({ 
  birthDate, sex, consultations, measure, maxAgeDays, isPremature, gestationalAgeWeeks, gestationalAgeDays
}) => {
  const [refTable, setRefTable] = useState<ReferenceDataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartMode, setChartMode] = useState<'term' | 'preterm'>('term');
  const [dataSource, setDataSource] = useState<'supabase' | 'mock' | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const gestAgeWeeksNum = Number(gestationalAgeWeeks);
    const gestAgeDaysNum = Number(gestationalAgeDays);
    const PRETERM_CHART_PCA_LIMIT_DAYS = 40 * 7; // 40 semanas

    // Decide mode based on the latest available data point or today.
    const latestConsultation = consultations.length > 0 ? consultations.reduce((a, b) => new Date(a.date) > new Date(b.date) ? a : b) : null;
    const latestDate = latestConsultation ? latestConsultation.date : new Date().toISOString().split('T')[0];
    
    const pcaDays = calculatePostConceptualAgeDays(birthDate, latestDate, gestAgeWeeksNum, gestAgeDaysNum);
    
    // Use preterm chart if patient is premature and latest data point is within Intergrowth range
    const usePretermChart = isPremature && gestAgeWeeksNum > 0 && pcaDays > 0 && pcaDays <= PRETERM_CHART_PCA_LIMIT_DAYS;
    
    const newMode = usePretermChart ? 'preterm' : 'term';
    setChartMode(newMode);

    const measureToFetch = newMode === 'preterm' ? `preterm_${measure}` : measure;
    
    getReferenceTable(measureToFetch as any, sex).then(result => {
      if (isMounted) {
        setRefTable(result.data);
        setDataSource(result.source);
        setLoading(false);
      }
    });
    
    return () => { isMounted = false; };
  }, [measure, sex, birthDate, isPremature, gestationalAgeWeeks, gestationalAgeDays, consultations]);

  if (loading) {
    return (
      <div className="w-full h-96 bg-white p-4 rounded-lg shadow-sm flex items-center justify-center text-gray-400 text-sm">
        Carregando dados de referência...
      </div>
    );
  }

  const getAgeForChart = (consultationDate: string): number => {
    const gestAgeWeeksNum = Number(gestationalAgeWeeks);
    const gestAgeDaysNum = Number(gestationalAgeDays);

    if (chartMode === 'preterm') {
        return calculatePostConceptualAgeDays(birthDate, consultationDate, gestAgeWeeksNum, gestAgeDaysNum);
    }
    if (isPremature) {
        return calculateCorrectedAgeDays(birthDate, consultationDate, gestAgeWeeksNum, gestAgeDaysNum);
    }
    return calculateAgeInDays(birthDate, consultationDate);
  };

  const transformPoint = (point: ReferenceDataPoint) => {
    const isBMI = measure === 'bmi';
    const range_green = isBMI ? [point.z_neg_2, point.z_pos_1] : [point.z_neg_2, point.z_pos_2];
    const range_yellow_pos = isBMI ? [point.z_pos_1, point.z_pos_3] : [point.z_pos_2, point.z_pos_3];

    return {
      day: point.age_days, z_neg_4: point.z_neg_4, z_neg_3: point.z_neg_3, z_neg_2: point.z_neg_2,
      z_neg_1: point.z_neg_1, z_0: point.z_0, z_pos_1: point.z_pos_1, z_pos_2: point.z_pos_2,
      z_pos_3: point.z_pos_3, z_pos_4: point.z_pos_4,
      range_red_neg: [point.z_neg_4, point.z_neg_3],
      range_yellow_neg: [point.z_neg_3, point.z_neg_2],
      range_green, range_yellow_pos,
      range_red_pos: [point.z_pos_3, point.z_pos_4],
    };
  };

  const chartData = refTable.map(transformPoint);

  const patientPoints = consultations.map(c => {
    const ageForChart = getAgeForChart(c.date);
    let val = 0;
    
    if (measure === 'weight') val = c.weight_grams; 
    else if (measure === 'height') val = c.height_cm;
    else if (measure === 'cephalic') val = c.cephalic_cm;
    else if (measure === 'bmi') {
         if (c.weight_grams && c.height_cm) {
             val = (c.weight_grams / 1000) / Math.pow(c.height_cm / 100, 2);
         }
    }
    
    if (!val) return null;

    const refPoint = getInterpolatedReference(refTable, ageForChart);
    const baseData = refPoint ? transformPoint(refPoint) : {};

    return { ...baseData, day: ageForChart, patientVal: val, isPatient: true };
  }).filter(Boolean);

  const allPoints = [...chartData, ...patientPoints].sort((a: any, b: any) => a.day - b.day);
  
  const uniqueData = allPoints.reduce((acc: any[], current) => {
    const existingIndex = acc.findIndex((item: any) => item.day === current.day);
    if (existingIndex === -1) {
      acc.push(current);
    } else if (current.isPatient) {
      acc[existingIndex] = { ...acc[existingIndex], ...current };
    }
    return acc;
  }, []);

  const displayedData = maxAgeDays && chartMode === 'term'
    ? uniqueData.filter((d: any) => d.day <= maxAgeDays)
    : uniqueData;

  const getTitle = () => {
    const baseTitle = measure === 'weight' ? 'Peso x Idade' : measure === 'height' ? 'Estatura x Idade' : measure === 'cephalic' ? 'Perímetro Cefálico x Idade' : 'IMC x Idade';
    if (chartMode === 'preterm') {
      return `${baseTitle} (Prematuro - INTERGROWTH-21)`;
    }
    if (isPremature) {
      return `${baseTitle} (OMS - Idade Corrigida)`;
    }
    return `${baseTitle} (OMS)`;
  };

  const C_RED = "#ef4444", C_AMBER = "#f59e0b", C_GREEN = "#22c55e";
  const FILL_RED = "#fee2e2", FILL_AMBER = "#fef3c7", FILL_GREEN = "#dcfce7";

  const getLineColor = (zType: string) => {
     if (measure === 'bmi' && zType === 'pos_2') return C_AMBER;
     if (zType.includes('3') || zType.includes('4')) return C_AMBER;
     return C_GREEN;
  };

  const nameMap: Record<string, string> = {
    z_neg_4: 'Z -4', z_neg_3: 'Z -3', z_neg_2: 'Z -2', z_neg_1: 'Z -1', z_0: 'Média (0)',
    z_pos_1: 'Z +1', z_pos_2: 'Z +2', z_pos_3: 'Z +3', z_pos_4: 'Z +4', patientVal: 'Paciente'
  };

  const CustomLabel = (props: any) => {
    const { x, y, value } = props;
    if (value === null || value === undefined) return null;
    const text = measure === 'bmi' ? Number(value).toFixed(2).replace('.', ',') : measure === 'weight' ? Math.round(Number(value)).toString() : Number(value).toFixed(1).replace('.', ',');
    return (
      <g>
        <rect x={x - 16} y={y - 22} width={32} height={16} rx={4} fill="white" fillOpacity={0.8} />
        <text x={x} y={y} dy={-10} fill="#0f172a" fontSize={11} fontWeight={700} textAnchor="middle" style={{ pointerEvents: 'none', textShadow: '0 1px 2px rgba(255,255,255,0.8)' }}>
          {text}
        </text>
      </g>
    );
  };
  
  const domainStart = chartMode === 'preterm' ? Math.floor(Number(gestationalAgeWeeks) * 7 + Number(gestationalAgeDays)) : 0;
  const domainEnd = chartMode === 'preterm' ? 40*7 : (maxAgeDays || 'auto');

  return (
    <div className="w-full h-full">
      <div className="flex justify-between items-center mb-2">
          <div className="flex items-center gap-3">
            <h4 className="font-bold text-gray-700 uppercase text-sm">{getTitle()}</h4>
            {dataSource && !loading && (
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${dataSource === 'supabase' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}`}>
                    {dataSource === 'supabase' ? 'Fonte: Supabase' : 'Fonte: Dados Locais'}
                </span>
            )}
          </div>
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
            dataKey="day" type="number" domain={[domainStart, domainEnd]} allowDataOverflow={true} tick={{fontSize: 10}}
            tickFormatter={(val) => {
              if (chartMode === 'preterm') {
                 const weeks = Math.floor(val / 7);
                 return `${weeks}s`;
              }
              const months = Math.floor(val / 30.44);
              const years = Math.floor(months / 12);
              if (years >= 1 && months % 12 === 0) return `${years}a`;
              return `${months}m`;
            }}
          />
          <YAxis domain={['dataMin', 'dataMax']} width={35} tick={{fontSize: 10}} />
          <Tooltip 
            contentStyle={{ fontSize: '12px', borderRadius: '8px', padding: '8px' }}
            formatter={(value: any, name: string) => {
                if (Array.isArray(value) || String(name).includes('range')) return [null, null];
                const valNum = Number(value);
                return [valNum?.toFixed ? valNum.toFixed(2) : value, nameMap[name] || name];
            }}
            labelFormatter={(val) => {
                const days = Number(val);
                if (chartMode === 'preterm') {
                  const weeks = Math.floor(days / 7);
                  const remDays = days % 7;
                  return `Idade Pós-Conceptual: ${weeks}s ${remDays}d`;
                }
                if (isPremature) {
                  return `Idade Corrigida: ${formatAgeString(days)}`;
                }
                const months = Math.floor(days / 30.44);
                if (months >= 12) { const y = Math.floor(months / 12); const m = months % 12; return `${y}a ${m}m (${days}d)`; }
                return `${months} meses (${days}d)`;
            }}
            itemSorter={(item: any) => {
                const order = ['patientVal', 'z_pos_4', 'z_pos_3', 'z_pos_2', 'z_pos_1', 'z_0', 'z_neg_1', 'z_neg_2', 'z_neg_3', 'z_neg_4'];
                return order.indexOf(item.name as string);
            }}
            filterNull={true}
          />
          
          <Area type="monotone" dataKey="range_red_neg" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_yellow_neg" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_green" stroke="none" fill={FILL_GREEN} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_yellow_pos" stroke="none" fill={FILL_AMBER} fillOpacity={0.6} isAnimationActive={false} />
          <Area type="monotone" dataKey="range_red_pos" stroke="none" fill={FILL_RED} fillOpacity={0.6} isAnimationActive={false} />

          <Line type="monotone" dataKey="z_pos_3" stroke={getLineColor('pos_3')} strokeWidth={1.5} dot={false} isAnimationActive={false} name="z_pos_3" />
          <Line type="monotone" dataKey="z_pos_2" stroke={getLineColor('pos_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_pos_2" />
          <Line type="monotone" dataKey="z_0" stroke="#15803d" strokeWidth={2} dot={false} isAnimationActive={false} name="z_0" />
          <Line type="monotone" dataKey="z_neg_2" stroke={getLineColor('neg_2')} strokeWidth={2} dot={false} isAnimationActive={false} name="z_neg_2" />
          <Line type="monotone" dataKey="z_neg_3" stroke={getLineColor('neg_3')} strokeWidth={1.5} dot={false} isAnimationActive={false} name="z_neg_3" />
          
          <Line type="linear" dataKey="patientVal" stroke="#0f172a" strokeWidth={3} dot={{ r: 4, fill: '#0f172a', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls name="patientVal" isAnimationActive={true} label={<CustomLabel />} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};