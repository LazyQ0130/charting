
export enum PrimitiveType {
  BOX = 'BOX',
  CYLINDER = 'CYLINDER', // High poly cylinder
  PRISM = 'PRISM',       // Low poly cylinder (3-12 sides)
  SPHERE = 'SPHERE',
  CONE = 'CONE',         // High poly cone
  PYRAMID = 'PYRAMID',   // Low poly cone (3-12 sides)
  WEDGE = 'WEDGE',       // Legacy, mapped to Prism with 3 sides
  CUSTOM = 'CUSTOM'      // For CSG results
}

export interface GeometryPart {
  type: PrimitiveType;
  position: [number, number, number];
  rotation?: [number, number, number]; // Euler angles
  scale: [number, number, number];
  color?: string;
  segments?: number; // For Cylinders, Cones, Prisms, Pyramids, Spheres
  geometryData?: any; // Stores JSON exported BufferGeometry for CUSTOM types
}

export interface ShapeDefinition {
  id: string;
  name: string;
  description: string;
  parts: GeometryPart[];
}

export interface Category {
  id: string;
  name: string;
  shapes: ShapeDefinition[];
}

export type ViewType = 'ISO' | 'FRONT' | 'TOP' | 'LEFT' | 'ALL';

export type EdgeMode = 'NONE' | 'VISIBLE' | 'HIDDEN_VISIBLE';
