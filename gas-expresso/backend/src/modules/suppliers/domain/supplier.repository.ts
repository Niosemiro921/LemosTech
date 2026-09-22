export abstract class SupplierRepositoryPort {
  abstract create(input: {
    userId: string;
    legalName: string;
    tradeName: string;
    nif: string;
    responsibleName: string;
  }): Promise<void>;
}
