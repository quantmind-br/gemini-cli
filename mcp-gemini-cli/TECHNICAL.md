# Documentação Técnica - MCP Gemini CLI Server

## Arquitetura

### Visão Geral

O MCP Gemini CLI Server é uma aplicação Node.js/TypeScript que implementa o protocolo MCP (Model Context Protocol) para expor as capacidades do Gemini CLI como ferramentas que outras LLMs podem usar.

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Cliente MCP   │    │  MCP Server     │    │   Gemini CLI    │
│  (Claude, etc.) │◄──►│  (Este projeto) │◄──►│   (Processo)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Componentes Principais

#### 1. Servidor MCP (`src/server.ts`)
- Implementa o protocolo MCP 2024-11-05
- Gerencia comunicação via stdio
- Registra e executa ferramentas
- Trata requisições JSON-RPC 2.0

#### 2. Cliente Gemini (`src/utils/gemini-client.ts`)
- Abstrai comunicação com o Gemini CLI
- Gerencia execução de processos
- Implementa timeouts e tratamento de erros
- Formata argumentos e parseia respostas

#### 3. Ferramentas (`src/tools/`)
- `gemini-edit.ts`: Edição de código
- `gemini-analyze.ts`: Análise de código
- `gemini-write.ts`: Criação de arquivos
- `gemini-shell.ts`: Execução de comandos

#### 4. Utilitários (`src/utils/`)
- `diff-formatter.ts`: Formatação de diffs
- `response-parser.ts`: Parsing de respostas
- Validação e tratamento de dados

## Protocolo MCP

### Métodos Suportados

#### `initialize`
Inicializa a conexão MCP.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "initialize",
  "params": {
    "protocolVersion": "2024-11-05",
    "capabilities": {},
    "clientInfo": {
      "name": "client-name",
      "version": "1.0.0"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "protocolVersion": "2024-11-05",
    "capabilities": {
      "tools": {}
    },
    "serverInfo": {
      "name": "gemini-cli-mcp-server",
      "version": "1.0.0"
    }
  }
}
```

#### `tools/list`
Lista ferramentas disponíveis.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/list"
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "result": {
    "tools": [
      {
        "name": "gemini_edit_code",
        "description": "Edit code files using Gemini CLI",
        "inputSchema": {
          "type": "object",
          "properties": {
            "prompt": {
              "type": "string",
              "description": "Description of changes to make"
            }
          },
          "required": ["prompt"]
        }
      }
    ]
  }
}
```

#### `tools/call`
Executa uma ferramenta.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "gemini_edit_code",
    "arguments": {
      "prompt": "Add error handling to fetchData function",
      "file_path": "src/api.ts"
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"message\": \"File edited successfully\", \"diffs\": [...]}"
      }
    ]
  }
}
```

## Fluxo de Execução

### 1. Inicialização
```typescript
// server.ts
const server = new GeminiMcpServer(config);
await server.start();
```

### 2. Registro de Ferramentas
```typescript
// Cada ferramenta é registrada com:
{
  name: string,
  description: string,
  inputSchema: object,
  execute: (params) => Promise<GeminiToolResponse>
}
```

### 3. Processamento de Requisições
```typescript
async handleRequest(request: MCPRequest): Promise<MCPResponse> {
  switch (request.method) {
    case 'tools/call':
      const tool = this.tools.find(t => t.name === request.params.name);
      const result = await tool.execute(request.params.arguments);
      return { jsonrpc: '2.0', id: request.id, result };
  }
}
```

### 4. Execução de Ferramentas
```typescript
// gemini-edit.ts
async execute(params: GeminiEditParams): Promise<GeminiToolResponse> {
  const result = await this.client.executePrompt(prompt, options);
  return {
    success: true,
    diffs: extractedDiffs,
    files_changed: changedFiles
  };
}
```

## Tipos de Dados

### Principais Interfaces

```typescript
interface GeminiToolResponse {
  success: boolean;
  message: string;
  diffs?: FormattedDiff[];
  files_changed?: string[];
  analysis?: CodeAnalysis;
  command_executed?: string;
  output?: string;
  error?: string;
  execution_time_ms?: number;
}

interface FormattedDiff {
  file_path: string;
  diff: string;
  change_type: 'created' | 'modified' | 'deleted';
  lines_added: number;
  lines_removed: number;
  original_content?: string;
  new_content?: string;
}

