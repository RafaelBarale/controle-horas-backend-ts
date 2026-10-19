import "dotenv/config";
import app from "./app";

const port = parseInt(process.env.APP_PORT || "3000");
const host = process.env.APP_HOST || "localhost";

app.listen(port, host, () => {
  console.log(`Servidor rodando na porta ${port}`);
});