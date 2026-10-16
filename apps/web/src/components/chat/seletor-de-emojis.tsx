"use client";

import { useState } from "react";
import { Icone } from "@/components/icones";
import { classeBotaoIcone } from "@/components/ui";

/** Emojis mais usados, por grupo. Sem biblioteca: o próprio sistema do aparelho desenha. */
const GRUPOS: { nome: string; emojis: string }[] = [
  {
    nome: "Carinhas",
    emojis:
      "😀 😃 😄 😁 😆 😅 😂 🤣 😊 😇 🙂 😉 😍 🥰 😘 😋 😜 🤪 😎 🤩 🥳 🤗 🤔 🤨 😐 😶 🙄 😏 😬 😌 😴 😷 🤒 🥵 🥶 😵 🤯 😕 😟 😮 😲 😳 🥺 😢 😭 😱 😤 😡 🤬",
  },
  {
    nome: "Gestos",
    emojis: "👍 👎 👌 ✌️ 🤞 🤟 🤘 🤙 👋 👏 🙌 👐 🙏 🤝 💪 👊 ✊ 🤛 🤜 👆 👇 👈 👉 ☝️ ✋ 🤚 🖐️ 🫶",
  },
  {
    nome: "Esporte",
    emojis: "🏐 ⚽ 🏀 🎾 🏖️ ☀️ 🌊 🏆 🥇 🥈 🥉 🏅 🎯 ⏱️ 💦 🔥 ⚡ 💯 ✅ ❌ ⭐ 🌟 🎉 🎊",
  },
  {
    nome: "Corações",
    emojis: "❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 💕 💞 💖 💗 💘 💝",
  },
  {
    nome: "Outros",
    emojis: "📅 ⏰ 📍 📞 💬 📷 🎥 🎤 📄 💰 💳 🧾 🚗 🏠 🍕 🍔 🥤 ☕ 🍺 🎂 🎁 ☔ 🌧️ 🌙",
  },
];

/** CHAT-CA-06: seletor de emojis do compositor; o emoji escolhido entra no texto. */
export function SeletorDeEmojis({ aoEscolher }: { aoEscolher: (emoji: string) => void }) {
  const [aberto, setAberto] = useState(false);
  const [grupo, setGrupo] = useState(0);
  return (
    <div className="relative">
      <button
        type="button"
        className={classeBotaoIcone}
        aria-label="Emojis"
        aria-expanded={aberto}
        onClick={() => setAberto((a) => !a)}
      >
        <Icone nome="emoji" width={20} height={20} />
      </button>
      {aberto && (
        <div
          role="dialog"
          aria-label="Escolher emoji"
          className="superficie animate-entrar absolute bottom-14 left-0 z-20 w-[min(20rem,calc(100vw-2rem))] rounded-2xl p-3 shadow-2xl"
        >
          <div className="mb-2 flex gap-1 overflow-x-auto" role="tablist">
            {GRUPOS.map((g, i) => (
              <button
                key={g.nome}
                type="button"
                role="tab"
                aria-selected={grupo === i}
                onClick={() => setGrupo(i)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${grupo === i ? "bg-roxo text-white" : "text-suave hover:bg-elevado"}`}
              >
                {g.nome}
              </button>
            ))}
          </div>
          <div className="grid max-h-48 grid-cols-8 gap-1 overflow-y-auto">
            {GRUPOS[grupo]!.emojis.split(" ").map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="hover:bg-elevado grid size-9 place-items-center rounded-lg text-xl"
                onClick={() => aoEscolher(emoji)}
                aria-label={`Inserir ${emoji}`}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Reações rápidas, como no WhatsApp. */
export const REACOES_RAPIDAS = ["👍", "❤️", "😂", "😮", "😢", "🙏"] as const;
