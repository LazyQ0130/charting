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
  const materialProps = {
    color: color || '#60a5fa',
    roughness: 0.5,
    metalness: 0.1,
    emissive: isSelected ? "#555555" : "#000000",
    emissiveIntensity: isSelected ? 0.3 : 0
  };

  const handlePointerDown = (e: any) => {
     if (onClick) {
         e.stopPropagation();
         // We handle the actual 'click' logic in the parent's logic or simple onClick, 
         // but stopPropagation here ensures background doesn't catch it immediately.
     }
  };

  // Common mesh props
  const meshProps = {
    ref: meshRef,
    position: position,
    rotation: rotation,
    scale: scale, // Apply scale directly to mesh
    onClick: onClick ? (e: any) => {
        e.stopPropagation();
        onClick(e);
    } : undefined,
    onPointerDown: handlePointerDown,
    castShadow: true,
    receiveShadow: true
  };

  // Render Unit Geometries (Size 1) so scale prop works perfectly
  const renderGeometry = () => {
    switch (type) {
      case PrimitiveType.BOX:
        return <boxGeometry args={[1, 1, 1]} />;
      case PrimitiveType.CYLINDER:
        // RadiusTop, RadiusBottom, Height, Segments. 
        // Radius 0.5 = Diameter 1. Height 1.
        return <cylinderGeometry args={[0.5, 0.5, 1, 32]} />;
      case PrimitiveType.CONE:
        // Radius 0.5 = Diameter 1. Height 1.
        return <coneGeometry args={[0.5, 1, 32]} />;
      case PrimitiveType.WEDGE:
         // 3-sided cylinder (prism)
        return <cylinderGeometry args={[0.5, 0.5, 1, 3]} />;
      default:
        return null;
    }
  };

  const renderEdges = () => {
    if (type === PrimitiveType.BOX) {
         return (
            <lineSegments>
                <edgesGeometry args={[new THREE.BoxGeometry(1, 1, 1)]} />
                <lineBasicMaterial color={isSelected ? "#fbbf24" : "black"} linewidth={2} />
            </lineSegments>
        );
    }
    return null;
  };

  return (
    <>
      <mesh {...meshProps} geometry={type === PrimitiveType.CUSTOM && customGeometry ? customGeometry : undefined}>
        {type !== PrimitiveType.CUSTOM && renderGeometry()}
        <meshStandardMaterial {...materialProps} flatShading={type === PrimitiveType.WEDGE || type === PrimitiveType.CONE} />
        {renderEdges()}
        {isSelected && type !== PrimitiveType.CUSTOM && (
          <mesh>
             {/* Selection Highlight Box (slightly larger) */}
             <boxGeometry args={[1.02, 1.02, 1.02]} />
             <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </mesh>

      {/* Transform Controls */}
      {isSelected && onTransformEnd && (
        <TransformControls 
          object={meshRef} 
          mode={transformMode}
          space="local" // Use local space so handles align with rotated parent group (Z-up)
          // Important: Capture the exact mesh properties on drag end
          onMouseUp={() => {
            if (meshRef.current) {
              const m = meshRef.current;
              onTransformEnd({
                ...part,
                position: [m.position.x, m.position.y, m.position.z],
                rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
                // Now we simply read the scale from the mesh for ALL types
                // because we are using unit geometries.
                scale: [m.scale.x, m.scale.y, m.scale.z] 
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
                onTransformEnd={isSelected && selectedPartIndices.length === 1 && onPartUpdate ? (updatedPart) => onPartUpdate(index, updatedPart) : undefined}
                transformMode={transformMode}
                onClick={onPartClick ? (e) => { 
                    // Logic handled in PartRenderer stopPropagation, but here we trigger the state change
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