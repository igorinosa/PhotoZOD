import React, { useState, useEffect, useRef } from 'react';
import { EditOperation } from '../../../../shared/types';
import { editStackEngine } from '../../../../core/versioning/editStackEngine';
import { assetStore } from '../../../../core/dam/assetStore';
import { diffEngine } from '../../../../core/versioning/diffEngine';

interface AdjustmentsPanelProps {
  assetId: string;
  activeVersionId?: string;
  onEditApplied: (versionId: string) => void;
  onPreviewChange?: (ops: EditOperation[]) => void;
}

export default function AdjustmentsPanel({ assetId, activeVersionId, onEditApplied, onPreviewChange }: AdjustmentsPanelProps) {
  const [exposure, setExposure] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [rotation, setRotation] = useState(0);

  // Sync state with active version
  useEffect(() => {
    if (!activeVersionId) return;

    const fullStack = diffEngine.getFullStack(activeVersionId);

    let exp = 0;
    let con = 0;
    let rot = 0;

    for (const op of fullStack) {
      if (op.type === 'exposure') exp = op.value;
      if (op.type === 'contrast') con = op.value;
      if (op.type === 'rotate') rot += op.angle;
    }

    setExposure(exp);
    setContrast(con);
    setRotation(rot % 360);
  }, [activeVersionId]);

  const handleExposureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setExposure(val);
    if (onPreviewChange) onPreviewChange([{ type: 'exposure', value: val }]);
  };

  const applyExposure = () => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return;
    if (onPreviewChange) onPreviewChange([]);
    const newVersionId = editStackEngine.applyEdit(assetId, asset.activeVersionId, { type: 'exposure', value: exposure });
    onEditApplied(newVersionId);
  };

  const handleContrastChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setContrast(val);
    if (onPreviewChange) onPreviewChange([{ type: 'contrast', value: val }]);
  };

  const applyContrast = () => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return;
    if (onPreviewChange) onPreviewChange([]);
    const newVersionId = editStackEngine.applyEdit(assetId, asset.activeVersionId, { type: 'contrast', value: contrast });
    onEditApplied(newVersionId);
  };

  const handleRotate = (angle: number) => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return;
    const newVersionId = editStackEngine.applyEdit(assetId, asset.activeVersionId, { type: 'rotate', angle });
    onEditApplied(newVersionId);
  };

  const applyFilter = (id: string) => {
    const asset = assetStore.get(assetId);
    if (!asset || !asset.activeVersionId) return;
    const newVersionId = editStackEngine.applyEdit(assetId, asset.activeVersionId, { type: 'filter', id });
    onEditApplied(newVersionId);
  };

  return (
    <div className="p-4 space-y-6">
      <div>
        <label className="text-xs font-medium text-zinc-300 flex justify-between">
          <span>Exposure</span>
          <span>{exposure}</span>
        </label>
        <input 
          type="range" 
          min="-100" max="100" 
          value={exposure}
          onChange={handleExposureChange}
          onMouseUp={applyExposure}
          onTouchEnd={applyExposure}
          className="w-full mt-2 accent-indigo-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-300 flex justify-between">
          <span>Contrast</span>
          <span>{contrast}</span>
        </label>
        <input 
          type="range" 
          min="-100" max="100" 
          value={contrast}
          onChange={handleContrastChange}
          onMouseUp={applyContrast}
          onTouchEnd={applyContrast}
          className="w-full mt-2 accent-indigo-500"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block">Rotation</label>
        <div className="flex gap-2">
          <button 
            onClick={() => handleRotate(-90)}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
          >
            -90°
          </button>
          <button 
            onClick={() => handleRotate(90)}
            className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
          >
            +90°
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-medium text-zinc-300 mb-2 block">Filters</label>
        <div className="grid grid-cols-2 gap-2">
          <button 
            onClick={() => applyFilter('grayscale')}
            className="py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
          >
            Grayscale
          </button>
          <button 
            onClick={() => applyFilter('sepia')}
            className="py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-xs rounded transition-colors"
          >
            Sepia
          </button>
        </div>
      </div>
    </div>
  );
}
