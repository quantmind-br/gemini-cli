# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-06-26

### Adicionado
- Servidor MCP inicial que expõe capacidades do Gemini CLI
- Ferramenta `gemini_edit_code` para edição de código
- Ferramenta `gemini_analyze_code` para análise de código
- Ferramenta `gemini_write_file` para criação/modificação de arquivos
- Ferramenta `gemini_shell_command` para execução de comandos shell
- Sistema de configuração via variáveis de ambiente
- Suporte a múltiplas extensões de arquivo
- Formatação de diffs estruturada
- Parser de respostas do Gemini CLI
- Cliente interno para comunicação com Gemini CLI
- Validação de parâmetros com Zod
- Sistema de logging e debug
- Documentação completa com exemplos
- Scripts de instalação e teste
- Configurações de exemplo para clientes MCP

### Características
- Protocolo MCP 2024-11-05 compatível
- Comunicação via stdio
- Timeout configurável para operações
- Modo de aprovação configurável (auto/manual/yolo)
- Suporte a arquivos de contexto
- Análise estruturada com issues e sugestões
- Diffs formatados para visualização
- Tratamento de erros robusto
- Validação de extensões de arquivo
- Logs detalhados para debug

### Ferramentas Disponíveis

#### gemini_edit_code
- Edita arquivos de código existentes
- Suporte a arquivos de contexto
- Retorna diffs das alterações
- Validação de extensões de arquivo

#### gemini_analyze_code
- Análise de código com tipos específicos (security, performance, code_review, general)
- Retorna issues categorizados por severidade
- Sugestões de melhoria estruturadas
- Métricas de código quando disponíveis

#### gemini_write_file
- Criação de novos arquivos
- Modificação de arquivos existentes
- Suporte a sobrescrita controlada
- Instruções específicas por tipo de arquivo

#### gemini_shell_command
- Execução segura de comandos shell
- Timeout configurável
- Diretório de trabalho especificável
- Logs de comandos executados

### Configuração
- `GEMINI_CLI_PATH`: Caminho para o Gemini CLI
- `GEMINI_MODEL`: Modelo Gemini a usar
- `MCP_TIMEOUT_MS`: Timeout para operações
- `MCP_APPROVAL_MODE`: Modo de aprovação
- `MCP_MAX_CONTEXT_FILES`: Máximo de arquivos de contexto
- `MCP_WORKING_DIRECTORY`: Diretório de trabalho padrão
- `MCP_DEBUG`: Habilitar logs de debug

### Arquivos de Exemplo
- `examples/client-config.json`: Configuração para clientes MCP
- `examples/usage-examples.md`: Exemplos detalhados de uso
- `scripts/test-server.js`: Script de teste do servidor
- `scripts/install.sh`: Script de instalação automatizada

### Documentação
- README.md completo com instruções de instalação e uso
- Exemplos práticos para cada ferramenta
- Guia de troubleshooting
- Documentação da API das ferramentas

### Dependências
- `@modelcontextprotocol/sdk`: SDK do Model Context Protocol
- `zod`: Validação de esquemas TypeScript
- `diff`: Geração de diffs
- `shell-quote`: Parsing seguro de comandos shell

### Requisitos do Sistema
- Node.js 18+
- Gemini CLI instalado e configurado
- TypeScript para desenvolvimento

### Limitações Conhecidas
- Suporte apenas para extensões de arquivo configuradas
- Dependente da disponibilidade do Gemini CLI
- Timeout fixo para operações (configurável)
- Comunicação apenas via stdio (sem HTTP/WebSocket)

### Próximas Versões Planejadas
- Suporte a WebSocket para comunicação
- Cache de resultados para melhor performance
- Métricas de uso e monitoramento
- Suporte a plugins personalizados
- Interface web para configuração
- Integração com mais editores e IDEs
