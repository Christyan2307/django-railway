const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise");
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

let botSocket = null;

const db = mysql.createPool({
  host: process.env.MYSQLHOST || "metro.proxy.rlwy.net",
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 52240,
  user: process.env.MYSQLUSER || "root",
  password: process.env.MYSQLPASSWORD || "MiOXroTWfjlzEswHdSnpjpgNkXahDnua",
  database: process.env.MYSQLDATABASE || "chatbot1",
  waitForConnections: true,
});

// Inicia o bot
async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");
  const sock = makeWASocket({ auth: state, printQRInTerminal: false });
  botSocket = sock;

  sock.ev.on("creds.update", saveCreds);
  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;
    if (qr) console.log("📱 Escaneie o QR Code:", `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`);
    if (connection === "open") console.log("✅ Bot conectado!");
    if (connection === "close") {
      const code = lastDisconnect?.error?.output?.statusCode;
      if (code !== DisconnectReason.loggedOut) startBot();
    }
  });
}

// Página principal
app.get("/", async (req, res) => {
  const [agendamentos] = await db.query("SELECT * FROM app_agendamentopublico ORDER BY criado_em DESC");
  res.render("index", { agendamentos });
});

// Adicionar agendamento e enviar mensagem automaticamente
app.post("/add", async (req, res) => {
  try {
    const { nome, telefone, status } = req.body;

    // Inserir no banco
    const [result] = await db.query(
      "INSERT INTO app_agendamentopublico (nome, telefone, status, notificado) VALUES (?, ?, ?, 0)",
      [nome, telefone, status]
    );
    const id = result.insertId;

    // Preparar mensagem
    let mensagem = "";
    switch (status) {
      case "andamento": mensagem = `Olá ${nome}, seu agendamento está em andamento. ⏳`; break;
      case "aprovado": mensagem = `Olá ${nome}, parabéns! Seu agendamento foi aprovado. 🎉`; break;
      case "cancelado": mensagem = `Olá ${nome}, infelizmente seu agendamento foi cancelado. ❌`; break;
      default: mensagem = `Olá ${nome}, status: ${status}`;
    }

    // Enviar mensagem via WhatsApp
    if (botSocket) {
      let numero = String(telefone).replace(/\D/g, "");
      if (!numero.startsWith("55")) numero = "55" + numero;
      const jid = `${numero}@s.whatsapp.net`;

      await botSocket.sendMessage(jid, { text: mensagem });
      // Atualiza banco para notificado
      await db.query("UPDATE app_agendamentopublico SET notificado=1 WHERE id=?", [id]);
      console.log(`📩 Mensagem enviada para ${nome} (${jid})`);
    }

    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.send("Erro ao cadastrar agendamento: " + err.message);
  }
});

// Inicia o servidor
app.listen(3000, () => console.log("🌐 Servidor rodando em http://localhost:3000"));
startBot();