interface CodeAnalysis {
  summary: string;
  issues: Issue[];
  suggestions: Suggestion[];
  metrics?: CodeMetrics;
  files_analyzed: string[];
}
```

## Configuração

### Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `GEMINI_CLI_PATH` | `gemini` | Caminho para o executável |
| `GEMINI_MODEL` | `gemini-2.0-flash-exp` | Modelo a usar |
| `MCP_TIMEOUT_MS` | `300000` | Timeout em ms |
| `MCP_APPROVAL_MODE` | `yolo` | Modo de aprovação |
| `MCP_MAX_CONTEXT_FILES` | `10` | Máx. arquivos contexto |
| `MCP_DEBUG` | `false` | Habilitar debug |

### Configuração Programática

```typescript
const config: ServerConfig = {
  gemini_cli_path: '/usr/local/bin/gemini',
  default_model: 'gemini-2.0-flash-exp',
  timeout_ms: 300000,
  approval_mode: 'yolo',
  max_context_files: 10,
  allowed_file_extensions: ['.ts', '.js', '.py'],
  debug: true
};
```

## Tratamento de Erros

### Níveis de Erro

1. **Configuração**: Erros de configuração inválida
2. **Validação**: Parâmetros inválidos (Zod)
3. **Execução**: Falhas na execução do Gemini CLI
4. **Parsing**: Erros ao processar respostas
5. **Sistema**: Erros de I/O, timeout, etc.

### Códigos de Erro MCP

| Código | Descrição |
|--------|-----------|
| `-32601` | Método não encontrado |
| `-32602` | Parâmetros inválidos |
| `-32603` | Erro interno |

## Performance

### Otimizações

1. **Timeout Configurável**: Evita travamentos
2. **Validação Prévia**: Falha rápida em parâmetros inválidos
3. **Streaming**: Comunicação via stdio eficiente
4. **Cache de Configuração**: Carregamento único

### Métricas

- Tempo de execução por ferramenta
- Tamanho de arquivos processados
- Número de diffs gerados
- Taxa de sucesso/erro

## Segurança

### Medidas Implementadas

1. **Validação de Entrada**: Zod schemas
2. **Extensões Permitidas**: Lista configurável
3. **Timeout**: Previne execução infinita
4. **Modo de Aprovação**: Controle de execução
5. **Sanitização**: Escape de comandos shell

### Considerações

- Execute em ambiente controlado
- Configure extensões permitidas
- Use modo de aprovação apropriado
- Monitore logs para atividade suspeita

## Desenvolvimento

### Estrutura de Arquivos

```
src/
├── config/           # Configuração
├── tools/            # Implementação das ferramentas
├── types/            # Definições TypeScript
├── utils/            # Utilitários
└── server.ts         # Servidor principal

scripts/              # Scripts auxiliares
examples/             # Exemplos de uso
dist/                 # Código compilado
```

### Comandos de Desenvolvimento

```bash
npm run dev          # Compilação em watch mode
npm run build        # Compilação para produção
npm run test:server  # Teste do servidor
npm run lint         # Linting
npm run format       # Formatação
npm run validate     # Validação completa
```

### Adicionando Novas Ferramentas

1. Criar arquivo em `src/tools/`
2. Implementar interface da ferramenta
3. Adicionar validação Zod
4. Registrar no servidor
5. Adicionar testes
6. Documentar uso

```typescript
// Exemplo de nova ferramenta
export class MinhaFerramenta {
  get name(): string { return 'minha_ferramenta'; }
  get description(): string { return 'Descrição da ferramenta'; }
  get inputSchema(): object { return { /* schema */ }; }
  
  async execute(params: unknown): Promise<GeminiToolResponse> {
    // Implementação
  }
}
```

## Troubleshooting

### Problemas Comuns

1. **Gemini CLI não encontrado**
   - Verificar `GEMINI_CLI_PATH`
   - Confirmar instalação do Gemini CLI

2. **Timeout em operações**
   - Aumentar `MCP_TIMEOUT_MS`
   - Verificar complexidade da tarefa

3. **Arquivos não encontrados**
   - Verificar caminhos relativos
   - Confirmar permissões de acesso

4. **Erros de parsing**
   - Ativar `MCP_DEBUG=true`
   - Verificar formato de saída do Gemini CLI

### Logs de Debug

Com `MCP_DEBUG=true`, o servidor produz logs detalhados:

```
📝 Server log: Starting Gemini CLI MCP Server...
📤 Enviando: tools/call
📥 Resposta: {"success": true, ...}
```

### Monitoramento

- Monitore stderr para logs do servidor
- Verifique exit codes dos processos
- Acompanhe tempo de execução das ferramentas
