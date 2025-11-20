
import React, { useState, useEffect } from 'react';
import { AssessmentData, Consultation } from './types';
import { AssessmentForm } from './components/AssessmentForm';
import { generateSummary } from './services/puericulturaLogic';
import { GrowthChart } from './components/GrowthChart';
import { checkSupabaseConnection } from './lib/supabase';
import { 
  CalculatorIcon, 
  DocumentDuplicateIcon,
  CloudIcon,
  SignalSlashIcon,
  ChartPieIcon,
  ClockIcon
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
      <header className="bg-teal-700 text-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CalculatorIcon className="h-8 w-8 text-teal-200" />
            <div>
              <h1 className="text-xl font-bold">Puericultura Pro</h1>
              <p className="text-teal-100 text-xs">Calculadora de Crescimento e Desenvolvimento</p>
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
                  <CloudIcon className="w-3 h-3" /> Banco Conectado
                </span>
              </>
            )}
            {dbStatus === 'offline' && (
              <>
                <div className="w-2 h-2 rounded-full bg-orange-400"></div>
                <span className="text-orange-100 flex items-center gap-1">
                  <SignalSlashIcon className="w-3 h-3" /> Modo Local (Demo)
                </span>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-screen-2xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Sidebar: Form */}
        <div className="lg:col-span-4 xl:col-span-3 space-y-6">
          <section>
             <h2 className="text-lg font-semibold text-slate-700 mb-4">Dados da Consulta</h2>
             <AssessmentForm data={data} onChange={setData} />
          </section>
          
          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-sm font-bold text-slate-600 uppercase">Para o Prontuário</h2>
              <button 
                onClick={handleCopy} 
                className="text-teal-600 hover:text-teal-800 flex items-center gap-1 text-sm font-medium"
              >
                <DocumentDuplicateIcon className="h-4 w-4" /> Copiar
              </button>
            </div>
            <textarea 
              readOnly 
              value={summary}
              className="w-full h-48 p-3 text-xs font-mono bg-slate-50 border border-slate-200 rounded resize-none focus:outline-none text-slate-700"
            />
          </section>
        </div>

        {/* Right Content: Charts */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-8">
          <section>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
               <h2 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                 <ChartPieIcon className="w-5 h-5 text-teal-600" />
                 Curvas de Crescimento (OMS)
               </h2>
               
               {/* Aviso Offline Inline */}
               {dbStatus === 'offline' && (
                 <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded border border-orange-200">
                   Modo Offline: Curvas de Exemplo
                 </span>
               )}
            </div>
            
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              {/* Controles do Gráfico */}
              <div className="flex flex-col gap-4 mb-6">
                
                {/* Linha 1: Tipo de Gráfico */}
                <div className="flex flex-wrap gap-2">
                  {chartOptions.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setActiveMeasure(opt.id as any)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeMeasure === opt.id 
                        ? 'bg-teal-600 text-white shadow-sm' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Linha 2: Filtro de Tempo */}
                <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
                  <div className="flex items-center gap-1 text-slate-400 mr-2">
                    <ClockIcon className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase">Período:</span>
                  </div>
                  {timeRangeOptions.map((opt) => (
                    <button
                      key={opt.label}
                      onClick={() => setTimeRange(opt.days)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
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

              {/* Renderização do Gráfico */}
              <div className="transition-all duration-300 ease-in-out">
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
