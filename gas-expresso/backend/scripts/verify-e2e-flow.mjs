const BASE = 'http://localhost:5048/api/v1';

async function req(path, method, body, token) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = text; }
  return { status: res.status, data };
}

async function main() {
  const phone = '987654322';
  const password = 'Teste@123456';

  console.log('1) Registo de fornecedor...');
  const reg = await req('/auth/register/supplier', 'POST', {
    phone, email: 'teste.aprovacao@lemostech.test', password,
    legalName: 'Teste Lancamento', tradeName: 'Demo Teste', nif: '123456789', responsibleName: 'Resp Teste',
  });
  const userId = reg.data?.id ?? reg.data?.user?.id;
  console.log('   status:', reg.status, '| userId:', userId, '| status:', reg.data?.status ?? reg.data?.user?.status);
  if (!userId) { console.log('   FALHA no registo:', JSON.stringify(reg.data).slice(0, 300)); return; }

  console.log('2) Login antes da aprovacao (deve falhar/bloquear)...');
  const loginPending = await req('/auth/login', 'POST', { phone, password });
  console.log('   status:', loginPending.status, '|', JSON.stringify(loginPending.data).slice(0, 200));

  console.log('3) Login do admin...');
  const adminLogin = await req('/auth/login', 'POST', { phone: '923000010', password: 'Demo@123' });
  const adminToken = adminLogin.data?.accessToken;
  console.log('   status:', adminLogin.status, '| token:', adminToken ? 'obtido' : 'FALHOU ' + JSON.stringify(adminLogin.data).slice(0, 200));

  console.log('4) Admin lista aplicacoes...');
  const apps = await req('/admin/applications?status=PENDING_REVIEW', 'GET', undefined, adminToken);
  const list = Array.isArray(apps.data) ? apps.data : (apps.data?.items ?? []);
  console.log('   status:', apps.status, '| pendentes:', list.length);
  const found = list.find((a) => (a.id ?? a.userId) === userId);
  console.log('   novo registo na fila:', found ? 'SIM' : 'NAO');

  console.log('5) Admin aprova...');
  const approve = await req(`/admin/applications/${userId}/approve`, 'POST', { reason: 'Verificacao end-to-end' }, adminToken);
  console.log('   status:', approve.status, '|', JSON.stringify(approve.data).slice(0, 200));

  console.log('6) Login depois da aprovacao...');
  const loginOk = await req('/auth/login', 'POST', { phone, password: 'Teste@123456' });
  const token = loginOk.data?.accessToken;
  console.log('   status:', loginOk.status, '| token:', token ? 'obtido' : 'FALHOU ' + JSON.stringify(loginOk.data).slice(0, 200));

  console.log('7) Acesso ao stock do fornecedor...');
  const inv = await req('/suppliers/me/inventory', 'GET', undefined, token);
  console.log('   status:', inv.status, '| itens:', Array.isArray(inv.data) ? inv.data.length : JSON.stringify(inv.data).slice(0, 150));

  console.log('8) Movimentos de stock...');
  const mov = await req('/suppliers/me/inventory/movements', 'GET', undefined, token);
  console.log('   status:', mov.status, '| registos:', Array.isArray(mov.data) ? mov.data.length : JSON.stringify(mov.data).slice(0, 150));

  console.log('9) Analytics summary (admin)...');
  const summary = await req('/analytics/summary', 'GET', undefined, adminToken);
  console.log('   status:', summary.status, '| total eventos:', summary.data?.total);
}

main();
