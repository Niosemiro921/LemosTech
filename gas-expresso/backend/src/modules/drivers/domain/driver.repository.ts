export abstract class DriverRepositoryPort {
  abstract create(input: {
    userId: string;
    fullName: string;
    documentNumber: string;
    vehicleType: string;
  }): Promise<void>;
}
