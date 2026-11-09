# Arena Pong Distribuída

Jogo Pong 2D multiplayer em tempo real para a disciplina de Sistemas Distribuídos. O jogo é executado no navegador e demonstrável por dois ou mais dispositivos na mesma rede local.

O servidor é autoritativo: ele é a única fonte da verdade sobre física, placar, salas e papéis. O cliente apenas envia intenções de movimento e renderiza os snapshots recebidos por WebSocket.

## Tecnologias

- Node.js, TypeScript, Express e Socket.IO no servidor
- Zod para validar todas as mensagens recebidas
- React, Vite, Tailwind CSS e Canvas no cliente
- PNPM workspaces com os pacotes `server`, `client` e `shared`

## Arquitetura

```text
Browser A --\                         /-- Room A: estado e loop próprios
Browser B ---- Socket.IO / WebSocket ----
Browser C --/                         \-- Room B: estado e loop próprios
                    |
                    `-- Servidor autoritativo a 30 ticks/s
```

O estado é mantido apenas em memória. Cada sala possui as conexões dos jogadores e espectadores, estado da partida, placar da sessão, versão incremental e seu próprio ciclo de jogo lógico. Não há banco de dados, login ou endpoint HTTP para jogar.

## Física da bola (autoridade do servidor)

A física roda exclusivamente em `server/src/game-engine.ts` a 30 ticks/s. A bola acelera a cada colisão com qualquer raquete para aumentar a intensidade dos ralis, mantendo determinismo e limite de segurança:

- **Gatilho:** cada rebatida em `PLAYER_ONE` ou `PLAYER_TWO` aumenta a magnitude da velocidade.
- **Progressão:** escala geométrica por rebatida, calibrada para atingir a velocidade máxima após **30 rebatidas** em um mesmo rali.
- **Velocidade inicial:** componentes `(360, 210)` px/s, magnitude `~416,77` px/s.
- **Velocidade máxima:** `2,2x` a magnitude inicial (`~916,90` px/s, `~30,56` px/tick a 30 ticks/s).
- **Fator por rebatida:** `(máx/inicial)^(1/30) = ~1,02663` por hit, com clamp no máximo.
- **Direção:** a direção horizontal é invertida para longe da raquete atingida; o vetor é normalizado e reescalado para preservar o ângulo relativo com aceleração consistente.
- **Reset:** a velocidade volta ao valor inicial em todo saque/nova rodada, nova partida, revanche e retorno ao estado de espera (`createInitialGameState` / `createNextRound`).

O contrato compartilhado (`shared/src/types.ts`) continua estável: `BallState` na rede expõe apenas `x`, `y` e `radius`; as componentes de velocidade permanecem internas ao motor.

**Risco conhecido:** velocidades muito altas podem atravessar a raquete entre ticks (tunneling) com teste discreto de colisão. A calibração atual é conservadora para 30 ticks/s; se ocorrerem pontos injustos em ralis longos, reduzir o multiplicador máximo (ex.: `2,0x`) ou adicionar detecção contínua/swept como evolução.

## Pré-requisitos

- Node.js 22 ou superior
- PNPM 11 ou superior
- Dois dispositivos conectados à mesma rede local para a demonstração

## Instalação

Na raiz do projeto:

```powershell
pnpm install
```

Crie o arquivo de configuração do cliente a partir do exemplo:

```powershell
Copy-Item client\.env.example client\.env
```

Edite `client/.env` e informe o IP LAN do computador que executará o servidor:

```env
VITE_SERVER_URL=http://192.168.0.15:3000
```

Não use `localhost` nesse arquivo quando for abrir o jogo em outro dispositivo.

## Execução

Para subir servidor e cliente juntos:

```powershell
pnpm dev
```

O servidor escuta em `0.0.0.0:3000` e o Vite em `0.0.0.0:5173`. A porta do servidor pode ser alterada antes da execução:

```powershell
$env:PORT = "3000"
pnpm --filter @arena/server dev
```

Em outro terminal, execute o cliente:

```powershell
pnpm --filter @arena/client dev
```

Verificações disponíveis:

```powershell
pnpm typecheck
pnpm build
```

## Acesso pela rede local

1. No computador que executa o servidor, descubra o IPv4:

   ```powershell
   ipconfig
   ```

   Procure o campo `Endereço IPv4` do adaptador conectado à rede. Exemplo: `192.168.0.15`.

2. Confirme que `VITE_SERVER_URL` usa esse IP e reinicie o Vite após alterar o `.env`.
3. Nos outros dispositivos, abra `http://SEU_IP:5173`, por exemplo `http://192.168.0.15:5173`.
4. Se a página não abrir, permita as portas TCP 3000 e 5173 no Firewall do Windows. Em um PowerShell aberto como administrador:

   ```powershell
   New-NetFirewallRule -DisplayName "Arena Pong servidor" -Direction Inbound -Protocol TCP -LocalPort 3000 -Action Allow
   New-NetFirewallRule -DisplayName "Arena Pong cliente" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow
   ```

