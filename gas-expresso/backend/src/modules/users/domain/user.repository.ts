import { Role, AccountStatus } from '../../../shared/domain/auth.enums';

export interface UserRecord {
  id: string;
  phone: string;
  email: string | null;
  name?: string | null;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
  reviewedAt: Date | null;
  reviewNote: string | null;
}

export interface CreateUserInput {
  phone: string;
  email?: string;
  passwordHash: string;
  role: Role;
  status: AccountStatus;
}

export abstract class UserRepositoryPort {
  abstract create(input: CreateUserInput): Promise<UserRecord>;
  abstract findByPhone(phone: string): Promise<UserRecord | null>;
  abstract findByPhoneAndRole(phone: string, role: Role): Promise<UserRecord | null>;
  abstract findById(id: string): Promise<UserRecord | null>;
  abstract updateCustomerProfile(id: string, input: { fullName?: string; email?: string | null }): Promise<UserRecord>;
  abstract deleteById(id: string): Promise<void>;
}
