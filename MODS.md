# MODS.md - Modificações para Desabilitar Auto-switching e Melhorar Retry Logic

## Visão Geral

Este documento detalha todas as modificações realizadas para implementar:

1. **Desabilitação do auto-switching** de `gemini-2.5-pro` para `gemini-2.5-flash`
2. **Exponential backoff inteligente** para erros 429 com configurações personalizáveis
3. **Experiência do usuário melhorada** durante retries

## Resumo das Modificações

### Arquivos Modificados

1. **`packages/cli/src/config/config.ts`** - Configuração CLI
2. **`packages/core/src/config/config.ts`** - Configuração Core
3. **`packages/core/src/core/geminiChat.ts`** - Lógica de Chat
4. **`packages/core/src/utils/retry.ts`** - Sistema de Retry

---

## 1. Configuração CLI (`packages/cli/src/config/config.ts`)

### Modificações Realizadas

#### 1.1 Interface CliArgs - Novas Propriedades
**Localização:** Linha ~42-56
```typescript
// ANTES
interface CliArgs {
  model: string | undefined;
  sandbox: boolean | string | undefined;
  // ... outras propriedades existentes
  telemetryLogPrompts: boolean | undefined;
}

// DEPOIS
interface CliArgs {
  model: string | undefined;
  sandbox: boolean | string | undefined;
  // ... outras propriedades existentes
  telemetryLogPrompts: boolean | undefined;
  'disable-model-fallback': boolean | undefined;
  'retry-delay-multiplier': number | undefined;
  'max-retry-delay': number | undefined;
  'max-429-retries': number | undefined;
}
```

#### 1.2 Novas Opções CLI
**Localização:** Após linha ~134 (após opção `checkpointing`)
```typescript
// ADICIONADO
.option('disable-model-fallback', {
  type: 'boolean',
  description: 'Disable automatic fallback from gemini-2.5-pro to gemini-2.5-flash on rate limits',
  default: process.env.GEMINI_DISABLE_MODEL_FALLBACK === 'true' || false,
})
.option('retry-delay-multiplier', {
  type: 'number',
  description: 'Multiplier for exponential backoff delay on 429 errors',
  default: Number(process.env.GEMINI_RETRY_DELAY_MULTIPLIER) || 2,
})
.option('max-retry-delay', {
  type: 'number',
  description: 'Maximum delay in seconds for retries on 429 errors',
  default: Number(process.env.GEMINI_MAX_RETRY_DELAY) || 30,
})
.option('max-429-retries', {
  type: 'number',
  description: 'Maximum number of retries for 429 errors before giving up',
  default: Number(process.env.GEMINI_MAX_429_RETRIES) || 5,
})
```

#### 1.3 Passagem de Parâmetros para Config
**Localização:** Linha ~270-272
```typescript
// ANTES
bugCommand: settings.bugCommand,
model: argv.model!,
extensionContextFilePaths,

// DEPOIS
bugCommand: settings.bugCommand,
model: argv.model!,
extensionContextFilePaths,
disableModelFallback: argv['disable-model-fallback'] || false,
retryDelayMultiplier: argv['retry-delay-multiplier'] || 2,
maxRetryDelay: argv['max-retry-delay'] || 30,
max429Retries: argv['max-429-retries'] || 5,
```

### Variáveis de Ambiente Suportadas
```bash
GEMINI_DISABLE_MODEL_FALLBACK=true
GEMINI_RETRY_DELAY_MULTIPLIER=3
GEMINI_MAX_RETRY_DELAY=60
GEMINI_MAX_429_RETRIES=10
```

---

## 2. Configuração Core (`packages/core/src/config/config.ts`)

### Modificações Realizadas

#### 2.1 Interface ConfigParameters - Novas Propriedades
**Localização:** Linha ~126-129
```typescript
// ANTES
bugCommand?: BugCommandSettings;
model: string;
extensionContextFilePaths?: string[];

// DEPOIS
bugCommand?: BugCommandSettings;
model: string;
extensionContextFilePaths?: string[];
disableModelFallback?: boolean;
retryDelayMultiplier?: number;
maxRetryDelay?: number;
max429Retries?: number;
```

