export class DriverGetOffersDto {
  // Parâmetros de filtros opcionais
  status?: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'COMPLETED';
  dateFrom?: string; // ISO date string
  dateTo?: string; // ISO date string
}

export class DriverAcceptOfferDto {
  // Apenas o ID da oferta
  offerId?: string;
}

export class DriverRejectOfferDto {
  // Apenas o ID da oferta
  offerId?: string;
}

export class DriverToggleStatusDto {
  // true para online, false para offline
  isOnline?: boolean;
}

export class DriverLocationDto {
  // Coordenadas geográficas
  latitude?: number;
  longitude?: number;
  // Timestamp em ISO 8601
  timestamp?: string;
}

export class DriverWalletGetDto {
  // Sem parâmetros - apenas consulta o saldo do usuário autenticado
}

export class DriverWalletGetTransactionsDto {
  // Parâmetros de filtros opcionais
  status?: 'PENDING' | 'COMPLETED' | 'FAILED';
  dateFrom?: string;
  dateTo?: string;
  limit?: number; // máximo de registros retornados
  offset?: number; // para paginação
}

export class DriverWalletTopUpDto {
  // Valor da recarga
  amount?: number;
  // Forma de pagamento (pode ser estendido no futuro)
  paymentMethod?: string;
}