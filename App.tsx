import React, { useState, useEffect } from 'react';
import { AssessmentData, Consultation } from './types';
import { AssessmentForm } from './components/AssessmentForm';
import { generateSummary, calculatePostConceptualAgeDays } from './services/puericulturaLogic';
import { GrowthChart } from './components/GrowthChart';
import { ResultsTable } from './components/ResultsTable';
import { VaccinationCard } from './components/VaccinationCard';
import { 
  CalculatorIcon, 
  DocumentDuplicateIcon,
  ChartPieIcon,
  ClockIcon,
  ClipboardDocumentListIcon,
  TableCellsIcon,
  EyeDropperIcon,
  FolderOpenIcon,
  InformationCircleIcon,
  ArrowPathIcon,
  ArrowUpTrayIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import * as XLSX from 'xlsx';

// Mapeamento das tabelas de referência da OMS (8) e do Intergrowth-21 (6)
const FILE_DEFINITIONS = [
  // Curvas OMS
  { fileName: 'lhfa-girls-zscore-expanded-tables.xlsx', measure: 'height', sex: 'Feminino', label: 'Estatura (Meninas)' },
  { fileName: 'lhfa-boys-zscore-expanded-tables.xlsx', measure: 'height', sex: 'Masculino', label: 'Estatura (Meninos)' },
  { fileName: 'wfa-girls-zscore-expanded-tables.xlsx', measure: 'weight', sex: 'Feminino', label: 'Peso (Meninas)' },
  { fileName: 'wfa-boys-zscore-expanded-tables.xlsx', measure: 'weight', sex: 'Masculino', label: 'Peso (Meninos)' },
  { fileName: 'bfa-girls-zscore-expanded-tables.xlsx', measure: 'bmi', sex: 'Feminino', label: 'IMC (Meninas)' },
  { fileName: 'bfa-boys-zscore-expanded-tables.xlsx', measure: 'bmi', sex: 'Masculino', label: 'IMC (Meninos)' },
  { fileName: 'hcfa-girls-zscore-expanded-tables.xlsx', measure: 'cephalic', sex: 'Feminino', label: 'Perím. Cefálico (Meninas)' },
  { fileName: 'hcfa-boys-zscore-expanded-tables.xlsx', measure: 'cephalic', sex: 'Masculino', label: 'Perím. Cefálico (Meninos)' },

  // Curvas de Prematuros (Intergrowth-21)
  { fileName: 'grow_preterm-zs-girls_It_table.xlsx', measure: 'preterm_height', sex: 'Feminino', label: 'Estatura Preter. (Meninas)' },
  { fileName: 'grow_preterm-zs-boys_It_tablegr.xlsx', measure: 'preterm_height', sex: 'Masculino', label: 'Estatura Preter. (Meninos)' },
  { fileName: 'grow_preterm-zs-girls_bw_table.xlsx', measure: 'preterm_weight', sex: 'Feminino', label: 'Peso Preter. (Meninas)' },
  { fileName: 'grow_preterm-zs-boys_bw_table.xlsx', measure: 'preterm_weight', sex: 'Masculino', label: 'Peso Preter. (Meninos)' },
  { fileName: 'grow_preterm-zs-girls_hc_table.xlsx', measure: 'preterm_cephalic', sex: 'Feminino', label: 'Perím. Cefálico Preter. (Meninas)' },
  { fileName: 'grow_preterm-zs-boys_hc_table.xlsx', measure: 'preterm_cephalic', sex: 'Masculino', label: 'Perím. Cefálico Preter. (Meninos)' },
];

// Importa planilhas locais compiladas para checar status no painel
import weight_Feminino from './services/oms-data/weight_Feminino.json';
import weight_Masculino from './services/oms-data/weight_Masculino.json';
import height_Feminino from './services/oms-data/height_Feminino.json';
import height_Masculino from './services/oms-data/height_Masculino.json';
import bmi_Feminino from './services/oms-data/bmi_Feminino.json';
import bmi_Masculino from './services/oms-data/bmi_Masculino.json';
import cephalic_Feminino from './services/oms-data/cephalic_Feminino.json';
import cephalic_Masculino from './services/oms-data/cephalic_Masculino.json';

// Importa arquivos preterm locais compilados para checar status no painel
import preterm_weight_Feminino from './services/oms-data/preterm_weight_Feminino.json';
import preterm_weight_Masculino from './services/oms-data/preterm_weight_Masculino.json';
import preterm_height_Feminino from './services/oms-data/preterm_height_Feminino.json';
import preterm_height_Masculino from './services/oms-data/preterm_height_Masculino.json';
import preterm_cephalic_Feminino from './services/oms-data/preterm_cephalic_Feminino.json';
import preterm_cephalic_Masculino from './services/oms-data/preterm_cephalic_Masculino.json';

function App() {
  // Get today's date for default initialization
  const today = new Date().toISOString().split('T')[0];

  const [localRecordsCount, setLocalRecordsCount] = useState<number>(0);
  const [syncStatus, setSyncStatus] = useState<{
    loading: boolean;
    progress: string;
    logs: string[];
    error?: string;
    success?: string;
  }>({
    loading: false,
    progress: '',
    logs: [],
  });

  // Config do GitHub
  const [githubRepo, setGithubRepo] = useState<string>('migueljanssen13/puericultura-pro');
  const [githubBranch, setGithubBranch] = useState<string>('main');
  const [githubFolder, setGithubFolder] = useState<string>('Dados-OMS');

  const [activeImportTab, setActiveImportTab] = useState<'upload' | 'github'>('upload');

  const countTotalRecords = () => {
    let count = 0;
    // Json estático pré-compilado (OMS + Prematuro)
    count += (weight_Feminino?.length || 0) + (weight_Masculino?.length || 0);
    count += (height_Feminino?.length || 0) + (height_Masculino?.length || 0);
    count += (bmi_Feminino?.length || 0) + (bmi_Masculino?.length || 0);
    count += (cephalic_Feminino?.length || 0) + (cephalic_Masculino?.length || 0);

    count += (preterm_weight_Feminino?.length || 0) + (preterm_weight_Masculino?.length || 0);
    count += (preterm_height_Feminino?.length || 0) + (preterm_height_Masculino?.length || 0);
    count += (preterm_cephalic_Feminino?.length || 0) + (preterm_cephalic_Masculino?.length || 0);

    // Dados salvos de forma dinâmica em localStorage pelo usuário
    FILE_DEFINITIONS.forEach(def => {
      try {
        const stored = localStorage.getItem(`puericultura_oms_${def.measure}_${def.sex}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            count += parsed.length;
          }
        }
      } catch (e) {}
    });

    setLocalRecordsCount(count);
  };

  useEffect(() => {
    countTotalRecords();
  }, []);

  const parseXlsxBuffer = (arrayBuffer: ArrayBuffer, measure: string): any[] => {
    const data = new Uint8Array(arrayBuffer);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<any>(worksheet);

    const processedPoints: any[] = [];
    const cleanKey = (k: string) => k.trim().toLowerCase();

    for (const row of rows) {
      const keys = Object.keys(row);
      const getVal = (possibleNames: string[]): number | null => {
        for (const name of possibleNames) {
          const found = keys.find(k => cleanKey(k) === cleanKey(name));
          if (found !== undefined) {
            const val = row[found];
            return val !== null && val !== undefined ? Number(val) : null;
          }
        }
        return null;
      };

      const isPretermFile = measure.startsWith('preterm_');
      let day = getVal([
        'day', 'age_days', 'days', 'day_number', 
        'idade gestacional', 'idade_gestacional', 'ig', 
        'semana', 'semanas', 'week', 'weeks', 'gestational_age'
      ]);

      if (day === null || isNaN(day)) {
        continue;
      }

      // Se for preterm e o dia/semana for <= 100, significa que a idade está em semanas.
      // Nesse caso, multiplicamos por 7 para converter em idade gestacional pós-conceptual em dias.
      if (isPretermFile && day <= 100) {
        day = day * 7;
      }

      // Desvios
      let sd4neg = getVal(['sd4neg', 'sd4_neg', 'sd_4neg', 'sd4n', '-4', 'z-score -4', 'z_score_neg_4']) ?? 0;
      let sd3neg = getVal(['sd3neg', 'sd3_neg', 'sd_3neg', 'sd3n', 'sd3negativa', '-3', 'z-score -3', 'z_score_neg_3', 'sd3_negativa']) ?? 0;
      let sd2neg = getVal(['sd2neg', 'sd2_neg', 'sd_2neg', 'sd2n', 'sd2negativa', '-2', 'z-score -2', 'z_score_neg_2', 'sd2_negativa']) ?? 0;
      let sd1neg = getVal(['sd1neg', 'sd1_neg', 'sd_1neg', 'sd1n', 'sd1negativa', '-1', 'z-score -1', 'z_score_neg_1', 'sd1_negativa']) ?? 0;
      let sd0    = getVal([
        'sd0', 'z0', 'z_0', 'sd00', 'sd_0', 'm', 'median', 
        '0', 'z-score 0', 'z_score_0', 'media', 'média', 'média (0)', 'media (0)', 'm_val'
      ]) ?? 0;
      let sd1    = getVal(['sd1', 'z1', 'z_pos_1', 'sd1p', 'sd1positiva', '1', '+1', 'z-score 1', 'z_score_pos_1', 'sd1_positiva']) ?? 0;
      let sd2    = getVal(['sd2', 'z2', 'z_pos_2', 'sd2p', 'sd2positiva', '2', '+2', 'z-score 2', 'z_score_pos_2', 'sd2_positiva']) ?? 0;
      let sd3    = getVal(['sd3', 'z3', 'z_pos_3', 'sd3p', 'sd3positiva', '3', '+3', 'z-score 3', 'z_score_pos_3', 'sd3_positiva']) ?? 0;
      let sd4    = getVal(['sd4', 'z4', 'z_pos_4', 'sd4p', 'sd4positiva', '4', '+4', 'z-score 4', 'z_score_pos_4', 'sd4_positiva']) ?? 0;

      // Conversão automática de peso de Kg para Gramas no frontend se necessário
      // (Algumas planilhas OMS ou Preterm de Peso mostram valores em Kg de 0.2 a 15, ao invés de gramas)
      if ((measure === 'weight' || measure === 'preterm_weight') && sd0 < 100 && sd0 > 0) {
        sd4neg = Math.round(sd4neg * 1000);
        sd3neg = Math.round(sd3neg * 1000);
        sd2neg = Math.round(sd2neg * 1000);
        sd1neg = Math.round(sd1neg * 1000);
        sd0    = Math.round(sd0 * 1000);
        sd1    = Math.round(sd1 * 1000);
        sd2    = Math.round(sd2 * 1000);
        sd3    = Math.round(sd3 * 1000);
        sd4    = Math.round(sd4 * 1000);
      }

      processedPoints.push({
        age_days: Math.round(day),
        z_neg_4: Number(sd4neg.toFixed(2)),
        z_neg_3: Number(sd3neg.toFixed(2)),
        z_neg_2: Number(sd2neg.toFixed(2)),
        z_neg_1: Number(sd1neg.toFixed(2)),
        z_0:     Number(sd0.toFixed(2)),
        z_pos_1: Number(sd1.toFixed(2)),
        z_pos_2: Number(sd2.toFixed(2)),
        z_pos_3: Number(sd3.toFixed(2)),
        z_pos_4: Number(sd4.toFixed(2)),
      });
    }

    processedPoints.sort((a, b) => a.age_days - b.age_days);
    return processedPoints;
  };

  const saveJsonToServer = async (measure: string, sex: string, points: any[]) => {
    try {
      const response = await fetch('/api/save-oms-json', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ measure, sex, data: points }),
      });
      const res = await response.json();
      return !!res.success;
    } catch (e) {
      console.error('[Save to Server Error]', e);
      return false;
    }
  };

  const syncFromGitHub = async () => {
    setSyncStatus({
      loading: true,
      progress: 'Iniciando sincronização...',
      logs: ['Estabelecendo contato com o GitHub Raw...'],
    });

    const repoClean = githubRepo.replace('https://github.com/', '').trim();
    const branch = githubBranch.trim() || 'main';
    const folder = githubFolder.trim() ? githubFolder.trim().replace(/\/$/, '') : '';

    let successCount = 0;
    let totalPointsLoaded = 0;
    let currentLogs = ['Estabelecendo contato com o GitHub Raw...', `Repositório configurado: ${repoClean}`];

    try {
      for (const def of FILE_DEFINITIONS) {
        currentLogs = [...currentLogs, `Baixando ${def.fileName}...`];
        setSyncStatus(prev => ({
          ...prev,
          progress: `Baixando ${successCount}/${FILE_DEFINITIONS.length}: ${def.label}...`,
          logs: currentLogs
        }));

        // Se for Curva de Prematuros, busca da pasta Dados-IG21 do repositório
        const isPreterm = def.measure.startsWith('preterm_');
        const activeFolder = isPreterm ? 'Dados-IG21' : (folder || 'Dados-OMS');
        const folderPart = activeFolder ? activeFolder + '/' : '';
        const url = `https://raw.githubusercontent.com/${repoClean}/${branch}/${folderPart}${def.fileName}`;

        try {
          const response = await fetch(url);
          if (!response.ok) {
            throw new Error(`Erro HTTP ${response.status} ao baixar arquivo de ${url}`);
          }

          const buffer = await response.arrayBuffer();
          const points = parseXlsxBuffer(buffer, def.measure);
          
          if (points.length > 0) {
            localStorage.setItem(`puericultura_oms_${def.measure}_${def.sex}`, JSON.stringify(points));
            const savedServer = await saveJsonToServer(def.measure, def.sex, points);
            successCount++;
            totalPointsLoaded += points.length;
            if (savedServer) {
              currentLogs = [...currentLogs, `✓ SUCESSO: ${def.label} (${points.length} pts) integrado no projeto.`];
            } else {
              currentLogs = [...currentLogs, `✓ SUCESSO: ${def.label} (${points.length} pts) em cache local.`];
            }
          } else {
            throw new Error('Nenhum ponto válido encontrado no arquivo.');
          }
        } catch (fileErrObj: any) {
          const fileErr = fileErrObj as Error;
          currentLogs = [...currentLogs, `✗ FALHA em ${def.fileName}: ${fileErr.message}`];
        }
      }

      if (successCount > 0) {
        setSyncStatus({
          loading: false,
          progress: 'Finalizado com SUCESSO!',
          logs: [...currentLogs, `✓ Sincronização concluída! Carregado ${totalPointsLoaded} pontos do GitHub em ${successCount}/${FILE_DEFINITIONS.length} curvas.`],
          success: `Banco de dados sincronizado com sucesso! ${successCount} curvas gravadas e prontas para uso.`,
        });
        countTotalRecords();
      } else {
        setSyncStatus({
          loading: false,
          progress: 'Incompatibilidade ou falha.',
          logs: [...currentLogs, `✗ Nenhuma curva pôde ser sincronizada do GitHub.`],
          error: 'Nenhum dos arquivos de curva foi carregado do GitHub. Certifique-se de que o repositório é público e que o caminho/branch estão corretos ou use o Upload manual.',
        });
      }

    } catch (e: any) {
      setSyncStatus({
        loading: false,
        progress: 'Ocorreu um erro geral.',
        logs: [...currentLogs, `ERRO GERAL: ${e.message}`],
        error: `Ocorreu um erro na requisição: ${e.message}. Verifique sua conexão e tente o upload manual de arquivos XLSX do seu PC.`,
      });
    }
  };

  const handleXlsxFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setSyncStatus({
      loading: true,
      progress: 'Garantindo leitura dos arquivos...',
      logs: [`Carregando ${files.length} arquivo(s) selecionado(s)...`],
    });

    let successCount = 0;
    let totalPointsLoaded = 0;
    let currentLogs = [`Carregando ${files.length} arquivo(s) selecionado(s)...`];

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const lowerName = file.name.toLowerCase();
        
        const matchedDef = FILE_DEFINITIONS.find(def => 
          lowerName.includes(def.fileName.toLowerCase())
        ) || FILE_DEFINITIONS.find(def => {
          const isPreterm = lowerName.includes('preterm') || lowerName.includes('grow_preterm') || lowerName.includes('it_table') || lowerName.includes('bw_table') || lowerName.includes('hc_table');
          const isBoy = lowerName.includes('boy') || lowerName.includes('masc') || lowerName.includes('_boys_') || lowerName.includes('-boys-') || lowerName.includes('boys');
          const isGirl = lowerName.includes('girl') || lowerName.includes('fem') || lowerName.includes('_girls_') || lowerName.includes('-girls-') || lowerName.includes('girls');
          
          if (isPreterm) {
            const isHeight = lowerName.includes('it_table') || lowerName.includes('lh_') || lowerName.includes('length') || lowerName.includes('estatura') || lowerName.includes('altura') || lowerName.includes('alt');
            const isWeight = lowerName.includes('bw_table') || lowerName.includes('weight') || lowerName.includes('peso') || lowerName.includes('bw');
            const isCephalic = lowerName.includes('hc_table') || lowerName.includes('cephalic') || lowerName.includes('perim') || lowerName.includes('hc_') || lowerName.includes('cef');
            
            if (isGirl && def.sex === 'Feminino') {
               if (isHeight && def.measure === 'preterm_height') return true;
               if (isWeight && def.measure === 'preterm_weight') return true;
               if (isCephalic && def.measure === 'preterm_cephalic') return true;
            }
            if (isBoy && def.sex === 'Masculino') {
               if (isHeight && def.measure === 'preterm_height') return true;
               if (isWeight && def.measure === 'preterm_weight') return true;
               if (isCephalic && def.measure === 'preterm_cephalic') return true;
            }
          } else {
            const isHeight = lowerName.includes('lhfa') || lowerName.includes('height') || lowerName.includes('estatura') || lowerName.includes('altura') || lowerName.includes('alt');
            const isWeight = lowerName.includes('wfa') || lowerName.includes('weight') || lowerName.includes('peso');
            const isBmi = lowerName.includes('bfa') || lowerName.includes('bmi') || lowerName.includes('imc');
            const isCephalic = lowerName.includes('hcfa') || lowerName.includes('cephalic') || lowerName.includes('perim') || lowerName.includes('cef');
            
            if (isGirl && def.sex === 'Feminino') {
               if (isHeight && def.measure === 'height') return true;
               if (isWeight && def.measure === 'weight') return true;
               if (isBmi && def.measure === 'bmi') return true;
               if (isCephalic && def.measure === 'cephalic') return true;
            }
            if (isBoy && def.sex === 'Masculino') {
               if (isHeight && def.measure === 'height') return true;
               if (isWeight && def.measure === 'weight') return true;
               if (isBmi && def.measure === 'bmi') return true;
               if (isCephalic && def.measure === 'cephalic') return true;
            }
          }
          return false;
        }) || FILE_DEFINITIONS.find(def => 
          lowerName.includes(def.measure) && 
          (lowerName.includes(def.sex.toLowerCase()) || 
           (def.sex === 'Feminino' && lowerName.includes('girl')) ||
           (def.sex === 'Masculino' && lowerName.includes('boy')))
        ) || FILE_DEFINITIONS.find(def => {
          if (def.measure === 'height' && lowerName.includes('lhfa')) return true;
          if (def.measure === 'weight' && lowerName.includes('wfa')) return true;
          if (def.measure === 'bmi' && lowerName.includes('bfa')) return true;
          if (def.measure === 'cephalic' && lowerName.includes('hcfa')) return true;
          return false;
        });

        if (!matchedDef) {
          currentLogs = [...currentLogs, `⚠️ Ignorado ${file.name}: Sem correspondência automática (renomeie ou garanta o padrão de nome).` ];
          continue;
        }

        try {
          const buffer = await file.arrayBuffer();
          const points = parseXlsxBuffer(buffer, matchedDef.measure);
          
          if (points.length > 0) {
            localStorage.setItem(`puericultura_oms_${matchedDef.measure}_${matchedDef.sex}`, JSON.stringify(points));
            const savedServer = await saveJsonToServer(matchedDef.measure, matchedDef.sex, points);
            successCount++;
            totalPointsLoaded += points.length;
            if (savedServer) {
              currentLogs = [...currentLogs, `✓ SUCESSO: "${file.name}" importado e integrado no projeto (${points.length} pts).` ];
            } else {
              currentLogs = [...currentLogs, `✓ SUCESSO: "${file.name}" importado em cache local (${points.length} pts).` ];
            }
            setSyncStatus(prev => ({
              ...prev,
              progress: `Processando arquivo ${i+1}/${files.length}: ${file.name}...`,
              logs: currentLogs
            }));
          } else {
            throw new Error('Nenhum registro com colunas Day e SDs válidas.');
          }
        } catch (err: any) {
          currentLogs = [...currentLogs, `✗ FALHA ao ler ${file.name}: ${err.message}`];
        }
      }

      if (successCount > 0) {
        setSyncStatus({
          loading: false,
          progress: 'Carregamento finalizado!',
          logs: [...currentLogs, `✓ Upload concluído. Total de registros adicionados ao navegador: ${totalPointsLoaded}`],
          success: `Importação local realizada com sucesso! Carregamos ${successCount} arquivo(s) com ${totalPointsLoaded} pontos totais.`,
        });
        countTotalRecords();
      } else {
        setSyncStatus({
          loading: false,
          progress: 'Falha ao importar.',
          logs: [...currentLogs, `✗ Nenhum dos arquivos importados pôde ser interpretado.`],
          error: 'Não foi possível ler as tabelas. Lembre-se de subir as planilhas da OMS com as colunas certas!',
        });
      }

    } catch (e: any) {
      setSyncStatus({
        loading: false,
        progress: 'Erro no processamento.',
        logs: [...currentLogs, `FALHA GERAL: ${e.message}`],
        error: `Ocorreu um erro no processador local: ${e.message}`,
      });
    }
  };

  const clearLocalDatabase = () => {
    if (confirm("Tem certeza que deseja limpar o cache local de curvas Z-score temporárias neste navegador?")) {
      FILE_DEFINITIONS.forEach(def => {
        localStorage.removeItem(`puericultura_oms_${def.measure}_${def.sex}`);
      });
      countTotalRecords();
      alert("Cache limpo! O aplicativo voltou a carregar unicamente as tabelas JSON oficiais do repositório.");
    }
  };

  const [data, setData] = useState<AssessmentData>({
    birthDate: today,
    sex: 'Feminino',
    isFirstConsultation: false,
    isPremature: false,
    gestationalAgeWeeks: '',
    gestationalAgeDays: '',
    prev: { date: today, weight: '', height: '', cephalic: '' },
    curr: { date: today, weight: '', height: '', cephalic: '' } 
  });

  const [summary, setSummary] = useState('');

  // Navigation State
  const [activeTab, setActiveTab] = useState<'growth' | 'vaccines'>('growth');

  // State para os Gráficos
  const [activeMeasure, setActiveMeasure] = useState<'weight' | 'height' | 'cephalic' | 'bmi'>('weight');
  const [timeRange, setTimeRange] = useState<number | null>(365); // Default 1 year

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
         { ...data.curr, weight: Number(data.curr.weight), height: Number(data.curr.height), cephalic: Number(data.curr.cephalic), bmi: currBMI },
         data.isFirstConsultation,
         data.isPremature,
         data.gestationalAgeWeeks,
         data.gestationalAgeDays
       );
       setSummary(text);
    };
    run();
  }, [data]);
  
  // Se o usuário marcar como prematuro enquanto o IMC estiver selecionado, muda para peso caso a IG seja menor ou igual a 60 semanas.
  useEffect(() => {
    if (data.isPremature && activeMeasure === 'bmi') {
        const gestAgeWeeks = Number(data.gestationalAgeWeeks);
        const gestAgeDays = Number(data.gestationalAgeDays);
        const currentPCADays = calculatePostConceptualAgeDays(data.birthDate, data.curr.date, gestAgeWeeks, gestAgeDays);
        if (currentPCADays > 0 && currentPCADays <= 60 * 7) {
            setActiveMeasure('weight');
        }
    }
  }, [data.isPremature, data.birthDate, data.curr.date, data.gestationalAgeWeeks, data.gestationalAgeDays, activeMeasure]);

  const handleCopy = () => {
    navigator.clipboard.writeText(summary);
    alert("Copiado para a área de transferência!");
  };

  // Prepare Data for Charts
  const chartConsultations: Consultation[] = [];

  // Only add previous consultation if it exists AND it is NOT the first consultation
  if (!data.isFirstConsultation && (data.prev.weight || data.prev.height)) {
    chartConsultations.push({ 
      id: 'prev', 
      patient_id: 'temp', 
      date: data.prev.date, 
      weight_grams: Number(data.prev.weight), 
      height_cm: Number(data.prev.height), 
      cephalic_cm: Number(data.prev.cephalic),
      bmi: 0
    });
  }

  // Always add current consultation if data exists
  if (data.curr.weight || data.curr.height) {
    chartConsultations.push({ 
      id: 'curr', 
      patient_id: 'temp', 
      date: data.curr.date, 
      weight_grams: Number(data.curr.weight), 
      height_cm: Number(data.curr.height), 
      cephalic_cm: Number(data.curr.cephalic),
      bmi: 0
    });
  }
  
  const baseChartOptions = [
    { id: 'weight', label: 'Peso' },
    { id: 'height', label: 'Estatura' },
    { id: 'cephalic', label: 'Perím. Cefálico' },
    { id: 'bmi', label: 'IMC' },
  ];
  
  const currentPCAForOptions = data.isPremature 
    ? calculatePostConceptualAgeDays(data.birthDate, data.curr.date, Number(data.gestationalAgeWeeks), Number(data.gestationalAgeDays)) 
    : 0;

  const chartOptions = (data.isPremature && currentPCAForOptions > 0 && currentPCAForOptions <= 60 * 7)
    ? baseChartOptions.filter(opt => opt.id !== 'bmi')
    : baseChartOptions;

  const timeRangeOptions = [
    { label: '6 Meses', days: 180 },
    { label: '1 Ano', days: 365 },
    { label: '2 Anos', days: 730 },
    { label: '5 Anos', days: 1825 },
    { label: 'Todos', days: null },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-inter text-sm">
      <header className="bg-teal-700 text-white shadow-md sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalculatorIcon className="h-6 w-6 text-teal-200" />
            <div>
              <h1 className="text-base font-bold leading-tight">Puericultura Pro</h1>
              <p className="text-teal-100 text-[9px] font-light">Calculadora de Crescimento OMS & Intergrowth-21</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 md:gap-4">
            {/* Status do Banco Local (GitHub) */}
            <div className={`flex items-center gap-2 px-3 py-0.5 rounded-full text-[10px] font-medium ${
              localRecordsCount > 0 ? 'bg-emerald-800/60 text-emerald-100' : 'bg-amber-800/60 text-amber-100'
            }`}>
              {localRecordsCount > 0 ? (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></div>
                  <span className="flex items-center gap-1">
                    <FolderOpenIcon className="w-3 h-3" /> Repositório OMS: Ativo ({localRecordsCount} pts)
                  </span>
                </>
              ) : (
                <>
                  <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></div>
                  <span className="flex items-center gap-1">
                    <FolderOpenIcon className="w-3 h-3" /> Repositório OMS: Sem dados xlsx
                  </span>
                </>
              )}
            </div>

            <div className="hidden md:flex items-center gap-2 bg-teal-800/50 px-3 py-0.5 rounded-full text-[10px] font-semibold text-teal-100">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-300"></div>
              <span>Fonte: Base Local Repositório (.json)</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        
        {/* BARRA LATERAL (Sempre visível) */}
        <div className="lg:col-span-4 space-y-4">
          
          {/* Gerenciador de Banco de Dados Local (XLSX & GitHub) */}
          <section className="bg-gradient-to-br from-slate-50 to-teal-50/50 p-4 rounded-xl border border-teal-200/40 shadow-sm leading-relaxed">
            <div className="flex items-start gap-2.5">
              <FolderOpenIcon className="w-5 h-5 text-teal-700 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-bold text-slate-800">Sincronização de Tabelas OMS (XLSX)</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Carregue as planilhas completas da OMS para habilitar a busca de Z-scores offline no navegador.
                </p>

                {/* Status DB */}
                <div className="mt-2.5 bg-white border border-teal-200/50 rounded-lg p-2.5 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-700">Banco de Dados Ativo:</span>
                    <span className="font-bold text-teal-700">{localRecordsCount} pontos de curva</span>
                  </div>
                  {localRecordsCount > 0 && (
                    <div className="mt-1 flex gap-2 justify-end">
                      <button 
                        onClick={clearLocalDatabase}
                        className="text-[10px] text-red-600 hover:text-red-700 underline font-medium"
                      >
                        Limpar Banco Local
                      </button>
                    </div>
                  )}
                </div>

                {/* Selecionar Método */}
                <div className="mt-3 flex rounded-md bg-slate-100 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveImportTab('upload')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      activeImportTab === 'upload'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ArrowUpTrayIcon className="w-3.5 h-3.5 inline mr-1" />
                    Upload XLSX
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveImportTab('github')}
                    className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                      activeImportTab === 'github'
                        ? 'bg-white text-teal-700 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <ArrowPathIcon className="w-3.5 h-3.5 inline mr-1" />
                    Do GitHub
                  </button>
                </div>

                {/* Conteúdo Aba Upload */}
                {activeImportTab === 'upload' && (
                  <div className="mt-3 space-y-2">
                    <p className="text-[11px] text-slate-600">
                      Selecione os 8 arquivos <code className="font-mono bg-slate-100 text-teal-700 px-1 py-0.2 rounded">.xlsx</code> que você fez o upload no GitHub. O app os processará de forma offline em milissegundos.
                    </p>
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-teal-200 hover:border-teal-400 bg-white hover:bg-teal-50 px-4 py-3 rounded-lg cursor-pointer transition-colors text-center">
                      <ArrowUpTrayIcon className="w-6 h-6 text-teal-500 mb-1" />
                      <span className="text-xs font-bold text-slate-700">Escolher Arquivos Excel (.xlsx)</span>
                      <span className="text-[10px] text-slate-400 mt-0.5">Selecione os múltiplos arquivos OMS</span>
                      <input 
                        type="file" 
                        accept=".xlsx" 
                        multiple 
                        onChange={handleXlsxFileUpload} 
                        className="hidden" 
                        disabled={syncStatus.loading}
                      />
                    </label>
                  </div>
                )}

                {/* Conteúdo Aba GitHub */}
                {activeImportTab === 'github' && (
                  <div className="mt-3 space-y-2 text-xs">
                    <p className="text-[11px] text-slate-600">
                      Baixe os arquivos brutos diretamente do seu repositório público do GitHub de forma rápida e transparente.
                    </p>
                    
                    <div className="space-y-2 bg-white p-2.5 rounded-lg border border-slate-200">
                      <div>
                        <label className="block text-[10px] uppercase font-bold text-slate-400">Repositório GitHub</label>
                        <input 
                          type="text" 
                          value={githubRepo} 
                          onChange={(e) => setGithubRepo(e.target.value)}
                          placeholder="usuario/repositorio"
                          className="w-full mt-0.5 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400">Branch</label>
                          <input 
                            type="text" 
                            value={githubBranch} 
                            onChange={(e) => setGithubBranch(e.target.value)}
                            className="w-full mt-0.5 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] uppercase font-bold text-slate-400">Pasta Interna</label>
                          <input 
                            type="text" 
                            value={githubFolder} 
                            onChange={(e) => setGithubFolder(e.target.value)}
                            placeholder="Ex: Dados-OMS"
                            className="w-full mt-0.5 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={syncFromGitHub}
                      disabled={syncStatus.loading}
                      className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-bold py-1.5 px-3 rounded-lg text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
                    >
                      {syncStatus.loading ? (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5 animate-spin" />
                          {syncStatus.progress}
                        </>
                      ) : (
                        <>
                          <ArrowPathIcon className="w-3.5 h-3.5" />
                          Sincronizar do GitHub Raw
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/*Logs e Mensagens de Feedback */}
                {(syncStatus.error || syncStatus.success || syncStatus.logs.length > 0) && (
                  <div className="mt-3 space-y-2">
                    {syncStatus.error && (
                      <div className="p-2 border border-red-200 bg-red-50 text-red-700 rounded-lg text-[11px] flex gap-1.5 items-start">
                        <XCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-red-500 text-xs" />
                        <div>{syncStatus.error}</div>
                      </div>
                    )}
                    {syncStatus.success && (
                      <div className="p-2 border border-green-200 bg-green-50 text-green-700 rounded-lg text-[11px] flex gap-1.5 items-start">
                        <CheckCircleIcon className="w-4 h-4 shrink-0 mt-0.5 text-green-500 text-xs" />
                        <div>{syncStatus.success}</div>
                      </div>
                    )}
                    {syncStatus.logs.length > 0 && (
                      <div className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg p-2 font-mono text-[9px] max-h-32 overflow-y-auto leading-relaxed">
                        <div className="text-slate-400 border-b border-slate-800 pb-1 mb-1 font-bold flex justify-between">
                          <span>Log de Atividades:</span>
                          <span className="text-[8px]">{syncStatus.loading ? 'Atualizando...' : 'Finalizado'}</span>
                        </div>
                        {syncStatus.logs.map((log, index) => (
                          <div key={index} className="truncate">{log}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </section>

          <section>
             <div className="flex items-center gap-2 mb-2">
               <CalculatorIcon className="w-4 h-4 text-teal-700" />
               <h2 className="text-base font-bold text-slate-800">Inserção de Dados</h2>
             </div>
             <AssessmentForm data={data} onChange={setData} />
          </section>

          {/* Resumo / Prontuário */}
          <section className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                <ClipboardDocumentListIcon className="w-4 h-4 text-slate-600" />
                <h2 className="text-sm font-bold text-slate-700 uppercase">Resumo para Prontuário</h2>
              </div>
              <button 
                onClick={handleCopy} 
                className="bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded-md flex items-center gap-1 text-xs font-semibold transition-colors"
              >
                <DocumentDuplicateIcon className="h-3 w-3" /> Copiar
              </button>
            </div>
            <textarea 
              readOnly 
              value={summary}
              className="w-full h-32 p-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500/20 text-slate-700"
            />
          </section>
        </div>

        {/* CONTEÚDO PRINCIPAL (Abas) */}
        <div className="lg:col-span-8 space-y-4">
          
          {/* TAB NAVIGATION */}
          <div className="flex gap-2 border-b border-gray-200 pb-1">
            <button
              onClick={() => setActiveTab('growth')}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'growth' 
                ? 'bg-white text-teal-700 border-t border-x border-gray-200 -mb-[5px] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              }`}
            >
              <ChartPieIcon className="w-4 h-4" />
              Crescimento & Desenvolvimento
            </button>
            <button
              onClick={() => setActiveTab('vaccines')}
              className={`px-4 py-2 text-sm font-bold rounded-t-lg transition-colors flex items-center gap-2 ${
                activeTab === 'vaccines' 
                ? 'bg-white text-blue-700 border-t border-x border-gray-200 -mb-[5px] shadow-sm' 
                : 'text-slate-500 hover:text-slate-700 hover:bg-gray-50'
              }`}
            >
              <EyeDropperIcon className="w-4 h-4" />
              Carteira de Vacinação (Status)
            </button>
          </div>

          {activeTab === 'growth' ? (
            <div className="space-y-4">
              {/* 1. Tabela de Resultados e Análise */}
              <section>
                <div className="flex items-center gap-2 mb-2">
                  <TableCellsIcon className="w-5 h-5 text-teal-600" />
                  <h2 className="text-base font-bold text-slate-800">Análise Detalhada</h2>
                </div>
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <ResultsTable data={data} />
                </div>
              </section>

              {/* 2. Gráficos */}
              <section>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <ChartPieIcon className="w-5 h-5 text-teal-600" />
                    Curvas de Crescimento
                  </h2>
                </div>
                
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  {/* Controles do Gráfico */}
                  <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                    <div className="flex bg-slate-100 p-0.5 rounded-md overflow-x-auto max-w-full">
                      {chartOptions.map(opt => (
                        <button
                          key={opt.id}
                          onClick={() => setActiveMeasure(opt.id as any)}
                          className={`px-3 py-1 rounded-[4px] text-xs font-semibold transition-all whitespace-nowrap ${
                            activeMeasure === opt.id 
                            ? 'bg-white text-teal-700 shadow-sm ring-1 ring-black/5' 
                            : 'text-slate-500 hover:text-slate-700'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" /> Período:
                      </span>
                      {timeRangeOptions.map((opt) => (
                        <button
                          key={opt.label}
                          onClick={() => setTimeRange(opt.days)}
                          className={`px-2 py-0.5 rounded text-[10px] font-medium border transition-colors ${
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

                  <div className="h-[400px]">
                    <GrowthChart 
                      birthDate={data.birthDate}
                      sex={data.sex}
                      consultations={chartConsultations}
                      measure={activeMeasure}
                      maxAgeDays={timeRange}
                      isPremature={data.isPremature}
                      gestationalAgeWeeks={data.gestationalAgeWeeks}
                      gestationalAgeDays={data.gestationalAgeDays}
                    />
                  </div>
                </div>
              </section>
            </div>
          ) : (
            <div className="bg-white p-4 rounded-b-xl rounded-tr-xl shadow-sm border border-gray-200 min-h-[600px]">
               <div className="mb-4 flex items-center gap-2 bg-blue-50 text-blue-800 p-3 rounded-lg text-sm border border-blue-100">
                  <EyeDropperIcon className="w-5 h-5" />
                  <p>
                    Este painel exibe o status vacinal calculado <strong>com base na idade do paciente</strong>. 
                    Ele não substitui a verificação física da caderneta.
                  </p>
               </div>
               <VaccinationCard birthDate={data.birthDate} consultationDate={data.curr.date} />
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

export default App;