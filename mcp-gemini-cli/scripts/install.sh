#!/bin/bash

# Script de instalação do MCP Gemini CLI Server
# Este script automatiza a instalação e configuração inicial

set -e

echo "🚀 Instalando MCP Gemini CLI Server..."

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para imprimir mensagens coloridas
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verifica se Node.js está instalado
check_nodejs() {
    print_status "Verificando Node.js..."
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js não encontrado. Por favor, instale Node.js 18+ antes de continuar."
        print_status "Visite: https://nodejs.org/"
        exit 1
    fi
    
    NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$NODE_VERSION" -lt 18 ]; then
        print_error "Node.js versão 18+ é necessária. Versão atual: $(node --version)"
        exit 1
    fi
    
    print_success "Node.js $(node --version) encontrado"
}

# Verifica se Gemini CLI está instalado
check_gemini_cli() {
    print_status "Verificando Gemini CLI..."
    
    if ! command -v gemini &> /dev/null; then
        print_warning "Gemini CLI não encontrado no PATH"
        print_status "Você pode instalar o Gemini CLI de: https://github.com/google-gemini/gemini-cli"
        print_status "Ou especificar o caminho usando a variável GEMINI_CLI_PATH"
    else
        print_success "Gemini CLI encontrado: $(which gemini)"
    fi
}

# Instala dependências
install_dependencies() {
    print_status "Instalando dependências..."
    
    if [ -f "package-lock.json" ]; then
        npm ci
    else
        npm install
    fi
    
    print_success "Dependências instaladas"
}

# Compila o projeto
build_project() {
    print_status "Compilando projeto..."
    
    npm run build
    
    print_success "Projeto compilado"
}

# Cria arquivo de configuração de exemplo
create_example_config() {
    print_status "Criando arquivo de configuração de exemplo..."
    
    cat > .env.example << EOF
# Configuração do MCP Gemini CLI Server

# Caminho para o executável do Gemini CLI
GEMINI_CLI_PATH=gemini

# Modelo Gemini a ser usado
GEMINI_MODEL=gemini-2.0-flash-exp

# Timeout para operações (em milissegundos)
MCP_TIMEOUT_MS=300000

# Modo de aprovação (auto, manual, yolo)
MCP_APPROVAL_MODE=yolo

# Máximo de arquivos de contexto
MCP_MAX_CONTEXT_FILES=10

# Diretório de trabalho padrão
MCP_WORKING_DIRECTORY=

# Habilitar modo debug
MCP_DEBUG=false
EOF
    
    print_success "Arquivo .env.example criado"
}

# Cria script de inicialização
create_start_script() {
    print_status "Criando script de inicialização..."
    
    cat > start-server.sh << 'EOF'
#!/bin/bash

# Script para iniciar o MCP Gemini CLI Server

# Carrega variáveis de ambiente se existir arquivo .env
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Inicia o servidor
node dist/server.js
EOF
    
    chmod +x start-server.sh
    
    print_success "Script start-server.sh criado"
}

# Executa testes básicos
run_tests() {
    print_status "Executando testes básicos..."
    
    if [ -f "scripts/test-server.js" ]; then
        timeout 30s node scripts/test-server.js || {
            print_warning "Testes básicos falharam ou expiraram (isso pode ser normal se o Gemini CLI não estiver configurado)"
        }
    else
        print_warning "Script de teste não encontrado, pulando testes"
    fi
}

# Mostra instruções finais
show_instructions() {
    echo ""
    echo "🎉 Instalação concluída!"
    echo ""
    echo "📋 Próximos passos:"
    echo ""
    echo "1. Configure suas variáveis de ambiente:"
    echo "   cp .env.example .env"
    echo "   # Edite o arquivo .env com suas configurações"
    echo ""
    echo "2. Certifique-se de que o Gemini CLI está instalado e configurado:"
    echo "   gemini --version"
    echo ""
    echo "3. Inicie o servidor:"
    echo "   ./start-server.sh"
    echo "   # ou"
    echo "   npm start"
    echo ""
    echo "4. Configure seu cliente MCP (Claude Desktop, VS Code, etc.):"
    echo "   Veja examples/client-config.json para exemplos"
    echo ""
    echo "📚 Documentação:"
    echo "   - README.md - Documentação principal"
    echo "   - examples/usage-examples.md - Exemplos de uso"
    echo ""
    echo "🐛 Debug:"
    echo "   - Use MCP_DEBUG=true para logs detalhados"
    echo "   - Execute node scripts/test-server.js para testar"
    echo ""
}

# Função principal
main() {
    echo "🔧 MCP Gemini CLI Server - Script de Instalação"
    echo "=============================================="
    echo ""
    
    # Verifica se estamos no diretório correto
    if [ ! -f "package.json" ]; then
        print_error "package.json não encontrado. Execute este script no diretório raiz do projeto."
        exit 1
    fi
    
    # Executa verificações e instalação
    check_nodejs
    check_gemini_cli
    install_dependencies
    build_project
    create_example_config
    create_start_script
    
    # Testes opcionais
    if [ "$1" != "--skip-tests" ]; then
        run_tests
    fi
    
    show_instructions
}

# Executa função principal
main "$@"
