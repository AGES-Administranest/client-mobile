import { appendPage, hasMorePages } from './appointmentPagination';

describe('hasMorePages', () => {
  it.each([
    [20, 20, true],
    [21, 20, true],
    [19, 20, false],
    [1, 20, false],
    [0, 20, false],
  ])('%i itens em página de %i → %s', (received, pageSize, expected) => {
    expect(hasMorePages(received, pageSize)).toBe(expected);
  });
});

describe('appendPage', () => {
  it('acrescenta a página nova ao fim, na ordem em que chegou', () => {
    expect(
      appendPage([{ id: 'a' }, { id: 'b' }], [{ id: 'c' }, { id: 'd' }]),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }]);
  });

  it('descarta o item que a paginação por offset repetiu entre duas páginas', () => {
    expect(
      appendPage([{ id: 'a' }, { id: 'b' }], [{ id: 'b' }, { id: 'c' }]),
    ).toEqual([{ id: 'a' }, { id: 'b' }, { id: 'c' }]);
  });

  it('aceita página vazia e lista inicial vazia', () => {
    expect(appendPage([{ id: 'a' }], [])).toEqual([{ id: 'a' }]);
    expect(appendPage([], [{ id: 'a' }])).toEqual([{ id: 'a' }]);
  });

  it('não altera a lista original', () => {
    const current = [{ id: 'a' }];
    appendPage(current, [{ id: 'b' }]);

    expect(current).toEqual([{ id: 'a' }]);
  });
});
