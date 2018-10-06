import { IVector3, IVector2 } from './IVectors';
import { ICorners } from './ICorners';
import { IDrawingTool } from './IDrawingTool';

export interface IAppState {
    name: string;
    corners: ICorners | null;
    calibrationProgress: IVector3[];
    drawings: IDrawing[];
}

export interface IDrawing {
    id: string;
    drawingTool: IDrawingTool;
    frames: IFrame[];
}

export interface IFrame {
    time: number;
    positionInSpace: IVector3;
    positionOnWall: IVector3 | null;
    positionOnSquare: IVector2 | null;
}