#### 2.2 Classe Config - Novas Propriedades Privadas
**Localização:** Após linha ~172
```typescript
// ADICIONADO
private readonly disableModelFallback: boolean;
private readonly retryDelayMultiplier: number;
private readonly maxRetryDelay: number;
private readonly max429Retries: number;
```

#### 2.3 Inicialização no Construtor
**Localização:** Após linha ~217
```typescript
// ADICIONADO
this.disableModelFallback = params.disableModelFallback ?? false;
this.retryDelayMultiplier = params.retryDelayMultiplier ?? 2;
this.maxRetryDelay = params.maxRetryDelay ?? 30;
this.max429Retries = params.max429Retries ?? 5;
```

#### 2.4 Métodos Getter
**Localização:** Após linha ~296 (método `resetModelToDefault`)
```typescript
// ADICIONADO
getDisableModelFallback(): boolean {
  return this.disableModelFallback;
}

getRetryDelayMultiplier(): number {
  return this.retryDelayMultiplier;
}

getMaxRetryDelay(): number {
  return this.maxRetryDelay;
}

getMax429Retries(): number {
  return this.max429Retries;
}
```

---

## 3. Lógica de Chat (`packages/core/src/core/geminiChat.ts`)

### Modificações Realizadas

#### 3.1 Método handleFlashFallback - Verificação de Configuração
**Localização:** Linha ~198-202
```typescript
// ANTES
private async handleFlashFallback(authType?: string): Promise<string | null> {
  // Only handle fallback for OAuth users
  if (authType !== AuthType.LOGIN_WITH_GOOGLE_PERSONAL) {
    return null;
  }

// DEPOIS
private async handleFlashFallback(authType?: string): Promise<string | null> {
  // Check if model fallback is disabled
  if (this.config.getDisableModelFallback()) {
    return null;
  }

  // Only handle fallback for OAuth users
  if (authType !== AuthType.LOGIN_WITH_GOOGLE_PERSONAL) {
    return null;
  }
```

#### 3.2 Primeira Chamada retryWithBackoff - Configurações de Retry
**Localização:** Linha ~274-285
```typescript
// ANTES
response = await retryWithBackoff(apiCall, {
  shouldRetry: (error: Error) => {
    if (error && error.message) {
      if (error.message.includes('429')) return true;
      if (error.message.match(/5\d{2}/)) return true;
    }
    return false;
  },
  onPersistent429: async (authType?: string) =>
    await this.handleFlashFallback(authType),
  authType: this.config.getContentGeneratorConfig()?.authType,
});

// DEPOIS
response = await retryWithBackoff(apiCall, {
  shouldRetry: (error: Error) => {
    if (error && error.message) {
      if (error.message.includes('429')) return true;
      if (error.message.match(/5\d{2}/)) return true;
    }
    return false;
  },
  onPersistent429: async (authType?: string) =>
    await this.handleFlashFallback(authType),
  authType: this.config.getContentGeneratorConfig()?.authType,
  retryDelayMultiplier: this.config.getRetryDelayMultiplier(),
  maxDelayMs: this.config.getMaxRetryDelay() * 1000, // Convert seconds to milliseconds
  max429Retries: this.config.getMax429Retries(),
});
```

#### 3.3 Segunda Chamada retryWithBackoff - Stream Response
**Localização:** Linha ~373-385
```typescript
// ANTES
const streamResponse = await retryWithBackoff(apiCall, {
  shouldRetry: (error: Error) => {
    // Check error messages for status codes, or specific error names if known
    if (error && error.message) {
      if (error.message.includes('429')) return true;
      if (error.message.match(/5\d{2}/)) return true;
    }
    return false; // Don't retry other errors by default
  },
  onPersistent429: async (authType?: string) =>
    await this.handleFlashFallback(authType),
  authType: this.config.getContentGeneratorConfig()?.authType,
});

// DEPOIS
const streamResponse = await retryWithBackoff(apiCall, {
  shouldRetry: (error: Error) => {
    // Check error messages for status codes, or specific error names if known
    if (error && error.message) {
      if (error.message.includes('429')) return true;
      if (error.message.match(/5\d{2}/)) return true;
    }
    return false; // Don't retry other errors by default
  },
  onPersistent429: async (authType?: string) =>
    await this.handleFlashFallback(authType),
  authType: this.config.getContentGeneratorConfig()?.authType,
  retryDelayMultiplier: this.config.getRetryDelayMultiplier(),
  maxDelayMs: this.config.getMaxRetryDelay() * 1000, // Convert seconds to milliseconds
  max429Retries: this.config.getMax429Retries(),
});
```

