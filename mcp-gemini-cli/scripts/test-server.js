#!/usr/bin/env node

/**
 * Script para testar o servidor MCP Gemini CLI
 * Simula requisições MCP e verifica as respostas
 */

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class MCPTester {
  constructor() {
    this.serverProcess = null;
    this.requestId = 1;
  }

  async startServer() {
    console.log('🚀 Iniciando servidor MCP...');
    
    const serverPath = join(__dirname, '..', 'dist', 'server.js');
    
    this.serverProcess = spawn('node', [serverPath], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        MCP_DEBUG: 'true',
        GEMINI_CLI_PATH: 'echo', // Mock para testes
        MCP_APPROVAL_MODE: 'yolo'
      }
    });

    this.serverProcess.stderr.on('data', (data) => {
      console.log('📝 Server log:', data.toString().trim());
    });

    // Aguarda um pouco para o servidor inicializar
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('✅ Servidor iniciado');
  }

  async sendRequest(method, params = {}) {
    return new Promise((resolve, reject) => {
      const request = {
        jsonrpc: '2.0',
        id: this.requestId++,
        method,
        params
      };

      console.log(`📤 Enviando: ${method}`);
      console.log('   Params:', JSON.stringify(params, null, 2));

      let responseData = '';
      
      const onData = (data) => {
        responseData += data.toString();
        
        // Verifica se temos uma resposta completa
        const lines = responseData.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            try {
              const response = JSON.parse(line);
              if (response.id === request.id) {
                this.serverProcess.stdout.removeListener('data', onData);
                resolve(response);
                return;
              }
            } catch (e) {
              // Linha incompleta, continua aguardando
            }
          }
        }
      };

      this.serverProcess.stdout.on('data', onData);
      
      // Timeout
      setTimeout(() => {
        this.serverProcess.stdout.removeListener('data', onData);
        reject(new Error('Timeout waiting for response'));
      }, 10000);

      // Envia a requisição
      this.serverProcess.stdin.write(JSON.stringify(request) + '\n');
    });
  }

  async testInitialize() {
    console.log('\n🔧 Testando initialize...');
    
    try {
      const response = await this.sendRequest('initialize', {
        protocolVersion: '2024-11-05',
        capabilities: {},
        clientInfo: {
          name: 'test-client',
          version: '1.0.0'
        }
      });

      console.log('📥 Resposta:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.serverInfo) {
        console.log('✅ Initialize OK');
        return true;
      } else {
        console.log('❌ Initialize falhou');
        return false;
      }
    } catch (error) {
      console.log('❌ Erro no initialize:', error.message);
      return false;
    }
  }

  async testListTools() {
    console.log('\n🛠️  Testando tools/list...');
    
    try {
      const response = await this.sendRequest('tools/list');
      
      console.log('📥 Resposta:', JSON.stringify(response, null, 2));
      
      if (response.result && response.result.tools && Array.isArray(response.result.tools)) {
        console.log(`✅ Lista de ferramentas OK (${response.result.tools.length} ferramentas)`);
        
        // Lista as ferramentas encontradas
        response.result.tools.forEach(tool => {
          console.log(`   - ${tool.name}: ${tool.description}`);
        });
        
        return response.result.tools;
      } else {
        console.log('❌ Lista de ferramentas falhou');
        return null;
      }
    } catch (error) {
      console.log('❌ Erro ao listar ferramentas:', error.message);
      return null;
    }
  }

  async testToolCall(toolName, args) {
    console.log(`\n⚡ Testando chamada da ferramenta: ${toolName}...`);
    
    try {
      const response = await this.sendRequest('tools/call', {
        name: toolName,
        arguments: args
      });

      console.log('📥 Resposta:', JSON.stringify(response, null, 2));
      
      if (response.result) {
        console.log(`✅ Chamada de ${toolName} OK`);
        return response.result;
      } else if (response.error) {
        console.log(`❌ Erro na chamada de ${toolName}:`, response.error.message);
        return null;
      }
    } catch (error) {
      console.log(`❌ Erro ao chamar ${toolName}:`, error.message);
      return null;
    }
  }

  async runTests() {
    try {
      await this.startServer();

      // Teste 1: Initialize
      const initOk = await this.testInitialize();
      if (!initOk) {
        console.log('❌ Falha no initialize, parando testes');
        return;
      }

      // Teste 2: List tools
      const tools = await this.testListTools();
      if (!tools || tools.length === 0) {
        console.log('❌ Nenhuma ferramenta encontrada, parando testes');
        return;
      }

      // Teste 3: Testar algumas ferramentas
      const testCases = [
        {
          name: 'gemini_edit_code',
          args: {
            prompt: 'Adicione um comentário explicativo no início do arquivo',
            file_path: 'test.js'
          }
        },
        {
          name: 'gemini_analyze_code',
          args: {
            prompt: 'Analise este código para possíveis melhorias',
            file_paths: ['test.js'],
            analysis_type: 'general'
          }
        },
        {
          name: 'gemini_write_file',
          args: {
            prompt: 'Crie um arquivo JavaScript simples com uma função hello world',
            file_path: 'hello.js'
          }
        }
      ];

      for (const testCase of testCases) {
        // Verifica se a ferramenta existe
        const tool = tools.find(t => t.name === testCase.name);
        if (tool) {
          await this.testToolCall(testCase.name, testCase.args);
        } else {
          console.log(`⚠️  Ferramenta ${testCase.name} não encontrada, pulando teste`);
        }
      }

      console.log('\n🎉 Testes concluídos!');

    } catch (error) {
      console.error('💥 Erro durante os testes:', error);
    } finally {
      this.cleanup();
    }
  }

  cleanup() {
    if (this.serverProcess) {
      console.log('\n🛑 Parando servidor...');
      this.serverProcess.kill();
    }
  }
}

// Executa os testes se o script for chamado diretamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const tester = new MCPTester();
  
  // Cleanup em caso de interrupção
  process.on('SIGINT', () => {
    console.log('\n🛑 Interrompido pelo usuário');
    tester.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('\n🛑 Terminado');
    tester.cleanup();
    process.exit(0);
  });

  tester.runTests().catch(console.error);
}
