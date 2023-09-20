import { CSharpClass, CSharpFile, CSharpNamespace } from "@fluffy-spoon/csharp-to-typescript-generator";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
export declare const CODE_INDENT = "  ";
export declare function indentCode(code: string, levels: number): string;
/**
 *
 * @param dtoPath
 */
export declare function scanCSharpClasses(options: {
    dirPath: string;
    namespaces: string[];
    skipScan: string[];
    skipScanRe: string[];
    scanRe: string[];
    verbose: boolean;
    relDir?: string;
}): Result<CSharpClassSourceInfo[]>;
export declare function hasCsExtension(filename: string): boolean;
export declare function isClassInNamespaceExact(theClass: CSharpClass, reNamespace: string): boolean;
export declare function isClassInNamespace(theClass: CSharpClass, theNamespace: string): boolean;
export declare function isClassInNamespaceList(theClass: CSharpClass, theNamespaces: string[]): boolean;
export declare function getClassesInFile(csFilePath: string): CSharpClass[];
export declare function simplifyPath(path: string): string;
export declare function dumpObject(o: object): void;
export declare function asArray<T>(value: T | Array<T>): Array<T>;
export declare function ifUndefined<T>(value: T | undefined, otherwise: T): T;
export declare function getNamespaceParts(cs: CSharpClass | CSharpNamespace | CSharpFile): string[];
