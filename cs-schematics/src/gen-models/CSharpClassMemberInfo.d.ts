import { CSharpField, CSharpProperty, CSharpType } from "@fluffy-spoon/csharp-to-typescript-generator";
import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo, TargetType } from "./CSharpClassInfo";
export declare type GenericMap = {
    [name: string]: string;
};
export declare type fnConverter = (member: CSharpField | CSharpProperty, genericMap?: GenericMap) => Result<string>;
export declare let fnConvertPrimitive: fnConverter;
export declare let fnConvertPrimitiveTypeName: (typName: string, genericMap?: GenericMap | undefined) => Result<string>;
export declare var primitiveTypeLookup: {
    [csType: string]: string;
};
export declare var collectionTypeLookup: {
    [csType: string]: boolean;
};
export declare var typeConversion: {
    [csType: string]: fnConverter;
};
export declare var initialiserConversion: {
    [csType: string]: fnConverter;
};
export declare class CSharpClassMemberInfo {
    name: string;
    type: CSharpType;
    member: CSharpField | CSharpProperty;
    genericMap: {
        [name: string]: string;
    };
    getMemberName(): string;
    genMemberType(clsInfo: CSharpClassInfo, target: TargetType): Result<string>;
    isCollection(): boolean;
    isCollectionOfPrimitives(): boolean;
    genMemberInitialiser(): Result<string>;
    genToRawHydrater(): string;
    genFromRawHydrater(): string;
    genTsInterfaceFieldCode(clsInfo: CSharpClassInfo): string;
    genTypescriptLookupField(): string;
    genCode(clsInfo: CSharpClassInfo, target: TargetType): string;
    private excludeField;
    private genTsClassFieldCode;
    private constructor();
    static create(prop: CSharpProperty | CSharpField, genericMap: {
        [name: string]: string;
    }): CSharpClassMemberInfo | undefined;
    private static createFromProp;
    private static createFromField;
}
