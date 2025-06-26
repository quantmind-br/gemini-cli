# Exemplos de Uso do MCP Gemini CLI Server

Este documento contém exemplos práticos de como usar o servidor MCP Gemini CLI.

## Configuração Básica

### 1. Claude Desktop

Adicione ao seu arquivo de configuração do Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json` no macOS):

```json
{
  "mcpServers": {
    "gemini-cli": {
      "command": "node",
      "args": ["/path/to/mcp-gemini-cli/dist/server.js"],
      "env": {
        "GEMINI_CLI_PATH": "gemini",
        "MCP_DEBUG": "true"
      }
    }
  }
}
```

### 2. VS Code com Copilot

Configure no arquivo `settings.json`:

```json
{
  "github.copilot.chat.mcpServers": {
    "gemini-cli": {
      "command": "node /path/to/mcp-gemini-cli/dist/server.js"
    }
  }
}
```

## Exemplos de Uso das Ferramentas

### 1. Edição de Código

#### Adicionar tratamento de erro
```json
{
  "tool": "gemini_edit_code",
  "params": {
    "prompt": "Adicione tratamento de erro try-catch na função fetchUserData para capturar erros de rede",
    "file_path": "src/api/users.ts",
    "context_files": ["src/types/user.ts", "src/utils/api.ts"]
  }
}
```

#### Refatorar função
```json
{
  "tool": "gemini_edit_code",
  "params": {
    "prompt": "Refatore a função calculateTotal para usar reduce ao invés de for loop",
    "file_path": "src/utils/calculations.ts"
  }
}
```

#### Adicionar documentação
```json
{
  "tool": "gemini_edit_code",
  "params": {
    "prompt": "Adicione documentação JSDoc completa para todas as funções exportadas",
    "file_path": "src/services/auth.ts"
  }
}
```

### 2. Análise de Código

#### Revisão de segurança
```json
{
  "tool": "gemini_analyze_code",
  "params": {
    "prompt": "Analise este código para vulnerabilidades de segurança, especialmente injeção SQL e XSS",
    "file_paths": ["src/controllers/user.ts", "src/middleware/auth.ts"],
    "analysis_type": "security"
  }
}
```

#### Análise de performance
```json
{
  "tool": "gemini_analyze_code",
  "params": {
    "prompt": "Identifique gargalos de performance e oportunidades de otimização",
    "file_paths": ["src/services/data-processing.ts"],
    "analysis_type": "performance"
  }
}
```

#### Code review geral
```json
{
  "tool": "gemini_analyze_code",
  "params": {
    "prompt": "Faça uma revisão completa do código, verificando qualidade, melhores práticas e possíveis bugs",
    "file_paths": ["src/components/UserList.tsx", "src/hooks/useUsers.ts"],
    "analysis_type": "code_review"
  }
}
```

### 3. Criação de Arquivos

#### Criar componente React
```json
{
  "tool": "gemini_write_file",
  "params": {
    "prompt": "Crie um componente React TypeScript para exibir uma lista de produtos com filtros por categoria e preço. Inclua props tipadas, estado local para filtros e renderização condicional",
    "file_path": "src/components/ProductList.tsx",
    "context_files": ["src/types/product.ts", "src/components/common/Filter.tsx"]
  }
}
```

#### Criar API endpoint
```json
{
  "tool": "gemini_write_file",
  "params": {
    "prompt": "Crie um endpoint Express.js para CRUD de usuários com validação de dados, autenticação JWT e tratamento de erros",
    "file_path": "src/routes/users.ts",
    "context_files": ["src/middleware/auth.ts", "src/models/User.ts"]
  }
}
```

#### Criar arquivo de configuração
```json
{
  "tool": "gemini_write_file",
  "params": {
    "prompt": "Crie um arquivo de configuração TypeScript para variáveis de ambiente com validação usando Zod",
    "file_path": "src/config/env.ts"
  }
}
```

#### Criar testes unitários
```json
{
  "tool": "gemini_write_file",
  "params": {
    "prompt": "Crie testes unitários completos usando Jest para a classe UserService, incluindo mocks e casos de erro",
    "file_path": "src/services/__tests__/UserService.test.ts",
    "context_files": ["src/services/UserService.ts"]
  }
}
```

### 4. Execução de Comandos Shell

#### Setup de projeto
```json
{
  "tool": "gemini_shell_command",
  "params": {
    "prompt": "Configure um novo projeto Node.js com TypeScript, ESLint, Prettier e Jest",
    "working_directory": "/path/to/new-project"
  }
}
```

#### Executar testes
```json
{
  "tool": "gemini_shell_command",
  "params": {
    "prompt": "Execute todos os testes unitários e gere relatório de cobertura",
    "working_directory": "/path/to/project"
  }
}
```

#### Build e deploy
```json
{
  "tool": "gemini_shell_command",
  "params": {
    "prompt": "Faça build da aplicação e deploy para staging",
    "working_directory": "/path/to/project"
  }
}
```

#### Análise de dependências
```json
{
  "tool": "gemini_shell_command",
  "params": {
    "prompt": "Verifique dependências desatualizadas e vulnerabilidades de segurança",
    "working_directory": "/path/to/project"
  }
}
```

## Exemplos de Respostas

### Resposta de Edição
```json
{
  "success": true,
  "message": "Successfully edited 1 file(s). Added 8 lines, removed 2 lines.",
  "diffs": [
    {
      "file_path": "src/api/users.ts",
      "diff": "@@ -15,8 +15,14 @@\n async function fetchUserData(id: string) {\n+  try {\n     const response = await fetch(`/api/users/${id}`);\n+    if (!response.ok) {\n+      throw new Error(`HTTP error! status: ${response.status}`);\n+    }\n     return response.json();\n+  } catch (error) {\n+    console.error('Failed to fetch user data:', error);\n+    throw error;\n+  }\n }",
      "change_type": "modified",
      "lines_added": 8,
      "lines_removed": 2
    }
  ],
  "files_changed": ["src/api/users.ts"],
  "execution_time_ms": 3500
}
```

### Resposta de Análise
```json
{
  "success": true,
  "message": "Analysis completed. Analyzed 2 file(s), found 3 issue(s) and 5 suggestion(s).",
  "analysis": {
    "summary": "O código apresenta boa estrutura geral, mas há algumas vulnerabilidades de segurança e oportunidades de melhoria na validação de entrada.",
    "issues": [
      {
        "type": "error",
        "message": "Possível vulnerabilidade de injeção SQL na query dinâmica",
        "file_path": "src/controllers/user.ts",
        "line_number": 45,
        "severity": "high"
      },
      {
        "type": "warning",
        "message": "Validação de entrada insuficiente para parâmetros de usuário",
        "file_path": "src/controllers/user.ts",
        "line_number": 23,
        "severity": "medium"
      }
    ],
    "suggestions": [
      {
        "description": "Use prepared statements ou ORM para prevenir injeção SQL",
        "file_path": "src/controllers/user.ts",
        "line_number": 45,
        "category": "security"
      },
      {
        "description": "Implemente validação com biblioteca como Joi ou Zod",
        "file_path": "src/controllers/user.ts",
        "line_number": 23,
        "category": "security"
      }
    ],
    "files_analyzed": ["src/controllers/user.ts", "src/middleware/auth.ts"]
  },
  "execution_time_ms": 4200
}
```

## Dicas de Uso

### 1. Contexto Efetivo
- Sempre inclua arquivos de contexto relevantes (tipos, interfaces, utilitários)
- Limite o contexto a arquivos realmente necessários para melhor performance
- Use arquivos de configuração e documentação como contexto quando apropriado

### 2. Prompts Específicos
- Seja específico sobre o que deseja: "adicione validação" vs "adicione validação Zod para email e senha"
- Mencione padrões e convenções: "seguindo o padrão Repository", "usando React hooks"
- Especifique tecnologias: "usando TypeScript", "com testes Jest"

### 3. Análise Direcionada
- Use `analysis_type` apropriado para focar na análise desejada
- Combine análise com edição: primeiro analise, depois edite baseado nos resultados
- Use análise de performance em arquivos críticos do sistema

### 4. Comandos Shell Seguros
- O servidor executa em modo `yolo` por padrão, mas seja cauteloso com comandos destrutivos
- Especifique diretórios de trabalho para evitar execução em locais incorretos
- Use timeouts apropriados para comandos que podem demorar

## Troubleshooting

### Problemas Comuns

1. **Timeout**: Aumente `MCP_TIMEOUT_MS` para operações longas
2. **Arquivos não encontrados**: Verifique caminhos relativos ao diretório de trabalho
3. **Permissões**: Certifique-se que o Gemini CLI tem acesso aos arquivos
4. **Modelo não disponível**: Verifique se `GEMINI_MODEL` está configurado corretamente

### Debug

Ative o modo debug com `MCP_DEBUG=true` para ver logs detalhados da execução.
