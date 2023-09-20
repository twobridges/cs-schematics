import { CSharpClass, CSharpFile, CSharpType } from "@fluffy-spoon/csharp-to-typescript-generator";
export declare class CSharpClassSourceInfo {
    cls: CSharpClass;
    namespace: string;
    fileName: string;
    fileRelPath: string;
    fileFullPath: string;
    csFile: CSharpFile;
    nameWithGeneric: string;
    static Create(cls: CSharpClass, fileName: string, fileRelPath: string, fileFullPath: string): CSharpClassSourceInfo;
    static getNameWithGeneric(clsName: string, genericParameters: CSharpType[]): string;
    getTypeFullname(typ: CSharpType): string | undefined;
}
