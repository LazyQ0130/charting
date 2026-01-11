import React, { useRef, useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Grid, Environment, Text } from '@react-three/drei';
import ShapeRenderer, { TransformMode } from './ShapeRenderer';
import { GeometryPart, ShapeDefinition, ViewType } from '../types';
import { Move, RotateCw, Maximize } from 'lucide-react';
import * as THREE from 'three';

interface Viewer3DProps {
  activeShape: ShapeDefinition;
  viewType: ViewType;
  selectedPartIndices?: number[];
  onPartClick?: (index: number, multiSelect: boolean) => void;
  onPartUpdate?: (index: number, part: GeometryPart) => void;
}

const CoordinateAxes = () => {
    const axisLength = 10; // Length in each direction (total 20)
    const axisRadius = 0.03;
    const arrowLength = 0.5;
    const arrowWidth = 0.2;
    const opacity = 0.5;
    const textOffset = 0.6;
    
    // Faint colors
    const colorX = "#fda4af"; // Light Red
    const colorY = "#86efac"; // Light Green
    const colorZ = "#93c5fd"; // Light Blue

    return (
        <group>
            {/* X Axis (Red) - Local X */}
            {/* Main shaft spanning negative to positive */}
            <mesh rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength * 2, 16]} />
                <meshBasicMaterial color={colorX} transparent opacity={opacity} />
            </mesh>
            {/* Arrow at positive end */}
            <mesh position={[axisLength, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <coneGeometry args={[arrowWidth, arrowLength, 16]} />
                <meshBasicMaterial color={colorX} transparent opacity={opacity} />
            </mesh>
            <Text position={[axisLength + textOffset, 0, 0]} fontSize={0.5} color={colorX}>X</Text>

            {/* Y Axis (Green) - Local Y (mapped to Depth) */}
            <mesh>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength * 2, 16]} />
                <meshBasicMaterial color={colorY} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, axisLength, 0]}>
                <coneGeometry args={[arrowWidth, arrowLength, 16]} />
                <meshBasicMaterial color={colorY} transparent opacity={opacity} />
            </mesh>
            <Text position={[0, axisLength + textOffset, 0]} fontSize={0.5} color={colorY}>Y</Text>

            {/* Z Axis (Blue) - Local Z (mapped to Height) */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[axisRadius, axisRadius, axisLength * 2, 16]} />
                <meshBasicMaterial color={colorZ} transparent opacity={opacity} />
            </mesh>
            <mesh position={[0, 0, axisLength]} rotation={[Math.PI / 2, 0, 0]}>
                <coneGeometry args={[arrowWidth, arrowLength, 16]} />
                <meshBasicMaterial color={colorZ} transparent opacity={opacity} />
            </mesh>
            <Text position={[0, 0, axisLength + textOffset]} fontSize={0.5} color={colorZ}>Z</Text>
            
            {/* Center Dot */}
            <mesh>
                <sphereGeometry args={[0.08]} />
                <meshBasicMaterial color="#94a3b8" transparent opacity={0.8} />
            </mesh>
        </group>
    );
};

const CameraManager = ({ viewType }: { viewType: ViewType }) => {
  const controlsRef = useRef<CameraControls>(null);

  useEffect(() => {
    if (!controlsRef.current) return;

    const transition = true; 
    // Targets (0,0,0) by default
    
    // Note: Since we rotated the content -90 around X:
    // World Y is now Content Z (Up).
    // World X is Content X.
    // World Z is Content -Y (Back/Front).

    switch (viewType) {
      case 'FRONT':
        // Front View: Look from Front. 
        // In standard engineering (Z-up), Front view looks along Y axis? 
        // Here, visual front is looking at the X-Z plane (Height-Width).
        // This corresponds to looking from World Z (Content -Y).
        controlsRef.current.setLookAt(0, 0, 20, 0, 0, 0, transition);
        break;
      case 'TOP':
        // Top View: Look from Top (World Y / Content Z).
        controlsRef.current.setLookAt(0, 20, 0, 0, 0, 0, transition);
        break;
      case 'LEFT':
        // Left View: Look from Left (World -X).
        controlsRef.current.setLookAt(-20, 0, 0, 0, 0, 0, transition);
        break;
      case 'ISO':
      default:
        // Isometric
        controlsRef.current.setLookAt(12, 12, 12, 0, 0, 0, transition);
        break;
    }
  }, [viewType]);

  return <CameraControls ref={controlsRef} makeDefault minDistance={2} maxDistance={100} />;
};

