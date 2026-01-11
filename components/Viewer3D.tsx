import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { CameraControls, Grid, Environment, Text, View, PerspectiveCamera, OrthographicCamera } from '@react-three/drei';
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
    const axisLength = 20; 
    const opacity = 0.9;
    const textOffset = 0.6;
    const thickness = 0.02; // Thinner axes
    
    const colorX = "#ef4444"; // Red-500
    const colorY = "#22c55e"; // Green-500
    const colorZ = "#3b82f6"; // Blue-500

    return (
        <group>
            {/* X Axis (Red) - Right */}
            <mesh position={[axisLength/2, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
                <cylinderGeometry args={[thickness, thickness, axisLength, 16]} />
                <meshStandardMaterial color={colorX} transparent opacity={opacity} />
            </mesh>
            <Text position={[axisLength + textOffset, 0, 0]} fontSize={0.6} color={colorX} anchorX="center" anchorY="middle">X</Text>

            {/* Y Axis (Green) - Back */}
            <mesh position={[0, axisLength/2, 0]}> 
                <cylinderGeometry args={[thickness, thickness, axisLength, 16]} />
                <meshStandardMaterial color={colorY} transparent opacity={opacity} />
            </mesh>
            <Text position={[0, axisLength + textOffset, 0]} fontSize={0.6} color={colorY} anchorX="center" anchorY="middle">Y</Text>

            {/* Z Axis (Blue) - Up */}
            <mesh position={[0, 0, axisLength/2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[thickness, thickness, axisLength, 16]} />
                <meshStandardMaterial color={colorZ} transparent opacity={opacity} />
            </mesh>
            <Text position={[0, 0, axisLength + textOffset]} fontSize={0.6} color={colorZ} anchorX="center" anchorY="middle">Z</Text>
            
            {/* Center Sphere */}
            <mesh>
                <sphereGeometry args={[thickness * 4]} />
                <meshStandardMaterial color="#64748b" />
            </mesh>
        </group>
    );
};

const SceneContent: React.FC<Viewer3DProps & { transformMode: TransformMode }> = (props) => {
    return (
        <>
            <ambientLight intensity={0.7} />
            <directionalLight 
                position={[20, -30, 50]} 
                intensity={1.5} 
                castShadow 
                shadow-bias={-0.0001}
            />
            <Environment preset="city" />

            <CoordinateAxes />
            
            <ShapeRenderer 
                shape={props.activeShape} 
                selectedPartIndices={props.selectedPartIndices}
                onPartClick={props.onPartClick}
                transformMode={props.transformMode}
                onPartUpdate={props.onPartUpdate}
            />

            {/* Grid on XY plane (Z=0) */}
            <Grid 
                position={[0, 0, -0.01]} 
                args={[60, 60]} 
                rotation={[Math.PI/2, 0, 0]} 
                cellColor="#cbd5e1" 
                sectionColor="#94a3b8" 
                fadeDistance={60} 
                cellSize={1} 
                sectionSize={5}
                infiniteGrid
            />
            
            <mesh position={[0, 0, -0.05]} receiveShadow rotation={[0,0,0]}>
                <planeGeometry args={[200, 200]} />
                <shadowMaterial opacity={0.15} />
            </mesh>
        </>
    );
};

const CameraSync = ({ controls }: { controls: Record<string, React.RefObject<CameraControls | null>> }) => {
    const locked = useRef(false);

    useEffect(() => {
        const handlers: Record<string, (e?: any) => void> = {};

        Object.entries(controls).forEach(([key, ref]) => {
            if (!ref.current) return;

            // Using 'change' event which is standard for Drei CameraControls (wrapping Three's controls)
            const handler = () => {
                if (locked.current) return;
                const source = ref.current;
                if (!source) return;

                locked.current = true;
                const target = new THREE.Vector3();
                source.getTarget(target);

                // Sync Target (Pan)
                Object.entries(controls).forEach(([k, targetRef]) => {
                    if (k === key || !targetRef.current) return;
                    targetRef.current.setTarget(target.x, target.y, target.z, false);
                });

                // Sync Zoom for Ortho views
                if (['TOP', 'LEFT', 'FRONT'].includes(key)) {
                    const sourceCam = source.camera;
                    if (sourceCam instanceof THREE.OrthographicCamera) {
                        const zoom = sourceCam.zoom;
                        Object.entries(controls).forEach(([k, targetRef]) => {
                            if (k === key || !targetRef.current) return;
                            if (['TOP', 'LEFT', 'FRONT'].includes(k)) {
                                const targetCtrl = targetRef.current;
                                if (targetCtrl.camera instanceof THREE.OrthographicCamera) {
                                    targetCtrl.zoomTo(zoom, false);
                                }
                            }
                        });
                    }
                }
                locked.current = false;
            };

            handlers[key] = handler;
            // @ts-ignore - CameraControls type definition might miss internal event emitter types sometimes
            ref.current.addEventListener('control', handler); 
        });

        return () => {
            Object.entries(controls).forEach(([key, ref]) => {
                if (ref.current && handlers[key]) {
                    // @ts-ignore
                    ref.current.removeEventListener('control', handlers[key]);
                }
            });
        };
    }, [controls]);

    return null;
};


const Viewer3D: React.FC<Viewer3DProps> = (props) => {
  const [transformMode, setTransformMode] = useState<TransformMode>('translate');
  
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const mainViewRef = useRef<HTMLDivElement>(null);
  const topViewRef = useRef<HTMLDivElement>(null);
  const frontViewRef = useRef<HTMLDivElement>(null);
  const leftViewRef = useRef<HTMLDivElement>(null);

  // Camera Control Refs
  const isoControls = useRef<CameraControls>(null);
  const topControls = useRef<CameraControls>(null);
  const frontControls = useRef<CameraControls>(null);
  const leftControls = useRef<CameraControls>(null);

  const isMultiView = props.viewType === 'ALL';
  const isBuilderMode = props.onPartClick !== undefined;
  const isSingleSelection = props.selectedPartIndices && props.selectedPartIndices.length === 1;

  // Single View Camera Logic
  const SingleCameraSetup = ({ type }: { type: ViewType }) => {
      const ctrlRef = useRef<CameraControls>(null);
      useEffect(() => {
        if (!ctrlRef.current) return;
        const transition = true;
        switch (type) {
            case 'FRONT': 
                ctrlRef.current.setLookAt(0, -20, 0, 0, 0, 0, transition); 
                break;
            case 'TOP': 
                ctrlRef.current.setLookAt(0, 0, 20, 0, 0, 0, transition); 
                break;
            case 'LEFT': 
                ctrlRef.current.setLookAt(-20, 0, 0, 0, 0, 0, transition); 
                break;
            case 'ISO': 
            default: 
                ctrlRef.current.setLookAt(12, -12, 10, 0, 0, 0, transition); 
                break;
        }
      }, [type]);
      return <CameraControls ref={ctrlRef} makeDefault minDistance={1} maxDistance={200} />;
  };

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 relative">
      <Canvas 
         className="absolute inset-0 block"
         eventSource={containerRef}
         shadows
         camera={{ position: [12, -12, 10], fov: 45, up: [0, 0, 1] }}
      >
        {!isMultiView ? (
            /* STANDARD SINGLE VIEW MODE */
            <>
                <PerspectiveCamera makeDefault position={[12, -12, 10]} fov={45} up={[0,0,1]} />
                <SingleCameraSetup type={props.viewType} />
                <SceneContent {...props} transformMode={transformMode} />
            </>
        ) : (
            /* MULTI-VIEW MODE */
            <>
                <View track={mainViewRef}>
                    <CameraControls ref={isoControls} makeDefault minDistance={1} maxDistance={200} />
                    <PerspectiveCamera makeDefault position={[12, -12, 10]} fov={45} up={[0,0,1]} />
                    <SceneContent {...props} transformMode={transformMode} />
                </View>

                <View track={topViewRef}>
                    <CameraControls ref={topControls} makeDefault minZoom={10} maxZoom={200} />
                    <OrthographicCamera makeDefault position={[0, 0, 20]} zoom={30} up={[0, 1, 0]} /> 
                    <SceneContent {...props} transformMode={transformMode} />
                </View>

                <View track={frontViewRef}>
                    <CameraControls ref={frontControls} makeDefault minZoom={10} maxZoom={200} />
                    <OrthographicCamera makeDefault position={[0, -20, 0]} zoom={30} up={[0, 0, 1]} />
                    <SceneContent {...props} transformMode={transformMode} />
                </View>

                <View track={leftViewRef}>
                    <CameraControls ref={leftControls} makeDefault minZoom={10} maxZoom={200} />
                    <OrthographicCamera makeDefault position={[-20, 0, 0]} zoom={30} up={[0, 0, 1]} />
                    <SceneContent {...props} transformMode={transformMode} />
                </View>

                <CameraSync controls={{ 
                    'ISO': isoControls, 
                    'TOP': topControls, 
                    'FRONT': frontControls, 
                    'LEFT': leftControls 
                }} />
            </>
        )}
      </Canvas>

      {/* HTML Layout for MultiView */}
      {isMultiView && (
          <div className="absolute inset-0 grid grid-cols-2 grid-rows-2 pointer-events-none">
              <div ref={topViewRef} className="border-r border-b border-slate-300 relative bg-transparent">
                  <div className="absolute top-2 left-2 text-xs font-bold text-slate-500 bg-white/80 px-2 py-1 rounded">俯视图 (Top)</div>
              </div>
              <div ref={mainViewRef} className="border-b border-slate-300 relative bg-transparent">
                  <div className="absolute top-2 right-2 text-xs font-bold text-slate-500 bg-white/80 px-2 py-1 rounded">等轴测 (ISO)</div>
              </div>
              <div ref={frontViewRef} className="border-r border-slate-300 relative bg-transparent">
                   <div className="absolute top-2 left-2 text-xs font-bold text-slate-500 bg-white/80 px-2 py-1 rounded">主视图 (Front)</div>
              </div>
              <div ref={leftViewRef} className="relative bg-transparent">
                   <div className="absolute top-2 left-2 text-xs font-bold text-slate-500 bg-white/80 px-2 py-1 rounded">左视图 (Left)</div>
              </div>
          </div>
      )}
      
      {/* Overlay Info (Single View) */}
      {!isMultiView && (
        <div className="absolute top-4 right-4 pointer-events-none z-10">
            <div className="bg-white/80 backdrop-blur border border-slate-200 p-3 rounded-lg shadow-sm text-right">
                <h3 className="text-sm font-bold text-slate-700">当前视角</h3>
                <p className="text-xs text-slate-500 font-mono mb-2">
                    {props.viewType === 'ISO' && '等轴测投影 (Isometric)'}
                    {props.viewType === 'FRONT' && '主视图 (Front)'}
                    {props.viewType === 'TOP' && '俯视图 (Top)'}
                    {props.viewType === 'LEFT' && '左视图 (Left)'}
                </p>
                {isBuilderMode && (
                <div className="mt-2 border-t border-slate-200 pt-2 text-xs text-blue-600">
                    <p>1. 点击图形选中 (Ctrl+单击多选)</p>
                    <p>2. 蓝色轴线(Z)控制高度</p>
                </div>
                )}
            </div>
        </div>
      )}

      {/* Transform Tools */}
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