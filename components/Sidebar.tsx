import React from 'react';
import { Category, ShapeDefinition, PrimitiveType, GeometryPart } from '../types';
import { Box, Layers, Triangle, Plus, Trash2, RotateCcw, PenTool, MousePointer2, Combine, ScanLine, XCircle, Undo, Redo, Palette, Save } from 'lucide-react';

interface SidebarProps {
  categories: Category[]; 
  currentShape: ShapeDefinition;
  onSelectShape: (shape: ShapeDefinition) => void;
  isOpen: boolean;
  onToggle: () => void;
  onDeleteShape: (categoryId: string, shapeId: string) => void;
  onSaveToGallery: () => void;
  
  // Builder Mode Props
  isBuilderMode: boolean;
  onToggleBuilderMode: () => void;
  customShapeParts: GeometryPart[];
  onAddPart: (type: PrimitiveType) => void;
  onUpdatePart: (index: number, part: GeometryPart) => void;
  onRemovePart: (index: number) => void;
  selectedPartIndices: number[];
  onSelectPart: (indices: number[]) => void;
  onBooleanOperation: (type: 'UNION' | 'SUBTRACT' | 'INTERSECT') => void;
  
  // Undo/Redo Props
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({ 
    categories, currentShape, onSelectShape, isOpen, onToggle,
    onDeleteShape, onSaveToGallery,
    isBuilderMode, onToggleBuilderMode,
    customShapeParts, onAddPart, onUpdatePart, onRemovePart,
    selectedPartIndices, onSelectPart,
    onBooleanOperation,
    onUndo, onRedo, canUndo, canRedo
}) => {
  
  const getIcon = (id: string) => {
    switch(id) {
        case 'basic': return <Box className="w-4 h-4" />;
        case 'mechanical': return <Layers className="w-4 h-4" />;
        case 'custom': return <PenTool className="w-4 h-4" />;
        default: return <Triangle className="w-4 h-4" />;
    }
  }

  // Handle single part selection for editing properties
  const primaryIndex = selectedPartIndices.length === 1 ? selectedPartIndices[0] : null;

  const handleValueChange = (
      key: 'position' | 'scale' | 'rotation', 
      axis: 0 | 1 | 2, 
      val: string
  ) => {
      if (primaryIndex === null) return;
      const part = customShapeParts[primaryIndex];
      const newValue = parseFloat(val) || 0;
      
      const newArray = [...(part[key] || [0,0,0])] as [number, number, number];
      newArray[axis] = newValue;
      
      onUpdatePart(primaryIndex, { ...part, [key]: newArray });
  };

  const handleColorChange = (newColor: string) => {
    if (primaryIndex === null) return;
    const part = customShapeParts[primaryIndex];
    onUpdatePart(primaryIndex, { ...part, color: newColor });
  };

  const renderBuilderControls = () => {
      const primaryPart = primaryIndex !== null ? customShapeParts[primaryIndex] : null;
      const canOperate = selectedPartIndices.length >= 2;

      return (
          <div className="flex flex-col h-full">
               <div className="p-4 bg-blue-50 border-b border-blue-100">
                  <h2 className="font-bold text-blue-800 flex items-center gap-2 mb-2">
                      <PenTool className="w-4 h-4" /> 自定义构建
                  </h2>
                  <p className="text-xs text-blue-600 mb-4 leading-relaxed">
                      <strong>操作说明：</strong>
                      <br/>1. <strong>点击</strong>物体选中。
                      <br/>2. 按住 <strong>Shift/Ctrl + 点击</strong> 进行多选。
                      <br/>3. 选中两个以上物体进行布尔运算。
                  </p>
                  
                  {/* Undo/Redo Toolbar */}
                  <div className="flex gap-2 mb-3">
                    <button 
                        onClick={onUndo} 
                        disabled={!canUndo}
                        className={`flex-1 flex items-center justify-center p-2 rounded border text-xs shadow-sm transition-all ${canUndo ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300' : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                        title="撤销 (Ctrl+Z)"
                    >
                        <Undo className="w-3 h-3 mr-1"/> 撤销
                    </button>
                    <button 
                        onClick={onRedo} 
                        disabled={!canRedo}
                        className={`flex-1 flex items-center justify-center p-2 rounded border text-xs shadow-sm transition-all ${canRedo ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300' : 'bg-slate-100 text-slate-300 border-slate-100 cursor-not-allowed'}`}
                        title="重做 (Ctrl+Y)"
                    >
                        <Redo className="w-3 h-3 mr-1"/> 重做
                    </button>
                  </div>

                  {/* Primitive Tools */}
                  <div className="grid grid-cols-3 gap-2 mb-3">
                      <button onClick={() => onAddPart(PrimitiveType.BOX)} className="flex flex-col items-center justify-center p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 text-xs shadow-sm">
                          <Box className="w-4 h-4 mb-1 text-blue-500"/> 长方体
                      </button>
                      <button onClick={() => onAddPart(PrimitiveType.CYLINDER)} className="flex flex-col items-center justify-center p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 text-xs shadow-sm">
                          <Layers className="w-4 h-4 mb-1 text-blue-500"/> 圆柱体
                      </button>
                      <button onClick={() => onAddPart(PrimitiveType.WEDGE)} className="flex flex-col items-center justify-center p-2 bg-white rounded border border-blue-200 hover:bg-blue-100 text-xs shadow-sm">
                          <Triangle className="w-4 h-4 mb-1 text-blue-500"/> 棱柱(楔)
                      </button>
                  </div>

                  {/* Boolean Tools */}
                  <div className="grid grid-cols-3 gap-2 border-t border-blue-200 pt-3">
                       <button 
                          disabled={!canOperate}
                          onClick={() => onBooleanOperation('UNION')}
                          className={`flex flex-col items-center justify-center p-2 rounded border text-xs shadow-sm transition-all ${canOperate ? 'bg-white border-blue-200 hover:bg-blue-100 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}`}
                       >
                          <Combine className="w-4 h-4 mb-1"/> 并集 (Union)
                       </button>
                       <button 
                          disabled={!canOperate}
                          onClick={() => onBooleanOperation('SUBTRACT')}
                          className={`flex flex-col items-center justify-center p-2 rounded border text-xs shadow-sm transition-all ${canOperate ? 'bg-white border-blue-200 hover:bg-blue-100 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}`}
                       >
                          <XCircle className="w-4 h-4 mb-1"/> 差集 (Diff)
                       </button>
                       <button 
                          disabled={!canOperate}
                          onClick={() => onBooleanOperation('INTERSECT')}
                          className={`flex flex-col items-center justify-center p-2 rounded border text-xs shadow-sm transition-all ${canOperate ? 'bg-white border-blue-200 hover:bg-blue-100 text-slate-700' : 'bg-slate-50 border-slate-100 text-slate-300 cursor-not-allowed'}`}
                       >
                          <ScanLine className="w-4 h-4 mb-1"/> 交集 (Int)
                       </button>
                  </div>
              </div>

              {/* Layer List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  <div className="text-sm font-semibold text-slate-700 flex justify-between items-center">
                      图层列表 ({customShapeParts.length})
                      <button onClick={() => {onSelectPart([]); }} className="text-xs text-blue-500 hover:underline">取消全选</button>
                  </div>
                  <div className="space-y-2">
                      {customShapeParts.map((part, idx) => {
                          const isSelected = selectedPartIndices.includes(idx);
                          return (
                            <div 
                                key={idx}
                                onClick={(e) => {
                                    if (e.ctrlKey || e.metaKey || e.shiftKey) {
                                        const newSel = isSelected ? selectedPartIndices.filter(i => i !== idx) : [...selectedPartIndices, idx];
                                        onSelectPart(newSel);
                                    } else {
                                        onSelectPart([idx]);
                                    }
                                }}
                                className={`p-2 rounded border text-sm flex justify-between items-center cursor-pointer transition-colors ${isSelected ? 'bg-blue-100 border-blue-300' : 'bg-white border-slate-200 hover:bg-slate-50'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <div 
                                      className="w-3 h-3 rounded-full border border-slate-300"
                                      style={{ backgroundColor: part.color || '#60a5fa' }}
                                    ></div>
                                    <div className="w-4 text-center text-xs text-slate-400">{idx+1}</div>
                                    <span>{part.type === 'BOX' ? '长方体' : part.type === 'CYLINDER' ? '圆柱体' : part.type === 'WEDGE' ? '三棱柱' : '组合体'}</span>
                                </div>
                                {isSelected && (
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onRemovePart(idx); }} 
                                        className="text-red-500 hover:bg-red-100 p-1 rounded transition-colors"
                                        title="删除"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                          );
                      })}
                      {customShapeParts.length === 0 && (
                          <div className="text-center py-8 text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded">
                              暂无物体，请点击上方按钮添加
                          </div>
                      )}
                  </div>
              </div>

              {/* Properties Editor (Only when 1 item selected) */}
              {primaryPart && (
                  <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs space-y-3">
                      <div className="font-semibold text-slate-700 flex items-center gap-2">
                          <MousePointer2 className="w-3 h-3"/> 编辑属性 (第 {primaryIndex! + 1} 项)
                      </div>
                      
                      {/* Color Picker */}
                      <div>
                          <label className="block text-slate-500 mb-1 flex items-center gap-1">
                             <Palette className="w-3 h-3" /> 颜色
                          </label>
                          <div className="flex items-center gap-2">
                              <input 
                                  type="color" 
                                  value={primaryPart.color || '#60a5fa'}
                                  onChange={(e) => handleColorChange(e.target.value)}
                                  className="h-6 w-12 p-0 border-0 rounded cursor-pointer"
                                  title="选择颜色"
                              />
                              <span className="text-xs text-slate-400 font-mono">{primaryPart.color || '#60a5fa'}</span>
                          </div>
                      </div>

                      {/* Position */}
                      <div>
                          <label className="block text-slate-500 mb-1">位置 (X, Y, Z)</label>
                          <div className="grid grid-cols-3 gap-1">
                              {[0, 1, 2].map(axis => (
                                  <input 
                                    key={`pos-${axis}`}
                                    type="number" 
                                    step="0.5"
                                    value={primaryPart.position[axis as 0|1|2]}
                                    onChange={(e) => handleValueChange('position', axis as 0|1|2, e.target.value)}
                                    className="w-full px-1 py-1 border rounded text-center focus:border-blue-500 outline-none"
                                  />
                              ))}
                          </div>
                      </div>

                       {/* Scale */}
                       <div>
                          <label className="block text-slate-500 mb-1">尺寸 (W, H, D)</label>
                          <div className="grid grid-cols-3 gap-1">
                              {[0, 1, 2].map(axis => (
                                  <input 
                                    key={`scale-${axis}`}
                                    type="number" 
                                    step="0.5"
                                    min="0.1"
                                    value={primaryPart.scale[axis as 0|1|2]}
                                    onChange={(e) => handleValueChange('scale', axis as 0|1|2, e.target.value)}
                                    className="w-full px-1 py-1 border rounded text-center focus:border-blue-500 outline-none"
                                  />
                              ))}
                          </div>
                      </div>
                      
                      {/* Rotation */}
                      <div>
                          <label className="block text-slate-500 mb-1">旋转 (弧度)</label>
                          <div className="grid grid-cols-3 gap-1">
                              {[0, 1, 2].map(axis => (
                                  <input 
                                    key={`rot-${axis}`}
                                    type="number" 
                                    step="0.785" 
                                    value={primaryPart.rotation?.[axis as 0|1|2] || 0}
                                    onChange={(e) => handleValueChange('rotation', axis as 0|1|2, e.target.value)}
                                    className="w-full px-1 py-1 border rounded text-center focus:border-blue-500 outline-none"
                                  />
                              ))}
                          </div>
                      </div>
                  </div>
              )}

              <div className="p-4 border-t border-slate-200 flex gap-2">
                  <button 
                    onClick={onToggleBuilderMode}
                    className="flex-1 py-2 bg-slate-200 text-slate-700 rounded hover:bg-slate-300 transition text-sm font-medium flex items-center justify-center gap-2"
                  >
                      <RotateCcw className="w-4 h-4"/> 返回
                  </button>
                  <button 
                    onClick={onSaveToGallery}
                    className="flex-1 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-medium flex items-center justify-center gap-2 shadow-sm"
                  >
                      <Save className="w-4 h-4"/> 保存
                  </button>
              </div>
          </div>
      )
  }

  // Check if there are ANY shapes in any category
  const hasAnyShapes = categories.some(cat => cat.shapes.length > 0);

  return (
    <>
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 z-20 md:hidden" 
          onClick={onToggle}
        />
      )}

      <aside 
        className={`
          fixed md:static inset-y-0 left-0 z-30
          w-80 bg-white border-r border-slate-200
          transform transition-transform duration-200 ease-in-out
          flex flex-col
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-6 border-b border-slate-100 flex-shrink-0">
            <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                <Box className="w-6 h-6 text-blue-500" />
                GeoTech View
            </h1>
            <p className="text-xs text-slate-500 mt-1">工程制图视角训练</p>
        </div>

        {isBuilderMode ? renderBuilderControls() : (
            <>
                <div className="flex-1 overflow-y-auto p-4 space-y-6 relative">
                    {/* Empty State Message */}
                    {!hasAnyShapes && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-slate-400">
                          <Box className="w-12 h-12 mb-3 text-slate-200" />
                          <p className="font-medium text-slate-600 mb-1">还没有创建图形哦</p>
                          <p className="text-xs">点击下方按钮开始自定义拼接</p>
                      </div>
                    )}

                    {categories.map((category) => (
                        category.shapes.length > 0 && (
                            <div key={category.id}>
                                <div className="flex items-center gap-2 text-slate-800 font-semibold mb-3 px-2">
                                    {getIcon(category.id)}
                                    <span>{category.name}</span>
                                </div>
                                <div className="space-y-1">
                                    {category.shapes.map(shape => (
                                        <div 
                                            key={shape.id}
                                            className={`
                                                w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors group relative
                                                ${currentShape.id === shape.id 
                                                    ? 'bg-blue-50 text-blue-700 font-medium ring-1 ring-blue-200' 
                                                    : 'text-slate-600 hover:bg-slate-50'
                                                }
                                            `}
                                        >
                                            <button
                                                onClick={() => {
                                                    onSelectShape(shape);
                                                    if (window.innerWidth < 768) onToggle();
                                                }}
                                                className="flex-1 text-left py-1"
                                            >
                                                {shape.name}
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    e.preventDefault();
                                                    if (window.confirm('确定删除此图形?')) {
                                                      onDeleteShape(category.id, shape.id);
                                                    }
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-white rounded transition-all z-10"
                                                title="删除此图形"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )
                    ))}
                </div>

                <div className="p-4 border-t border-slate-100 bg-slate-50">
                    <div className="text-xs text-slate-500 mb-4 min-h-[60px]">
                        <p className="font-semibold">图形描述:</p>
                        <p className="mt-1 leading-relaxed">{currentShape.description}</p>
                    </div>
                    
                    <button 
                        onClick={onToggleBuilderMode}
                        className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition shadow-sm text-sm font-medium flex items-center justify-center gap-2"
                    >
                        <PenTool className="w-4 h-4" /> 进入自定义拼接
                    </button>
                </div>
            </>
        )}
      </aside>
    </>
  );
};

export default Sidebar;