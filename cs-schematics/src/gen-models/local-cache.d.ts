import { CSharpClass } from "@fluffy-spoon/csharp-parser";
import { CSharpClassInfo } from "./CSharpClassInfo";
export declare class KnownClasses {
    private static idxFullnames;
    static addItem(a: CSharpClass): void;
    static lookupFullname(fullname: string): CSharpClass;
}
export declare class KnownClassInfos {
    private static idxFullnames;
    static addItem(clsInfo: CSharpClassInfo): void;
    static lookupFullname(fullname: string): CSharpClassInfo;
}
