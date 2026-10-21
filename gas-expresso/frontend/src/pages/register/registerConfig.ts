export type RegisterRole = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER';
export type ProfessionalRegisterRole = Exclude<RegisterRole, 'CUSTOMER'>;

export interface RegisterConfig {
  title: string;
  subtitle: string;
  label: string;
  professional: boolean;
}

/** Perfis que aparecem nas opções públicas de cadastro. */
export const registerRoles: RegisterRole[] = ['CUSTOMER', 'DRIVER', 'SUPPLIER'];

export const registerConfigs: Record<RegisterRole, RegisterConfig> = {
  CUSTOMER: {
    title: 'Gás na sua porta, sem complicação.',
    subtitle: 'Crie a sua conta pessoal para pedir e acompanhar entregas.',
    label: 'Cliente',
    professional: false,
  },
  DRIVER: {
    title: 'Entre na operação como entregador.',
    subtitle: 'Candidate-se com os seus dados e aguarde a validação da equipa.',
    label: 'Entregador',
    professional: true,
  },
  SUPPLIER: {
    title: 'Traga a sua empresa para a rede.',
    subtitle: 'Registe os dados da empresa parceira e aguarde a validação antes de operar entregas.',
    label: 'Empresa',
    professional: true,
  },
};

export const roleSlugs: Record<RegisterRole, string> = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  SUPPLIER: 'empresa',
};

export function normalizeRegisterRole(raw?: string): RegisterRole {
  const value = (raw ?? '').toUpperCase();
  if (value === 'DRIVER' || value === 'ENTREGADOR') return 'DRIVER';
  // A Empresa é o perfil público das empresas parceiras; os links antigos continuam válidos.
  if (value === 'SUPPLIER' || value === 'EMPRESA' || value === 'FORNECEDOR') return 'SUPPLIER';
  return 'CUSTOMER';
}

/** Dados de acesso usados por todos os perfis (passo 1). */
export interface AccessForm {
  name: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  consent: boolean;
}

export const emptyAccessForm: AccessForm = {
  name: '',
  phone: '+244 ',
  email: '',
  password: '',
  confirmPassword: '',
  consent: false,
};

export function passwordScore(password: string): number {
  const rules = ['^(?=.{10,})', '[A-Z]', '[a-z]', '\\d', '[^A-Za-z0-9]'];
  return rules.reduce((score, rule) => score + (new RegExp(rule).test(password) ? 1 : 0), 0);
}

/** Devolve uma mensagem de erro ou '' quando os dados de acesso são válidos. */
export function validateAccessForm(form: AccessForm): string {
  if (form.name.trim().length < 2) return 'Introduza o nome completo.';
  if (form.phone.replace(/\D/g, '').length < 9) return 'Introduza um telefone angolano válido.';
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'Verifique o email.';
  if (form.password.length < 10) return 'A palavra-passe deve ter pelo menos 10 caracteres.';
  if (form.password !== form.confirmPassword) return 'A confirmação da palavra-passe não coincide.';
  if (passwordScore(form.password) < 3) return 'Use uma palavra-passe mais forte.';
  if (!form.consent) return 'Aceite os termos e a política de privacidade.';
  return '';
}
