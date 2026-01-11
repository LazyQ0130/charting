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
  const { type, position, rotation, scale, color, segments } = part;
  const meshRef = useRef<THREE.Mesh>(null);
  
  // Custom Geometry construction with Z-up alignment
  const geometry = useMemo(() => {
    let geo: THREE.BufferGeometry | null = null;
    const segs = segments || 32;

    switch (type) {
      case PrimitiveType.BOX:
        geo = new THREE.BoxGeometry(1, 1, 1);
        break;
      case PrimitiveType.SPHERE:
        geo = new THREE.SphereGeometry(0.5, segs, Math.max(16, segs/2));
        break;
      case PrimitiveType.CYLINDER:
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, segs);
        geo.rotateX(Math.PI / 2); // Align Y (height) to Z
        break;
      case PrimitiveType.PRISM:
        // Prism is a cylinder with low segments (e.g. 3, 4, 5, 6)
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, segments || 3);
        geo.rotateX(Math.PI / 2); // Align Y to Z
        break;
      case PrimitiveType.WEDGE: // Legacy mapping to 3-sided prism
        geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
        geo.rotateX(Math.PI / 2);
        break;
      case PrimitiveType.CONE:
         geo = new THREE.ConeGeometry(0.5, 1, segs);
         geo.rotateX(Math.PI / 2); // Align Y to Z
         break;
      case PrimitiveType.PYRAMID:
         // Pyramid is a cone with low segments
         geo = new THREE.ConeGeometry(0.5, 1, segments || 4);
         geo.rotateX(Math.PI / 2); // Align Y to Z
         break;
      case PrimitiveType.CUSTOM:
        if (part.geometryData) {
            try {
                const loader = new THREE.BufferGeometryLoader();
                geo = loader.parse(part.geometryData);
            } catch (e) {
                console.error("Failed to load custom geometry", e);
            }
        }
        break;
      default:
        geo = new THREE.BoxGeometry(1, 1, 1);
    }
    return geo;
  }, [type, part.geometryData, segments]);

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
     }
  };

  const renderEdges = () => {
     // Edges helper also needs Z-up alignment if it's based on primitive
     if (!isSelected && type !== PrimitiveType.BOX && type !== PrimitiveType.PRISM && type !== PrimitiveType.WEDGE && type !== PrimitiveType.PYRAMID) return null;
     
     // For flat shading primitives, show edges
     if (geometry) {
         return (
            <lineSegments>
                <edgesGeometry args={[geometry]} />
                <lineBasicMaterial color={isSelected ? "#fbbf24" : "black"} linewidth={2} />
            </lineSegments>
        );
     }
     return null;
  };

  // Determine if we should use flat shading (low poly)
  const isFlat = [PrimitiveType.BOX, PrimitiveType.PRISM, PrimitiveType.WEDGE, PrimitiveType.PYRAMID].includes(type);

  // Common mesh props
  const meshProps = {
    ref: meshRef,
    position: position,
    rotation: rotation,
    scale: scale, 
    onClick: onClick ? (e: any) => {
        e.stopPropagation();
        onClick(e);
    } : undefined,
    onPointerDown: handlePointerDown,
    castShadow: true,
    receiveShadow: true
  };

  if (!geometry) return null;

  return (
    <>
      <mesh {...meshProps} geometry={geometry}>
        <meshStandardMaterial {...materialProps} flatShading={isFlat} />
        {renderEdges()}
        {isSelected && type !== PrimitiveType.CUSTOM && (
          <mesh>
             {/* Selection Highlight Box - we use a slightly larger version of the same geometry */}
             <meshBasicMaterial color="#fbbf24" wireframe transparent opacity={0.5} />
          </mesh>
        )}
      </mesh>

      {/* Transform Controls */}
      {isSelected && onTransformEnd && (
        <TransformControls 
          object={meshRef} 
          mode={transformMode}
          space="local" // In Z-up world, Local Z is Up (if rotation is 0). Gizmo Blue = Up.
          onMouseUp={() => {
            if (meshRef.current) {
              const m = meshRef.current;
              onTransformEnd({
                ...part,
                position: [m.position.x, m.position.y, m.position.z],
                rotation: [m.rotation.x, m.rotation.y, m.rotation.z],
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