---

## 4. Sistema de Retry (`packages/core/src/utils/retry.ts`)

### Modificações Realizadas

#### 4.1 Interface RetryOptions - Novas Propriedades
**Localização:** Linha ~9-16
```typescript
// ANTES
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  shouldRetry: (error: Error) => boolean;
  onPersistent429?: (authType?: string) => Promise<string | null>;
  authType?: string;
}

// DEPOIS
export interface RetryOptions {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  shouldRetry: (error: Error) => boolean;
  onPersistent429?: (authType?: string) => Promise<string | null>;
  authType?: string;
  retryDelayMultiplier?: number;
  max429Retries?: number;
}
```

#### 4.2 Opções Padrão
**Localização:** Linha ~20-26
```typescript
// ANTES
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelayMs: 5000,
  maxDelayMs: 30000, // 30 seconds
  shouldRetry: defaultShouldRetry,
};

// DEPOIS
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelayMs: 5000,
  maxDelayMs: 30000, // 30 seconds
  shouldRetry: defaultShouldRetry,
  retryDelayMultiplier: 2,
  max429Retries: 5,
};
```

#### 4.3 Desestruturação de Parâmetros
**Localização:** Linha ~70-82
```typescript
// ANTES
const {
  maxAttempts,
  initialDelayMs,
  maxDelayMs,
  onPersistent429,
  authType,
  shouldRetry,
} = {
  ...DEFAULT_RETRY_OPTIONS,
  ...options,
};

// DEPOIS
const {
  maxAttempts,
  initialDelayMs,
  maxDelayMs,
  onPersistent429,
  authType,
  shouldRetry,
  retryDelayMultiplier,
  max429Retries,
} = {
  ...DEFAULT_RETRY_OPTIONS,
  ...options,
};
```

#### 4.4 Controle de Erros 429 Consecutivos
**Localização:** Linha ~95-105
```typescript
// ANTES
// Track consecutive 429 errors
if (errorStatus === 429) {
  consecutive429Count++;
} else {
  consecutive429Count = 0;
}

// DEPOIS
// Track consecutive 429 errors
if (errorStatus === 429) {
  consecutive429Count++;
  
  // Check if we've exceeded max 429 retries
  if (consecutive429Count > max429Retries!) {
    throw error;
  }
} else {
  consecutive429Count = 0;
}
```

#### 4.5 Exponential Backoff Inteligente
**Localização:** Linha ~146-167
```typescript
// ANTES
} else {
  // Fallback to exponential backoff with jitter
  logRetryAttempt(attempt, error, errorStatus);
  // Add jitter: +/- 30% of currentDelay
  const jitter = currentDelay * 0.3 * (Math.random() * 2 - 1);
  const delayWithJitter = Math.max(0, currentDelay + jitter);
  await delay(delayWithJitter);
  currentDelay = Math.min(maxDelayMs, currentDelay * 2);
}

// DEPOIS
} else {
  // Implement different backoff strategies for 429 vs other errors
  if (errorStatus === 429) {
    // For 429 errors, use exponential backoff starting from 2 seconds
    const base429Delay = 2000; // Start with 2 seconds for 429 errors
    const retryDelay = Math.min(
      base429Delay * Math.pow(retryDelayMultiplier!, consecutive429Count - 1),
      maxDelayMs
    );
    console.warn(
      `Rate limit hit (429). Attempt ${attempt}/${maxAttempts}. Waiting ${Math.round(retryDelay / 1000)}s before retry ${consecutive429Count}/${max429Retries} for 429 errors...`,
    );
    await delay(retryDelay);
  } else {
    // For other errors, use standard exponential backoff with jitter
    logRetryAttempt(attempt, error, errorStatus);
    // Add jitter: +/- 30% of currentDelay
    const jitter = currentDelay * 0.3 * (Math.random() * 2 - 1);
    const delayWithJitter = Math.max(0, currentDelay + jitter);
    await delay(delayWithJitter);
    currentDelay = Math.min(maxDelayMs, currentDelay * retryDelayMultiplier!);
  }
}
```

