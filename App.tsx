import React, { useState, useMemo, useEffect } from 'react';
import Viewer3D from './components/Viewer3D';
import Sidebar from './components/Sidebar';
import { SHAPE_CATEGORIES } from './constants';
import { ShapeDefinition, ViewType, PrimitiveType, GeometryPart, Category } from './types';
import { Menu, Box, X } from 'lucide-react';
import * as THREE from 'three';
import { SUBTRACTION, ADDITION, INTERSECTION, Brush, Evaluator } from 'three-bvh-csg';

// Save Dialog Component
const SaveModal = ({ 
    isOpen, 
    onClose, 
    onSave, 
    categories 
}: { 
    isOpen: boolean; 
    onClose: () => void; 
    onSave: (name: string, categoryName: string) => void; 
    categories: Category[] 
}) => {
    const [name, setName] = useState('');
    const [categoryMode, setCategoryMode] = useState<'EXISTING' | 'NEW'>('EXISTING');
    const [selectedCategory, setSelectedCategory] = useState(categories[0]?.name || '我的收藏');
    const [newCategoryName, setNewCategoryName] = useState('');

    useEffect(() => {
        if (isOpen && categories.length > 0) {
            setSelectedCategory(categories[0].name);
        }
    }, [isOpen, categories]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-slate-800">保存到图库</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">图形名称</label>
                        <input 
                            type="text" 
                            className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                            placeholder="例如：组合体练习01"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">分类</label>
                        <div className="flex gap-2 mb-2 text-xs">
                            <button 
                                onClick={() => setCategoryMode('EXISTING')}
                                className={`flex-1 py-1 rounded ${categoryMode === 'EXISTING' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-600'}`}
                            >
                                现有分类
                            </button>
                            <button 
                                onClick={() => setCategoryMode('NEW')}
                                className={`flex-1 py-1 rounded ${categoryMode === 'NEW' ? 'bg-blue-100 text-blue-700 font-bold' : 'bg-slate-100 text-slate-600'}`}
                            >
                                新建分类
                            </button>
                        </div>

                        {categoryMode === 'EXISTING' && categories.length > 0 ? (
                            <select 
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm outline-none"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                {categories.map(c => (
                                    <option key={c.id} value={c.name}>{c.name}</option>
                                ))}
                            </select>
                        ) : (
                            <input 
                                type="text" 
                                className="w-full border border-slate-300 rounded px-3 py-2 text-sm focus:border-blue-500 outline-none"
                                placeholder={categories.length === 0 && categoryMode === 'EXISTING' ? "暂无分类，请新建" : "输入新分类名称"}
                                value={categoryMode === 'EXISTING' && categories.length === 0 ? '' : newCategoryName}
                                onChange={(e) => setNewCategoryName(e.target.value)}
                                disabled={categoryMode === 'EXISTING' && categories.length === 0}
                            />
                        )}
                    </div>

                    <button 
                        onClick={() => {
                            if (!name.trim()) return alert('请输入名称');
                            let cat = '';
                            if (categoryMode === 'EXISTING') {
                                if (categories.length === 0) return alert('请先新建分类');
                                cat = selectedCategory;
                            } else {
                                cat = newCategoryName;
                            }
                            
                            if (!cat.trim()) return alert('请输入分类名称');
                            onSave(name, cat);
                        }}
                        className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700 transition"
                    >
                        确认保存
                    </button>
                </div>
            </div>
        </div>
    );
};

const EMPTY_SHAPE: ShapeDefinition = {
    id: 'empty-start',
    name: '暂无图形',
    description: '还没有创建图形哦，请点击下方“进入自定义拼接”开始创作！',
    parts: []
};

