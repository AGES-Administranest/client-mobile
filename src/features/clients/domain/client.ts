export type ClientType = 'CLINIC' | 'INDIVIDUAL';

export type TaxIdType = 'CPF' | 'CNPJ';

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type PaymentMethod = 'CARD' | 'BANK_SLIP' | 'PIX' | 'OTHER';

// Espelho do ClientEntity do backend (módulo client), que é a fonte da
// verdade. Campo opcional lá vem como `| null`, nunca ausente.
export type Client = {
  id: string;
  type: ClientType;
  name: string;
  taxId: string | null;
  taxIdType: TaxIdType | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  addressLine: string | null;
  city: string | null;
  state: string | null;
  serviceDays: Weekday[];
  paymentTermsDays: number | null;
  preferredPaymentMethod: PaymentMethod | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

// O que um campo de seleção precisa de um tomador: qualquer Client serve.
export type ClientOption = Pick<Client, 'id' | 'name'>;

// O CreateClientDto aceita mais campos (taxId, email, endereço, dias de
// atendimento…). O cadastro rápido manda só o mínimo de propósito: a edição
// completa do tomador fica para a tela de Clínicas.
export type CreateClientPayload = {
  type: ClientType;
  name: string;
  phone?: string;
};