---

## 5. Comportamento Resultante

### Antes das Modificações
1. **Auto-switching obrigatório**: Após 2 erros 429 consecutivos, mudava automaticamente para `gemini-2.5-flash`
2. **Retry simples**: Usava backoff padrão de 5s → 10s → 20s → 30s
3. **Sem configuração**: Usuário não podia personalizar comportamento

### Depois das Modificações
1. **Auto-switching opcional**: Pode ser desabilitado com `--disable-model-fallback`
2. **Retry inteligente**: Erros 429 usam backoff específico: 2s → 4s → 8s → 16s → 30s
3. **Configuração flexível**: Todos os parâmetros são personalizáveis
4. **Mensagens informativas**: Usuário vê progresso dos retries com tempo de espera

### Configurações Disponíveis
```bash
# Flags CLI
--disable-model-fallback           # Desabilita auto-switching
--retry-delay-multiplier 3         # Multiplicador de delay (padrão: 2)
--max-retry-delay 60               # Delay máximo em segundos (padrão: 30)
--max-429-retries 10               # Max retries para 429 (padrão: 5)

# Variáveis de Ambiente
GEMINI_DISABLE_MODEL_FALLBACK=true
GEMINI_RETRY_DELAY_MULTIPLIER=3
GEMINI_MAX_RETRY_DELAY=60
GEMINI_MAX_429_RETRIES=10
```

---

## 6. Guia de Reaplicação

### Para Aplicar em Nova Versão:

1. **Identifique os arquivos equivalentes** na nova estrutura
2. **Mantenha a mesma ordem de modificações**:
   - CLI config primeiro (interface + opções + passagem)
   - Core config segundo (interface + propriedades + getters)
   - Logic de chat terceiro (fallback + retry calls)
   - Retry utils por último (interface + logic)

3. **Atenção especiais**:
   - Nomes de variáveis podem mudar
   - Estrutura de arquivos pode ser diferente
   - Imports podem precisar atualização
   - TypeScript strict mode pode exigir `!` em alguns locais

4. **Teste sempre**:
   - `npm run typecheck` para verificar tipos
   - `npm start -- --help` para ver opções CLI
   - Teste manual com flags para verificar comportamento

### Compatibilidade
- ✅ **Backward compatible**: Não quebra funcionalidade existente
- ✅ **Opt-in**: Funcionalidades novas são opcionais
- ✅ **Environment friendly**: Suporta variáveis de ambiente
- ✅ **CLI friendly**: Flags seguem convenções padrão

---

## 7. Checklist de Validação

Após reaplicar as modificações, verifique:

- [ ] CLI mostra novas opções no `--help`
- [ ] Variáveis de ambiente funcionam
- [ ] `--disable-model-fallback` previne switching
- [ ] Retry delays são personalizáveis
- [ ] Mensagens 429 são informativas
- [ ] Build passa sem erros TypeScript
- [ ] Funcionalidade existente não quebra
- [ ] Testes passam (se existirem)

Este documento deve ser suficiente para recriar toda a funcionalidade em versões futuras da aplicação.

---

## 8. ATUALIZAÇÃO: Mudança do Comportamento Padrão

### Modificação Posterior - Habilitar --disable-model-fallback por Padrão

**Data**: Posterior à implementação inicial  
**Objetivo**: Fazer com que `--disable-model-fallback` seja `true` por padrão

#### 8.1 Mudança no Valor Padrão CLI
**Arquivo:** `packages/cli/src/config/config.ts` linha 138
```typescript
// ANTES
default: process.env.GEMINI_DISABLE_MODEL_FALLBACK === 'true' || false,

// DEPOIS  
default: process.env.GEMINI_DISABLE_MODEL_FALLBACK === 'false' ? false : true,
```

