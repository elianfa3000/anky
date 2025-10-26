import React, { useEffect, useRef, useState } from "react";
import { importApkg } from "../../importer";
import type { SimpleCard } from "../../types";
import s from "./Drop.module.css";

/**
 * Anki Lite (MVP React) — versión simplificada
 *
 * Qué mejoré:
 * 1) Separé estilos a CSS Modules (Drop.module.css) → JSX más limpio y fácil de leer.
 * 2) Reduje useMemo/useCallback al mínimo. Para este tamaño de componente no aportaban valor
 *    y complicaban la lectura. Uso funciones/consts directas.
 * 3) Unifiqué handlers y nombres claros: handleFile, goNext, goPrev, goToCard, etc.
 * 4) Mantuve accesibilidad (aria-labels), atajos y limpieza de <audio> embebidos.
 * 5) Mantengo TODO el comportamiento original: drag&drop .apkg, selector, progreso,
 *    ir a tarjeta, deslizador, audio único al revelar, atajos de teclado, etc.
 */

export default function Drop() {
  // Estado principal
  const [cards, setCards] = useState<SimpleCard[]>([]);
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [goValue, setGoValue] = useState<string>("");

  // Ref del input file oculto
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Tarjeta actual y metadatos
  const total = cards.length;
  const current = cards[index];
  const progress = total ? `${index + 1} / ${total}` : "0 / 0";

  // --- Utilidad: quitar <audio> embebidos del HTML para que solo usemos el reproductor único ---
  const stripAudios = (html: string) =>
    (html || "").replace(/<audio[\s\S]*?<\/audio>/gi, "");

  const htmlFront = stripAudios(
    current?.htmlFront || current?.fields?.[0] || ""
  );
  const htmlBack = stripAudios(current?.htmlBack || current?.fields?.[1] || "");
  const audioUrl = current?.audioUrls?.[0] ?? null;

  // --- Carga de archivo (selector o drag&drop) ---
  async function handleFile(file?: File | null) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".apkg")) {
      alert("Selecciona un archivo .apkg de Anki.");
      return;
    }
    // Reinicio de navegación
    setCards([]);
    setIndex(0);
    setShowAnswer(false);
    setGoValue("");

    try {
      const { cards: loaded } = await importApkg(file);
      if (!loaded || loaded.length === 0) {
        alert("No se encontraron tarjetas en el archivo.");
        return;
      }
      setCards(loaded);
    } catch (err) {
      console.error(err);
      alert("No se pudo leer el .apkg. Verifica que el archivo sea válido.");
    }
  }

  // --- Drag & Drop ---
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }
  function onDragLeave() {
    setIsDragging(false);
  }
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    handleFile(e.dataTransfer.files?.[0]);
  }

  // --- Selector de archivo (input oculto) ---
  function onSelect(e: React.ChangeEvent<HTMLInputElement>) {
    handleFile(e.target.files?.[0] ?? null);
  }

  // --- Navegación ---
  function goNext() {
    setIndex((i) => Math.min(i + 1, Math.max(0, cards.length - 1)));
    setShowAnswer(false);
  }
  function goPrev() {
    setIndex((i) => Math.max(i - 1, 0));
    setShowAnswer(false);
  }
  function goToCard() {
    if (!total) return;
    const n = parseInt(goValue, 10);
    if (Number.isNaN(n)) return;
    const zero = Math.max(1, Math.min(n, total)) - 1;
    setIndex(zero);
    setShowAnswer(false);
  }

  // --- Atajos de teclado ---
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!total) return;
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        setShowAnswer((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [total]);

  return (
    <div className={s.page}>
      <header className={s.header}>
        <h1 className={s.h1}>Anki Lite (MVP React)</h1>
        <p className={s.sub}>
          Arrastra un archivo <code>.apkg</code> o usa el botón «Seleccionar».
        </p>
      </header>

      <main
        className={s.main}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      >
        <div className={s.row}>
          <button
            className={s.btnPrimary}
            onClick={() => fileInputRef.current?.click()}
            aria-label="Seleccionar archivo .apkg"
          >
            Seleccionar .apkg
          </button>

          {/* Input oculto solo para abrir el selector del sistema */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".apkg"
            className={s.hiddenInput}
            onChange={onSelect}
          />

          {/* Barra de controles solo si hay tarjetas cargadas */}
          {total > 0 && (
            <>
              <span className={s.mini}>Tarjeta: {progress}</span>

              <label className={s.label} htmlFor="go">
                Ir a:
              </label>
              <input
                id="go"
                type="number"
                min={1}
                max={Math.max(1, total)}
                placeholder="número"
                value={goValue}
                onChange={(e) => setGoValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") goToCard();
                }}
                className={s.inputNum}
                aria-label="Número de tarjeta a saltar"
              />
              <button
                className={s.btn}
                onClick={goToCard}
                aria-label="Ir a la tarjeta indicada"
              >
                Ir
              </button>

              <input
                type="range"
                min={0}
                max={Math.max(0, total - 1)}
                value={index}
                onChange={(e) => {
                  setIndex(parseInt(e.target.value, 10));
                  setShowAnswer(false);
                }}
                className={s.range}
                aria-label="Deslizar para cambiar de tarjeta"
              />
            </>
          )}
        </div>

        {!current && (
          <div className={`${s.dropZone} ${isDragging ? s.dragging : ""}`}>
            Suelta aquí tu archivo <strong>.apkg</strong>
          </div>
        )}

        {current && (
          <div className={s.card}>
            <div className={s.meta}>
              Tarjeta #{current.cardId} — Nota #{current.noteId}
            </div>

            {/* PREGUNTA */}
            <div className={s.section}>
              <h2 className={s.sectionTitle}>Pregunta</h2>
              <p className={s.hint}>
                Lee la consigna. Pulsa <kbd>Espacio</kbd> o «Mostrar respuesta».
              </p>
              <div
                className={s.htmlBox}
                dangerouslySetInnerHTML={{ __html: htmlFront }}
              />
            </div>

            {/* RESPUESTA */}
            <div className={s.section}>
              <h2 className={s.sectionTitle}>Respuesta</h2>
              {!showAnswer ? (
                <button
                  className={s.btnPrimary}
                  onClick={() => setShowAnswer(true)}
                  aria-label="Mostrar respuesta"
                >
                  Mostrar respuesta
                </button>
              ) : (
                <>
                  <div
                    className={s.htmlBox}
                    dangerouslySetInnerHTML={{ __html: htmlBack }}
                  />
                  {audioUrl && (
                    <div className={s.audioWrap}>
                      <audio
                        controls
                        preload="none"
                        src={audioUrl}
                        controlsList="nodownload noplaybackrate"
                        onContextMenu={(e) => e.preventDefault()}
                        className={s.audio}
                        aria-label="Reproducir audio"
                      />
                    </div>
                  )}
                </>
              )}
            </div>

            <div className={s.navRow}>
              <button
                className={`${s.btn} ${index === 0 ? s.btnDisabled : ""}`}
                onClick={goPrev}
                disabled={index === 0}
              >
                ◀ Anterior
              </button>
              <button
                className={`${s.btn} ${
                  index >= cards.length - 1 ? s.btnDisabled : ""
                }`}
                onClick={goNext}
                disabled={index >= cards.length - 1}
              >
                Siguiente ▶
              </button>
            </div>

            <div className={s.help}>
              Atajos: ← / → para navegar, <kbd>Espacio</kbd> para
              mostrar/ocultar la respuesta. Usa «Ir a» o el deslizador para
              saltar a una tarjeta específica.
            </div>
          </div>
        )}

        <p className={s.mini}>
          * Este MVP muestra Pregunta/Respuesta, audio único al revelar, y
          permite saltar a cualquier tarjeta.
        </p>
      </main>

      <a className={s.baseLink} href="/">
        BASE
      </a>
    </div>
  );
}