5. Verifique se os dispositivos estão na mesma rede e se a rede do Windows está marcada como Privada.

## Protocolo de mensagens

O único evento Socket.IO é `message`. Seu payload é uma união discriminada pelo campo `type`, declarada em `shared/src/types.ts` e usada pelo servidor e cliente.

| Direção | Tipos | Finalidade |
| --- | --- | --- |
| Cliente -> servidor | `CREATE_ROOM`, `JOIN_ROOM`, `LIST_ROOMS` | Operações do lobby |
| Cliente -> servidor | `INPUT` | Intenção `UP`, `DOWN` ou `STOP` |
| Cliente -> servidor | `REQUEST_REMATCH` | Confirmação de revanche |
| Servidor -> cliente | `ROLE_ASSIGNED`, `ROOMS_LIST` | Papel automático e salas públicas |
| Servidor -> cliente | `GAME_STATE` | Snapshot autoritativo com versão incremental |
| Servidor -> cliente | `MATCH_FINISHED`, `OPPONENT_DISCONNECTED` | Eventos de término e falha parcial |
| Servidor -> cliente | `ERROR` | Rejeição segura apenas ao remetente |

Todo payload recebido passa por Zod antes de alcançar o gerenciador de salas. Mensagens malformadas, ações de espectadores, salas inexistentes e entradas fora do estado correto retornam `ERROR`; nenhuma delas derruba o processo.

## Máquina de estados da sala

```text
WAITING -- dois jogadores --> PLAYING -- ponto --> PAUSED -- 1 segundo --> PLAYING
   ^                              |                                  |
   |                              `-- 5 pontos --> FINISHED -- revanche dos dois --> PLAYING
   `---------------- jogador desconecta ------------------------------'
```

- `WAITING`: aguarda dois jogadores.
- `PLAYING`: loop de 30 ticks/s aplica inputs e física.
- `PAUSED`: pausa curta entre pontos.
- `FINISHED`: alguém atingiu 5 pontos; ambos os jogadores podem pedir revanche.

## Roteiro de testes manuais

| Cenário | Procedimento | Resultado esperado |
| --- | --- | --- |
| Dois dispositivos | Abra a URL LAN em dois dispositivos e entre na mesma sala. | Papéis Jogador 1 e Jogador 2; partida inicia e ambos veem o mesmo placar. |
| Espectador | Abra um terceiro navegador e entre no mesmo código. | Papel Espectador; canvas acompanha a partida; controles ficam indisponíveis. |
| Input inválido | Em desenvolvimento, abra DevTools -> Console em um cliente conectado e execute `window.__arenaSocket.emit("message", { type: "INPUT", direction: "TELEPORT" })`. | O console de rede recebe `ERROR` com `INVALID_PAYLOAD`; o servidor continua ativo e registra a rejeição. |
| Duas salas | Crie duas salas diferentes, com dois jogadores em cada uma. | Placares, bola e mensagens não vazam entre salas. |
| Aceleração da bola | Em dois clientes, mantenha um rali longo sem marcar ponto. | A bola acelera a cada rebatida, atinge um teto perceptível após ~30 rebatidas e mantém colisões/placar corretos. |
| Reset após ponto | Marque um ponto durante um rali acelerado e observe o saque. | A velocidade volta ao padrão inicial na nova rodada; após revanche/fim de partida, o reset permanece correto. |
| Desconexão | Feche a aba de um jogador no meio de um ponto. | O restante recebe "Oponente desconectado"; sala retorna a `WAITING`; servidor continua ativo. |
| Revanche | Termine uma partida (5 pontos) e pressione "Pedir revanche" nos dois jogadores. | Nova partida começa na mesma sala com placar da partida zerado; vitórias da sessão preservadas. |
| Tráfego WebSocket | Abra DevTools -> Network -> WS -> conexão Socket.IO -> Frames. | Frames `message` mostram o contrato e `GAME_STATE` com `version` crescente. |

`window.__arenaSocket` existe apenas quando o Vite está em modo de desenvolvimento e serve exclusivamente para o teste de robustez acima.

## Organização do código

```text
server/src/game-engine.ts  # física, regras, aceleração e resets da bola
server/src/rooms.ts        # estado em memória e papéis
server/src/index.ts        # Socket.IO, loop e difusão
client/src/hooks/          # comunicação Socket.IO
client/src/components/     # lobby, canvas e tela do jogo
shared/src/types.ts        # contrato compartilhado
plans/                     # planos de implementação e prompts
```
