export enum PrimitiveType {
  BOX = 'BOX',
  CYLINDER = 'CYLINDER',
  WEDGE = 'WEDGE', // Triangular prism
  CONE = 'CONE',
  CUSTOM = 'CUSTOM' // For CSG results
}

export interface GeometryPart {
  type: PrimitiveType;
  position: [number, number, number];
  rotation?: [number, number, number]; // Euler angles
  scale: [number, number, number];
  color?: string;
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

export type ViewType = 'ISO' | 'FRONT' | 'TOP' | 'LEFT';