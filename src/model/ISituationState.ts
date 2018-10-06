import { IController } from './IController';
import World from '../3d/World/World';

export interface ISituationState {
    controllers: IController[];
    world: World | null;
}