const App: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>(SHAPE_CATEGORIES);
  
  const initialShape = useMemo(() => {
      for (const cat of SHAPE_CATEGORIES) {
          if (cat.shapes.length > 0) return cat.shapes[0];
      }
      return EMPTY_SHAPE;
  }, []);

  const [activeShape, setActiveShape] = useState<ShapeDefinition>(initialShape);
  const [viewType, setViewType] = useState<ViewType>('ISO');
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isSaveModalOpen, setSaveModalOpen] = useState(false);

  const [isBuilderMode, setIsBuilderMode] = useState(false);
  const [customParts, setCustomParts] = useState<GeometryPart[]>([]);
  const [selectedPartIndices, setSelectedPartIndices] = useState<number[]>([]);

  const [history, setHistory] = useState<GeometryPart[][]>([]);
  const [future, setFuture] = useState<GeometryPart[][]>([]);

  const pushToHistory = () => {
    setHistory((prev) => [...prev, customParts]);
    setFuture([]); 
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setFuture((prev) => [customParts, ...prev]);
    setCustomParts(previous);
    setHistory(newHistory);
    setSelectedPartIndices([]); 
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);
    setHistory((prev) => [...prev, customParts]);
    setCustomParts(next);
    setFuture(newFuture);
    setSelectedPartIndices([]);
  };

  const handleDeleteShape = (categoryId: string, shapeId: string) => {
     const newCategories = categories.map(cat => {
         if (cat.id !== categoryId) return cat;
         return {
             ...cat,
             shapes: cat.shapes.filter(s => s.id !== shapeId)
         };
     });
     setCategories(newCategories);
     if (activeShape && activeShape.id === shapeId) {
         let foundShape: ShapeDefinition | undefined;
         for (const cat of newCategories) {
             if (cat.shapes.length > 0) {
                 foundShape = cat.shapes[0];
                 break;
             }
         }
         if (foundShape) {
             setActiveShape(foundShape);
         } else {
             setActiveShape(EMPTY_SHAPE);
         }
     }
  };

  const handleOpenSaveModal = () => {
      setSaveModalOpen(true);
  };

  const handleSaveToGallery = (name: string, categoryName: string) => {
      const newShape: ShapeDefinition = {
          id: `custom-${Date.now()}`,
          name: name,
          description: '用户自定义创建的组合体。',
          parts: JSON.parse(JSON.stringify(customParts))
      };

      setCategories(prev => {
          const existingCatIndex = prev.findIndex(c => c.name === categoryName);
          if (existingCatIndex >= 0) {
              const newCats = [...prev];
              const targetCat = newCats[existingCatIndex];
              newCats[existingCatIndex] = {
                  ...targetCat,
                  shapes: [...targetCat.shapes, newShape]
              };
              return newCats;
          } else {
              return [...prev, {
                  id: `cat-${Date.now()}`,
                  name: categoryName,
                  shapes: [newShape]
              }];
          }
      });
      
      setSaveModalOpen(false);
      setIsBuilderMode(false);
      setActiveShape(newShape);
      alert("保存成功！");
  };

  const currentRenderShape: ShapeDefinition = useMemo(() => {
    if (isBuilderMode) {
      return {
        id: 'custom-build',
        name: '自定义组合',
        description: '您正在自由编辑模式。按住 Ctrl/Shift 键可多选物体，点击侧边栏按钮进行布尔运算。完成后可保存到图库。',
        parts: customParts
      };
    }
    return activeShape;
  }, [isBuilderMode, customParts, activeShape]);

  // Builder Actions
  const handleAddPart = (type: PrimitiveType) => {
    pushToHistory();
    const newPart: GeometryPart = {
        type,
        position: [0, 0, 0],
        scale: type === PrimitiveType.BOX ? [2, 2, 2] : [2, 2, 2], // Default bigger start size
        rotation: [0, 0, 0],
        color: '#60a5fa'
    };
    setCustomParts([...customParts, newPart]);
    setSelectedPartIndices([customParts.length]); 
  };

  const handleUpdatePart = (index: number, updatedPart: GeometryPart) => {
      pushToHistory();
      const newParts = [...customParts];
      newParts[index] = updatedPart;
      setCustomParts(newParts);
  };

  const handleRemovePart = (index: number) => {
      pushToHistory();
      const newParts = customParts.filter((_, i) => i !== index);
      setCustomParts(newParts);
      setSelectedPartIndices([]);
  };

  const handlePartClick = (index: number, multiSelect: boolean) => {
      if (index === -1) {
          setSelectedPartIndices([]);
          return;
      }
      if (multiSelect) {
          if (selectedPartIndices.includes(index)) {
              setSelectedPartIndices(selectedPartIndices.filter(i => i !== index));
          } else {
              setSelectedPartIndices([...selectedPartIndices, index]);
          }
      } else {
          setSelectedPartIndices([index]);
      }
  };

  // Helper to create a ThreeJS Brush from GeometryPart
  const createBrushFromPart = (part: GeometryPart): Brush => {
      let geo: THREE.BufferGeometry;
      
      // Re-create geometry based on type (Using UNIT SIZES to match ShapeRenderer)
      if (part.type === PrimitiveType.BOX) {
          geo = new THREE.BoxGeometry(1, 1, 1);
      } else if (part.type === PrimitiveType.CYLINDER) {
          geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 32);
      } else if (part.type === PrimitiveType.WEDGE) {
           geo = new THREE.CylinderGeometry(0.5, 0.5, 1, 3);
      } else if (part.type === PrimitiveType.CONE) {
           geo = new THREE.ConeGeometry(0.5, 1, 32);
      } else if (part.type === PrimitiveType.CUSTOM && part.geometryData) {
           geo = new THREE.BufferGeometryLoader().parse(part.geometryData);
      } else {
           geo = new THREE.BoxGeometry(1,1,1);
      }

      const brush = new Brush(geo);
      brush.position.set(...part.position);
      if (part.rotation) brush.rotation.set(...part.rotation);
      // Important: Apply the scale to the Brush logic
      brush.scale.set(...part.scale);
      
      brush.updateMatrixWorld();
      return brush;
  };

  const handleBooleanOperation = (type: 'UNION' | 'SUBTRACT' | 'INTERSECT') => {
      if (selectedPartIndices.length < 2) return;
      pushToHistory();

      const sortedIndices = [...selectedPartIndices].sort((a,b) => a - b);
      const brushes = sortedIndices.map(idx => createBrushFromPart(customParts[idx]));
      
      const evaluator = new Evaluator();
      
      let resultBrush = brushes[0];
      
      for (let i = 1; i < brushes.length; i++) {
          const targetBrush = brushes[i];
          let op = ADDITION;
          if (type === 'SUBTRACT') op = SUBTRACTION;
          if (type === 'INTERSECT') op = INTERSECTION;
          
          const result = evaluator.evaluate(resultBrush, targetBrush, op);
          resultBrush = result;
      }

      const resGeometry = resultBrush.geometry;
      resGeometry.computeBoundingBox();
      const center = new THREE.Vector3();
      resGeometry.boundingBox?.getCenter(center);
      resGeometry.center(); 

      const newPart: GeometryPart = {
          type: PrimitiveType.CUSTOM,
          position: [center.x, center.y, center.z], 
          scale: [1, 1, 1], 
          rotation: [0, 0, 0], 
          color: '#60a5fa',
          geometryData: resGeometry.toJSON() 
      };

      const remainingParts = customParts.filter((_, idx) => !selectedPartIndices.includes(idx));
      setCustomParts([...remainingParts, newPart]);
      setSelectedPartIndices([remainingParts.length]); 
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden text-slate-900 font-sans">
      
      <Sidebar 
        categories={categories}
        currentShape={activeShape} 
        onSelectShape={setActiveShape}
        isOpen={isSidebarOpen}
        onToggle={() => setSidebarOpen(!isSidebarOpen)}
        onDeleteShape={handleDeleteShape}
        onSaveToGallery={handleOpenSaveModal}
        
        isBuilderMode={isBuilderMode}
        onToggleBuilderMode={() => setIsBuilderMode(!isBuilderMode)}
        customShapeParts={customParts}
        onAddPart={handleAddPart}
        onUpdatePart={handleUpdatePart}
        onRemovePart={handleRemovePart}
        selectedPartIndices={selectedPartIndices}
        onSelectPart={setSelectedPartIndices}
        onBooleanOperation={handleBooleanOperation}
        
        onUndo={handleUndo}
        onRedo={handleRedo}
        canUndo={history.length > 0}
        canRedo={future.length > 0}
      />

      <SaveModal 
        isOpen={isSaveModalOpen} 
        onClose={() => setSaveModalOpen(false)} 
        onSave={handleSaveToGallery}
        categories={categories}
      />

      <main className="flex-1 flex flex-col relative h-full">
        
        <header className="md:hidden h-14 bg-white border-b border-slate-200 flex items-center px-4 justify-between z-10">
            <div className="flex items-center gap-2">
                <Box className="w-5 h-5 text-blue-500" />
                <span className="font-bold text-slate-800">GeoTech View</span>
            </div>
            <button 
                onClick={() => setSidebarOpen(true)}
                className="p-2 text-slate-600 hover:bg-slate-100 rounded-full"
            >
                <Menu className="w-5 h-5" />
            </button>
        </header>

        <div className="flex-1 relative bg-slate-100">
            <Viewer3D 
                activeShape={currentRenderShape} 
                viewType={viewType} 
                selectedPartIndices={isBuilderMode ? selectedPartIndices : undefined}
                onPartClick={isBuilderMode ? handlePartClick : undefined}
                onPartUpdate={isBuilderMode ? handleUpdatePart : undefined}
            />
            
            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex items-center gap-2 p-2 bg-white/90 backdrop-blur-sm rounded-full shadow-lg border border-slate-200 z-10 overflow-x-auto max-w-[95%]">
                <ControlButton 
                    active={viewType === 'ISO'} 
                    onClick={() => setViewType('ISO')}
                    label="等轴测"
                    icon={<Box className="w-4 h-4" />}
                />
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <ControlButton 
                    active={viewType === 'FRONT'} 
                    onClick={() => setViewType('FRONT')}
                    label="主视图"
                    icon={<div className="font-bold text-xs">V</div>} 
                />
                 <ControlButton 
                    active={viewType === 'TOP'} 
                    onClick={() => setViewType('TOP')}
                    label="俯视图"
                    icon={<div className="font-bold text-xs">H</div>} 
                />
                 <ControlButton 
                    active={viewType === 'LEFT'} 
                    onClick={() => setViewType('LEFT')}
                    label="左视图"
                    icon={<div className="font-bold text-xs">W</div>} 
                />
            </div>
        </div>
      </main>
    </div>
  );
};

const ControlButton: React.FC<{
    active: boolean; 
    onClick: () => void; 
    icon: React.ReactNode; 
    label: string
}> = ({ active, onClick, icon, label }) => (
    <button
        onClick={onClick}
        className={`
            flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap
            ${active 
                ? 'bg-blue-600 text-white shadow-md' 
                : 'bg-transparent text-slate-600 hover:bg-slate-100'
            }
        `}
        title={label}
    >
        {icon}
        <span className="hidden sm:inline">{label}</span>
    </button>
);

export default App;