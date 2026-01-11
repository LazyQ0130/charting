import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Grid, Center, Environment } from '@react-three/drei';
import ShapeRenderer, { TransformMode } from './ShapeRenderer';
import { GeometryPart, ShapeDefinition, ViewType } from '../types';
import { Move, RotateCw } from 'lucide-react';

interface Viewer3DProps {
  activeShape: ShapeDefinition;
  viewType: ViewType;
  selectedPartIndices?: number[];
  onPartClick?: (index: number, multiSelect: boolean) => void;
  onPartUpdate?: (index: number, part: GeometryPart) => void;
}

const CameraManager = ({ viewType }: { viewType: ViewType }) => {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (!controlsRef.current) return;

    const transition = true; 

    switch (viewType) {
      case 'FRONT':
        controlsRef.current.setLookAt(0, 0, 10, 0, 0, 0, transition);
        break;
      case 'TOP':
        controlsRef.current.setLookAt(0, 10, 0, 0, 0, 0, transition);
        break;
      case 'LEFT':
        controlsRef.current.setLookAt(-10, 0, 0, 0, 0, 0, transition);
        break;
      case 'ISO':
      default:
        controlsRef.current.setLookAt(8, 6, 8, 0, 0, 0, transition);
        break;
    }
  }, [viewType]);

  return <CameraControls ref={controlsRef} makeDefault minDistance={2} maxDistance={50} />;
};

const Viewer3D: React.FC<Viewer3DProps> = ({ 
  activeShape, 
  viewType, 
  selectedPartIndices, 
  onPartClick,
  onPartUpdate
}) => {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');

  const getViewName = (type: ViewType) => {
      switch(type) {
          case 'ISO': return '等轴测投影 (Isometric)';
          case 'FRONT': return '主视图 (Front)';
          case 'TOP': return '俯视图 (Top)';
          case 'LEFT': return '左视图 (Left)';
          default: return type;
      }
  }

  const isBuilderMode = onPartClick !== undefined;
  // If multiple items are selected, disable individual transform controls (or handle group, simplified to single)
  const isSingleSelection = selectedPartIndices && selectedPartIndices.length === 1;

  return (
    <div className="w-full h-full bg-slate-50 relative" onClick={() => isBuilderMode && onPartClick && onPartClick(-1, false)}>
      
      <Canvas shadows camera={{ fov: 45 }}>
        <fog attach="fog" args={['#f8fafc', 10, 40]} />
        
        <CameraManager viewType={viewType} />
        
        <ambientLight intensity={0.5} />
        <directionalLight 
            position={[10, 10, 5]} 
            intensity={1} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <Environment preset="city" />

        <Center>
          <ShapeRenderer 
            shape={activeShape} 
            selectedPartIndices={selectedPartIndices}
            onPartClick={onPartClick}
            transformMode={transformMode}
            onPartUpdate={onPartUpdate}
          />
        </Center>

        <Grid 
            position={[0, -2.01, 0]} 
            args={[20, 20]} 
            cellColor="#cbd5e1" 
            sectionColor="#94a3b8" 
            fadeDistance={20} 
            cellSize={0.5} 
            sectionSize={2}
        />
        
        <mesh position={[0, -2.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[50, 50]} />
          <shadowMaterial opacity={0.2} />
        </mesh>

      </Canvas>
      
      {/* Overlay info */}
      <div className="absolute top-4 right-4 pointer-events-none z-10">
        <div className="bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm text-right">
            <h3 className="text-sm font-bold text-slate-700">当前视角</h3>
            <p className="text-xs text-slate-500 font-mono mb-2">{getViewName(viewType)}</p>
            {isBuilderMode && (
              <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-blue-600">
                <p>1. 单击选中 (Ctrl+单击多选)</p>
                <p>2. 拖拽轴线移动/旋转 (仅单选)</p>
                <p>3. 使用侧边栏进行布尔运算</p>
              </div>
            )}
        </div>
      </div>

      {/* Builder Mode Transform Tools (Only single select) */}
      {isBuilderMode && isSingleSelection && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 p-1 rounded-lg shadow-sm flex gap-1 z-20" onClick={(e) => e.stopPropagation()}>
           <button 
             onClick={() => setTransformMode('translate')}
             className={`p-2 rounded ${transformMode === 'translate' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
             title="移动"
           >
             <Move className="w-4 h-4"/>
           </button>
           <button 
             onClick={() => setTransformMode('rotate')}
             className={`p-2 rounded ${transformMode === 'rotate' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
             title="旋转"
           >
             <RotateCw className="w-4 h-4"/>
           </button>
        </div>
      )}
    </div>
  );
};

export default Viewer3D;