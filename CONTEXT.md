# Contexto do Projeto: Gemini CLI

## Descrição Geral

O Gemini CLI é uma ferramenta de linha de comando (CLI) baseada em IA, projetada para otimizar e acelerar os fluxos de trabalho de desenvolvimento de software. Ele se integra a ferramentas existentes, compreende a base de código e automatiza tarefas operacionais.

## Funcionalidades Principais

- **Consulta e Edição de Código:** Permite interagir com grandes bases de código, superando a janela de contexto de 1 milhão de tokens do Gemini.
- **Geração de Código Multimodal:** Capaz de criar novos aplicativos a partir de PDFs ou esboços.
- **Automação de Tarefas:** Automatiza tarefas como consultar pull requests ou realizar rebases complexos.
- **Extensibilidade:** Conecta-se a novas funcionalidades através de ferramentas e servidores MCP (Model-Centric Protocol), como a geração de mídia com Imagen, Veo ou Lyria.
- **Integração com Google Search:** Utiliza a ferramenta de busca do Google para embasar as respostas.

## Tecnologias Utilizadas

- **Linguagem:** TypeScript
- **Ambiente de Execução:** Node.js (versão 18 ou superior)
- **Interface do CLI:** React com Ink
- **Build e Bundling:** ESbuild
- **Testes:** Vitest
- **Linting e Formatação:** ESLint e Prettier

## Estrutura do Projeto

O projeto é um monorepo gerenciado com npm workspaces, com a seguinte estrutura principal:

- `packages/`: Contém os pacotes principais da aplicação.
  - `cli/`: O código-fonte da aplicação de linha de comando.
  - `core/`: A lógica central e as funcionalidades principais.
- `scripts/`: Diversos scripts para build, teste e automação de tarefas de desenvolvimento.
- `docs/`: Documentação completa do projeto.
- `integration-tests/`: Testes de integração.

## Fluxo de Desenvolvimento

- **Validação Completa:** O comando `npm run preflight` executa todas as verificações de qualidade: build, testes, checagem de tipos e linting.
- **Testes:** Os testes são escritos com Vitest e estão localizados junto aos arquivos de código-fonte que eles testam.
- **Padrões de Código:** O projeto segue diretrizes estritas para a escrita de código TypeScript e React, favorecendo objetos simples em vez de classes, e o uso de módulos ES para encapsulamento.
