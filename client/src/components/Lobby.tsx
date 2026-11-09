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

  return (
    <section className="mx-auto grid w-full max-w-3xl gap-6 px-4 py-10 sm:px-6">
      <header>
        <p className="text-sm font-semibold tracking-[0.22em] text-cyan-300">SISTEMAS DISTRIBUÍDOS</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Arena Pong</h1>
        <p className="mt-3 max-w-xl text-slate-300">Entre em uma sala para jogar ou acompanhar uma partida em tempo real.</p>
      </header>

      <div className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <label className="text-sm font-semibold text-slate-200" htmlFor="username">Seu nome de usuário</label>
        <input id="username" value={username} maxLength={20} onChange={(event) => setUsername(event.target.value)} placeholder="Ex.: Pablo" className="mt-3 w-full rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 text-white outline-none focus:border-cyan-300" />
        <p className="mt-2 text-xs text-slate-400">Use de 2 a 20 caracteres.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <button type="button" disabled={!canEnter} onClick={() => onCreate(normalizedUsername)} className="rounded-2xl bg-cyan-400 px-5 py-5 text-left font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50">
          <span className="block text-sm uppercase tracking-wider">Nova partida</span>
          <span className="mt-1 block text-xl">Criar sala</span>
        </button>
        <form className="rounded-2xl border border-slate-700 bg-slate-900 p-4" onSubmit={(event) => { event.preventDefault(); if (roomCode && canEnter) onJoin(roomCode, normalizedUsername); }}>
          <label className="text-sm font-semibold text-slate-200" htmlFor="room-code">Código da sala</label>
          <div className="mt-3 flex gap-2">
            <input id="room-code" value={roomCode} maxLength={5} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} placeholder="ABCDE" className="min-w-0 flex-1 rounded-lg border border-slate-600 bg-slate-950 px-3 py-2 font-mono uppercase text-white outline-none focus:border-cyan-300" />
            <button type="submit" disabled={!canEnter || roomCode.length !== 5} className="rounded-lg bg-slate-100 px-4 py-2 font-bold text-slate-950 disabled:opacity-50">Entrar</button>
          </div>
        </form>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-white">Salas disponíveis</h2>
          <button type="button" onClick={onRefresh} disabled={!connected} className="rounded-md border border-slate-600 px-3 py-1.5 text-sm font-semibold text-slate-200 hover:border-cyan-300 disabled:opacity-50">Atualizar</button>
        </div>
        {rooms.length === 0 ? <p className="mt-5 text-sm text-slate-400">Nenhuma sala criada ainda.</p> : (
          <ul className="mt-4 grid gap-2">
            {rooms.map((room) => (
              <li key={room.code} className="flex items-center justify-between gap-3 rounded-lg bg-slate-950 px-4 py-3">
                <div><span className="font-mono font-bold text-cyan-300">{room.code}</span><span className="ml-3 text-sm text-slate-400">{room.playerCount}/2 jogadores · {room.spectatorCount} espectadores</span></div>
                <button type="button" onClick={() => onJoin(room.code, normalizedUsername)} disabled={!canEnter} className="rounded-md bg-slate-700 px-3 py-1.5 text-sm font-semibold hover:bg-slate-600 disabled:opacity-50">Entrar</button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
