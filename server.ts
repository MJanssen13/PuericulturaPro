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
      const targetDir = path.join(process.cwd(), "services", "oms-data");
      
      // Ensure directory exists
      if (!fs.existsSync(targetDir)) {
        fs.mkdirSync(targetDir, { recursive: true });
      }

      const filename = `${measure}_${sex}.json`;
      const filePath = path.join(targetDir, filename);

      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
      
      console.log(`[API] Gravado arquivo JSON do repositório: ${filename} com ${data.length} pontos.`);
      
      return res.json({ 
        success: true, 
        message: `Tabela para ${measure} (${sex}) gravada com sucesso!`,
        points: data.length,
        filename
      });
    } catch (error: any) {
      console.error("[API Error] Falha ao gravar JSON:", error);
      return res.status(500).json({ error: `Falha ao gravar arquivo: ${error.message}` });
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
