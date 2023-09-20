import { CSharpClassInfo } from "./CSharpClassInfo";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
import { CSharpNamespace } from "@fluffy-spoon/csharp-parser";
import { CSharpClass, CSharpFile } from "@fluffy-spoon/csharp-to-typescript-generator";
export declare class NamespaceInfo {
    private _seg;
    private _level;
    private namespace;
    private parent;
    namespaces: {
        [nsSegment: string]: NamespaceInfo;
    };
    classes: {
        [className: string]: CSharpClassInfo;
    };
    private constructor();
    static create(seg: string, parent: NamespaceInfo | null, level: number): NamespaceInfo;
    static createRoot(): NamespaceInfo;
    dump(prefix?: string): string;
    static getFullNamespace(cs: CSharpClass | CSharpNamespace | CSharpFile): string;
    addClass(clsSource: CSharpClassSourceInfo): void;
    getAllClasses(): CSharpClassInfo[];
    getOrCreateNamespace(fullNamespace: string): NamespaceInfo;
}
