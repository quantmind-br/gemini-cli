# MCP Gemini CLI Server

Um servidor MCP (Model Context Protocol) que expõe as capacidades do Gemini CLI para outras LLMs, permitindo delegação de tarefas de edição de código, análise e execução de comandos.

## Visão Geral

Este servidor MCP permite que outras LLMs utilizem o Gemini CLI como uma ferramenta externa, fornecendo acesso às seguintes capacidades:

- **Edição de Código**: Modificar arquivos existentes com base em prompts
- **Análise de Código**: Analisar código para encontrar problemas e sugestões
- **Criação de Arquivos**: Criar novos arquivos com conteúdo específico
- **Execução de Comandos**: Executar comandos shell de forma segura

## Ferramentas Disponíveis

### Ferramentas de Edição e Criação

#### 1. `gemini_edit_code`
Edita arquivos de código usando o Gemini CLI.

**Parâmetros:**
- `prompt` (obrigatório): Descrição das alterações desejadas
- `file_path` (opcional): Arquivo específico para editar
- `context_files` (opcional): Arquivos de contexto adicionais
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Diffs das alterações realizadas

#### 2. `gemini_write_file`
Cria ou modifica arquivos usando o Gemini CLI.

**Parâmetros:**
- `prompt` (obrigatório): Descrição do conteúdo do arquivo
- `file_path` (obrigatório): Caminho do arquivo a ser criado/modificado
- `overwrite` (opcional): Se deve sobrescrever arquivo existente
- `context_files` (opcional): Arquivos de contexto
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Diffs das alterações realizadas

### Ferramentas de Leitura e Navegação

#### 3. `gemini_read_file`
Lê o conteúdo de um arquivo específico.

**Parâmetros:**
- `file_path` (obrigatório): Caminho do arquivo para ler
- `start_line` (opcional): Linha inicial para leitura parcial
- `end_line` (opcional): Linha final para leitura parcial
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Conteúdo do arquivo

#### 4. `gemini_list_directory`
Lista o conteúdo de um diretório.

**Parâmetros:**
- `path` (obrigatório): Caminho do diretório para listar
- `ignore` (opcional): Padrões glob para ignorar
- `respect_git_ignore` (opcional): Respeitar .gitignore (padrão: true)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Lista de arquivos e diretórios

#### 5. `gemini_read_many_files`
Lê conteúdo de múltiplos arquivos ou diretórios.

**Parâmetros:**
- `paths` (obrigatório): Array de caminhos ou padrões glob
- `exclude` (opcional): Padrões para excluir
- `max_files` (opcional): Máximo de arquivos (padrão: 50)
- `respect_git_ignore` (opcional): Respeitar .gitignore (padrão: true)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Conteúdo concatenado dos arquivos

### Ferramentas de Busca

#### 6. `gemini_find_files`
Encontra arquivos usando padrões glob.

**Parâmetros:**
- `pattern` (obrigatório): Padrão glob (ex: "*.js", "src/**/*.ts")
- `path` (opcional): Diretório para buscar
- `case_sensitive` (opcional): Busca sensível a maiúsculas (padrão: false)
- `respect_git_ignore` (opcional): Respeitar .gitignore (padrão: true)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Lista de arquivos encontrados

#### 7. `gemini_search_content`
Busca texto dentro de arquivos usando regex.

**Parâmetros:**
- `pattern` (obrigatório): Padrão regex para buscar
- `path` (opcional): Diretório para buscar
- `include` (opcional): Padrão glob para incluir arquivos
- `exclude` (opcional): Padrão glob para excluir arquivos
- `case_sensitive` (opcional): Busca sensível a maiúsculas (padrão: false)
- `max_results` (opcional): Máximo de resultados (padrão: 100)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Resultados da busca com localizações

### Ferramentas de Análise

#### 8. `gemini_analyze_code`
Analisa código e fornece insights estruturados.

**Parâmetros:**
- `prompt` (obrigatório): Descrição da análise desejada
- `file_paths` (opcional): Arquivos específicos para analisar
- `analysis_type` (opcional): Tipo de análise (`code_review`, `security`, `performance`, `general`)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Análise estruturada com problemas, sugestões e métricas

### Ferramentas Web

#### 9. `gemini_web_fetch`
Busca conteúdo de uma URL.

**Parâmetros:**
- `url` (obrigatório): URL para buscar conteúdo
- `timeout_ms` (opcional): Timeout em ms (padrão: 30000)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Conteúdo da URL

#### 10. `gemini_web_search`
Realiza busca na web usando Google.

