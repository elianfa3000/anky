import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent } from "react";
import { getData } from "../../api/auth.js"; // tu API actual
import s from "./Base.module.css";

type Word = {
  _id?: string;
  front: string;
  back: string;
  level?: string; // A1, A2, B1, ...

  tipo?: string; // "adjetivos" | "adverbios" | "conjunciones" | "preposiciones" | "pronombres" | "sustantivos" | "verbos"
};

/** Orden fijo para el select "Tipo" */
const POS_ORDER = [
  "adjetivos",
  "adverbios",
  "conjunciones",
  "preposiciones",
  "pronombres",
  "sustantivos",
  "verbos",
];

export default function Base() {
  // datos y estado de navegación
  const [cards, setCards] = useState<Word[]>([]);
  const [index, setIndex] = useState(0);

  // filtros
  const [level, setLevel] = useState<string>("Todos");
  const [pos, setPos] = useState<string>("Todos");

  // cargar datos al montar
  useEffect(() => {
    (async () => {
      try {
        const res = await getData();
        // admite { data: [...] } o directamente [...]
        const arr: Word[] = Array.isArray(res.data?.data)
          ? res.data.data
          : res.data || [];
        setCards(arr);
        setIndex(0);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  // construir opciones del select "Nivel" (dinámico)
  const levels = useMemo(() => {
    const set = new Set<string>(
      cards.map((c) => (c.level || "").trim()).filter(Boolean)
    );
    return ["Todos", ...Array.from(set).sort()];
  }, [cards]);

  // construir opciones del select "Tipo" (orden fijo y solo lo que exista)
  const tipos = useMemo(() => {
    const found = new Set<string>();
    for (const c of cards) {
      const p = (c.tipo || "").toLowerCase().trim();
      if (p) found.add(p);
    }
    const ordered = POS_ORDER.filter((v) => found.has(v));
    return ["Todos", ...ordered];
  }, [cards]);

  // aplicar filtros en cliente (simple y rápido)
  const filtered = useMemo(() => {
    let arr = cards;
    if (level !== "Todos")
      arr = arr.filter((c) => (c.level || "").trim() === level);
    if (pos !== "Todos")
      arr = arr.filter((c) => (c.tipo || "").toLowerCase().trim() === pos);
    return arr;
  }, [cards, level, pos]);

  // cuando cambian filtros, vuelve al inicio del subconjunto
  useEffect(() => {
    setIndex(0);
  }, [level, pos]);

  // navegación
  const total = filtered.length;
  const current = filtered[index];
  const prev = () => setIndex((i) => Math.max(i - 1, 0));
  const next = () => setIndex((i) => Math.min(i + 1, Math.max(0, total - 1)));

  // número editable en la meta: Tarjeta [ n ] / total
  const onMetaNumberChange = (e: ChangeEvent<HTMLInputElement>) => {
    const n = parseInt(e.target.value, 10);
    if (Number.isNaN(n)) return;
    const clamped = Math.max(1, Math.min(n, Math.max(1, total)));
    setIndex(clamped - 1);
  };

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.h1}>Flashcards (DB)</h1>
        <p className={s.sub}>Tarjetas precargadas desde tu base de datos.</p>
      </header>

      <main className={s.main}>
        {/* Filtros compactos */}
        <div className={s.toolbar}>
          <label className={s.label}>Nivel</label>
          <select
            className={s.select}
            value={level}
            onChange={(e) => setLevel(e.target.value)}
          >
            {levels.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <label className={s.label}>Tipo</label>
          <select
            className={s.select}
            value={pos}
            onChange={(e) => setPos(e.target.value)}
          >
            {tipos.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>

          <span className={s.mini}>Mostrando: {total || 0} palabras</span>
        </div>

        {/* Tarjeta actual */}
        {current ? (
          <div className={s.card}>
            <div className={s.meta}>
              Tarjeta{" "}
              <input
                className={s.metaNum}
                type="number"
                min={1}
                max={Math.max(1, total)}
                value={Math.min(index + 1, Math.max(1, total))}
                onChange={onMetaNumberChange}
                aria-label="Número de tarjeta"
              />{" "}
              / {total}
            </div>

            {/* Pregunta */}
            <section className={s.section}>
              <h2 className={s.sectionTitle}>Pregunta</h2>
              <p className={s.hint}>
                Lee la consigna. Pulsa las flechas o escribe el número.
              </p>
              <div className={s.htmlBox}>{current.front}</div>
            </section>

            {/* Respuesta */}
            <section className={s.section}>
              <h2 className={s.sectionTitle}>Respuesta</h2>
              <div className={s.htmlBox}>{current.back}</div>
            </section>

            {/* Navegación */}
            <div className={s.nav}>
              <button className={s.btn} onClick={prev} disabled={index === 0}>
                ◀ Anterior
              </button>
              <button
                className={`${s.btn} ${s.primary}`}
                onClick={next}
                disabled={index >= total - 1}
              >
                Siguiente ▶
              </button>
            </div>
          </div>
        ) : (
          <div className={s.drop}>Cargando tarjetas…</div>
        )}
      </main>
      <a href="/drop">DROP</a>
    </div>
  );
}
