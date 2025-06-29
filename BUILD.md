# BUILD.md - Guia de Build e Instalação

## Visão Geral

Este guia detalha como fazer build e instalar a versão modificada do Gemini CLI com as funcionalidades:
- Desabilitação do auto-switching de modelos
- Retry inteligente com exponential backoff configurável
- Supressão de warnings de deprecação

## Pré-requisitos

### Todos os Sistemas
- **Node.js 18.x ou superior** (recomendado: 22.x)
- **npm 8.x ou superior**
- **Git** para clonar o repositório

### Verificação dos Pré-requisitos
```bash
# Verificar versões
node --version    # Deve ser >= 18.0.0
npm --version     # Deve ser >= 8.0.0
git --version     # Qualquer versão recente
```

---

## 🪟 Windows

### Passo 1: Preparação do Ambiente
```powershell
# Abrir PowerShell como Administrador (opcional, para instalação global)
# Ou usar PowerShell/CMD normal para instalação local

# Navegar para diretório de trabalho
cd C:\Dev  # ou qualquer diretório de sua escolha
```

### Passo 2: Clone e Preparação
```powershell
# Clonar o repositório modificado
git clone https://github.com/google-gemini/gemini-cli.git
cd gemini-cli

# Verificar se as modificações estão presentes
git status
dir MODS.md    # Deve existir
dir CLAUDE.md  # Deve existir
```

### Passo 3: Instalação de Dependências
```powershell
# Instalar dependências
npm install

# Em caso de erro de permissões, usar:
npm install --no-optional
```

### Passo 4: Build da Aplicação
```powershell
# Build completo (inclui testes e validação)
npm run preflight

# Ou build básico (mais rápido)
npm run build

# Verificar se build foi bem-sucedido
dir bundle\index.js
```

### Passo 5: Instalação

#### Opção A: Instalação Global
```powershell
# Instalar globalmente
npm install -g .

# Verificar instalação
gemini --version
gemini --help
```

#### Opção B: Instalação Local
```powershell
# Criar link simbólico local
npm link

# Verificar instalação
gemini --version
```

#### Opção C: Uso Direto (sem instalação)
```powershell
# Usar diretamente do bundle
node bundle\index.js --help
```

### Passo 6: Verificação das Funcionalidades
```powershell
# Testar novas opções CLI
gemini --help | findstr "disable-model-fallback"
gemini --help | findstr "retry-delay-multiplier"

# Testar com variáveis de ambiente
$env:GEMINI_DISABLE_MODEL_FALLBACK="true"
gemini --help
```

---

## 🐧 Linux/macOS

### Passo 1: Preparação do Ambiente
```bash
# Navegar para diretório de trabalho
cd ~/Dev  # ou qualquer diretório de sua escolha
# Se não existir: mkdir -p ~/Dev && cd ~/Dev
```

### Passo 2: Clone e Preparação
```bash
# Clonar o repositório modificado
git clone https://github.com/google-gemini/gemini-cli.git
cd gemini-cli

# Verificar se as modificações estão presentes
git status
ls -la MODS.md CLAUDE.md  # Devem existir
```

### Passo 3: Instalação de Dependências
```bash
# Instalar dependências
npm install

# Em sistemas com permissões restritivas:
npm install --no-optional
```

### Passo 4: Build da Aplicação
```bash
# Build completo (inclui testes e validação)
npm run preflight

# Ou build básico (mais rápido)
npm run build

# Verificar se build foi bem-sucedido
ls -la bundle/index.js
```

### Passo 5: Instalação

#### Opção A: Instalação Global
```bash
# Instalar globalmente (pode precisar de sudo)
sudo npm install -g .

# Ou sem sudo se npm estiver configurado com prefix local
npm install -g .

# Verificar instalação
gemini --version
gemini --help
```

#### Opção B: Instalação Local
```bash
# Criar link simbólico local
npm link

# Verificar instalação
gemini --version
```

#### Opção C: Uso Direto (sem instalação)
```bash
# Usar diretamente do bundle
node bundle/index.js --help

# Criar alias para facilitar uso
echo 'alias gemini-dev="node $(pwd)/bundle/index.js"' >> ~/.bashrc
source ~/.bashrc
gemini-dev --help
```

### Passo 6: Verificação das Funcionalidades
```bash
# Testar novas opções CLI
gemini --help | grep "disable-model-fallback"
gemini --help | grep "retry-delay-multiplier"

# Testar com variáveis de ambiente
export GEMINI_DISABLE_MODEL_FALLBACK=true
gemini --help
```

---

## 🔧 Scripts de Build Úteis

### Scripts Disponíveis
```bash
# Desenvolvimento
npm start                    # Inicia em modo desenvolvimento
npm run debug               # Inicia com debugger
npm run build              # Build básico
npm run preflight          # Build + testes + lint + typecheck

# Qualidade de Código
npm run lint               # Verificar linting
npm run lint:fix           # Corrigir problemas de linting
npm run format             # Formatar código
npm run typecheck          # Verificar tipos TypeScript

# Testes
npm run test               # Testes unitários
npm run test:ci            # Testes com coverage
npm run test:e2e           # Testes end-to-end

# Limpeza
npm run clean              # Limpar arquivos de build
```

