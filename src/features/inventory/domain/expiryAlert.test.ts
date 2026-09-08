import {
  daysUntilExpiration,
  ExpiringItem,
  formatExpirationDate,
  isExpiringSoon,
  IsoDate,
  parseExpirationDate,
} from './expiryAlert';

const today = new Date(2026, 8, 8, 12);

function isoIn(daysFromToday: number): IsoDate {
  const date = new Date(today);
  date.setDate(date.getDate() + daysFromToday);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}` as IsoDate;
}

function item(id: string, daysFromToday: number): ExpiringItem {
  return { id, name: id, expirationDate: isoIn(daysFromToday) };
}

describe('parseExpirationDate', () => {
  it('aceita o formato ISO', () => {
    expect(parseExpirationDate('2026-09-15')).toEqual(new Date(2026, 8, 15));
  });

  // A máscara do cadastro (US09) é DD/MM/AAAA: tem que ser rejeitada aqui,
  // não virar NaN mais adiante.
  it('rejeita o formato de tela DD/MM/AAAA', () => {
    expect(parseExpirationDate('15/09/2026')).toBeNull();
  });

  it('rejeita ISO com hora e string vazia', () => {
    expect(parseExpirationDate('2026-09-15T00:00:00Z')).toBeNull();
    expect(parseExpirationDate('')).toBeNull();
  });

  it('rejeita data inexistente', () => {
    expect(parseExpirationDate('2026-02-31')).toBeNull();
    expect(parseExpirationDate('2026-13-01')).toBeNull();
  });

  it('aceita 29 de fevereiro em ano bissexto e rejeita fora dele', () => {
    expect(parseExpirationDate('2028-02-29')).toEqual(new Date(2028, 1, 29));
    expect(parseExpirationDate('2027-02-29')).toBeNull();
  });
});

describe('daysUntilExpiration', () => {
  it('conta dias inteiros ignorando a hora do dia', () => {
    expect(daysUntilExpiration(isoIn(0), today)).toBe(0);
    expect(daysUntilExpiration(isoIn(7), today)).toBe(7);
    expect(daysUntilExpiration(isoIn(-3), today)).toBe(-3);
  });

  it('devolve null para data ilegível', () => {
    expect(daysUntilExpiration('15/09/2026', today)).toBeNull();
  });
});

describe('isExpiringSoon', () => {
  it('ignora itens já vencidos', () => {
    expect(isExpiringSoon(item('propofol', -1), today)).toBe(false);
  });

  it('alerta um item que vence hoje', () => {
    expect(isExpiringSoon(item('propofol', 0), today)).toBe(true);
  });

  // A fronteira do CA6: exatamente 7 dias entra, 8 não.
  it('alerta até o limite de 7 dias', () => {
    expect(isExpiringSoon(item('propofol', 7), today)).toBe(true);
  });

  it('ignora itens que vencem depois da janela', () => {
    expect(isExpiringSoon(item('propofol', 8), today)).toBe(false);
    expect(isExpiringSoon(item('propofol', 30), today)).toBe(false);
  });

  it('não alerta com data inválida', () => {
    const broken = {
      id: 'x',
      name: 'x',
      expirationDate: '15/09/2026' as IsoDate,
    };

    expect(isExpiringSoon(broken, today)).toBe(false);
  });
});

describe('formatExpirationDate', () => {
  it('converte ISO para o formato que o usuário lê', () => {
    expect(formatExpirationDate('2026-09-20')).toBe('20/09/2026');
  });

  it('devolve o valor original quando não consegue interpretar', () => {
    expect(formatExpirationDate('20/09/2026')).toBe('20/09/2026');
  });
});
