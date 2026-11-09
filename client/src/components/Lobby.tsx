import { useState } from "react";
import type { PublicRoom } from "@arena/shared";

interface LobbyProps {
  connected: boolean;
  rooms: PublicRoom[];
  onCreate: (username: string) => void;
  onJoin: (roomCode: string, username: string) => void;
  onRefresh: () => void;
}

export function Lobby({ connected, rooms, onCreate, onJoin, onRefresh }: LobbyProps) {
  const [roomCode, setRoomCode] = useState("");
  const [username, setUsername] = useState("");
  const normalizedUsername = username.trim();
  const canEnter = connected && normalizedUsername.length >= 2 && normalizedUsername.length <= 20;

  const panelStyle = {
    background: "linear-gradient(to bottom, #1e1b35, #151122)",
    border: "1px solid #4a4563",
  } as const;

  const inputStyle = {
    background: "#0d0b1a",
    border: "1px solid #4a4563",
    color: "#e5e7eb",
    outline: "none",
  } as const;

  const goldButtonStyle = {
    background: "linear-gradient(135deg, #92400e, #b45309, #d97706)",
    boxShadow: "0 0 20px rgba(180,83,9,0.35), inset 0 1px 0 rgba(255,255,255,0.1)",
    border: "1px solid #d97706",
  } as const;

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10 sm:px-6">

      {/* Cabeçalho */}
      <header className="text-center">
        <p className="text-sm font-semibold tracking-[0.3em] text-amber-500 uppercase">Reino Distribuído</p>
        <h1
          className="mt-3 text-5xl font-black tracking-tight text-white sm:text-6xl"
          style={{ textShadow: "0 0 40px rgba(217,119,6,0.4), 0 2px 4px rgba(0,0,0,0.8)" }}
        >
          ⚔️ Arena Medieval
        </h1>
        <p className="mt-3 text-slate-400 max-w-sm mx-auto">
          Desafie outros cavaleiros em uma batalha épica de torres. Que o castelo mais forte vença.
        </p>
        <div
          className="mt-4 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold"
          style={connected
            ? { background: "rgba(5,150,105,0.2)", border: "1px solid #059669", color: "#6ee7b7" }
            : { background: "rgba(220,38,38,0.2)", border: "1px solid #dc2626", color: "#fca5a5" }}
        >
          <span
            className="inline-block w-2 h-2 rounded-full"
            style={{ background: connected ? "#6ee7b7" : "#fca5a5", boxShadow: connected ? "0 0 6px #6ee7b7" : "0 0 6px #fca5a5" }}
          />
          {connected ? "Conectado ao servidor" : "Desconectado"}
        </div>
      </header>

      {/* Campo de nome */}
      <div className="rounded-2xl p-5" style={panelStyle}>
        <label className="block text-sm font-semibold text-amber-300 tracking-wide" htmlFor="username">
          🛡 Nome do Cavaleiro
        </label>
        <input
          id="username"
          value={username}
          maxLength={20}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Ex.: Sir Lancelot"
          className="mt-3 w-full rounded-lg px-3 py-2 transition"
          style={inputStyle}
          onFocus={(e) => { e.target.style.border = "1px solid #d97706"; }}
          onBlur={(e) => { e.target.style.border = "1px solid #4a4563"; }}
        />
        <p className="mt-2 text-xs text-slate-500">Use de 2 a 20 caracteres.</p>
      </div>

      {/* Ações principais */}
      <div className="grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          disabled={!canEnter}
          onClick={() => onCreate(normalizedUsername)}
          className="rounded-2xl px-5 py-6 text-left font-bold text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
          style={goldButtonStyle}
        >
          <span className="block text-sm uppercase tracking-wider text-amber-200">Nova batalha</span>
          <span className="mt-1 block text-2xl">🏰 Erguer Castelo</span>
          <span className="mt-1 block text-xs text-amber-200/70">Cria uma sala e aguarda um oponente</span>
        </button>

        <form
          className="rounded-2xl p-5"
          style={panelStyle}
          onSubmit={(event) => {
            event.preventDefault();
            if (roomCode && canEnter) onJoin(roomCode, normalizedUsername);
          }}
        >
          <label className="block text-sm font-semibold text-amber-300 tracking-wide" htmlFor="room-code">
            ⚔️ Código da Batalha
          </label>
          <div className="mt-3 flex gap-2">
            <input
              id="room-code"
              value={roomCode}
              maxLength={5}
              onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
              placeholder="ABCDE"
              className="min-w-0 flex-1 rounded-lg px-3 py-2 font-mono uppercase transition"
              style={inputStyle}
              onFocus={(e) => { e.target.style.border = "1px solid #d97706"; }}
              onBlur={(e) => { e.target.style.border = "1px solid #4a4563"; }}
            />
            <button
              type="submit"
              disabled={!canEnter || roomCode.length !== 5}
              className="rounded-lg px-4 py-2 font-bold text-white transition hover:brightness-110 disabled:opacity-50"
              style={goldButtonStyle}
            >
              Entrar
            </button>
          </div>
        </form>
      </div>

      {/* Lista de salas */}
      <section className="rounded-2xl p-5" style={panelStyle}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">🗺 Batalhas Disponíveis</h2>
          <button
            type="button"
            onClick={onRefresh}
            disabled={!connected}
            className="rounded-md px-3 py-1.5 text-sm font-semibold text-amber-300 transition hover:text-amber-100 disabled:opacity-50"
            style={{ background: "rgba(180,83,9,0.15)", border: "1px solid #b45309" }}
          >
            Atualizar
          </button>
        </div>
        {rooms.length === 0 ? (
          <p className="mt-5 text-sm text-slate-500 text-center py-4">Nenhuma batalha em andamento.<br />Seja o primeiro a erguer um castelo!</p>
        ) : (
          <ul className="mt-4 grid gap-2">
            {rooms.map((room) => (
              <li
                key={room.code}
                className="flex items-center justify-between gap-3 rounded-lg px-4 py-3 transition"
                style={{ background: "#0d0b1a", border: "1px solid #2d2b4e" }}
              >
                <div>
                  <span className="font-mono font-bold text-amber-400">{room.code}</span>
                  <span className="ml-3 text-sm text-slate-400">
                    {room.playerCount}/2 cavaleiros · {room.spectatorCount} espectadores
                  </span>
                  <span
                    className="ml-2 text-xs rounded-full px-2 py-0.5"
                    style={room.status === "PLAYING"
                      ? { background: "rgba(5,150,105,0.2)", color: "#6ee7b7", border: "1px solid #059669" }
                      : { background: "rgba(180,83,9,0.2)", color: "#fbbf24", border: "1px solid #b45309" }}
                  >
                    {room.status === "PLAYING" ? "Em batalha" : room.status === "WAITING" ? "Aguardando" : room.status}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onJoin(room.code, normalizedUsername)}
                  disabled={!canEnter}
                  className="rounded-md px-3 py-1.5 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
                  style={{ background: "rgba(180,83,9,0.3)", border: "1px solid #b45309" }}
                >
                  Entrar
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
