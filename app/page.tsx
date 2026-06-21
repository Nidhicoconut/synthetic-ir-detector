"use client";

import { useState, useRef, useCallback } from "react";
import Image from "next/image";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://your-space.hf.space";

export default function Home() {
  const [dragOver, setDragOver]       = useState(false);
  const [preview, setPreview]         = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [result, setResult]           = useState<any>(null);
  const [error, setError]             = useState<string | null>(null);
  const fileInputRef                  = useRef(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      setError("Please upload an image file.");
      return;
    }

    setError(null);
    setResult(null);

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(file);

    // Send to API
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`${API_URL}/detect`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError(err.message || "Something went wrong. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFile(file);
  }, [handleFile]);

  const onFileChange = (e) => handleFile(e.target.files[0]);

  return (
    <main className="min-h-screen bg-[#0a0a0a] text-white font-mono">

      {/* ── Header ── */}
      <header className="border-b border-orange-900/40 px-6 py-4 flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
        <span className="text-orange-400 text-xs tracking-[0.3em] uppercase">
          Synthetic IR · Object Detector
        </span>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">

        {/* ── Title ── */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">
            Thermal Vision
            <span className="text-orange-500">.</span>
          </h1>
          <p className="text-zinc-500 text-sm leading-relaxed max-w-lg">
            Upload any RGB image. We convert it to synthetic infrared and detect
            people using a YOLOv8 model trained entirely on fake thermal data.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* ── Upload Panel ── */}
          <div>
            <p className="text-xs text-zinc-600 tracking-widest uppercase mb-3">Input</p>

            {/* Drop zone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              className={`
                relative border-2 border-dashed rounded-lg cursor-pointer
                transition-all duration-200 overflow-hidden
                ${dragOver
                  ? "border-orange-500 bg-orange-500/5"
                  : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/50"
                }
              `}
              style={{ minHeight: "300px" }}
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-contain"
                  style={{ minHeight: "300px" }}
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <div className="text-3xl">📷</div>
                  <p className="text-zinc-500 text-sm">Drop image here or click to upload</p>
                  <p className="text-zinc-700 text-xs">JPG, PNG, WEBP</p>
                </div>
              )}

              {loading && (
                <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3">
                  <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-orange-400 text-xs tracking-widest">PROCESSING</p>
                  <p className="text-zinc-600 text-xs">Converting to synthetic IR...</p>
                </div>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />

            {error && (
              <div className="mt-3 px-4 py-3 bg-red-900/20 border border-red-900/40 rounded text-red-400 text-xs">
                {error}
              </div>
            )}

            {preview && !loading && (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 w-full py-2 text-xs text-zinc-500 border border-zinc-800 rounded hover:border-zinc-600 hover:text-zinc-300 transition-all"
              >
                Upload different image
              </button>
            )}
          </div>

          {/* ── Results Panel ── */}
          <div>
            <p className="text-xs text-zinc-600 tracking-widest uppercase mb-3">
              Detection Result
            </p>

            {result ? (
              <div className="space-y-4">
                {/* Annotated image */}
                <div className="rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                  <img
                    src={`data:image/png;base64,${result.annotated_image}`}
                    alt="Detection result"
                    className="w-full object-contain"
                  />
                </div>

                {/* Stats bar */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-orange-400">
                      {result.total_detected}
                    </div>
                    <div className="text-zinc-600 text-xs mt-1">Detected</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {result.total_detected > 0
                        ? Math.round(
                            (result.detections.reduce((s, d) => s + d.confidence, 0) /
                              result.detections.length) * 100
                          ) + "%"
                        : "—"}
                    </div>
                    <div className="text-zinc-600 text-xs mt-1">Avg Conf</div>
                  </div>
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-center">
                    <div className="text-2xl font-bold text-white">
                      {result.image_size.width}×{result.image_size.height}
                    </div>
                    <div className="text-zinc-600 text-xs mt-1">Resolution</div>
                  </div>
                </div>

                {/* Detection list */}
                {result.detections.length > 0 && (
                  <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                    <div className="px-4 py-2 border-b border-zinc-800 text-xs text-zinc-600 tracking-widest uppercase">
                      Detections
                    </div>
                    <div className="divide-y divide-zinc-800/50 max-h-48 overflow-y-auto">
                      {result.detections.map((det, i) => (
                        <div key={i} className="px-4 py-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
                            <span className="text-xs text-white capitalize">{det.class}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-1 w-16 bg-zinc-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-orange-500 rounded-full"
                                style={{ width: `${det.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-zinc-400 w-10 text-right">
                              {Math.round(det.confidence * 100)}%
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Synthetic IR toggle */}
                <details className="group">
                  <summary className="text-xs text-zinc-600 cursor-pointer hover:text-zinc-400 transition-colors list-none flex items-center gap-2">
                    <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                    View synthetic IR image
                  </summary>
                  <div className="mt-2 rounded-lg overflow-hidden border border-zinc-800">
                    <img
                      src={`data:image/png;base64,${result.synthetic_ir_image}`}
                      alt="Synthetic IR"
                      className="w-full object-contain"
                    />
                  </div>
                </details>
              </div>
            ) : (
              <div
                className="border-2 border-dashed border-zinc-800 rounded-lg flex flex-col items-center justify-center gap-3 text-zinc-700"
                style={{ minHeight: "300px" }}
              >
                <div className="text-3xl">🌡️</div>
                <p className="text-xs">Results will appear here</p>
              </div>
            )}
          </div>
        </div>

        {/* ── How it works ── */}
        <div className="mt-16 border-t border-zinc-900 pt-10">
          <p className="text-xs text-zinc-600 tracking-widest uppercase mb-6">How it works</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              { step: "01", title: "RGB → Synthetic IR", desc: "CLAHE + gamma correction + INFERNO colormap converts your image to fake thermal." },
              { step: "02", title: "YOLOv8 Inference", desc: "Model trained entirely on synthetic IR data detects people in the converted image." },
              { step: "03", title: "Results", desc: "Bounding boxes and confidence scores returned. No real thermal camera needed." },
            ].map((item) => (
              <div key={item.step} className="bg-zinc-900/50 border border-zinc-800/50 rounded-lg p-5">
                <div className="text-orange-500/50 text-xs font-bold mb-2">{item.step}</div>
                <div className="text-white text-sm font-medium mb-1">{item.title}</div>
                <div className="text-zinc-600 text-xs leading-relaxed">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </main>
  );
}