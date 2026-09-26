export type ClientType = 'CLINIC' | 'INDIVIDUAL';

export type TaxIdType = 'CPF' | 'CNPJ';

export type Weekday = 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN';

export type PaymentMethod = 'CARD' | 'BANK_SLIP' | 'PIX' | 'OTHER';

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

export type CreateClientPayload = {
  type: ClientType;
  name: string;
  taxId?: string;
  taxIdType?: TaxIdType;
  contactName?: string;
  email?: string;
  phone?: string;
  addressLine?: string;
  city?: string;
  state?: string;
};

export type DeletedClient = {
  id: string;
  name: string;
};
