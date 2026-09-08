import { InventoryNotificationsScreen } from './InventoryNotificationsScreen';
import { IsoDate } from '../domain/expiryAlert';
import { InventoryItem } from '../domain/inventoryNotifications';

// Data fixa para os exemplos ficarem estáveis: sem isso os alertas de validade
// sairiam da janela conforme o tempo passa e a tela mudaria sozinha.
const REFERENCE_DATE = new Date(2026, 8, 13, 10, 0);

const MINUTES = 60 * 1000;

function minutesAgo(minutes: number): number {
  return REFERENCE_DATE.getTime() - minutes * MINUTES;
}

/**
 * DADOS MOCKADOS — some quando a aba de Estoque passar os itens reais.
 * O conteúdo daqui não é usado por nenhuma lógica: é só entrada para conferir
 * o visual da lista.
 */
const MOCK_ITEMS: InventoryItem[] = [
  {
    id: 'isoflurano',
    name: 'Isoflurano',
    unit: 'frasco',
    quantity: 2,
    minimumStock: 3,
    expirationDate: '2027-05-10' as IsoDate,
  },
  {
    id: 'dipirona',
    name: 'Dipirona Monoidratada 10mg',
    unit: 'ampola',
    quantity: 40,
    minimumStock: 10,
    expirationDate: '2026-09-20' as IsoDate,
  },
  {
    id: 'cetamina',
    name: 'Cetamina 50mg/ml',
    unit: 'frasco',
    quantity: 3,
    minimumStock: 5,
    expirationDate: '2027-11-02' as IsoDate,
  },
  {
    id: 'midazolam',
    name: 'Midazolam 5mg/ml',
    unit: 'ampola',
    quantity: 6,
    minimumStock: 12,
    expirationDate: '2027-03-18' as IsoDate,
  },
  {
    id: 'lidocaina',
    name: 'Cloridrato de lidocaína 2%',
    unit: 'frasco',
    quantity: 5,
    minimumStock: 8,
    expirationDate: '2027-08-30' as IsoDate,
  },
  {
    id: 'tramadol',
    name: 'Tramadol 50mg/ml',
    unit: 'ampola',
    quantity: 7,
    minimumStock: 15,
    expirationDate: '2026-09-18' as IsoDate,
  },
  {
    id: 'luvas',
    name: 'Luvas cirúrgicas estéreis 7.5',
    unit: 'par',
    quantity: 8,
    minimumStock: 20,
    expirationDate: '2028-01-15' as IsoDate,
  },
  {
    id: 'seringa',
    name: 'Seringa 10ml',
    unit: 'unidade',
    quantity: 25,
    minimumStock: 50,
    expirationDate: '2029-04-01' as IsoDate,
  },
];

// Carimbos fixos só para os exemplos mostrarem tempos variados.
const MOCK_TIMESTAMPS: Record<string, number> = {
  'lowStock:isoflurano': minutesAgo(10),
  'expiry:dipirona': minutesAgo(10),
  'lowStock:cetamina': minutesAgo(35),
  'lowStock:midazolam': minutesAgo(90),
  'lowStock:lidocaina': minutesAgo(240),
  'lowStock:tramadol': minutesAgo(1500),
  'expiry:tramadol': minutesAgo(20),
  'lowStock:luvas': minutesAgo(4320),
  'lowStock:seringa': minutesAgo(11000),
};

export function MockedNotificationsScreen() {
  return (
    <InventoryNotificationsScreen
      items={MOCK_ITEMS}
      referenceDate={REFERENCE_DATE}
      seedTimestamps={MOCK_TIMESTAMPS}
    />
  );
}