const Viewer3D: React.FC<Viewer3DProps> = ({ 
  activeShape, 
  viewType, 
  selectedPartIndices, 
  onPartClick,
  onPartUpdate
}) => {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  
  // Ref to track mouse movement to distinguish click from drag
  const pointerStartRef = useRef<{x: number, y: number}>({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);

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
  const isSingleSelection = selectedPartIndices && selectedPartIndices.length === 1;

  // Handle background click (deselect)
  const handlePointerDown = (e: React.PointerEvent) => {
      pointerStartRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      const dx = Math.abs(e.clientX - pointerStartRef.current.x);
      const dy = Math.abs(e.clientY - pointerStartRef.current.y);
      
      if (dx > 5 || dy > 5) {
          isDraggingRef.current = true;
      } else {
          isDraggingRef.current = false;
          if (isBuilderMode && onPartClick) {
              onPartClick(-1, false);
          }
      }
  };

  return (
    <div 
        className="w-full h-full bg-slate-50 relative" 
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
    >
      
      <Canvas shadows camera={{ fov: 45 }}>
        <fog attach="fog" args={['#f8fafc', 20, 60]} />
        
        <CameraManager viewType={viewType} />
        
        <ambientLight intensity={0.6} />
        <directionalLight 
            position={[10, 20, 10]} 
            intensity={1.2} 
            castShadow 
            shadow-mapSize={[1024, 1024]} 
        />
        <Environment preset="city" />

        {/* 
            Rotate everything -90deg around X axis.
            Mapping:
            App X (Red) -> World X (Right)
            App Y (Green) -> World -Z (Depth/Back)
            App Z (Blue) -> World Y (Up)
            
            This achieves "Z-Axis Perpendicular to Bottom (Grid)"
        */}
        <group rotation={[-Math.PI / 2, 0, 0]}>
            <CoordinateAxes />
            <ShapeRenderer 
                shape={activeShape} 
                selectedPartIndices={selectedPartIndices}
                onPartClick={onPartClick}
                transformMode={transformMode}
                onPartUpdate={onPartUpdate}
            />
        </group>

        {/* Grid is on World XZ plane (Y=0). Matches the visual "Bottom". */}
        <Grid 
            position={[0, -0.01, 0]} 
            args={[40, 40]} 
            cellColor="#cbd5e1" 
            sectionColor="#94a3b8" 
            fadeDistance={40} 
            cellSize={1} 
            sectionSize={5}
        />
        
        <mesh position={[0, -0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[100, 100]} />
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
                <p>1. 点击图形选中 (Ctrl+单击多选)</p>
                <p>2. 拖拽轴线可直接操作</p>
                <p>3. 蓝色轴为Z轴(高度)</p>
              </div>
            )}
        </div>
      </div>

      {/* Builder Mode Transform Tools */}
      {isBuilderMode && isSingleSelection && (
        <div 
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm border border-slate-200 p-1 rounded-lg shadow-sm flex gap-1 z-20" 
            onPointerDown={(e) => e.stopPropagation()} 
        >
           <button 
             onClick={() => setTransformMode('translate')}
             className={`p-2 rounded ${transformMode === 'translate' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
             title="移动 (Translate)"
           >
             <Move className="w-4 h-4"/>
           </button>
           <button 
             onClick={() => setTransformMode('rotate')}
             className={`p-2 rounded ${transformMode === 'rotate' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
             title="旋转 (Rotate)"
           >
             <RotateCw className="w-4 h-4"/>
           </button>
           <button 
             onClick={() => setTransformMode('scale')}
             className={`p-2 rounded ${transformMode === 'scale' ? 'bg-blue-100 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}
             title="缩放 (Scale)"
           >
             <Maximize className="w-4 h-4"/>
           </button>
        </div>
      )}
    </div>
  );
};

export default Viewer3D;