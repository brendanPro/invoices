import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateField, FieldBounds } from '@/types/template-field';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@tanstack/react-router';
import { Stage, Layer, Image as KonvaImage, Rect } from 'react-konva';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';

if (GlobalWorkerOptions && GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InteractivePdfViewerProps {
  templateId: number;
  fields: TemplateField[];
  isDrawingMode: boolean;
  onFieldCreate: (bounds: FieldBounds) => void;
  onDrawingComplete: () => void;
}

export function InteractivePdfViewer({
  templateId,
  fields,
  isDrawingMode,
  onFieldCreate,
  onDrawingComplete,
}: InteractivePdfViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [stageSize, setStageSize] = useState({ width: 800, height: 600 });
  const [scale, setScale] = useState(1);
  const [bgCanvas, setBgCanvas] = useState<HTMLCanvasElement | null>(null);
  const [drawing, setDrawing] = useState<null | {
    startX: number;
    startY: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>(null);

  const { user } = useAuth();
  const { templateId: searchTemplateId } = useSearch({ from: '/templates' });
  const effectiveTemplateId = templateId ?? searchTemplateId;

  // Resize stage when container changes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const resize = () => {
      const width = el.clientWidth || 800;
      setStageSize((prev) => ({ width, height: prev.height }));
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Load and render first PDF page to canvas
  useEffect(() => {
    const loadPdf = async () => {
      if (!effectiveTemplateId || !user?.email || !containerRef.current) return;
      try {
        const resp = await authenticatedFetch(
          `${API_ENDPOINTS.PDF}/?template_id=${effectiveTemplateId}&email=${user?.email}`,
        );
        if (!resp.ok) throw new Error(`Failed to load PDF: ${resp.statusText}`);
        const data = await resp.arrayBuffer();

        const pdf = await getDocument(data).promise;
        const page = await pdf.getPage(1);

        const containerWidth = containerRef.current.clientWidth || 800;
        const viewport = page.getViewport({ scale: 1 });
        const computedScale = containerWidth / viewport.width;
        const scaledViewport = page.getViewport({ scale: computedScale });

        const canvas = document.createElement('canvas');
        canvas.width = Math.floor(scaledViewport.width);
        canvas.height = Math.floor(scaledViewport.height);
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        await page.render({ canvasContext: ctx, viewport: scaledViewport }).promise;

        setBgCanvas(canvas);
        setScale(computedScale);
        setStageSize({ width: canvas.width, height: canvas.height });

        await pdf.cleanup();
      } catch (e) {
        console.error('PDF load/render error:', e);
      }
    };
    loadPdf();
  }, [effectiveTemplateId, user?.email]);

  // Konva Image needs an HTMLImageElement or canvas; canvas is fine
  const bgImage = useMemo(() => bgCanvas ?? undefined, [bgCanvas]);

  // Convert DB field (PDF px) to stage coordinates
  const toStageRect = (f: TemplateField) => ({
    x: Number(f.x_position) * scale,
    y: Number(f.y_position) * scale,
    width: Number(f.width) * scale,
    height: Number(f.height) * scale,
  });

  const handleMouseDown = (e: any) => {
    if (!isDrawingMode) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    setDrawing({ startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: any) => {
    if (!isDrawingMode || !drawing) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    const x = Math.min(drawing.startX, pos.x);
    const y = Math.min(drawing.startY, pos.y);
    const w = Math.abs(pos.x - drawing.startX);
    const h = Math.abs(pos.y - drawing.startY);
    setDrawing({ ...drawing, x, y, w, h });
  };

  const handleMouseUp = () => {
    if (!drawing) return;
    if (drawing.w > 10 && drawing.h > 10) {
      // Back to PDF pixel coordinates
      onFieldCreate({
        x: drawing.x / scale,
        y: drawing.y / scale,
        width: drawing.w / scale,
        height: drawing.h / scale,
      });
    }
    setDrawing(null);
    onDrawingComplete();
  };

  return (
    <div className="flex-1 flex flex-col">
      <Card className="flex-1 flex flex-col">
        <CardHeader>
          <CardTitle>PDF Template</CardTitle>
          <div className="text-sm text-gray-600">
            {isDrawingMode ? (
              <span className="text-blue-600 font-medium">
                Drawing Mode: Click and drag to create a field
              </span>
            ) : (
              'Click "Add Field" to start placing fields on the template'
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 p-0">
          <div ref={containerRef} className="relative w-full h-full bg-gray-100 overflow-auto">
            <Stage
              width={stageSize.width}
              height={stageSize.height}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              style={{ cursor: isDrawingMode ? 'crosshair' : 'default' }}
            >
              <Layer>
                {bgImage && (
                  <KonvaImage
                    image={bgImage as any}
                    x={0}
                    y={0}
                    width={stageSize.width}
                    height={stageSize.height}
                  />
                )}

                {fields.map((f) => {
                  const r = toStageRect(f);
                  return (
                    <Rect
                      key={`${f.id}`}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill={
                        f.field_type === 'text'
                          ? 'rgba(59,130,246,0.3)'
                          : f.field_type === 'number'
                            ? 'rgba(34,197,94,0.3)'
                            : 'rgba(249,115,22,0.3)'
                      }
                      stroke={
                        f.field_type === 'text'
                          ? '#3b82f6'
                          : f.field_type === 'number'
                            ? '#22c55e'
                            : '#f97316'
                      }
                      strokeWidth={2}
                    />
                  );
                })}

                {drawing && (
                  <Rect
                    x={drawing.x}
                    y={drawing.y}
                    width={drawing.w}
                    height={drawing.h}
                    stroke="#ef4444"
                    dash={[5, 5]}
                    strokeWidth={2}
                  />
                )}
              </Layer>
            </Stage>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
