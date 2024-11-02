"use client";
import React from 'react';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Square, Type, Pencil, MousePointer, Move, Eraser, Hand, Trash2, Image, Lock, ChevronDown } from 'lucide-react';
interface Tool {
    id: string;
    toolId: number;  // Changed to number to match the existing toolId values
    icon?: JSX.Element;
}



interface DrawingElement {
    points: [number, number][]; // Ensure points are defined as an array of coordinates
    id: number;  // Changed to number to match toolId
    color: string;
    stroke: number;
    opacity: number;
    isFilled: boolean;
    selected?: boolean; // Optional, since not all elements need to be selected
}
const App: React.FC = () => {
    const [elements, setElements] = useState<DrawingElement[]>([]); // Use specific type for elements
    const [isDrawing, setIsDrawing] = useState<boolean>(false);
    const [currentTool, setCurrentTool] = useState<number>(5); // Set initial toolId as a number
    const [panning, setPanning] = useState<boolean>(false);
    const [panOffset, setPanOffset] = useState<[number, number, number, number, number, number]>([0, 0, 0, 0, 0, 0]);
    const [strokeWidth, setStrokeWidth] = useState<number>(5);
    const [opacity, setOpacity] = useState<number>(100);
    const [isFilled] = useState<boolean>(false);
    const [selectedElement, setSelectedElement] = useState<[number, number, number] | null>(null);
    const [currentColor, setCurrentColor] = useState<string>("#000000");
    const [isLocked, setIsLocked] = useState<boolean>(false);
    const [zoomLevel, setZoomLevel] = useState<number>(1);
    const [scaledOffset, setScaledOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
    //const [showColorPicker, setShowColorPicker] = useState<boolean>(false);
    const [windowDimension, setWindowDimension] = useState({ width: 0, height: 0 });

    const tools: Tool[] = [
        { id: 'select', icon: <MousePointer size={20} />, toolId: 5 },
        { id: 'hand', icon: <Hand size={20} />, toolId: 8 },
        { id: 'draw', icon: <Pencil size={20} />, toolId: 1 },
        { id: 'shapes', icon: <Square size={20} />, toolId: 3 },
        { id: 'text', icon: <Type size={20} />, toolId: 6 },
        { id: 'image', icon: <Image size={20} /* eslint-disable-line jsx-a11y/alt-text */ />, toolId: 7 },
        { id: 'eraser', icon: <Eraser size={20} />, toolId: 7 }
    ];

    const colors = [
        "#000000",
        "#FF0000",
        "#00FF00",
        "#0000FF",
        "#FFA500",
        "#800080",
        "#FFC0CB",
        "#A52A2A"
    ];

    useEffect(() => {
        if (typeof window !== 'undefined') {
            setWindowDimension({ width: window.innerWidth, height: window.innerHeight });
        }
    }, []);

    // Keep all the existing utility functions (isPointOnLine, findElementAt, etc.)
    // ... (previous implementation remains the same)

    const handleToolChange = (toolId: string): void => {
        if (isLocked) return;
        const tool = tools.find(t => t.id === toolId);
        if (tool) {
            setCurrentTool(tool.toolId);
        }
    };

    const handleClearCanvas = (): void => {
        if (isLocked) return;
        if (window.confirm('Are you sure you want to clear the canvas?')) {
            setElements([]);
        }
    };

    const handleOpacityChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (isLocked) return;
        const newOpacity = parseInt(e.target.value);
        setOpacity(newOpacity);
        if (selectedElement) {
            setElements(prev => {
                const updated = [...prev];
                updated[selectedElement[2]].opacity = newOpacity / 100;
                return updated;
            });
        }
    };

    const handleStrokeWidthChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (isLocked) return;
        const newWidth = parseInt(e.target.value);
        setStrokeWidth(newWidth);
        if (selectedElement) {
            setElements(prev => {
                const updated = [...prev];
                updated[selectedElement[2]].stroke = newWidth;
                return updated;
            });
        }
    };

    const handleColorChange = (color: string): void => {
        if (isLocked) return;
        setCurrentColor(color);
        if (selectedElement) {
            setElements(prev => {
                const updated = [...prev];
                updated[selectedElement[2]].color = color;
                return updated;
            });
        }
    };

    const handleZoom = (delta: number): void => {
        if (isLocked) return;
        setZoomLevel(prev => Math.min(Math.max(0.5, prev + delta * 0.1), 3));
    };

    useEffect(() => {
        const handleWheel = (e: WheelEvent): void => {
            if (e.ctrlKey) {
                e.preventDefault();
                handleZoom(e.deltaY > 0 ? -1 : 1);
            }
        };

        document.addEventListener('wheel', handleWheel, { passive: false });
        return () => document.removeEventListener('wheel', handleWheel);
    });

    const getMousePosition = (e: React.MouseEvent<HTMLCanvasElement>): [number, number] => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;

        return [
            ((e.clientX - rect.left) * scaleX) / zoomLevel + scaledOffset.x,
            ((e.clientY - rect.top) * scaleY) / zoomLevel + scaledOffset.y
        ];
    };

    const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (isLocked) return;

        const [mouseX, mouseY] = getMousePosition(e);
        setIsDrawing(true);

        if (currentTool === 7) { // Eraser
            // setEraserMode(true);
            return;
        } else if (currentTool === 8) { // Hand tool (panning)
            setPanning(true);
            setPanOffset(prev => [mouseX, mouseY, prev[2], prev[3], prev[4], prev[5]]);
            return;
        }

        // Handle selection tool
        if (currentTool === 5 && !selectedElement) {
            // findElementAt(mouseX, mouseY);
            return;
        }

        // Clear selection if clicking elsewhere
        if (selectedElement) {
            setElements(prev => {
                const updated = [...prev];
                if (updated.length > 0) {
                    updated[selectedElement[2]].selected = false;
                }
                return updated;
            });
            setSelectedElement(null);
        }

        // Start new element
        setElements(prev => {
            const updated = [...prev];
            let newElement: DrawingElement;
            if (updated.length === 0 || Object.keys(updated[updated.length - 1]).length !== 0) {
                newElement = {
                    points: [],
                    id: currentTool,
                    color: currentColor,
                    stroke: strokeWidth,
                    opacity: opacity / 100,
                    isFilled: isFilled
                };
                updated.push(newElement);
            } else {
                newElement = updated[updated.length - 1];
            }

            newElement.points.push([mouseX, mouseY]);

            // Initialize shape elements with two points
            if ([3, 4].includes(currentTool)) {
                newElement.points.push([mouseX, mouseY]);
            }

            return updated;
        });
    };


    // Handle mouse move event
    const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>): void => {
        if (!isDrawing && !panning) return;

        const [mouseX, mouseY] = getMousePosition(e);

        if (panning) {
            setPanOffset(prev => [
                mouseX,
                mouseY,
                prev[2] + (mouseX - prev[0]) / zoomLevel,
                prev[3] + (mouseY - prev[1]) / zoomLevel,
                prev[4],
                prev[5]
            ]);
            return;
        }

        if (selectedElement) {
            // Handle moving selected element
            const [offsetX, offsetY, index] = selectedElement;
            setElements(prev => {
                const updated = [...prev];
                const element = updated[index];

                if (element.points) {
                    element.points = element.points.map(point => [
                        point[0] + (mouseX - offsetX),
                        point[1] + (mouseY - offsetY)
                    ]);
                }

                return updated;
            });
            setSelectedElement([mouseX, mouseY, index]);
            return;
        }

        setElements(prev => {
            const updated = [...prev];
            const currentElement = updated[updated.length - 1];

            switch (currentTool) {
                case 1: // Freehand drawing
                case 2: // Line
                    currentElement.points.push([mouseX, mouseY]);
                    break;
                case 3: // Rectangle
                case 4: // Circle
                    currentElement.points[1] = [mouseX, mouseY];
                    break;
                default:
                    break;
            }

            return updated;
        });
    };

    // Handle mouse up event
    const handleMouseUp = (): void => {
        if (isDrawing || panning) {
            setIsDrawing(false);
            setPanning(false);
            //setEraserMode(false);

            // Cleanup empty elements
            setElements(prev => prev.filter(element =>
                Object.keys(element).length > 0 && element.points?.length > 0
            ));
        }
    };

    // Handle mouse leave
    const handleMouseLeave = () => {
        if (isDrawing || panning) {
            handleMouseUp();
        }
    };

    // Update canvas when elements change
    useLayoutEffect(() => {
        const canvas = document.getElementById('canvas') as HTMLCanvasElement;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);

        // Apply zoom and pan
        const scaledWidth = canvas.width * zoomLevel;
        const scaledHeight = canvas.height * zoomLevel;
        const scaledOffsetX = (scaledWidth - canvas.width) / 2;
        const scaledOffsetY = (scaledHeight - canvas.height) / 2;

        setScaledOffset({ x: scaledOffsetX, y: scaledOffsetY });

        ctx.translate(-scaledOffsetX + panOffset[2] * zoomLevel, -scaledOffsetY + panOffset[3] * zoomLevel);
        ctx.scale(zoomLevel, zoomLevel);

        // Draw elements
        elements.forEach(element => {
            if (!element.points?.length) return;

            ctx.save();
            ctx.globalAlpha = element.opacity || 1;
            ctx.setLineDash(element.selected ? [5, 5] : []);
            ctx.fillStyle = element.isFilled ? element.color : 'transparent';
            ctx.strokeStyle = element.color;
            ctx.lineWidth = element.stroke;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            ctx.beginPath();

            switch (element.id) {
                case 1: // Freehand
                    for (const [index, point] of element.points.entries()) {
                        if (index === 0) {
                            ctx.moveTo(...point); // Move to the first point
                        } else {
                            ctx.lineTo(...point); // Draw lines to subsequent points
                        }
                    }
                    break;

                case 2: // Line
                    ctx.moveTo(...element.points[0]);
                    ctx.lineTo(...element.points[element.points.length - 1]);
                    break;

                case 3: // Rectangle
                    const [x1, y1] = element.points[0];
                    const [x2, y2] = element.points[1];
                    ctx.rect(x1, y1, x2 - x1, y2 - y1);
                    break;

                case 4: // Circle
                    const [cx, cy] = element.points[0];
                    const [ex, ey] = element.points[1];
                    const radius = Math.hypot(ex - cx, ey - cy);
                    ctx.arc(cx, cy, radius, 0, 2 * Math.PI);
                    break;
            }

            if (element.isFilled) {
                ctx.fill();
            }
            ctx.stroke();
            ctx.restore();
        });
    }, [elements, panOffset, zoomLevel]);

    return (
        <div className="relative h-screen w-full bg-neutral-50">
            {/* Main Canvas */}
            <canvas
                id="canvas"
                className={`absolute inset-0 ${isLocked ? 'cursor-not-allowed' : 'cursor-crosshair'}`}
                width={windowDimension.width}
                height={windowDimension.height}
                onMouseDown={!isLocked ? handleMouseDown : undefined}
                onMouseMove={!isLocked ? handleMouseMove : undefined}
                onMouseUp={!isLocked ? handleMouseUp : undefined}
                onMouseLeave={!isLocked ? handleMouseLeave : undefined}
            />

            {/* Top Toolbar */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white rounded-lg shadow-md p-2">
                <button
                    className={`p-2 hover:bg-neutral-100 rounded ${isLocked ? 'text-red-500' : ''}`}
                    onClick={() => setIsLocked(!isLocked)}
                >
                    <Lock size={20} />
                </button>
                <div className="h-6 w-px bg-neutral-200" />
                {tools.map(tool => (
                    <button
                        key={tool.id}
                        className={`p-2 rounded transition-colors ${currentTool === tool.toolId ? 'bg-blue-100 text-blue-600' : 'hover:bg-neutral-100'
                            } ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={() => handleToolChange(tool.id)}
                        disabled={isLocked}
                    >
                        {tool.icon}
                    </button>
                ))}
                <div className="h-6 w-px bg-neutral-200" />
                <button
                    className={`p-2 hover:bg-neutral-100 rounded text-red-500 ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={handleClearCanvas}
                    disabled={isLocked}
                >
                    <Trash2 size={20} />
                </button>
            </div>

            {/* Left Sidebar */}
            <div className="absolute left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 bg-white rounded-lg shadow-md p-2">
                <div className="flex flex-col gap-1">
                    <button
                        className="p-2 hover:bg-neutral-100 rounded"
                        onClick={() => handleZoom(1)}
                        disabled={isLocked}
                    >
                        <ChevronDown size={20} className="rotate-180" />
                    </button>
                    <div className="text-center text-sm">{Math.round(zoomLevel * 100)}%</div>
                    <button
                        className="p-2 hover:bg-neutral-100 rounded"
                        onClick={() => handleZoom(-1)}
                        disabled={isLocked}
                    >
                        <ChevronDown size={20} />
                    </button>
                    <div className="h-px w-full bg-neutral-200" />
                </div>
                <button
                    className={`p-2 hover:bg-neutral-100 rounded ${panning ? 'bg-blue-100 text-blue-600' : ''}`}
                    onClick={() => setPanning(!panning)}
                    disabled={isLocked}
                >
                    <Move size={20} />
                </button>
            </div>

            {/* Right Sidebar - Properties */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-md p-4 w-64">
                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-neutral-700">Stroke</label>
                        <input
                            type="range"
                            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                            min="1"
                            max="20"
                            value={strokeWidth}
                            onChange={handleStrokeWidthChange}
                            disabled={isLocked}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-neutral-700">Opacity</label>
                        <input
                            type="range"
                            className="w-full h-2 bg-neutral-200 rounded-lg appearance-none cursor-pointer"
                            min="0"
                            max="100"
                            value={opacity}
                            onChange={handleOpacityChange}
                            disabled={isLocked}
                        />
                    </div>
                    <div>
                        <label className="text-sm font-medium text-neutral-700">Color</label>
                        <div className="flex flex-wrap gap-2 mt-2">
                            {colors.map(color => (
                                <button
                                    key={color}
                                    className={`w-6 h-6 rounded-full border ${currentColor === color ? 'border-blue-500 ring-2 ring-blue-200' : 'border-neutral-300'
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => handleColorChange(color)}
                                    disabled={isLocked}
                                />
                            ))}
                            <button
                                className="w-6 h-6 rounded-full border border-neutral-300 bg-white text-center text-xs leading-6"
                                // onClick={() => setShowColorPicker(true)}
                                disabled={isLocked}
                            >
                                +
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;