import { resolveLocationSuggestion } from './resolveLocationSuggestion';

describe('resolveLocationSuggestion', () => {
  it('preenche na primeira seleção, com o campo vazio', () => {
    expect(
      resolveLocationSuggestion({
        current: '',
        previousSuggestion: '',
        nextSuggestion: 'Rua A, SP',
      }),
    ).toBe('Rua A, SP');
  });

  it('trata campo só com espaços como vazio', () => {
    expect(
      resolveLocationSuggestion({
        current: '   ',
        previousSuggestion: '',
        nextSuggestion: 'Rua A, SP',
      }),
    ).toBe('Rua A, SP');
  });

  it('troca a sugestão ao mudar de tomador se o campo não foi editado', () => {
    expect(
      resolveLocationSuggestion({
        current: 'Rua A, SP',
        previousSuggestion: 'Rua A, SP',
        nextSuggestion: 'Rua B, RS',
      }),
    ).toBe('Rua B, RS');
  });

  it('mantém o texto que o usuário editou', () => {
    expect(
      resolveLocationSuggestion({
        current: 'Sala 2 da clínica',
        previousSuggestion: 'Rua A, SP',
        nextSuggestion: 'Rua B, RS',
      }),
    ).toBe('Sala 2 da clínica');
  });

  it('tomador sem endereço limpa a sugestão anterior', () => {
    expect(
      resolveLocationSuggestion({
        current: 'Rua A, SP',
        previousSuggestion: 'Rua A, SP',
        nextSuggestion: '',
      }),
    ).toBe('');
  });

  it('tomador sem endereço não apaga o texto editado', () => {
    expect(
      resolveLocationSuggestion({
        current: 'Sala 2 da clínica',
        previousSuggestion: 'Rua A, SP',
        nextSuggestion: '',
      }),
    ).toBe('Sala 2 da clínica');
  });
});