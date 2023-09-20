import { CSharpFile, CSharpType, CSharpClass, CSharpNamespace, CSharpProperty } from '@fluffy-spoon/csharp-to-typescript-generator';
import * as _ from "underscore";
import "./schema";
export declare class GeneratedTypeName {
    csharpClassName: string;
    classifiedName: string;
    classifiedInterfaceName: string;
    modelFilename: string;
    dashedName: string;
    constructor(csharpClassName: string, suffix: string);
    get fileNoExt(): string;
}
export declare class GeneratedModel {
    filePath: string;
    type: GeneratedTypeName;
    code: string;
    cSharpClass: CSharpClass;
    cSharpClassName: string;
    rawInterfaceCode: string;
    private _interfaceCode;
    cSharpFile: CSharpFile;
    props: GenModelPropInfo[];
    constructor(filePath: string);
    private extractClassInfo;
    /**
     * Prepend typescript import statement for each referenced Class
     * @param _file
     */
    getClassFunctions(_file: CSharpFile): string;
    private getFnFromRaw;
    private getFnFromRawProps;
    private getFnToRawProp;
    private getFnToRaw;
    getTypeInfo(_prop: CSharpProperty): void;
    genModelCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean): string;
    genInterfaceCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean): string;
    genClassCode(idxClassesByFilePath: _.Dictionary<GeneratedModel>, allowNullable: boolean): string;
    genFieldNames(): string;
    enhancePropertyInfo(idxClassesByFilePath: _.Dictionary<GeneratedModel>): void;
    /**
     * Prepend typescript import statement for each referenced Class
     * @param _file
     */
    getImports(): string[];
    getImportsForNamespaces(namespaces: CSharpNamespace[]): string[];
    getImportsForClasses(classes: CSharpClass[]): string[];
    getImportsForClassProps(props: CSharpProperty[]): string[];
    getImportsForTypes(types: CSharpType[]): string[];
}
export interface GenModelPropInfo {
    tsName: string;
    tsTypeRaw: string;
    tsInterfaceType: string;
    tsClassType: string;
    isList: boolean;
    isNullable: boolean;
    isTimestamp: boolean;
    model?: GeneratedModel;
    modelInclude: string;
}
export declare function getClass(parent: CSharpFile | CSharpNamespace): CSharpClass | null;
export declare function getCsString(filePath: string): string;
