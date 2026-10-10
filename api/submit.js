// POST { token, answers: [{q, a}] } -> envia a candidatura ao Discord via webhook
const crypto = require("crypto");
const { verify, parseCookies } = require("./_lib");

const COOLDOWN_MS = 60 * 60 * 1000;
const clip = (t, n) => String(t ?? "").slice(0, n);

function cookieMac(id, ts) {
  return crypto.createHmac("sha256", process.env.SESSION_SECRET).update(`${id}:${ts}`).digest("base64url");
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "Método não permitido" });

  const { WEBHOOK_URL, SESSION_SECRET } = process.env;
  if (!WEBHOOK_URL || !SESSION_SECRET) return res.status(500).json({ error: "Servidor sem configuração" });

  const { token, answers } = req.body || {};
  const user = verify(token);
  if (!user) return res.status(401).json({ error: "Sessão inválida" });

  if (!Array.isArray(answers) || answers.length === 0 || answers.length > 25) {
    return res.status(400).json({ error: "Respostas inválidas" });
  }

  // Prazo de 1 hora (cookie assinado)
  const c = parseCookies(req)["beaming_last"];
  if (c) {
    const [ts, mac] = c.split(".");
    if (ts && mac && mac === cookieMac(user.id, ts)) {
      const left = Number(ts) + COOLDOWN_MS - Date.now();
      if (left > 0) return res.status(429).json({ error: "Aguarde para enviar outra", retryAfterMs: left });
    }
  }

  const displayName = user.global_name || user.username;
  const avatarUrl = user.avatar
    ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=256`
    : undefined;

  const fields = answers.map((x, i) => ({
    name: clip(`${i + 1}. ${x.q}`, 256) || `Pergunta ${i + 1}`,
    value: clip(x.a, 1024) || "—",
    inline: false,
  }));

  const now = Math.floor(Date.now() / 1000);
  const COLOR = 0xe30613;
  const LIMIT = 5200; // o Discord aceita 6000 caracteres por mensagem; sobra margem

  const size = (e) =>
    (e.title || "").length + (e.author?.name || "").length + (e.description || "").length + (e.footer?.text || "").length + 20;

  let embed = {
    title: "📋 Nova candidatura · Suporte 𝑬𝒄𝒍𝒊𝒑𝒔𝒆 𝑩𝒆𝒂𝒎𝒊𝒏𝒈 𝑿",
    color: COLOR,
    author: { name: clip(`${displayName} (@${user.username})`, 256), icon_url: avatarUrl },
    description: `**Discord ID:** \`${user.id}\`\n**Mencionar:** <@${user.id}>\n**Horário:** <t:${now}:F>`,
    footer: { text: "Beaming Staff Recruit · user_id:" + user.id },
    timestamp: new Date().toISOString(),
    fields: [],
  };
  let used = size(embed);
  const list = [];
  for (const f of fields) {
    const fs = f.name.length + f.value.length;
    if (embed.fields.length >= 10 || used + fs > LIMIT) {
      list.push(embed);
      embed = {
        title: `Respostas (parte ${list.length + 1})`,
        color: COLOR,
        fields: [],
        footer: { text: "user_id:" + user.id },
      };
      used = size(embed);
    }
    embed.fields.push(f);
    used += fs;
  }
  list.push(embed);
  // Marca a última mensagem: é nela que o bot Zoe coloca os botões Aceitar/Negar
  const last = list[list.length - 1];
  last.footer = { text: last.footer.text + " #fim" };

  try {
    for (let i = 0; i < list.length; i++) {
      const r = await fetch(WEBHOOK_URL + "?wait=true", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: "𝑬𝒄𝒍𝒊𝒑𝒔𝒆 𝑩𝒆𝒂𝒎𝒊𝒏𝒈 𝑿 Recruit",
          avatar_url: avatarUrl,
          content: i === 0 ? `Nova candidatura de **${clip(displayName, 80)}** · <@${user.id}>` : undefined,
          embeds: [list[i]],
          // só permite mencionar o candidato; nunca @everyone/@here nem cargos
          allowed_mentions: { users: [user.id] },
        }),
      });
      if (!r.ok) {
        console.error("webhook status", r.status, await r.text());
        return res.status(502).json({ error: "Falha ao enviar para o Discord" });
      }
    }
  } catch (err) {
    console.error(err);
    return res.status(502).json({ error: "Falha ao enviar para o Discord" });
  }

  const ts = Date.now();
  res.setHeader(
    "Set-Cookie",
    `beaming_last=${ts}.${cookieMac(user.id, ts)}; Max-Age=${COOLDOWN_MS / 1000}; Path=/; HttpOnly; Secure; SameSite=Lax`
  );
  return res.status(200).json({ ok: true });
};
