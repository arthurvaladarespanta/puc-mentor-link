# Calouro Connect

Vamos construir o protótipo funcional de um site chamado Calouro+ (sempre escrito assim, com o símbolo "+"), em português do Brasil. Ele conecta calouros a veteranos da PUC-Rio para aulas particulares. Uma mesma conta pode ser aluno (procura aulas) e tutor (oferece aulas) ao mesmo tempo — não existe escolha de papel.

Vou construir em etapas. NESTA mensagem: configure o backend (Lovable Cloud/Supabase), crie o banco completo e faça só a parte de conta e perfil. As outras telas vêm nas próximas mensagens.

=== DESIGN (vale para o site todo) ===

- Cores: Azul Tempestade #1d2b4f (textos principais, botões primários, bordas de foco), Âmbar Dourado #e2a63b (destaques e foco de teclado, com moderação), Off-White Amadeirado #f6f3eb (fundo do site), branco #ffffff (cartões), Azul Petróleo Escuro #2f6f62 (sucesso/confirmado), Carmim Médio #A83f32 (erros), Preto.

- Fontes (Google Fonts): Newsreader nos títulos, IBM Plex Sans em todo o resto.

- Visual "editorial acadêmico": sem sombras fortes; cartões brancos com borda 1px rgba(29,43,79,0.08) e cantos de 8px; botões e campos com cantos de 4px e 44px de altura; foco com contorno de 2px em #e2a63b. Fotos de perfil sempre redondas.

- Ícone de carregamento (spinner) em Âmbar Dourado sempre que algo estiver carregando.

- Erros em Carmim Médio, logo abaixo do campo, explicando o que aconteceu e como resolver.

- Telas vazias sempre mostram uma orientação do que fazer em seguida.

- Linguagem informal na medida certa, sem gírias. Frases em "sentence case".

- Responsivo (celular e desktop), e tudo navegável só com teclado (Tab).

- Use as imagens anexadas como referência de layout e estilo, mas IGNORE nelas: os textos "Student Profile" e "Portal Acadêmico", a "Política de Monitoria Acadêmica", os botões "Sucesso/Erro/alternar estados", o texto sobre SSL e o menu inferior com "Início/Monitores/Sessões/Acervo". O e-mail pode ser qualquer e-mail (não precisa ser institucional).

- Logo: use só o ícone do chapéu de formatura do logo anexado, recolorido em Azul Tempestade, ao lado do nome "Calouro+" em Newsreader.

=== BANCO DE DADOS (crie tudo agora, com RLS) ===

- cursos (id, nome) — já popule com cursos da PUC-Rio (Ciência da Computação, Engenharia de Computação, Engenharia Civil, Engenharia de Produção, Administração, Economia, Direito, Design, Sistemas de Informação).

- materias (id, nome, nome_normalizado UNIQUE)

- perfis (id = id do usuário do auth, nome, foto_url, curso_id, aviso_resumo_semanal boolean default true, aviso_nova_mensagem boolean default true, created_at)

- usuario_materias (usuario_id, materia_id) — matérias de interesse

- aulas (id, tutor_id, materia_id, descricao (até 400 caracteres), preco opcional, max_alunos opcional, local opcional, modo opcional 'presencial'|'online', selo opcional 'Monitoria'|'Veterano', created_at, updated_at, apagada_em nullable)

- aula_horarios (id, aula_id, inicio timestamptz, duracao_minutos 60 ou 120) — cada aula tem um ou mais horários marcados

- inscricoes (id, aula_id, horario_id, aluno_id, created_at, cancelada_em nullable) — o aluno se inscreve em UM horário específico da aula

- avaliacoes (id, inscricao_id UNIQUE, nota 1 a 5, comentario opcional, created_at) — o aluno avalia o tutor depois que o horário passou

- conversas (id, aula_id, aluno_id, tutor_id, created_at) — única por (aula_id, aluno_id)

- mensagens (id, conversa_id, autor_id, texto, anexo_url opcional, anexo_nome opcional, created_at)

- avisos (id, usuario_id, texto, lido boolean, created_at) — avisos dentro do site, ex.: aula cancelada

Crie buckets no storage para fotos de perfil e para anexos do chat.

Senhas ficam só no sistema de autenticação (nunca em texto puro em tabela nossa).

=== REGRA DAS MATÉRIAS (muito importante) ===

Crie uma função normalizarMateria(texto) que: remove acentos, converte para minúsculas, tira espaços do início e do fim e troca espaços repetidos por um só. Ex.: "Cálculo 1", "calculo 1", "  CÁLCULO   1 " → "calculo 1".

Crie um componente reutilizável SeletorDeMateria (vai ser usado de novo na criação de aula):

- Campo de busca; conforme a pessoa digita, sugere matérias existentes (comparando pelo nome normalizado).

- Se o texto digitado, normalizado, for igual a uma matéria existente, usa a existente em vez de criar outra.

- Só se não houver nenhuma equivalente, mostra a opção "Criar matéria '<texto>'".

- Permite escolher várias matérias (chips com botão de remover) ou só uma, conforme uma prop.

Escreva testes de unidade (Vitest) para normalizarMateria e para a lógica "encontrar equivalente ou criar".

=== TELAS DESTA ETAPA ===

1. Cadastro ("Cadastre-se"): e-mail, senha, confirmação de senha.

   - E-mail sem formato válido → "E-mail inválido" e não deixa continuar.

   - E-mail já cadastrado → avisar que já está em uso e sugerir entrar ou recuperar a senha.

   - Confirmação diferente → "As senhas não são iguais".

   - Campos de senha ocultos, com botão de olho para mostrar/esconder.

2. Logo depois do cadastro: tela para informar nome, curso (lista) e matérias de interesse (SeletorDeMateria). Ao concluir, vai direto para o Feed.

3. Login: e-mail e senha. Se errar qualquer um dos dois, mostrar só "Usuário ou senha incorretos" (sem dizer qual). Link "Esqueci minha senha". Senha com botão de mostrar/esconder.

4. Esqueci minha senha (layout da imagem anexada): pede o e-mail e sempre mostra a mesma mensagem, "Se esse e-mail tiver conta, enviamos um link para criar uma nova senha", exista a conta ou não. Faça também a tela de definir a nova senha, que abre pelo link.

5. Estrutura logada:

   - Topo: logo Calouro+ à esquerda; à direita, sino de avisos (com contador de não lidos) e a foto do usuário. Clicar na foto abre um menu com "Editar perfil" e "Sair" (sair acessível de qualquer tela).

   - Navegação (barra inferior no celular, barra lateral ou superior no desktop): "Feed", "Conversas", um botão central grande "+" em Âmbar Dourado para criar aula, e "Aulas" (minhas aulas).

   - As páginas Feed, Conversas, Criar aula e Aulas podem ficar só com um título e uma mensagem de "em breve" por enquanto.

6. Editar perfil (layout da imagem anexada): alterar foto (upload), nome, e-mail, senha e matérias de interesse (SeletorDeMateria), e dois interruptores: "Resumo semanal por e-mail" e "Aviso de nova mensagem por e-mail". Se tentar trocar para um e-mail que já é de outra conta, mostrar erro e manter o e-mail anterior. Botão "Salvar alterações" com confirmação de sucesso em Azul Petróleo.

Páginas logadas redirecionam para o login se a pessoa não estiver logada, e vice-versa.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://puc-mentor-link.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3a06d15d-66ef-4932-842a-8953683a270a).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
