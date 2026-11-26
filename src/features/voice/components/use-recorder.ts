"use client";

import { useCallback, useEffect, useRef } from "react";

/** Los formatos que la API acepta, en orden; Safari solo graba mp4. */
const TYPES = ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4"];

/** Voz, no música: un minuto entra cómodo en los 2 MB de la API. */
const BITS_PER_SECOND = 32_000;

export interface Recorder {
  /** Empieza a grabar; false si el navegador no tiene micrófono o no lo permitió. */
  start(): Promise<boolean>;
  /** Para y devuelve lo grabado. */
  stop(): Promise<Blob>;
  /** Para y descarta lo grabado. */
  cancel(): void;
}

/**
 * El micrófono del navegador. Graba en memoria: el audio solo sale hacia la
 * API, que tampoco lo guarda (spec 012 del back, RF-10).
 */
export function useRecorder(): Recorder {
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);

  const release = useCallback(() => {
    recorder.current?.stream.getTracks().forEach((track) => track.stop());
    recorder.current = null;
  }, []);

  useEffect(() => release, [release]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") return false;
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      return false;
    }
    const mimeType = TYPES.find((type) => MediaRecorder.isTypeSupported(type));
    const media = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: BITS_PER_SECOND });
    chunks.current = [];
    media.ondataavailable = (event) => chunks.current.push(event.data);
    media.start();
    recorder.current = media;
    return true;
  }, []);

  const stop = useCallback(
    () =>
      new Promise<Blob>((resolve) => {
        const media = recorder.current;
        if (!media) return resolve(new Blob());
        media.onstop = () => {
          resolve(new Blob(chunks.current, { type: media.mimeType }));
          chunks.current = [];
          release();
        };
        media.stop();
      }),
    [release],
  );

  const cancel = useCallback(() => {
    if (recorder.current) recorder.current.onstop = null;
    recorder.current?.stop();
    chunks.current = [];
    release();
  }, [release]);

  return { start, stop, cancel };
}
