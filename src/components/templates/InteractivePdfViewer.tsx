import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { TemplateField, FieldBounds } from '@/types/template-field';
import { API_ENDPOINTS, authenticatedFetch } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useSearch } from '@tanstack/react-router';
import { Stage, Layer, Image as KonvaImage, Rect, Text, Circle } from 'react-konva';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import * as pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs';

if (GlobalWorkerOptions && GlobalWorkerOptions.workerSrc) {
  GlobalWorkerOptions.workerSrc = pdfWorker;
}

interface InteractivePdfViewerProps {
  templateId: number;
  fields: TemplateField[];
  isDrawingMode: boolean;
  pendingField?: FieldBounds;
  selectedFieldId?: number; // ID of the field being edited
  selectedField?: TemplateField; // Full field object for editing
  onFieldCreate: (bounds: FieldBounds) => void;
  onDrawingComplete: () => void;
  onPendingFieldUpdate?: (bounds: FieldBounds) => void;
  onSelectedFieldUpdate?: (bounds: FieldBounds) => void; // Callback to update selected field bounds
}

export function InteractivePdfViewer({
  templateId,
  fields,
  isDrawingMode,
  pendingField,
  selectedFieldId,
  selectedField,
  onFieldCreate,
  onDrawingComplete,
  onPendingFieldUpdate,
  onSelectedFieldUpdate,
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

  const [resizing, setResizing] = useState<null | {
    handle: 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r'; // corners + sides
    startX: number;
    startY: number;
    startBounds: FieldBounds;
    isPending: boolean; // true for pending field, false for selected field
  }>(null);

  const [dragging, setDragging] = useState<null | {
    startX: number;
    startY: number;
    startBounds: FieldBounds;
    isPending: boolean; // true for pending field, false for selected field
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

  // Convert selected field to FieldBounds for editing
  const selectedFieldBounds: FieldBounds | null = useMemo(() => {
    if (!selectedField) return null;
    return {
      x: parseFloat(selectedField.x_position),
      y: parseFloat(selectedField.y_position),
      width: parseFloat(selectedField.width),
      height: parseFloat(selectedField.height),
      field_type: selectedField.field_type,
      field_name: selectedField.field_name,
      font_size: parseFloat(selectedField.font_size),
      color: selectedField.color || '#000000',
    };
  }, [selectedField]);

  // Get field type colors
  const getFieldTypeColors = (fieldType?: 'text' | 'number' | 'date') => {
    switch (fieldType) {
      case 'text':
        return {
          fill: 'rgba(59, 130, 246, 0.1)',
          stroke: '#3b82f6',
          shadowColor: 'rgba(59, 130, 246, 0.5)',
        };
      case 'number':
        return {
          fill: 'rgba(34, 197, 94, 0.1)',
          stroke: '#22c55e',
          shadowColor: 'rgba(34, 197, 94, 0.5)',
        };
      case 'date':
        return {
          fill: 'rgba(249, 115, 22, 0.1)',
          stroke: '#f97316',
          shadowColor: 'rgba(249, 115, 22, 0.5)',
        };
      default:
        return {
          fill: 'rgba(59, 130, 246, 0.1)',
          stroke: '#3b82f6',
          shadowColor: 'rgba(59, 130, 246, 0.5)',
        };
    }
  };

  const handleMouseDown = (e: any) => {
    // Check if clicking on a resize handle for pending field
    if (e.target.name()?.startsWith('resize-handle-pending-') && pendingField) {
      e.cancelBubble = true;
      const handle = e.target.name().replace('resize-handle-pending-', '') as 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setResizing({
        handle,
        startX: pos.x,
        startY: pos.y,
        startBounds: pendingField,
        isPending: true,
      });
      return;
    }

    // Check if clicking on a resize handle for selected field
    if (e.target.name()?.startsWith('resize-handle-selected-') && selectedFieldBounds) {
      e.cancelBubble = true;
      const handle = e.target.name().replace('resize-handle-selected-', '') as 'tl' | 'tr' | 'bl' | 'br' | 't' | 'b' | 'l' | 'r';
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setResizing({
        handle,
        startX: pos.x,
        startY: pos.y,
        startBounds: selectedFieldBounds,
        isPending: false,
      });
      return;
    }

    // Check if clicking on the pending field rectangle itself (for dragging)
    if (e.target.name() === 'pending-field-rect' && pendingField) {
      e.cancelBubble = true;
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setDragging({
        startX: pos.x,
        startY: pos.y,
        startBounds: pendingField,
        isPending: true,
      });
      return;
    }

    // Check if clicking on the selected field rectangle itself (for dragging)
    if (e.target.name() === 'selected-field-rect' && selectedFieldBounds) {
      e.cancelBubble = true;
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;
      setDragging({
        startX: pos.x,
        startY: pos.y,
        startBounds: selectedFieldBounds,
        isPending: false,
      });
      return;
    }

    // Don't start drawing if we're resizing, dragging, or if there's a pending/selected field
    if (!isDrawingMode || pendingField || selectedFieldBounds) return;
    const pos = e.target.getStage().getPointerPosition();
    if (!pos) return;
    setDrawing({ startX: pos.x, startY: pos.y, x: pos.x, y: pos.y, w: 0, h: 0 });
  };

  const handleMouseMove = (e: any) => {
    // Handle dragging the pending field
    if (dragging && dragging.isPending && pendingField && onPendingFieldUpdate) {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const deltaX = (pos.x - dragging.startX) / scale;
      const deltaY = (pos.y - dragging.startY) / scale;
      const start = dragging.startBounds;

      const newBounds: FieldBounds = {
        ...start,
        x: Math.max(0, start.x + deltaX),
        y: Math.max(0, start.y + deltaY),
        width: start.width,
        height: start.height,
      };

      onPendingFieldUpdate(newBounds);
      return;
    }

    // Handle dragging the selected field
    if (dragging && !dragging.isPending && selectedFieldBounds && onSelectedFieldUpdate) {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const deltaX = (pos.x - dragging.startX) / scale;
      const deltaY = (pos.y - dragging.startY) / scale;
      const start = dragging.startBounds;

      const newBounds: FieldBounds = {
        ...start,
        x: Math.max(0, start.x + deltaX),
        y: Math.max(0, start.y + deltaY),
        width: start.width,
        height: start.height,
      };

      onSelectedFieldUpdate(newBounds);
      return;
    }

    // Handle resizing pending field
    if (resizing && resizing.isPending && pendingField) {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos || !onPendingFieldUpdate) return;

      const deltaX = (pos.x - resizing.startX) / scale;
      const deltaY = (pos.y - resizing.startY) / scale;
      const start = resizing.startBounds;

      let newBounds: FieldBounds = { ...start };

      switch (resizing.handle) {
        case 'tl': // Top-left: adjust x, y, width, height
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y + deltaY,
            width: start.width - deltaX,
            height: start.height - deltaY,
          };
          break;
        case 'tr': // Top-right: adjust y, width, height
          newBounds = {
            ...start,
            x: start.x,
            y: start.y + deltaY,
            width: start.width + deltaX,
            height: start.height - deltaY,
          };
          break;
        case 'bl': // Bottom-left: adjust x, width, height
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y,
            width: start.width - deltaX,
            height: start.height + deltaY,
          };
          break;
        case 'br': // Bottom-right: adjust width, height
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width + deltaX,
            height: start.height + deltaY,
          };
          break;
        case 't': // Top: adjust y and height only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y + deltaY,
            width: start.width,
            height: start.height - deltaY,
          };
          break;
        case 'b': // Bottom: adjust height only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width,
            height: start.height + deltaY,
          };
          break;
        case 'l': // Left: adjust x and width only
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y,
            width: start.width - deltaX,
            height: start.height,
          };
          break;
        case 'r': // Right: adjust width only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width + deltaX,
            height: start.height,
          };
          break;
      }

      // Ensure minimum size
      if (newBounds.width > 10 && newBounds.height > 10 && newBounds.x >= 0 && newBounds.y >= 0) {
        onPendingFieldUpdate(newBounds);
      }
      return;
    }

    // Handle resizing selected field
    if (resizing && !resizing.isPending && selectedFieldBounds && onSelectedFieldUpdate) {
      const pos = e.target.getStage().getPointerPosition();
      if (!pos) return;

      const deltaX = (pos.x - resizing.startX) / scale;
      const deltaY = (pos.y - resizing.startY) / scale;
      const start = resizing.startBounds;

      let newBounds: FieldBounds = { ...start };

      switch (resizing.handle) {
        case 'tl': // Top-left: adjust x, y, width, height
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y + deltaY,
            width: start.width - deltaX,
            height: start.height - deltaY,
          };
          break;
        case 'tr': // Top-right: adjust y, width, height
          newBounds = {
            ...start,
            x: start.x,
            y: start.y + deltaY,
            width: start.width + deltaX,
            height: start.height - deltaY,
          };
          break;
        case 'bl': // Bottom-left: adjust x, width, height
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y,
            width: start.width - deltaX,
            height: start.height + deltaY,
          };
          break;
        case 'br': // Bottom-right: adjust width, height
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width + deltaX,
            height: start.height + deltaY,
          };
          break;
        case 't': // Top: adjust y and height only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y + deltaY,
            width: start.width,
            height: start.height - deltaY,
          };
          break;
        case 'b': // Bottom: adjust height only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width,
            height: start.height + deltaY,
          };
          break;
        case 'l': // Left: adjust x and width only
          newBounds = {
            ...start,
            x: start.x + deltaX,
            y: start.y,
            width: start.width - deltaX,
            height: start.height,
          };
          break;
        case 'r': // Right: adjust width only
          newBounds = {
            ...start,
            x: start.x,
            y: start.y,
            width: start.width + deltaX,
            height: start.height,
          };
          break;
      }

      // Ensure minimum size
      if (newBounds.width > 10 && newBounds.height > 10 && newBounds.x >= 0 && newBounds.y >= 0) {
        onSelectedFieldUpdate(newBounds);
      }
      return;
    }

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
    if (dragging) {
      setDragging(null);
      return;
    }

    if (resizing) {
      setResizing(null);
      return;
    }

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
              style={{ cursor: resizing ? 'move' : isDrawingMode ? 'crosshair' : 'default' }}
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

                {/* Render all fields except the selected one (it will be rendered separately with edit controls) */}
                {fields.filter(f => f.id !== selectedFieldId).map((f) => {
                  const r = toStageRect(f);
                  
                  const baseFill = f.field_type === 'text'
                    ? 'rgba(59,130,246,0.3)'
                    : f.field_type === 'number'
                      ? 'rgba(34,197,94,0.3)'
                      : 'rgba(249,115,22,0.3)';
                  
                  const baseStroke = f.field_type === 'text'
                    ? '#3b82f6'
                    : f.field_type === 'number'
                      ? '#22c55e'
                      : '#f97316';

                  return (
                    <Rect
                      key={`field-${f.id}-${f.x_position}-${f.y_position}-${f.width}-${f.height}-${f.field_type}-${f.color}`}
                      x={r.x}
                      y={r.y}
                      width={r.width}
                      height={r.height}
                      fill={baseFill}
                      stroke={baseStroke}
                      strokeWidth={2}
                    />
                  );
                })}

                {/* Active drawing rectangle (while dragging) */}
                {drawing && (() => {
                  const colors = getFieldTypeColors(pendingField?.field_type || 'text');
                  return (
                    <Rect
                      x={drawing.x}
                      y={drawing.y}
                      width={drawing.w}
                      height={drawing.h}
                      fill={colors.fill.replace('0.1', '0.15')}
                      stroke={colors.stroke}
                      dash={[8, 4]}
                      strokeWidth={3}
                      shadowBlur={4}
                      shadowColor={colors.shadowColor}
                    />
                  );
                })()}

                {/* Pending field rectangle (after drawing complete, before save) */}
                {pendingField && !drawing && (() => {
                  const fieldType = pendingField.field_type || 'text';
                  const colors = getFieldTypeColors(fieldType);
                  const fieldTypeLabels = {
                    text: 'Unsaved Text Field',
                    number: 'Unsaved Number Field',
                    date: 'Unsaved Date Field',
                  };
                  const rectX = pendingField.x * scale;
                  const rectY = pendingField.y * scale;
                  const rectW = pendingField.width * scale;
                  const rectH = pendingField.height * scale;
                  const handleSize = 8;
                  const handleOffset = handleSize / 2;
                  const sideHandleLength = 20;
                  const sideHandleThickness = 6;

                  return (
                    <>
                      <Rect
                        name="pending-field-rect"
                        x={rectX}
                        y={rectY}
                        width={rectW}
                        height={rectH}
                        fill={colors.fill}
                        stroke={colors.stroke}
                        strokeWidth={3}
                        dash={[8, 4]}
                        shadowBlur={4}
                        shadowColor={colors.shadowColor}
                        listening={true}
                        onMouseEnter={(e) => {
                          // Only show move cursor if not over a handle
                          if (!e.target.name()?.startsWith('resize-handle-pending-')) {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'move';
                          }
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container && !dragging && !resizing) container.style.cursor = 'default';
                        }}
                      />
                      <Text
                        x={rectX}
                        y={rectY - 20}
                        text={fieldTypeLabels[fieldType]}
                        fontSize={12}
                        fontStyle="bold"
                        fill={colors.stroke}
                        padding={4}
                        backgroundColor="rgba(255, 255, 255, 0.9)"
                      />
                      {/* Preview text inside the field */}
                      {(() => {
                        const previewText = pendingField.field_name || 'Preview';
                        const previewFontSizePx = pendingField.font_size || 12;
                        const previewFontSize = previewFontSizePx * scale;
                        const previewColor = pendingField.color || '#000000';
                        
                        // Position text at a fixed offset from the top of the field
                        // The field bounds represent the area where text should appear
                        // Keep text position fixed relative to field top, regardless of font size
                        const previewX = rectX + 4; // Small padding from left
                        const previewY = rectY + 4; // Fixed small padding from top - stays consistent

                        return (
                          <Text
                            x={previewX}
                            y={previewY}
                            text={previewText}
                            fontSize={previewFontSize}
                            fill={previewColor}
                            fontFamily="Helvetica"
                            listening={false}
                            width={rectW - 8} // Constrain width to fit within field
                            ellipsis={true} // Add ellipsis if text is too long
                            align="left"
                          />
                        );
                      })()}
                      {/* Resize handles at corners */}
                      <Circle
                        name="resize-handle-pending-tl"
                        x={rectX}
                        y={rectY}
                        radius={handleSize}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nwse-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-pending-tr"
                        x={rectX + rectW}
                        y={rectY}
                        radius={handleSize}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nesw-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-pending-bl"
                        x={rectX}
                        y={rectY + rectH}
                        radius={handleSize}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nesw-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-pending-br"
                        x={rectX + rectW}
                        y={rectY + rectH}
                        radius={handleSize}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nwse-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      {/* Side resize handles */}
                      {/* Top handle */}
                      <Rect
                        name="resize-handle-pending-t"
                        x={rectX + rectW / 2 - sideHandleLength / 2}
                        y={rectY - sideHandleThickness / 2}
                        width={sideHandleLength}
                        height={sideHandleThickness}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ns-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      {/* Bottom handle */}
                      <Rect
                        name="resize-handle-pending-b"
                        x={rectX + rectW / 2 - sideHandleLength / 2}
                        y={rectY + rectH - sideHandleThickness / 2}
                        width={sideHandleLength}
                        height={sideHandleThickness}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ns-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      {/* Left handle */}
                      <Rect
                        name="resize-handle-pending-l"
                        x={rectX - sideHandleThickness / 2}
                        y={rectY + rectH / 2 - sideHandleLength / 2}
                        width={sideHandleThickness}
                        height={sideHandleLength}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ew-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      {/* Right handle */}
                      <Rect
                        name="resize-handle-pending-r"
                        x={rectX + rectW - sideHandleThickness / 2}
                        y={rectY + rectH / 2 - sideHandleLength / 2}
                        width={sideHandleThickness}
                        height={sideHandleLength}
                        fill={colors.stroke}
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ew-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                    </>
                  );
                })()}

                {/* Selected field rectangle (when editing an existing field) */}
                {selectedFieldBounds && !pendingField && (() => {
                  const fieldType = selectedFieldBounds.field_type || 'text';
                  const colors = getFieldTypeColors(fieldType);
                  const rectX = selectedFieldBounds.x * scale;
                  const rectY = selectedFieldBounds.y * scale;
                  const rectW = selectedFieldBounds.width * scale;
                  const rectH = selectedFieldBounds.height * scale;
                  const handleSize = 8;
                  const sideHandleLength = 20;
                  const sideHandleThickness = 6;

                  return (
                    <>
                      <Rect
                        name="selected-field-rect"
                        x={rectX}
                        y={rectY}
                        width={rectW}
                        height={rectH}
                        fill={colors.fill}
                        stroke="#eab308"
                        strokeWidth={4}
                        dash={[8, 4]}
                        shadowBlur={8}
                        shadowColor="rgba(234,179,8,0.6)"
                        listening={true}
                        onMouseEnter={(e) => {
                          if (!e.target.name()?.startsWith('resize-handle-selected-')) {
                            const container = e.target.getStage()?.container();
                            if (container) container.style.cursor = 'move';
                          }
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container && !dragging && !resizing) container.style.cursor = 'default';
                        }}
                      />
                      <Text
                        x={rectX}
                        y={rectY - 20}
                        text="Editing Field"
                        fontSize={12}
                        fontStyle="bold"
                        fill="#eab308"
                        padding={4}
                        backgroundColor="rgba(255, 255, 255, 0.9)"
                      />
                      {/* Preview text inside the field */}
                      {(() => {
                        const previewText = selectedFieldBounds.field_name || 'Preview';
                        const previewFontSizePx = selectedFieldBounds.font_size || 12;
                        const previewFontSize = previewFontSizePx * scale;
                        const previewColor = selectedFieldBounds.color || '#000000';
                        
                        const previewX = rectX + 4;
                        const previewY = rectY + 4;
                        const textWidth = Math.max(0, rectW - 8);

                        return (
                          <Text
                            key={`selected-preview-${selectedFieldId}-${selectedFieldBounds.width}-${selectedFieldBounds.height}-${previewFontSize}-${previewText}`}
                            x={previewX}
                            y={previewY}
                            text={previewText}
                            fontSize={previewFontSize}
                            fill={previewColor}
                            fontFamily="Helvetica"
                            listening={false}
                            width={textWidth}
                            ellipsis={true}
                            align="left"
                            wrap="word"
                          />
                        );
                      })()}
                      {/* Resize handles at corners */}
                      <Circle
                        name="resize-handle-selected-tl"
                        x={rectX}
                        y={rectY}
                        radius={handleSize}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nwse-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-selected-tr"
                        x={rectX + rectW}
                        y={rectY}
                        radius={handleSize}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nesw-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-selected-bl"
                        x={rectX}
                        y={rectY + rectH}
                        radius={handleSize}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nesw-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Circle
                        name="resize-handle-selected-br"
                        x={rectX + rectW}
                        y={rectY + rectH}
                        radius={handleSize}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={2}
                        draggable={false}
                        listening={true}
                        hitStrokeWidth={15}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'nwse-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      {/* Side resize handles */}
                      <Rect
                        name="resize-handle-selected-t"
                        x={rectX + rectW / 2 - sideHandleLength / 2}
                        y={rectY - sideHandleThickness / 2}
                        width={sideHandleLength}
                        height={sideHandleThickness}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ns-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Rect
                        name="resize-handle-selected-b"
                        x={rectX + rectW / 2 - sideHandleLength / 2}
                        y={rectY + rectH - sideHandleThickness / 2}
                        width={sideHandleLength}
                        height={sideHandleThickness}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ns-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Rect
                        name="resize-handle-selected-l"
                        x={rectX - sideHandleThickness / 2}
                        y={rectY + rectH / 2 - sideHandleLength / 2}
                        width={sideHandleThickness}
                        height={sideHandleLength}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ew-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                      <Rect
                        name="resize-handle-selected-r"
                        x={rectX + rectW - sideHandleThickness / 2}
                        y={rectY + rectH / 2 - sideHandleLength / 2}
                        width={sideHandleThickness}
                        height={sideHandleLength}
                        fill="#eab308"
                        stroke="#ffffff"
                        strokeWidth={1}
                        draggable={false}
                        listening={true}
                        onMouseEnter={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'ew-resize';
                        }}
                        onMouseLeave={(e) => {
                          const container = e.target.getStage()?.container();
                          if (container) container.style.cursor = 'default';
                        }}
                      />
                    </>
                  );
                })()}
              </Layer>
            </Stage>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
