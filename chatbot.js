const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys");
const mysql = require("mysql2/promise");

// === Conexão com o banco (Railway ou local) ===
const db = mysql.createPool({
  host: process.env.MYSQLHOST || process.env.MYSQL_HOST || "metro.proxy.rlwy.net",
  port: process.env.MYSQLPORT ? parseInt(process.env.MYSQLPORT) : 52240,
  user: process.env.MYSQLUSER || process.env.MYSQL_USER || "root",
  password: process.env.MYSQLPASSWORD || process.env.MYSQL_PASSWORD || "MiOXroTWfjlzEswHdSnpjpgNkXahDnua",
  database: process.env.MYSQLDATABASE || process.env.MYSQL_DATABASE || "chatbot1",
  waitForConnections: true,
});

// Delay simples
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

let checkTimer = null;
let isReady = false;

async function startBot() {
  const { state, saveCreds } = await useMultiFileAuthState("baileys_auth");

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // Railway não tem terminal interativo
    syncFullHistory: false,
    markOnlineOnConnect: true,
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qr)}`;
      console.log("📱 Escaneie o QR Code para conectar o bot:");
      console.log(qrUrl);
    }

    if (connection === "open") {
      console.log("✅ Bot conectado com sucesso ao WhatsApp!");
      isReady = true;

      if (checkTimer) clearInterval(checkTimer);
      checkTimer = setInterval(() => enviarMensagensAutomaticas(sock), 20000); // a cada 20s
    }

    if (connection === "close") {
      isReady = false;
      if (checkTimer) {
        clearInterval(checkTimer);
        checkTimer = null;
      }
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log("⚠️ Conexão perdida. Reconectar?", shouldReconnect, "| Código:", statusCode);

      if (shouldReconnect) startBot();
    }
  });

  // === Buscar agendamentos pendentes ===
  async function getAgendamentosPendentes() {
    const [rows] = await db.query(
      `SELECT id, nome, telefone, status 
       FROM app_agendamentopublico 
       WHERE status IN ('andamento','aprovado','cancelado')
         AND (notificado = 0 OR notificado IS NULL)`
    );
    return rows;
  }

  // === Enviar mensagens automáticas ===
  async function enviarMensagensAutomaticas(sockRef) {
    try {
      if (!isReady || !sockRef) return;

      const agendamentos = await getAgendamentosPendentes();
      if (!Array.isArray(agendamentos) || agendamentos.length === 0) return;

      console.log(`🔎 Agendamentos encontrados: ${agendamentos.length}`);

      for (const ag of agendamentos) {
        let mensagem = "";
        switch (ag.status) {
          case "andamento":
            mensagem = `Olá ${ag.nome}, seu agendamento está em andamento. ⏳`;
            break;
          case "aprovado":
            mensagem = `Olá ${ag.nome}, parabéns! Seu agendamento foi aprovado. 🎉`;
            break;
          case "cancelado":
            mensagem = `Olá ${ag.nome}, infelizmente seu agendamento foi cancelado. ❌`;
            break;
          default:
            continue;
        }

        let numero = String(ag.telefone || "").replace(/\D/g, "");
        if (!numero) continue;
        if (!numero.startsWith("55")) {
          numero = "55" + numero;
        }
        const jid = `${numero}@s.whatsapp.net`;

        try {
          await sockRef.sendMessage(jid, { text: mensagem });
          console.log(`📩 Enviado para ${ag.nome} (${jid})`);

          // Marca como notificado no banco
          await db.query("UPDATE app_agendamentopublico SET notificado = 1 WHERE id = ?", [ag.id]);
          await delay(1500);
        } catch (err) {
          console.error(`❌ Erro ao enviar para ${ag.nome} (${jid}):`, err?.message || err);
        }
      }
    } catch (error) {
      console.error("Erro ao enviar mensagens automáticas:", error);
    }
  }
}

// Iniciar bot
startBot()
  .then(() => console.log("🤖 Iniciando bot do WhatsApp..."))
  .catch((err) => console.error("❌ Erro ao iniciar o bot:", err));
