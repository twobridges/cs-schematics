import { Rule, Tree } from '@angular-devkit/schematics';
import "./schema";
import { Result } from '../ddd/shared-kernel/functional-programming/result.model';
import { GenModelOptions as GenModelOptions } from './schema';
export declare function genModels(options: GenModelOptions): Rule;
export declare function getOptions(host: Tree, options: GenModelOptions): Promise<Result<Tree>>;
