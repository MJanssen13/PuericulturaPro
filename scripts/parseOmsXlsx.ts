import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';

// Definição dos nomes dos arquivos e mapeamento para métrica e sexo
const FILES_MAPPING = [
  {
    fileName: 'lhfa-girls-zscore-expanded-tables.xlsx',
    measure: 'height',
    sex: 'Feminino',
  },
  {
    fileName: 'lhfa-boys-zscore-expanded-tables.xlsx',
    measure: 'height',
    sex: 'Masculino',
  },
  {
    fileName: 'wfa-girls-zscore-expanded-tables.xlsx',
    measure: 'weight',
    sex: 'Feminino',
  },
  {
    fileName: 'wfa-boys-zscore-expanded-tables.xlsx',
    measure: 'weight',
    sex: 'Masculino',
  },
  {
    fileName: 'bfa-girls-zscore-expanded-tables.xlsx',
    measure: 'bmi',
    sex: 'Feminino',
  },
  {
    fileName: 'bfa-boys-zscore-expanded-tables.xlsx',
    measure: 'bmi',
    sex: 'Masculino',
  },
  {
    fileName: 'hcfa-girls-zscore-expanded-tables.xlsx',
    measure: 'cephalic',
    sex: 'Feminino',
  },
  {
    fileName: 'hcfa-boys-zscore-expanded-tables.xlsx',
    measure: 'cephalic',
    sex: 'Masculino',
  },
];

const SOURCE_DIR = path.join(process.cwd(), 'Dados-OMS');
const OUTPUT_DIR = path.join(process.cwd(), 'services', 'oms-data');

function cleanKey(k: string): string {
  return k.trim().toLowerCase();
}

function parseWorkbook(filePath: string, measure: string) {
  console.log(`Lendo arquivo: ${path.basename(filePath)}...`);
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Converte a planilha para JSON de objetos chave-valor
  const rows = XLSX.utils.sheet_to_json<any>(worksheet);
  console.log(`Total de linhas lidas da planilha: ${rows.length}`);

  const processedPoints: any[] = [];

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

    const day = getVal(['day', 'age_days', 'days', 'day_number']);
    if (day === null || isNaN(day)) {
      continue; // Pula linhas sem a coluna Day válida
    }

    // Leitura das colunas de SD exigidas
    let sd4neg = getVal(['sd4neg', 'sd4_neg', 'sd_4neg', 'sd4n']) ?? 0;
    let sd3neg = getVal(['sd3neg', 'sd3_neg', 'sd_3neg', 'sd3n', 'sd3negativa']) ?? 0;
    let sd2neg = getVal(['sd2neg', 'sd2_neg', 'sd_2neg', 'sd2n', 'sd2negativa']) ?? 0;
    let sd1neg = getVal(['sd1neg', 'sd1_neg', 'sd_1neg', 'sd1n', 'sd1negativa']) ?? 0;
    let sd0    = getVal(['sd0', 'z0', 'z_0', 'sd00', 'sd_0', 'm', 'median']) ?? 0;
    let sd1    = getVal(['sd1', 'z1', 'z_pos_1', 'sd1p', 'sd1positiva']) ?? 0;
    let sd2    = getVal(['sd2', 'z2', 'z_pos_2', 'sd2p', 'sd2positiva']) ?? 0;
    let sd3    = getVal(['sd3', 'z3', 'z_pos_3', 'sd3p', 'sd3positiva']) ?? 0;
    let sd4    = getVal(['sd4', 'z4', 'z_pos_4', 'sd4p', 'sd4positiva']) ?? 0;

    // Ajuste importante: Se for peso (weight) e os valores estiverem em quilogramas (ex: < 100),
    // convertemos para gramas, pois o resto do sistema de prontuário calcula em gramas!
    if (measure === 'weight' && sd0 < 100 && sd0 > 0) {
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

  // Ordena por quantidade de dias para manter consistência nas interpolações
  processedPoints.sort((a, b) => a.age_days - b.age_days);
  return processedPoints;
}

function run() {
  console.log(`Iniciando conversão de planilhas OMS do diretório: ${SOURCE_DIR}`);

  if (!fs.existsSync(SOURCE_DIR)) {
    console.error(`ERRO: A pasta '${SOURCE_DIR}' não foi encontrada! certifique-se de fazer o upload dela.`);
    console.log('Você pode rodar esta ferramenta após adicionar a pasta com os arquivos xlsx.');
    process.exit(1);
  }

  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let successCount = 0;

  for (const mapping of FILES_MAPPING) {
    const fullPath = path.join(SOURCE_DIR, mapping.fileName);
    if (!fs.existsSync(fullPath)) {
      console.warn(`AVISO: Arquivo não encontrado: ${mapping.fileName} - PONTOS DESTE GRÁFICO FICARÃO VAZIOS ATÉ O UPLOAD.`);
      continue;
    }

    try {
      const data = parseWorkbook(fullPath, mapping.measure);
      const outputFilename = `${mapping.measure}_${mapping.sex}.json`;
      const outputPath = path.join(OUTPUT_DIR, outputFilename);
      
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2));
      console.log(`SUCESSO: Escrito ${data.length} pontos para ${outputFilename} em /services/oms-data/`);
      successCount++;
    } catch (e: any) {
      console.error(`ERRO ao processar ${mapping.fileName}:`, e.message);
    }
  }

  console.log(`\nCompilação concluída! Sucedidos: ${successCount}/${FILES_MAPPING.length} arquivos.`);
}

run();