**Parâmetros:**
- `query` (obrigatório): Consulta de busca
- `max_results` (opcional): Máximo de resultados (padrão: 10)
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Resultados da busca web

### Ferramentas de Sistema

#### 11. `gemini_shell_command`
Executa comandos shell usando o Gemini CLI.

**Parâmetros:**
- `prompt` (obrigatório): Descrição do comando ou tarefa
- `working_directory` (opcional): Diretório de trabalho
- `timeout_ms` (opcional): Timeout para execução

**Retorno:** Comando executado e saída

#### 12. `gemini_memory`
Gerencia memória persistente entre sessões.

**Parâmetros:**
- `action` (obrigatório): Ação (`save`, `recall`, `list`, `clear`)
- `content` (opcional): Conteúdo para salvar (obrigatório para `save`)
- `key` (opcional): Chave para identificar o conteúdo
- `working_directory` (opcional): Diretório de trabalho

**Retorno:** Resultado da operação de memória

## Instalação

1. Clone o repositório:
```bash
git clone <repository-url>
cd mcp-gemini-cli
```

2. Instale as dependências:
```bash
npm install
```

3. Compile o projeto:
```bash
npm run build
```

## Configuração

O servidor pode ser configurado através de variáveis de ambiente:

- `GEMINI_CLI_PATH`: Caminho para o executável do Gemini CLI (padrão: `gemini`)
- `GEMINI_MODEL`: Modelo Gemini a ser usado (padrão: `gemini-2.0-flash-exp`)
- `MCP_TIMEOUT_MS`: Timeout para operações em ms (padrão: `300000`)
- `MCP_APPROVAL_MODE`: Modo de aprovação (`auto`, `manual`, `yolo`) (padrão: `yolo`)
- `MCP_MAX_CONTEXT_FILES`: Máximo de arquivos de contexto (padrão: `10`)
- `MCP_WORKING_DIRECTORY`: Diretório de trabalho padrão
- `MCP_DEBUG`: Habilitar modo debug (`true`/`false`)

## Uso

### Executar o Servidor

```bash
npm start
```

Ou diretamente:
```bash
node dist/server.js
```

### Integração com Clientes MCP

Configure o servidor em seu cliente MCP (como Claude Desktop, VS Code, etc.):

```json
{
  "mcpServers": {
    "gemini-cli": {
      "command": "node",
      "args": ["/path/to/mcp-gemini-cli/dist/server.js"],
      "env": {
        "GEMINI_CLI_PATH": "/path/to/gemini",
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

### Exemplo de Uso

```javascript
// Editar código
{
  "tool": "gemini_edit_code",
  "params": {
    "prompt": "Adicione tratamento de erro na função fetchData",
    "file_path": "src/api/client.ts",
    "context_files": ["src/types/api.ts"]
  }
}

// Analisar código
{
  "tool": "gemini_analyze_code",
  "params": {
    "prompt": "Analise este código para problemas de segurança",
    "file_paths": ["src/auth.ts"],
    "analysis_type": "security"
  }
}

// Criar arquivo
{
  "tool": "gemini_write_file",
  "params": {
    "prompt": "Crie um componente React para exibir uma lista de usuários",
    "file_path": "src/components/UserList.tsx"
  }
}

// Executar comando
{
  "tool": "gemini_shell_command",
  "params": {
    "prompt": "Execute os testes unitários do projeto",
    "working_directory": "/path/to/project"
  }
}
```

## Desenvolvimento

### Scripts Disponíveis

- `npm run build`: Compila o TypeScript
- `npm run dev`: Compila em modo watch
- `npm start`: Inicia o servidor
- `npm run clean`: Remove arquivos compilados
- `npm run lint`: Executa linting
- `npm run test`: Executa testes

### Estrutura do Projeto

```
src/
├── config/           # Configuração do servidor
├── tools/            # Implementação das ferramentas MCP
├── types/            # Definições de tipos TypeScript
├── utils/            # Utilitários (cliente Gemini, formatadores)
└── server.ts         # Servidor MCP principal
```

## Requisitos

- Node.js >= 18.0.0
- Gemini CLI instalado e configurado
- Chave de API do Gemini ou autenticação configurada

## Limitações

- Suporte apenas para extensões de arquivo configuradas
- Timeout configurável para operações longas
- Modo de aprovação configurável para segurança

## Licença

Apache-2.0

## Contribuição

Contribuições são bem-vindas! Por favor, abra issues ou pull requests para melhorias e correções.
