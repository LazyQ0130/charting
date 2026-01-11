import React, { useRef, useMemo } from 'react';
import { GeometryPart, PrimitiveType, ShapeDefinition } from '../types';
import { TransformControls } from '@react-three/drei';
import * as THREE from 'three';

// Define the modes for transformation
export type TransformMode = 'translate' | 'rotate' | 'scale';

const PartRenderer: React.FC<{ 
  part: GeometryPart; 
  isSelected?: boolean;
  onClick?: (e: any) => void;
  transformMode?: TransformMode;
  onTransformEnd?: (updatedPart: GeometryPart) => void;
}> = ({ part, isSelected, onClick, transformMode = 'translate', onTransformEnd }) => {
  const { type, position, rotation, scale, color } = part;
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Custom Geometry Loader
  const customGeometry = useMemo(() => {
    if (type === PrimitiveType.CUSTOM && part.geometryData) {
        try {
            const loader = new THREE.BufferGeometryLoader();
            return loader.parse(part.geometryData);
        } catch (e) {
            console.error("Failed to load custom geometry", e);
            return null;
        }
    }
    return null;
  }, [type, part.geometryData]);

  // Material properties
  // Allow user defined color to persist even when selected
  const baseColor = color || '#60a5fa';
  const materialProps = {
    color: baseColor,
    roughness: 0.5,
    metalness: 0.1,
    // Add emissive glow when selected instead of overriding base color
    emissive: isSelected ? "#555555" : "#000000",
    emissiveIntensity: isSelected ? 0.5 : 0
  };

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    document.body.style.cursor = 'pointer';
  };
  const handlePointerOut = (e: any) => {
    document.body.style.cursor = 'auto';
  };

  // Common mesh props
  const meshProps = {
    ref: meshRef,
    position: position,
    rotation: rotation,
    onClick: onClick,
    onPointerOver: onClick ? handlePointerOver : undefined,
    onPointerOut: onClick ? handlePointerOut : undefined,
    castShadow: true,
    receiveShadow: true
  };

  const renderGeometry = () => {
    switch (type) {
      case PrimitiveType.BOX:
        return <boxGeometry args={scale} />;
      case PrimitiveType.CYLINDER:
        return <cylinderGeometry args={[scale[0], scale[0], scale[1], 32]} />;
      case PrimitiveType.CONE:
        return <coneGeometry args={[scale[0], scale[1], 4]} />;
      case PrimitiveType.WEDGE:
        return <cylinderGeometry args={[scale[0], scale[0], scale[1], 3]} />;
      case PrimitiveType.CUSTOM:
        return customGeometry ? <primitive object={customGeometry} /> : null;
      default:
        return null;
    }
  };

  const renderEdges = () => {
    // Only show simple edges for boxes for now to avoid clutter
    if (type === PrimitiveType.BOX) {
         return (
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(...scale)]} />
                <lineBasicMaterial color={isSelected ? "#fbbf24" : "black"} linewidth={2} />
            </lineSegments>
        );
    }
    return null;
  };

  return (
    <>
      <mesh {...meshProps}>
        {renderGeometry()}
        <meshStandardMaterial {...materialProps} flatShading={type === PrimitiveType.WEDGE || type === PrimitiveType.CONE} />
        {renderEdges()}
        {isSelected && (
          <mesh>
              {/* Selection Halo/Wireframe for primitives */}
               {type !== PrimitiveType.CUSTOM && (
                 <>
                    <boxGeometry args={[scale[0]*1.05, scale[1]*1.05, scale[2]*1.05]} />
                    <meshBasicMaterial color="#fbbf24" wireframe />
                 </>
               )}
          </mesh>
        )}
      </mesh>

      {/* Transform Controls for Mouse Interaction - Only enable if this is the ONLY selected item to avoid confusion or multiple controls */}
      {isSelected && onTransformEnd && (
        <TransformControls 
          object={meshRef} 
          mode={transformMode}
          onMouseUp={() => {
            if (meshRef.current) {
              const m = meshRef.current;
              onTransformEnd({
                ...part,
                position: [m.position.x, m.position.y, m.position.z],
                rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
                scale: [type === PrimitiveType.BOX ? m.scale.x : scale[0], type === PrimitiveType.BOX ? m.scale.y : scale[1], type === PrimitiveType.BOX ? m.scale.z : scale[2]] 
              });
            }
          }}
        />
      )}
    </>
  );
};

interface ShapeRendererProps {
  shape: ShapeDefinition;
  selectedPartIndices?: number[];
  onPartClick?: (index: number, multiSelect: boolean) => void;
  transformMode?: TransformMode;
  onPartUpdate?: (index: number, part: GeometryPart) => void;
}

const ShapeRenderer: React.FC<ShapeRendererProps> = ({ 
  shape, 
  selectedPartIndices = [], 
  onPartClick, 
  transformMode, 
  onPartUpdate 
}) => {
  return (
    <group>
      {shape.parts.map((part, index) => {
          const isSelected = selectedPartIndices.includes(index);
          return (
            <PartRenderer 
                key={index} 
                part={part} 
                isSelected={isSelected}
                // If multiple items are selected, only show transform controls for the LAST one (active) or all? 
                // Typically CAD tools show one gizmo for the group or individual gizmos. 
                // To keep it simple, only show gizmo if it is the ONLY selected item.
                onTransformEnd={isSelected && selectedPartIndices.length === 1 && onPartUpdate ? (updatedPart) => onPartUpdate(index, updatedPart) : undefined}
                transformMode={transformMode}
                onClick={onPartClick ? (e) => { 
                    e.stopPropagation(); 
                    // Check for shift/ctrl key
                    const isMulti = e.shiftKey || e.ctrlKey || e.metaKey;
                    onPartClick(index, isMulti); 
                } : undefined}
            />
          );
      })}
    </group>
  );
};

export default ShapeRenderer;