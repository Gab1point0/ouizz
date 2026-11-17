import { Fragment } from 'react';

/** Texte avec mise en forme légère : **gras**. Le reste est affiché tel quel. */
export function Rich({ text }: { text?: string }) {
  if (!text) return null;
  if (!text.includes('**')) return <>{text}</>;
  const parts = text.split('**');
  // un nombre pair de morceaux = un ** orphelin : on le garde tel quel à la fin
  return (
    <>
      {parts.map((p, i) => {
        if (i % 2 === 1 && i < parts.length - 1) return <b key={i}>{p}</b>;
        return <Fragment key={i}>{i % 2 === 1 ? `**${p}` : p}</Fragment>;
      })}
    </>
  );
}

/** Texte sans les marques de mise en forme (listes, rapports). */
export function plain(text?: string): string {
  return (text ?? '').replace(/\*\*/g, '');
}
