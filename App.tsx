
import React, { useState, useEffect } from 'react';
import { AssessmentData, Consultation } from './types';
import { AssessmentForm } from './components/AssessmentForm';
import { generateSummary } from './services/puericulturaLogic';
import { GrowthChart } from './components/GrowthChart';
import { ResultsTable } from './components/ResultsTable';
import { checkSupabaseConnection } from './lib/supabase';
import { 
  CalculatorIcon, 
  DocumentDuplicateIcon,
  CloudIcon,
  SignalSlashIcon,
  ChartPieIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon
} from '@heroicons/react/24/outline';

function App() {
  const [data, setData] = useState<AssessmentData>({
    birthDate: '2024-01-01',
    sex: 'Feminino',
    isFirstConsultation: false,
    prev: { date: '2024-01-01', weight: 5356, height: 58, cephalic: 39 },
    curr: { date: '2024-01-15', weight: 6047, height: 64, cephalic: 42 } 
  });

  const [summary, setSummary] = useState('');
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'offline'>('checking');

  // State para os Gráficos
  const [activeMeasure, setActiveMeasure] = useState<'weight' | 'height' | 'cephalic' | 'bmi'>('weight');
  const [timeRange, setTimeRange] = useState<number | null>(365); // Default 1 year

  // Verifica conexão ao iniciar
  useEffect(() => {
    checkSupabaseConnection().then(isConnected => {
      setDbStatus(isConnected ? 'connected' : 'offline');
    });
  }, []);

  useEffect(() => {
    const run = async () => {
       // Calc BMI
       const prevBMI = (Number(data.prev.weight) && Number(data.prev.height)) 
         ? (Number(data.prev.weight) / 1000) / Math.pow(Number(data.prev.height) / 100, 2) : 0;
       const currBMI = (Number(data.curr.weight) && Number(data.curr.height))
         ? (Number(data.curr.weight) / 1000) / Math.pow(Number(data.curr.height) / 100, 2) : 0;

       const text = await generateSummary(
         data.birthDate, 
         data.sex, 
         { ...data.prev, weight: Number(data.prev.weight), height: Number(data.prev.height), cephalic: Number(data.prev.cephalic), bmi: prevBMI },
         { ...data.curr, weight: Number(data.curr.weight), height: Number(data.curr.height), cephalic: Number(data.curr.cephalic), bmi: currBMI }
       );
       setSummary(text);
    };
    run();
  }, [data]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    alert("Copiado para a área de transferência!");
  };

  const chartConsultations: Consultation[] = [
    { 
      id: 'prev', 
      patient_id: 'temp', 
      date: data.prev.date, 
      weight_grams: Number(data.prev.weight), 
      height_cm: Number(data.prev.height), 
      cephalic_cm: Number(data.prev.cephalic),
      bmi: 0
    },
    { 
      id: 'curr', 
      patient_id: 'temp', 
      date: data.curr.date, 
      weight_grams: Number(data.curr.weight), 
      height_cm: Number(data.curr.height), 
      cephalic_cm: Number(data.curr.cephalic),
      bmi: 0
    }
  ];

  const chartOptions = [
    { id: 'weight', label: 'Peso' },
    { id: 'height', label: 'Estatura' },
    { id: 'cephalic', label: 'Perím. Cefálico' },
    { id: 'bmi', label: 'IMC' },
  ];

  const timeRangeOptions = [
    { label: '6 Meses', days: 180 },
    { label: '1 Ano', days: 365 },
    { label: '2 Anos', days: 730 },
    { label: '5 Anos', days: 1825 },
    { label: 'Todos', days: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-inter">
      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="h-7 w-7 text-teal-200" />
            <div>
              <h1 className="text-lg font-bold leading-tight">Puericultura Pro</h1>
              <p className="text-teal-100 text-[10px] font-light">Calculadora de Crescimento OMS</p>
            </div>
          </div>
          
          <div className="hidden md:flex items-center gap-2 bg-teal-800/50 px-3 py-1 rounded-full text-xs font-medium">
            {dbStatus === 'checking' && (
              <span className="text-teal-200 animate-pulse">Verificando conexão...</span>
            )}
            {dbStatus === 'connected' && (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-teal-50 flex items-center gap-1">
                  <CloudIcon className="w-3 h-3" /> Online
                </span>
              </>
            )}
            {dbStatus === 'offline' && (
              <>
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-orange-100 flex items-center gap-1">
                  <SignalSlashIcon className="w-3 h-3" /> Offline (Demo)
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* BARRA LATERAL (1/3 da tela - col-span-4) */}
        <div className="lg:col-span-4 space-y-6">
          <section>
             <div className="flex items-center gap-2 mb-4">
               <CalculatorIcon className="w-5 h-5 text-teal-700" />
               <h2 className="text-lg font-bold text-slate-800">Inserção de Dados</h2>
             </div>
             <AssessmentForm data={data} onChange={setData} />
          </section>

          {/* Resumo / Prontuário (Movido para cá) */}
          <section className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-5 h-5 text-slate-600" />
                <h2 className="text-base font-bold text-slate-700 uppercase">Resumo para Prontuário</h2>
              </div>
              <button 
                onClick={handleCopy} 
                className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm font-semibold transition-colors"
              >
                <DocumentDuplicateIcon className="h-4 w-4" /> Copiar
              </button>
            </div>
            <textarea 
              readOnly 
              value={summary}
              className="w-full h-48 p-3 text-sm font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
            />
          </section>
        </div>

        {/* CONTEÚDO PRINCIPAL (2/3 da tela - col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Tabela de Resultados e Análise (Novo local) */}
          <section>
             <div className="flex items-center gap-2 mb-4">
               <TableCellsIcon className="w-6 h-6 text-teal-600" />
               <h2 className="text-lg font-bold text-slate-800">Análise Detalhada do Crescimento</h2>
             </div>
             <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <ResultsTable data={data} />
             </div>
          </section>

          {/* 2. Gráficos */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
               <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                 <ChartPieIcon className="w-6 h-6 text-teal-600" />
                 Curvas de Crescimento (OMS)
               </h2>
               
               {dbStatus === 'offline' && (
                 <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200 font-medium">
                   Modo Demonstração
                 </span>
               )}
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              {/* Controles do Gráfico */}
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6 pb-4 border-b border-gray-100">
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  {chartOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setActiveMeasure(opt.id as any)}
                      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                        activeMeasure === opt.id 
                        ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' 
                        : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                    <ClockIcon className="w-3 h-3" /> Período:
                  </span>
                  {timeRangeOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setTimeRange(opt.days)}
                      className={`px-2 py-1 rounded text-xs font-medium border transition-colors ${
                        timeRange === opt.days
                        ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                        : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="h-[500px]">
                <GrowthChart 
                   birthDate={data.birthDate}
                   sex={data.sex}
                   consultations={chartConsultations}
                   measure={activeMeasure}
                   maxAgeDays={timeRange}
                />
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default App;
