import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import * as bcrypt from 'bcrypt';
import { AccountStatus, Role } from '../../../shared/domain/auth.enums';
import { UserRecord, UserRepositoryPort } from '../../users/domain/user.repository';
import { CustomerRepositoryPort } from '../../customers/domain/customer.repository';
import { DriverRepositoryPort } from '../../drivers/domain/driver.repository';
import { SupplierRepositoryPort } from '../../suppliers/domain/supplier.repository';
import { LoginDto } from './dto/login.dto';
import { RegisterCustomerDto } from './dto/register-customer.dto';
import { RegisterDriverDto } from './dto/register-driver.dto';
import { RegisterSupplierDto } from './dto/register-supplier.dto';
import { RegisterPrestadorDto } from './dto/register-prestador.dto';
import { UpdateCustomerProfileDto } from './dto/update-customer-profile.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly users: UserRepositoryPort,
    private readonly customers: CustomerRepositoryPort,
    private readonly drivers: DriverRepositoryPort,
    private readonly suppliers: SupplierRepositoryPort,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async registerCustomer(dto: RegisterCustomerDto) {
    const status = AccountStatus.ACTIVE;
    return this.registerUser(dto.phone, dto.email, dto.password, Role.CUSTOMER, status, async (userId) => {
      await this.customers.create({ userId, fullName: dto.fullName });
    });
  }

  async registerDriver(dto: RegisterDriverDto) {
    return this.registerProfessional(dto);
  }

  async registerPrestador(dto: RegisterPrestadorDto) {
    return this.registerUser(dto.phone, dto.email, dto.password, Role.PRESTADOR, AccountStatus.ACTIVE, async (userId) => {
      // Perfil comercial da empresa: é a informação que a Administração valida.
      await this.suppliers.create({
        userId,
        legalName: dto.legalName.trim(),
        tradeName: dto.tradeName.trim(),
        nif: dto.nif.trim(),
        responsibleName: dto.fullName.trim(),
        commercialRegistration: dto.commercialRegistration?.trim() || null,
        activity: dto.activity?.trim() || null,
        phoneAlt: null,
        province: dto.province?.trim() || null,
        municipality: dto.municipality?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
      });

      // Perfil operacional mínimo: mantém a área do prestador (ofertas, carteira e entregas) funcional.
      await this.drivers.create({
        userId,
        fullName: dto.fullName.trim(),
        documentNumber: dto.nif.trim(),
        nif: dto.nif.trim(),
        vehicleType: dto.vehicleType?.trim() || 'MOTORCYCLE',
        vehiclePlate: dto.vehiclePlate?.trim() || null,
        experienceYears: dto.experienceYears ?? 0,
        province: dto.province?.trim() || null,
        municipality: dto.municipality?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
        vehicleCapacityKg: dto.vehicleCapacityKg ?? 45,
      });
    });
  }

  async registerSupplier(dto: RegisterSupplierDto) {
    return this.registerUser(dto.phone, dto.email, dto.password, Role.SUPPLIER, AccountStatus.PENDING_REVIEW, async (userId) => {
      await this.suppliers.create({
        userId,
        legalName: dto.legalName,
        tradeName: dto.tradeName,
        nif: dto.nif,
        responsibleName: dto.responsibleName,
        commercialRegistration: dto.commercialRegistration?.trim() || null,
        activity: dto.activity?.trim() || null,
        phoneAlt: dto.phoneAlt?.trim() || null,
        province: dto.province?.trim() || null,
        municipality: dto.municipality?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
      });
    });
  }

  async login(dto: LoginDto) {
    const candidate = await this.users.findByPhone(dto.phone);
    const user = candidate ?? (await this.users.findByPhone(dto.phone));

    if (!user) throw new UnauthorizedException('Telefone ou palavra-passe inválidos.');

    // Use the role from the login DTO if provided, otherwise use the user's actual role from DB
    let role: Role;
    if (dto.role) {
      role = dto.role as Role;
    } else {
      role = user.role;
    }

    const suspendedOrRejected = ['SUSPENDED', 'REJECTED'].includes(user.status as string);
    if (suspendedOrRejected) {
      throw new UnauthorizedException(`Conta ${user.status}.`);
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Telefone ou palavra-passe inválidos.');

    if (user.status === AccountStatus.SUSPENDED || user.status === AccountStatus.REJECTED) {
      throw new UnauthorizedException(`Conta ${user.status.toLowerCase()}.`);
    }

    const accessToken = await this.jwt.signAsync({ sub: user.id, jti: randomUUID(), role: user.role, status: user.status, phone: user.phone });

    return {
      accessToken,
      user: this.publicUser(user),
    };
  }

  async logout(userId: string, jti?: string, exp?: number) {
    if (jti) {
      const expiresAt = exp ? new Date(exp * 1000) : new Date(Date.now() + 60 * 60 * 1000);
      if (expiresAt > new Date()) await this.prisma.revokedToken.upsert({ where: { jti }, update: { expiresAt }, create: { jti, expiresAt } });
    }
    return { loggedOut: true, userId };
  }

  async me(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException('Utilizador não encontrado.');
    return this.publicUser(user);
  }

  async updateCustomerProfile(userId: string, dto: UpdateCustomerProfileDto) {
    const fullName = dto.fullName?.trim();
    const email = dto.email === undefined ? undefined : dto.email?.trim().toLowerCase() || null;
    if (fullName === undefined && email === undefined) {
      throw new BadRequestException('Informe pelo menos um dado para atualizar.');
    }

    try {
      const user = await this.users.updateCustomerProfile(userId, { fullName, email });
      return this.publicUser(user);
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('O email informado já está associado a outra conta.');
      }
      throw error;
    }
  }

  private async registerProfessional(dto: RegisterDriverDto) {
    return this.registerUser(dto.phone, dto.email, dto.password, Role.DRIVER, AccountStatus.ACTIVE, async (userId) => {
      const data = {
        userId,
        fullName: dto.fullName,
        documentNumber: dto.documentNumber,
        vehicleType: dto.vehicleType,
        vehiclePlate: dto.vehiclePlate?.trim() || null,
        driverLicenseNumber: dto.driverLicenseNumber?.trim() || null,
        nif: dto.nif?.trim() || null,
        experienceYears: dto.experienceYears ?? 0,
        province: dto.province?.trim() || null,
        municipality: dto.municipality?.trim() || null,
        neighborhood: dto.neighborhood?.trim() || null,
        address: dto.address?.trim() || null,
        insurancePolicyNumber: dto.insurancePolicyNumber?.trim() || null,
        insuranceExpiresAt: dto.insuranceExpiresAt ? new Date(dto.insuranceExpiresAt) : null,
        vehicleCapacityKg: dto.vehicleCapacityKg ?? 45,
      };
      await this.drivers.create(data);
    });
  }

  private async registerUser(
    phone: string,
    email: string | undefined,
    password: string,
    role: Role,
    status: AccountStatus,
    createProfile: (userId: string) => Promise<void>,
  ) {
    const normalizedPhone = phone.trim();
    const existing = await this.users.findByPhoneAndRole(normalizedPhone, role);
    if (existing) throw new ConflictException('Já existe uma conta com este telefone.');

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await this.users.create({ phone: normalizedPhone, email: email?.trim().toLowerCase(), passwordHash, role, status });

    try {
      await createProfile(user.id);
    } catch (error) {
      await this.users.deleteById(user.id).catch(() => undefined);
      const code = (error as { code?: string })?.code;
      if (code === 'P2002') {
        throw new ConflictException('Os dados informados já estão em uso.');
      }
      throw new InternalServerErrorException('Não foi possível concluir o cadastro.');
    }

    const currentUser = await this.users.findById(user.id);
    if (!currentUser) throw new InternalServerErrorException('Não foi possível carregar a conta criada.');
    return {
      message: role === Role.CUSTOMER ? 'Conta criada com sucesso.' : 'Candidatura enviada para análise.',
      user: this.publicUser(currentUser),
    };
  }

  private publicUser(user: Pick<UserRecord, 'id' | 'name' | 'phone' | 'email' | 'role' | 'status' | 'reviewedAt' | 'reviewNote'>) {
    return {
      id: user.id,
      name: user.name ?? undefined,
      phone: user.phone,
      email: user.email,
      role: user.role,
      status: user.status,
      reviewedAt: user.reviewedAt ?? null,
      reviewNote: user.reviewNote ?? null,
    };
  }
}
