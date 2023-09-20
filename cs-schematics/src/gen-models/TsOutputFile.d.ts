import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { NamespaceInfo } from "./NamespaceInfo";
import { GenModelOptions } from "./schema";
export declare class TsOutputFile {
    filename: string;
    classInfoList: CSharpClassInfo[];
    static create(filename: string): TsOutputFile;
    addClassInfo(clsInfo: CSharpClassInfo): void;
    genContent(options: GenModelOptions): string;
    dump(): string;
}
export declare function createTsFileContainers(nsRoot: NamespaceInfo, options: GenModelOptions): Result<TsOutputFile[]>;
