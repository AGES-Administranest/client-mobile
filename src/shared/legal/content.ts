export type LegalDocument = 'privacyPolicy' | 'termsOfUse';

type Section = { heading: string; paragraphs: string[] };
type LegalText = { title: string; updated: string; sections: Section[] };

// Official texts (pt-BR only). Keep in sync with the PDFs from the company.
// ponytail: "[A DEFINIR]" contact/location fields are still open on the
// company side; fill them here before the public release.
export const LEGAL_TEXTS: Record<LegalDocument, LegalText> = {
  privacyPolicy: {
    title: 'Política de Privacidade',
    updated: 'Última atualização: 16/11/2026',
    sections: [
      {
        heading: '1. Identificação da controladora',
        paragraphs: [
          'Esta Política de Privacidade descreve como IVY DE LA ROCQUE ANESTESIOLOGIA VETERINÁRIA LTDA., inscrita no CNPJ sob nº 54.599.610/0001-82 (EMPRESA), trata dados pessoais no aplicativo ADMINISTRANEST, destinado à gestão financeira e operacional de médicos-veterinários.',
          'Esta Política deve ser lida em conjunto com os Termos de Uso. A EMPRESA deverá definir e divulgar um canal de contato para solicitações relacionadas à privacidade antes da disponibilização pública do aplicativo.',
        ],
      },
      {
        heading: '2. Dados tratados',
        paragraphs: [
          '2.1. Dados cadastrais e profissionais: nome, e-mail, número de registro no CRMV e credenciais necessárias à autenticação da conta.',
          '2.2. CPF: o ADMINISTRANEST não solicitará CPF como requisito de cadastro dos usuários.',
          '2.3. Idade e data de nascimento: poderão ser solicitadas de forma facultativa. Se fornecidas, poderão subsidiar análises internas agregadas sobre perfil etário, renda média e produtividade profissional. A EMPRESA deverá limitar o uso ao necessário e evitar a identificação individual nos resultados estatísticos.',
          '2.4. Gênero ou forma de tratamento: informação facultativa, destinada exclusivamente a ajustar a forma de tratamento e os pronomes utilizados pelo aplicativo. O usuário poderá deixar o campo em branco ou alterar a informação, conforme as opções disponibilizadas.',
          '2.5. Dados financeiros e econômicos: receitas, despesas, custos pessoais e profissionais, custos fixos e variáveis, valores cobrados por procedimentos, investimentos, aquisições e informações necessárias à elaboração de relatórios financeiros.',
          '2.6. Dados de veículos e equipamentos: marca, modelo, consumo, dados e valores de aquisição, datas de aquisição e informações sobre equipamentos e materiais utilizados na atividade profissional.',
          '2.7. Dados de pacientes veterinários: poderão incluir nome, idade, sexo, raça, peso, local do procedimento anestésico e valor cobrado. Dados de animais, isoladamente, não são dados pessoais de pessoa natural; poderão, contudo, tornar-se relacionados a pessoa identificável quando associados a informações de tutores ou outros indivíduos.',
          '2.8. Dados de tutores e terceiros: o cadastro de tutores não será obrigatório. O usuário poderá inserir dados pessoais em campos de observações, devendo evitar informações desnecessárias e assegurar que possui base legal para o tratamento.',
        ],
      },
      {
        heading: '3. Finalidades do tratamento',
        paragraphs: [
          'Os dados poderão ser utilizados para criar e administrar contas; autenticar usuários e confirmar cadastros por e-mail; disponibilizar ferramentas de gestão financeira e operacional; organizar receitas, despesas e custos; realizar cálculos estimados de depreciação; gerar relatórios; controlar materiais, equipamentos e estoque; organizar informações de procedimentos; prestar suporte; comunicar atualizações relevantes; garantir a segurança e prevenir fraudes; cumprir obrigações legais e regulatórias; e, quando idade ou data de nascimento forem voluntariamente informadas, produzir análises estatísticas internas agregadas sobre perfil etário, renda média e produtividade profissional.',
        ],
      },
      {
        heading: '4. Bases legais',
        paragraphs: [
          'O tratamento poderá ocorrer com fundamento nas hipóteses previstas na Lei nº 13.709/2018 (LGPD), especialmente execução de contrato ou de procedimentos preliminares; cumprimento de obrigação legal ou regulatória; exercício regular de direitos; legítimo interesse, quando aplicável e após avaliação dos direitos e expectativas dos titulares; e consentimento, quando necessário para finalidades específicas.',
          'A base legal será definida conforme a finalidade de cada operação. O consentimento não será utilizado indistintamente para todas as atividades. Campos opcionais não deverão ser tratados como condição para acesso às funcionalidades que não dependam dessas informações.',
        ],
      },
      {
        heading: '5. Armazenamento e segurança',
        paragraphs: [
          '5.1. Os dados serão armazenados em infraestrutura tecnológica destinada ao funcionamento do aplicativo. O fornecedor de hospedagem e armazenamento ainda será definido pela EMPRESA; esta Política deverá ser atualizada se a escolha implicar informação relevante sobre fornecedores, localização dos dados ou transferência internacional.',
          '5.2. A EMPRESA adotará medidas técnicas e administrativas razoáveis para proteger as informações contra acessos não autorizados, destruição, perda, alteração, comunicação ou tratamento inadequado ou ilícito.',
          '5.3. Conforme a arquitetura efetivamente adotada, poderão ser utilizados mecanismos de autenticação, controle de acesso, criptografia, cópias de segurança e outras medidas de proteção.',
          '5.4. O acesso administrativo será restrito a pessoas autorizadas que necessitem das informações para suporte, manutenção, segurança, atendimento de solicitações ou cumprimento de obrigações legais, observados necessidade, finalidade e confidencialidade.',
          '5.5. Nenhum sistema eletrônico pode garantir proteção absoluta contra todos os riscos existentes.',
        ],
      },
      {
        heading: '6. Exportação de relatórios',
        paragraphs: [
          'O aplicativo poderá permitir a exportação de relatórios financeiros, operacionais e gerenciais. Após a exportação, os arquivos poderão ser armazenados em dispositivos ou serviços externos ao aplicativo. O usuário será responsável por protegê-los, controlar seu compartilhamento e evitar o acesso por pessoas não autorizadas.',
        ],
      },
      {
        heading: '7. Compartilhamento de informações',
        paragraphs: [
          'A EMPRESA não comercializa dados pessoais dos usuários. As informações poderão ser compartilhadas estritamente quando necessário com fornecedores de infraestrutura, hospedagem e armazenamento em nuvem; prestadores de serviços tecnológicos; serviços de envio de e-mails e autenticação; fornecedores de segurança da informação; autoridades públicas, quando houver obrigação legal ou determinação válida; ou terceiros mediante autorização ou outra hipótese legal aplicável.',
          'Os prestadores que tiverem acesso aos dados deverão estar sujeitos a obrigações contratuais de confidencialidade e proteção compatíveis com suas atividades. Eventuais transferências internacionais deverão observar a LGPD e a regulamentação aplicável.',
        ],
      },
      {
        heading: '8. Relatórios e uso estatístico',
        paragraphs: [
          'Os relatórios financeiros e gerenciais serão disponibilizados ao próprio usuário, com base nas informações cadastradas em sua conta. Os dados financeiros e operacionais serão utilizados para as funcionalidades do aplicativo.',
          'Informações de idade ou data de nascimento, quando fornecidas, poderão ser usadas para análises internas de renda média e produtividade por faixa etária. Sempre que possível, essas análises serão realizadas com dados agregados ou efetivamente anonimizados, sem divulgação de resultados que permitam identificar usuários. Dados individualizados não serão disponibilizados publicamente.',
        ],
      },
      {
        heading: '9. Prazo de armazenamento e conservação',
        paragraphs: [
          'A EMPRESA conservará dados pessoais pelo período necessário às finalidades informadas, observando os princípios da finalidade, adequação e necessidade. A LGPD não estabelece um prazo geral único de cinco anos para todos os dados pessoais; os períodos variam conforme a categoria de informação, a finalidade e as obrigações legais aplicáveis.',
          'Dados cadastrais: serão mantidos enquanto a conta estiver ativa e forem necessários à prestação dos serviços. Após o encerramento, serão eliminados ou anonimizados, ressalvadas as hipóteses legais de conservação.',
          'Registros de acesso ao aplicativo: quando a EMPRESA estiver sujeita ao artigo 15 do Marco Civil da Internet, os registros de acesso a aplicações serão conservados pelo prazo legal de seis meses, sob sigilo e em ambiente controlado e seguro. Esse prazo se refere aos registros de acesso, não ao conteúdo dos dados cadastrados pelo usuário.',
          'Registros de procedimentos e prontuários médico-veterinários: informações que efetivamente integrem prontuários médico-veterinários deverão observar o prazo mínimo de cinco anos após a data do último atendimento, conforme o artigo 9º, § 3º, da Resolução CFMV nº 1.321/2020, consideradas suas alterações. A aplicação desse prazo depende da natureza do registro; ele não significa que todo dado inserido no aplicativo deva ser mantido por cinco anos.',
          'Informações financeiras, fiscais e contábeis: serão conservadas pelos prazos exigidos pela legislação aplicável à natureza de cada documento e obrigação. Não se presume que todos os lançamentos financeiros inseridos no aplicativo estejam sujeitos a um único prazo de cinco anos.',
          'Dados estatísticos: poderão ser conservados após anonimização efetiva ou agregação que impeça a identificação dos titulares, observada a legislação aplicável.',
          'Encerrada a finalidade, os dados serão eliminados ou anonimizados, salvo hipóteses de conservação autorizadas pelo artigo 16 da LGPD, como cumprimento de obrigação legal ou regulatória e exercício regular de direitos. Cópias de segurança poderão permanecer temporariamente, de acordo com ciclos técnicos de retenção e exclusão, com controles para impedir seu uso indevido.',
        ],
      },
      {
        heading: '10. Direitos dos titulares',
        paragraphs: [
          'Nos termos da LGPD, o titular poderá solicitar, observadas as condições legais, confirmação da existência de tratamento; acesso aos dados; correção de dados incompletos, inexatos ou desatualizados; anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados irregularmente; portabilidade, quando aplicável; informação sobre compartilhamento; revogação do consentimento, quando essa for a base legal; e eliminação de dados tratados com consentimento, ressalvadas as hipóteses legais de conservação.',
          'As solicitações poderão ser realizadas pelo canal de contato informado nesta Política. A EMPRESA poderá solicitar informações razoáveis para confirmar a identidade do solicitante e proteger os dados contra acesso indevido.',
        ],
      },
      {
        heading: '11. Exclusão da conta',
        paragraphs: [
          'O usuário poderá solicitar a exclusão de sua conta por meio dos canais disponibilizados pelo aplicativo. A exclusão será processada observadas as exigências técnicas e legais aplicáveis. A eliminação da conta não implicará necessariamente a exclusão imediata de todas as informações quando existir obrigação ou fundamento legal para sua conservação. Quando aplicável, a EMPRESA informará a conservação residual e sua justificativa.',
        ],
      },
      {
        heading: '12. Responsabilidade sobre dados de terceiros',
        paragraphs: [
          'O usuário é responsável pelas informações de terceiros que inserir no aplicativo, especialmente dados de tutores e informações que permitam identificar pessoas naturais. Deverá assegurar a existência de base legal adequada e limitar os dados ao necessário para a finalidade profissional.',
          'A definição dos papéis de controlador e operador poderá variar conforme a operação de tratamento e as decisões efetivamente tomadas pela EMPRESA e pelo usuário. Essa definição deverá ser refletida nos contratos e na operação real do serviço.',
        ],
      },
      {
        heading: '13. Alterações nesta Política',
        paragraphs: [
          'Esta Política poderá ser atualizada para acompanhar alterações legislativas, tecnológicas, operacionais e comerciais. As alterações relevantes serão comunicadas aos usuários pelos meios disponíveis, incluindo notificações no aplicativo ou mensagens eletrônicas. Quando uma alteração exigir nova base legal ou consentimento, a EMPRESA adotará as providências correspondentes.',
        ],
      },
      {
        heading: '14. Contato e solicitações de privacidade',
        paragraphs: [
          'Empresa: IVY DE LA ROCQUE ANESTESIOLOGIA VETERINÁRIA LTDA.',
          'CNPJ: 54.599.610/0001-82',
          'E-mail de privacidade: [A DEFINIR]',
          'Localização: [A DEFINIR]',
          'Os campos de e-mail e localização deverão ser preenchidos antes da publicação da Política. A EMPRESA deverá manter um canal efetivo para receber e responder às solicitações dos titulares.',
        ],
      },
      {
        heading: '15. Legislação aplicável',
        paragraphs: [
          'Esta Política será interpretada conforme a legislação brasileira, especialmente a Lei nº 13.709/2018 (Lei Geral de Proteção de Dados Pessoais – LGPD), a Lei nº 12.965/2014 (Marco Civil da Internet) e as normas profissionais aplicáveis aos registros médico-veterinários.',
        ],
      },
    ],
  },
  termsOfUse: {
    title: 'Termos de Uso',
    updated: 'Última atualização: 16/11/2026',
    sections: [
      {
        heading: '1. Identificação e apresentação',
        paragraphs: [
          'O presente Termo de Uso estabelece as condições para acesso e utilização do aplicativo ADMINISTRANEST, desenvolvido e administrado por IVY DE LA ROCQUE ANESTESIOLOGIA VETERINÁRIA LTDA., inscrita no CNPJ sob nº 54.599.610/0001-82, doravante denominada EMPRESA.',
          'O ADMINISTRANEST é uma ferramenta digital destinada a médicos-veterinários, especialmente profissionais que atuam na área de anestesiologia veterinária, com a finalidade de auxiliar na organização, gestão financeira, controle operacional e planejamento econômico de suas atividades profissionais.',
          'Ao concluir o cadastro e selecionar a opção de aceite, o usuário declara que leu, compreendeu e concorda com as condições deste documento.',
        ],
      },
      {
        heading: '2. Cadastro e acesso',
        paragraphs: [
          '2.1. Para utilizar as funcionalidades do aplicativo, o usuário deverá realizar cadastro individual, fornecendo as informações solicitadas, incluindo dados pessoais e profissionais.',
          '2.2. O cadastro poderá incluir nome completo, endereço eletrônico (e-mail), número de registro no Conselho Regional de Medicina Veterinária (CRMV) e, facultativamente, idade, data de nascimento e informação de gênero ou forma de tratamento/pronome preferido. O ADMINISTRANEST não solicitará CPF como requisito de cadastro.',
          '2.3. A idade e a data de nascimento serão opcionais. Caso fornecidas, poderão ser utilizadas, de forma agregada ou estatística, em análises internas sobre perfil etário, renda média e produtividade profissional, observadas as finalidades informadas na Política de Privacidade e a legislação aplicável.',
          '2.4. A informação de gênero ou forma de tratamento será facultativa e terá como finalidade ajustar a forma de tratamento e os pronomes utilizados nas comunicações do aplicativo.',
          '2.5. A confirmação da conta poderá ser realizada por meio de mensagem enviada ao endereço eletrônico informado no cadastro.',
          '2.6. O usuário é responsável pela veracidade, atualização e exatidão das informações fornecidas.',
          '2.7. O acesso será realizado mediante credenciais individuais, compostas por e-mail e senha. O usuário deverá manter a senha em sigilo e comunicar à EMPRESA qualquer suspeita de acesso não autorizado.',
          '2.8. A EMPRESA poderá adotar mecanismos de verificação e segurança para preservar a integridade das contas cadastradas.',
        ],
      },
      {
        heading: '3. Funcionalidades do aplicativo',
        paragraphs: [
          'O aplicativo disponibiliza ferramentas destinadas à organização e gestão da atividade profissional do médico-veterinário, podendo contemplar:',
          '• Cadastro e acompanhamento de receitas e despesas pessoais e profissionais;',
          '• Organização de custos fixos e variáveis;',
          '• Controle de estoque de materiais, medicamentos e insumos;',
          '• Cadastro e gerenciamento de equipamentos utilizados na atividade profissional;',
          '• Cadastro de veículos utilizados no exercício profissional;',
          '• Cálculo estimado de depreciação de veículos, equipamentos e materiais;',
          '• Organização de informações relacionadas a procedimentos anestésicos;',
          '• Registro de informações básicas de pacientes veterinários;',
          '• Registro de valores cobrados por procedimentos;',
          '• Geração e exportação de relatórios financeiros, operacionais e gerenciais.',
          'A EMPRESA poderá implementar, atualizar, modificar ou descontinuar funcionalidades, respeitando a legislação aplicável e comunicando alterações relevantes aos usuários.',
        ],
      },
      {
        heading: '4. Responsabilidade sobre as informações cadastradas',
        paragraphs: [
          '4.1. O usuário será responsável pelas informações inseridas no aplicativo, incluindo dados financeiros, receitas, despesas, valores de procedimentos, custos de aquisição de equipamentos, informações sobre veículos e dados de pacientes.',
          '4.2. O usuário deverá assegurar que possui autorização ou fundamento legal adequado para inserir informações de terceiros, especialmente dados de tutores de animais.',
          '4.3. O usuário deverá evitar inserir informações pessoais desnecessárias de tutores ou terceiros nos campos de observações. Sempre que possível, deverá limitar os registros aos dados necessários à finalidade profissional.',
          '4.4. A EMPRESA não será responsável por inconsistências decorrentes de informações incorretas, incompletas ou desatualizadas fornecidas pelo usuário.',
          '4.5. O usuário deverá manter suas informações atualizadas e verificar os dados cadastrados antes de utilizar os relatórios gerados para tomar decisões financeiras ou administrativas.',
        ],
      },
      {
        heading: '5. Relatórios, cálculos e informações financeiras',
        paragraphs: [
          '5.1. O aplicativo disponibiliza ferramentas de organização financeira, cálculos e relatórios gerenciais com finalidade informativa e de apoio à tomada de decisões.',
          '5.2. Os resultados apresentados dependem das informações inseridas pelo usuário e dos critérios de cálculo implementados no aplicativo.',
          '5.3. Os cálculos de custos, rentabilidade, receitas, despesas, depreciação e indicadores financeiros não constituem auditoria contábil, consultoria financeira, avaliação patrimonial oficial ou orientação tributária.',
          '5.4. Os valores de depreciação apresentados possuem caráter estimativo e gerencial, não substituindo critérios contábeis, fiscais ou avaliações técnicas específicas.',
          '5.5. A decisão sobre preços, investimentos, aquisição de equipamentos e condução financeira da atividade profissional permanece sob responsabilidade do usuário.',
          '5.6. A EMPRESA não garante resultados financeiros, aumento de faturamento, lucratividade ou melhoria econômica decorrentes da utilização do aplicativo.',
        ],
      },
      {
        heading: '6. Exportação de relatórios e informações',
        paragraphs: [
          '6.1. O aplicativo poderá disponibilizar ferramentas para exportação de relatórios financeiros, operacionais e gerenciais, conforme os formatos e funcionalidades disponíveis.',
          '6.2. O usuário será responsável pela utilização, armazenamento, compartilhamento e proteção dos arquivos exportados.',
          '6.3. Após a exportação, os arquivos poderão ficar armazenados fora do ambiente do aplicativo, sob responsabilidade do usuário e sujeitos às condições de segurança do dispositivo ou serviço utilizado para armazená-los.',
          '6.4. O usuário deverá adotar cuidados para evitar o compartilhamento não autorizado de relatórios que contenham informações pessoais, financeiras ou profissionais.',
          '6.5. A exportação de relatórios não substitui a realização de cópias de segurança dos dados mantidos no aplicativo, nem constitui garantia de recuperação de informações em caso de falhas técnicas.',
        ],
      },
      {
        heading: '7. Limitação de finalidade profissional',
        paragraphs: [
          'O aplicativo possui finalidade administrativa, financeira e gerencial. Não se destina a substituir o julgamento clínico do médico-veterinário, protocolos anestésicos, avaliação individualizada de pacientes, exames, diagnósticos ou decisões relacionadas à assistência veterinária.',
          'As informações cadastradas sobre pacientes e procedimentos têm finalidade de organização profissional e gestão, não constituindo recomendação clínica ou prescrição anestésica.',
        ],
      },
      {
        heading: '8. Gratuidade e futuras modalidades de assinatura',
        paragraphs: [
          '8.1. Na data de disponibilização inicial, o aplicativo será oferecido gratuitamente aos usuários.',
          '8.2. A EMPRESA poderá implementar futuramente funcionalidades pagas, planos premium, assinaturas ou outros modelos comerciais.',
          '8.3. A eventual implementação de planos pagos deverá ser acompanhada de informações claras sobre preços, funcionalidades, condições de contratação, renovação e cancelamento.',
          '8.4. A adesão a qualquer plano pago dependerá de manifestação expressa do usuário, não sendo permitida a cobrança automática pela simples criação de uma modalidade premium.',
          '8.5. Alterações relevantes nas condições comerciais serão comunicadas previamente aos usuários.',
        ],
      },
      {
        heading: '9. Propriedade intelectual',
        paragraphs: [
          '9.1. O aplicativo, sua identidade visual, marca, logotipo, estrutura, organização, funcionalidades, códigos, conteúdos e demais elementos de propriedade intelectual pertencem à EMPRESA ou a seus respectivos licenciantes.',
          '9.2. É proibida a reprodução, cópia, distribuição, comercialização, engenharia reversa ou exploração não autorizada de qualquer elemento protegido do aplicativo, salvo nas hipóteses permitidas pela legislação.',
          '9.3. As informações inseridas pelo usuário permanecem sob sua titularidade e responsabilidade, não representando transferência de propriedade à EMPRESA.',
        ],
      },
      {
        heading: '10. Segurança, confidencialidade e acesso administrativo',
        paragraphs: [
          '10.1. A EMPRESA adotará medidas técnicas e administrativas razoáveis para proteger as informações armazenadas contra acessos não autorizados, perdas, alterações ou tratamentos inadequados.',
          '10.2. O acesso aos dados financeiros e profissionais será destinado ao próprio usuário e poderá ser realizado por integrantes autorizados da equipe administrativa da EMPRESA, quando necessário para suporte técnico, manutenção, segurança, atendimento de solicitações ou cumprimento de obrigações legais.',
          '10.3. O acesso administrativo deverá observar critérios de necessidade, finalidade e restrição de acesso, respeitando a confidencialidade das informações.',
          '10.4. A EMPRESA não deverá utilizar o acesso administrativo para consultar, explorar ou divulgar informações financeiras individualizadas dos usuários para finalidades incompatíveis com a prestação dos serviços ou sem fundamento legal adequado.',
          '10.5. A EMPRESA buscará manter o aplicativo disponível, podendo ocorrer interrupções decorrentes de manutenção, atualizações, falhas técnicas, indisponibilidade de serviços de terceiros ou situações alheias ao seu controle. Não garante disponibilidade ininterrupta ou funcionamento livre de falhas.',
          '10.6. O usuário deverá manter seus dispositivos protegidos e utilizar senhas seguras.',
        ],
      },
      {
        heading: '11. Suspensão e encerramento de contas',
        paragraphs: [
          '11.1. O usuário poderá solicitar o encerramento de sua conta, observadas as condições técnicas e legais aplicáveis.',
          '11.2. A EMPRESA poderá suspender ou encerrar contas em situações de uso ilícito, fraude, violação destes Termos ou comprometimento da segurança do aplicativo, respeitados os direitos do usuário e a legislação aplicável.',
          '11.3. O encerramento da conta poderá resultar na exclusão dos dados associados, ressalvadas as hipóteses de conservação previstas na legislação e na Política de Privacidade.',
        ],
      },
      {
        heading: '12. Alterações dos Termos de Uso',
        paragraphs: [
          'A EMPRESA poderá atualizar este documento para refletir mudanças legislativas, tecnológicas, operacionais ou comerciais. As alterações relevantes serão comunicadas aos usuários, podendo ser solicitada nova manifestação de concordância quando necessária.',
        ],
      },
      {
        heading: '13. Disposições gerais e contato',
        paragraphs: [
          '13.1. A utilização do aplicativo dependerá do aceite expresso destes Termos de Uso. A Política de Privacidade será apresentada separadamente para ciência do usuário.',
          '13.2. Caso alguma disposição seja considerada inválida, as demais permanecerão em vigor, na medida permitida pela legislação.',
          '13.3. Eventuais controvérsias serão resolvidas conforme a legislação brasileira, respeitadas as regras de competência aplicáveis.',
          'Responsável pelo aplicativo: IVY DE LA ROCQUE ANESTESIOLOGIA VETERINÁRIA LTDA.',
          'CNPJ: 54.599.610/0001-82',
          'E-mail de contato: [A DEFINIR]',
          'Localização: [A DEFINIR]',
        ],
      },
    ],
  },
};