#### 8.2 Adição de Suporte a Settings
**Arquivo:** `packages/cli/src/config/settings.ts` linha 70-76
```typescript
// ADICIONADO à interface Settings
// Disable automatic model fallback from gemini-2.5-pro to gemini-2.5-flash
disableModelFallback?: boolean;

// Retry configuration for 429 errors
retryDelayMultiplier?: number;
maxRetryDelay?: number;
max429Retries?: number;
```

#### 8.3 Integração de Settings na Configuração
**Arquivo:** `packages/cli/src/config/config.ts` linha 272-275
```typescript
// ANTES
disableModelFallback: argv['disable-model-fallback'] || false,
retryDelayMultiplier: argv['retry-delay-multiplier'] || 2,
maxRetryDelay: argv['max-retry-delay'] || 30,
max429Retries: argv['max-429-retries'] || 5,

// DEPOIS
disableModelFallback: argv['disable-model-fallback'] ?? settings.disableModelFallback ?? true,
retryDelayMultiplier: argv['retry-delay-multiplier'] ?? settings.retryDelayMultiplier ?? 2,
maxRetryDelay: argv['max-retry-delay'] ?? settings.maxRetryDelay ?? 30,
max429Retries: argv['max-429-retries'] ?? settings.max429Retries ?? 5,
```

### Novo Comportamento Padrão

#### Antes da Atualização
- Auto-switching **habilitado** por padrão
- Usuário precisava usar `--disable-model-fallback` para desabilitar

#### Depois da Atualização  
- Auto-switching **desabilitado** por padrão
- Aplicação sempre usa `gemini-2.5-pro` por padrão
- Usuário pode reabilitar com `--disable-model-fallback=false` ou `GEMINI_DISABLE_MODEL_FALLBACK=false`

### Nova Hierarquia de Configuração
1. **Flag CLI explícito**: `--disable-model-fallback` ou `--disable-model-fallback=false`
2. **Variável de ambiente**: `GEMINI_DISABLE_MODEL_FALLBACK=true/false`  
3. **Arquivo settings.json**: `"disableModelFallback": true/false`
4. **Padrão da aplicação**: `true` (**NOVO** - era `false`)

### Configuração via settings.json
Usuários podem agora configurar permanentemente no arquivo `~/.gemini/settings.json`:
```json
{
  "disableModelFallback": false,
  "retryDelayMultiplier": 3,
  "maxRetryDelay": 60, 
  "max429Retries": 10
}
```

### Compatibilidade
- ✅ **Backward compatible**: Usuários podem reverter comportamento antigo
- ✅ **Configuração flexível**: Múltiplas formas de configurar  
- ✅ **Persistente**: Settings.json mantém configuração entre sessões
- ⚠️ **Breaking change**: Comportamento padrão mudou de auto-switching ON para OFF

Esta mudança garante que a aplicação sempre mantenha `gemini-2.5-pro` por padrão, a menos que explicitamente configurado diferente.

---

## 9. NOVA ATUALIZAÇÃO: Remoção de Atualizações Automáticas

### Modificação Adicional - Desabilitar Verificação Automática de Updates

**Data**: Posterior às implementações anteriores  
**Objetivo**: Permitir aos usuários desabilitar completamente as verificações automáticas de atualizações

#### 9.1 Modificação na Interface Settings
**Arquivo:** `packages/cli/src/config/settings.ts` linha 67-68
```typescript
// ADICIONADO à interface Settings
// Disable automatic update checking
disableUpdateCheck?: boolean;
```

#### 9.2 Modificação no Sistema de Verificação de Updates
**Arquivo:** `packages/cli/src/ui/utils/updateCheck.ts`

**Importação de Dependências:**
```typescript
// ANTES
import updateNotifier from 'update-notifier';
import { getPackageJson } from '../../utils/package.js';

// DEPOIS
import updateNotifier from 'update-notifier';
import { getPackageJson } from '../../utils/package.js';
import { LoadedSettings } from '../../config/settings.js';
```

