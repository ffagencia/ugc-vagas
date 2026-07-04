// netlify/functions/invite-buyer.js
//
// Recebe o webhook da Kiwify quando uma compra é aprovada.
// Se a pessoa já tem conta (cadastro gratuito feito antes de pagar),
// adiciona a role "assinante" nela. Se ainda não tem conta, cria e convida.
//
// Variáveis de ambiente necessárias (configurar em:
// Netlify → Project configuration → Environment variables):
//
//   IDENTITY_URL                 -> ex: https://seu-site.netlify.app/.netlify/identity
//   IDENTITY_ADMIN_REFRESH_TOKEN -> obtido uma única vez (veja instruções enviadas separadamente)
//   KIWIFY_WEBHOOK_TOKEN         -> um token secreto que você escolhe, configurado também na Kiwify

exports.handler = async (event) => {
  try {
    // 1. Verifica o token secreto (evita que qualquer um dispare o convite)
    const params = new URLSearchParams(event.queryStringParameters || {});
    const token = params.get("token");
    if (token !== process.env.KIWIFY_WEBHOOK_TOKEN) {
      return { statusCode: 401, body: "Token inválido" };
    }

    // 2. Lê os dados enviados pela Kiwify
    const payload = JSON.parse(event.body || "{}");

    const status = payload.order_status || payload.status;
    const email = payload?.Customer?.email || payload?.customer?.email || payload.email;

    if (!email) {
      return { statusCode: 400, body: "E-mail do comprador não encontrado no payload" };
    }

    const statusesAprovados = ["paid", "approved", "completed"];
    if (!statusesAprovados.includes(String(status).toLowerCase())) {
      return { statusCode: 200, body: "Status não é de compra aprovada, ignorado" };
    }

    // 3. Renova o token de admin
    const tokenResp = await fetch(`${process.env.IDENTITY_URL}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: process.env.IDENTITY_ADMIN_REFRESH_TOKEN,
      }),
    });

    if (!tokenResp.ok) {
      const errText = await tokenResp.text();
      return { statusCode: 500, body: `Falha ao renovar token admin: ${errText}` };
    }

    const { access_token } = await tokenResp.json();
    const authHeader = { Authorization: `Bearer ${access_token}` };

    // 4. Procura se já existe uma conta com esse e-mail (cadastro gratuito anterior)
    const listResp = await fetch(`${process.env.IDENTITY_URL}/admin/users`, {
      headers: authHeader,
    });

    if (!listResp.ok) {
      const errText = await listResp.text();
      return { statusCode: 500, body: `Falha ao listar usuários: ${errText}` };
    }

    const { users } = await listResp.json();
    const existing = (users || []).find(
      (u) => u.email?.toLowerCase() === email.toLowerCase()
    );

    if (existing) {
      // 5a. Já tinha conta -> adiciona a role de assinante
      const updateResp = await fetch(`${process.env.IDENTITY_URL}/admin/users/${existing.id}`, {
        method: "PUT",
        headers: { ...authHeader, "Content-Type": "application/json" },
        body: JSON.stringify({
          app_metadata: { ...(existing.app_metadata || {}), roles: ["assinante"] },
        }),
      });

      if (!updateResp.ok) {
        const errText = await updateResp.text();
        return { statusCode: 500, body: `Falha ao liberar acesso: ${errText}` };
      }

      return { statusCode: 200, body: "Acesso de assinante liberado (conta já existia)" };
    }

    // 5b. Não tinha conta -> cria e convida já com a role de assinante
    const inviteResp = await fetch(`${process.env.IDENTITY_URL}/admin/users`, {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        email_confirm: false,
        app_metadata: { roles: ["assinante"] },
      }),
    });

    if (!inviteResp.ok) {
      const errText = await inviteResp.text();
      return { statusCode: 500, body: `Falha ao convidar usuário: ${errText}` };
    }

    return { statusCode: 200, body: "Conta criada e convite enviado com role de assinante" };
  } catch (err) {
    return { statusCode: 500, body: `Erro inesperado: ${err.message}` };
  }
};
