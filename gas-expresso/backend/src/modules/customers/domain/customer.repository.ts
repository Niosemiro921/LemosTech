export abstract class CustomerRepositoryPort {
  abstract create(input: { userId: string; fullName: string }): Promise<void>;
}
