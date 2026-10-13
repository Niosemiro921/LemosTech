export type RegisterRole = 'CUSTOMER' | 'DRIVER' | 'SUPPLIER' | 'PRESTADOR';
export type ProfessionalRegisterRole = Exclude<RegisterRole, 'CUSTOMER' | 'SUPPLIER'>;

export interface RegisterConfig {
  title: string;
  subtitle: string;
  label: string;
  professional: boolean;
}

/** Só aparecem aqui os perfis com endpoint de registo confirmado no backend actual. */
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
    subtitle: 'Registe a empresa, o NIF e o responsável. A equipa valida a candidatura antes da operação.',
    label: 'Empresa / Fornecedor',
    professional: true,
  },
  PRESTADOR: {
    title: 'Perfil de prestador independente.',
    subtitle: 'Este perfil só poderá ser registado quando existir um papel e endpoint próprios no backend.',
    label: 'Prestador',
    professional: true,
  },
};

export const roleSlugs: Record<RegisterRole, string> = {
  CUSTOMER: 'customer',
  DRIVER: 'driver',
  SUPPLIER: 'supplier',
  PRESTADOR: 'prestador',
};

export function normalizeRegisterRole(raw?: string): RegisterRole {
  const value = (raw ?? '').toUpperCase();
  if (value === 'DRIVER' || value === 'ENTREGADOR') return 'DRIVER';
  if (value === 'SUPPLIER' || value === 'EMPRESA' || value === 'FORNECEDOR') return 'SUPPLIER';
  if (value === 'PRESTADOR') return 'PRESTADOR';
  return 'CUSTOMER';
}

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

export function validateAccessForm(form: AccessForm): string {
  if (form.name.trim().length < 2) return 'Introduza o nome completo ou o nome do responsável.';
  if (form.phone.replace(/\D/g, '').length < 9) return 'Introduza um telefone angolano válido.';
  if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) return 'Verifique o email.';
  if (form.password.length < 10) return 'A palavra-passe deve ter pelo menos 10 caracteres.';
  if (form.password !== form.confirmPassword) return 'A confirmação da palavra-passe não coincide.';
  if (passwordScore(form.password) < 3) return 'Use uma palavra-passe mais forte.';
  if (!form.consent) return 'Aceite os termos e a política de privacidade.';
  return '';
}
