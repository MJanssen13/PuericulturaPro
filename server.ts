import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Use JSON middleware with increased size limits for large datasets
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // API endpoint to save OMS JSON datasets directly to the repository folder
  app.post("/api/save-oms-json", (req, res) => {
    const { measure, sex, data } = req.body;

    if (!measure || !sex || !Array.isArray(data)) {
      return res.status(400).json({ 
        error: "Dados inválidos. Envie 'measure', 'sex' e o array 'data' de pontos da curva." 
      });
    }

    try {
      const dir1 = path.join(process.cwd(), "Dados-OMS");
      const dir2 = path.join(process.cwd(), "services", "oms-data");
      
      // Garante que ambos diretórios existem
      if (!fs.existsSync(dir1)) {
        fs.mkdirSync(dir1, { recursive: true });
      }
      if (!fs.existsSync(dir2)) {
        fs.mkdirSync(dir2, { recursive: true });
      }

      const filename = `${measure}_${sex}.json`;
      
      // Grava em ambas as pastas (pasta raiz de repositório e pasta interna do app)
      fs.writeFileSync(path.join(dir1, filename), JSON.stringify(data, null, 2), "utf8");
      fs.writeFileSync(path.join(dir2, filename), JSON.stringify(data, null, 2), "utf8");
      
      console.log(`[API] Gravado arquivo JSON nos locais: Dados-OMS e services/oms-data: ${filename} com ${data.length} pontos.`);
      
      return res.json({ 
        success: true, 
        message: `Tabela para ${measure} (${sex}) gravada em ambas as pastas com sucesso!`,
        points: data.length,
        filename
      });
    } catch (error: any) {
      console.error("[API Error] Falha ao gravar JSON:", error);
      return res.status(500).json({ error: `Falha ao gravar arquivo: ${error.message}` });
    }
  });

  // API endpoint para recuperar dados estáticos da OMS dinamicamente
  app.get("/api/get-oms-json", (req, res) => {
    const { measure, sex } = req.query;
    if (!measure || !sex) {
      return res.status(400).json({ error: "Parâmetros 'measure' e 'sex' são obrigatórios." });
    }

    const filename = `${measure}_${sex}.json`;
    
    // Procura primeiro em Dados-OMS, depois em services/oms-data
    const path1 = path.join(process.cwd(), "Dados-OMS", filename);
    const path2 = path.join(process.cwd(), "services", "oms-data", filename);

    let filePath = "";
    if (fs.existsSync(path1)) {
      filePath = path1;
    } else if (fs.existsSync(path2)) {
      filePath = path2;
    }

    if (!filePath) {
      return res.status(404).json({ error: `Tabela para ${measure} (${sex}) não encontrada no servidor.` });
    }

    try {
      const content = fs.readFileSync(filePath, "utf8");
      return res.json(JSON.parse(content));
    } catch (error: any) {
      return res.status(500).json({ error: `Erro ao ler arquivo do servidor: ${error.message}` });
    }
  });

  // Serve static assets and support SPA fallback
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