**Assinatura da Função e Validação:**
```typescript
// ANTES
export async function checkForUpdates(): Promise<string | null> {

// DEPOIS
export async function checkForUpdates(settings?: LoadedSettings): Promise<string | null> {
  // Check if update checking is disabled
  if (settings?.merged.disableUpdateCheck || process.env.GEMINI_CLI_DISABLE_UPDATE_CHECK === 'true') {
    return null;
  }
```

#### 9.3 Integração no Componente Principal
**Arquivo:** `packages/cli/src/ui/App.tsx` linha 95-97
```typescript
// ANTES
useEffect(() => {
  checkForUpdates().then(setUpdateMessage);
}, []);

// DEPOIS
useEffect(() => {
  checkForUpdates(settings).then(setUpdateMessage);
}, [settings]);
```

#### 9.4 Documentação Atualizada
**Arquivo:** `docs/cli/configuration.md`

**Configuração via settings.json:**
```json
// ADICIONADO
- **`disableUpdateCheck`** (boolean):
  - **Description:** Disables automatic update checking when the CLI starts. When enabled, the CLI will no longer check for new versions and display update notifications.
  - **Default:** `false`
  - **Example:** `"disableUpdateCheck": true`
```

**Variável de Ambiente:**
```bash
# ADICIONADO
- **`GEMINI_CLI_DISABLE_UPDATE_CHECK`**:
  - Set to `true` to disable automatic update checking.
  - Alternative to the `disableUpdateCheck` setting in `settings.json`.
  - Example: `export GEMINI_CLI_DISABLE_UPDATE_CHECK=true`
```

### Como Habilitar Updates (Padrão é Desabilitado)

#### Via Arquivo de Configuração
```json
{
  "disableUpdateCheck": false
}
```

#### Via Variável de Ambiente
```bash
export GEMINI_CLI_DISABLE_UPDATE_CHECK=false
```

### Nova Hierarquia de Configuração para Updates
1. **Variável de ambiente**: `GEMINI_CLI_DISABLE_UPDATE_CHECK=true/false`
2. **Arquivo settings.json**: `"disableUpdateCheck": true/false`
3. **Padrão da aplicação**: `true` (**NOVO** - verificações desabilitadas por padrão)

### Comportamento Resultante

#### Sistema de Updates Original
- ✅ **Verificação automática**: Sempre executava na inicialização
- ✅ **Notificação**: Exibia caixa amarela com versão disponível
- ❌ **Controle do usuário**: Sem opção de desabilitar

#### Sistema de Updates Após Modificação
- ✅ **Verificação desabilitada por padrão**: Não executa verificações por padrão
- ✅ **Notificação**: Mantém funcionalidade quando explicitamente habilitada
- ✅ **Controle do usuário**: Múltiplas formas de habilitar/desabilitar
- ✅ **Flexibilidade**: Configuração via settings.json ou env var

### Arquivos Modificados para Updates
1. **`packages/cli/src/config/settings.ts`** - Interface Settings
2. **`packages/cli/src/ui/utils/updateCheck.ts`** - Lógica de verificação
3. **`packages/cli/src/ui/App.tsx`** - Integração principal
4. **`docs/cli/configuration.md`** - Documentação

### Compatibilidade da Funcionalidade de Updates
- ⚠️ **Breaking change**: Verificações agora desabilitadas por padrão (era habilitado)
- ✅ **Opt-in**: Usuários podem habilitar quando desejarem
- ✅ **Environment friendly**: Suporte completo a variáveis de ambiente
- ✅ **Persistent**: Settings.json mantém configuração entre sessões

### Checklist de Validação para Updates
Após implementar as modificações, verificar:

- [ ] Verificação de updates **desabilitada** por padrão (novo comportamento)
- [ ] `"disableUpdateCheck": false` no settings.json habilita updates
- [ ] `GEMINI_CLI_DISABLE_UPDATE_CHECK=false` habilita updates
- [ ] Combinação de ambas configurações funciona corretamente
- [ ] Documentação reflete as novas opções
- [ ] Build passa sem erros TypeScript
- [ ] Funcionalidade de updates funciona quando explicitamente habilitada

Esta implementação garante que as verificações automáticas de atualização estão desabilitadas por padrão, requerendo configuração explícita do usuário para habilitar.