### Build Otimizado para Produção
```bash
# Sequência completa de build para produção
npm run clean
npm install
npm run preflight
npm run bundle
```

---

## 🚀 Teste das Funcionalidades Implementadas

### 1. Testar Desabilitação do Auto-switching
```bash
# Via flag CLI
gemini --disable-model-fallback "teste de prompt"

# Via variável de ambiente
export GEMINI_DISABLE_MODEL_FALLBACK=true
gemini "teste de prompt"
```

### 2. Testar Configurações de Retry
```bash
# Configurar retry mais agressivo
gemini --retry-delay-multiplier 3 --max-retry-delay 60 --max-429-retries 10 "teste"

# Via variáveis de ambiente
export GEMINI_RETRY_DELAY_MULTIPLIER=3
export GEMINI_MAX_RETRY_DELAY=60
export GEMINI_MAX_429_RETRIES=10
gemini "teste de prompt"
```

### 3. Testar Combinação de Opções
```bash
# Forçar gemini-2.5-pro com retry otimizado
gemini --disable-model-fallback --retry-delay-multiplier 2 --max-retry-delay 45 "prompt complexo"
```

---

## 🔍 Troubleshooting

### Problemas Comuns

#### Erro de Permissões (Windows)
```powershell
# Executar PowerShell como Administrador
# Ou configurar npm para usar diretório local
npm config set prefix %APPDATA%\npm
```

#### Erro de Permissões (Linux/macOS)
```bash
# Configurar npm para usar diretório local
mkdir ~/.npm-global
npm config set prefix '~/.npm-global'
echo 'export PATH=~/.npm-global/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

#### Node.js Muito Antigo
```bash
# Atualizar Node.js
# Linux (usando nvm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
nvm install 22
nvm use 22

# Windows: Baixar de nodejs.org
```

#### Problemas de Build
```bash
# Limpar cache e reinstalar
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### Verificar se Modificações Estão Ativas
```bash
# Deve mostrar as novas opções
gemini --help | grep -E "(disable-model-fallback|retry-delay-multiplier)"

# Verificar arquivos de documentação das modificações
ls -la MODS.md CLAUDE.md BUILD.md
```

---

## 📋 Checklist de Instalação Bem-sucedida

- [ ] Node.js 18+ instalado
- [ ] Dependências instaladas sem erros
- [ ] Build concluído com sucesso
- [ ] Comando `gemini --help` funciona
- [ ] Novas opções aparecem no help:
  - [ ] `--disable-model-fallback`
  - [ ] `--retry-delay-multiplier`
  - [ ] `--max-retry-delay`
  - [ ] `--max-429-retries`
- [ ] Variáveis de ambiente funcionam
- [ ] Sem warnings de deprecação `punycode`

---

## ⚡ Comportamento Padrão ATUALIZADO

### Mudança Importante - Auto-switching Desabilitado por Padrão

A partir desta versão modificada, o comportamento padrão mudou:

#### ✅ **NOVO Comportamento (Atual)**
- **Auto-switching DESABILITADO** por padrão
- Aplicação sempre usa `gemini-2.5-pro` por padrão
- Não muda automaticamente para `gemini-2.5-flash` em rate limits
- Retry inteligente com exponential backoff para resolver rate limits

#### ❌ **Comportamento Anterior**  
- Auto-switching habilitado por padrão
- Mudava para `gemini-2.5-flash` após 2 erros 429 consecutivos

### Como Reverter para Comportamento Antigo
Se você preferir o comportamento antigo (com auto-switching):

**Via Flag CLI:**
```bash
gemini --disable-model-fallback=false "seu prompt"
```

**Via Variável de Ambiente:**
```bash
export GEMINI_DISABLE_MODEL_FALLBACK=false
gemini "seu prompt"
```

**Via Settings Permanente:**
Criar/editar `~/.gemini/settings.json`:
```json
{
  "disableModelFallback": false
}
```

### Configuração Personalizada via Settings
Você pode configurar permanentemente todas as opções:
```json
{
  "disableModelFallback": true,
  "retryDelayMultiplier": 3,
  "maxRetryDelay": 60,
  "max429Retries": 10
}
```

---

## 📚 Próximos Passos

Após instalação bem-sucedida:

1. **Configurar autenticação**: `gemini /auth`
2. **Definir modelo padrão**: `export GEMINI_MODEL=gemini-2.5-pro`
3. **Configurar comportamento (opcional)**:
   ```bash
   # Estas são as configurações padrão agora
   export GEMINI_DISABLE_MODEL_FALLBACK=true  # JÁ É PADRÃO
   export GEMINI_RETRY_DELAY_MULTIPLIER=2
   export GEMINI_MAX_RETRY_DELAY=30
   export GEMINI_MAX_429_RETRIES=5
   ```
4. **Testar funcionalidade**: A aplicação agora mantém `gemini-2.5-pro` mesmo com rate limits

Para mais detalhes sobre as modificações, consulte `MODS.md`.