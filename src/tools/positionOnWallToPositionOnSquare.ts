import { ICorners } from '../model/ICorners';
import { IVector2, IVector3 } from '../model/IVectors';
import { cleanVectorToBabylon } from './vectors';

export function positionOnWallToPositionOnSquare(
    positionOnWall: IVector3,
    corners: ICorners,
): IVector2 | null {
    const middle = cleanVectorToBabylon(positionOnWall).subtractInPlace(
        cleanVectorToBabylon(corners.topLeft),
    );

    const left = cleanVectorToBabylon(corners.topRight).subtractInPlace(
        cleanVectorToBabylon(corners.topLeft),
    ); //todo optimize
    const down = cleanVectorToBabylon(corners.bottomLeft).subtractInPlace(
        cleanVectorToBabylon(corners.topLeft),
    ); //todo optimize

    const x =
        BABYLON.Vector3.Dot(middle, left) / BABYLON.Vector3.Dot(left, left); //todo optimize
    const y =
        BABYLON.Vector3.Dot(middle, down) / BABYLON.Vector3.Dot(down, down); //todo optimize

    return { x, y };
}
