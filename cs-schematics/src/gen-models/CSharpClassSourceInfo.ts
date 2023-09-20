import { CSharpClass, CSharpFile, CSharpType } from "@fluffy-spoon/csharp-to-typescript-generator";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { KnownClasses } from "./local-cache";
import { NamespaceInfo } from "./NamespaceInfo";


export class CSharpClassSourceInfo {
    cls: CSharpClass;
    namespace: string;
    fileName: string;
    fileRelPath: string;
    fileFullPath: string;
    csFile: CSharpFile;
    nameWithGeneric: string;

    static Create(cls: CSharpClass, fileName: string, fileRelPath: string, fileFullPath: string) {
        let info = new CSharpClassSourceInfo();
        info.cls = cls;
        info.namespace = CSharpClassInfo.getNamespace(cls);
        info.csFile = CSharpClassInfo.getCSharpFile(cls);
        info.fileName = fileName;
        info.fileRelPath = fileRelPath;
        info.fileFullPath = fileFullPath;
        info.nameWithGeneric = this.getNameWithGeneric(cls.name, cls.genericParameters);
        return info;
    }
    static getNameWithGeneric(clsName: string, genericParameters: CSharpType[]) {
        clsName = clsName?.split('<')[0];
        return `${clsName}${genericParameters.length ? '<' + genericParameters.length + '>' : ''}`;
    }
    getTypeFullname(typ: CSharpType) {
        let typName = CSharpClassSourceInfo.getNameWithGeneric(typ.name, typ.genericParameters);
        let potentials = this.csFile.usings.map(using => `${NamespaceInfo.getFullNamespace(using.namespace)}.${typName}`);
        potentials.push(`${this.namespace}.${typName}`);
        let match = potentials.find(e => KnownClasses.lookupFullname(e));

        return match;
    }

}
