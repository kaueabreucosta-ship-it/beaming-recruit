// POST { code, redirect_uri } -> { user, token }
// Troca o code do Discord pelo usuário (identify) e devolve uma sessão assinada.
const { sign } = require("./_lib");

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, SESSION_SECRET } = process.env;
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET || !SESSION_SECRET) {
    return res.status(500).json({ error: "Servidor sem configuração (variáveis de ambiente)" });
  }

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const { code, redirect_uri } = body;
  if (!code || !redirect_uri) return res.status(400).json({ error: "Faltou code ou redirect_uri" });

  try {
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code,
        redirect_uri,
      }),
    });
    const tokenData = await tokenRes.json().catch(() => ({}));
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(400).json({ error: "Código do Discord inválido ou expirado. Tente entrar de novo" });
    }

    const userRes = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const u = await userRes.json().catch(() => ({}));
    if (!userRes.ok || !u.id) return res.status(400).json({ error: "Não consegui ler seu perfil do Discord" });

    const user = {
      id: u.id,
      username: u.username,
      global_name: u.global_name || null,
      avatar: u.avatar || null,
    };

    // Sessão assinada válida por 2 horas
    const token = sign({ ...user, exp: Date.now() + 2 * 60 * 60 * 1000 });
    return res.status(200).json({ user, token });
  } catch (err) {
    console.error("oauth error:", err);
    return res.status(500).json({ error: "Erro interno" });
  }
};
