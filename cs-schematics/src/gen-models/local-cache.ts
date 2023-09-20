import { CSharpClass } from "@fluffy-spoon/csharp-parser";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";

// dependency injection in node: https://medium.com/@lazlojuly/are-node-js-modules-singletons-764ae97519af

export class KnownClasses {

    private static idxFullnames: { [fullName: string]: CSharpClass } = {};

    static addItem(a: CSharpClass) {
        let parts = a.fullName.split('.');
        parts[parts.length - 1] = CSharpClassSourceInfo.getNameWithGeneric(a.name, a.genericParameters);
        let fullnameWithGeneric = `${parts.join('.')}`;
        this.idxFullnames[fullnameWithGeneric] = a;
    }

    static lookupFullname(fullname: string) {
        return this.idxFullnames[fullname];
    }
}

export class KnownClassInfos {

    private static idxFullnames: { [fullName: string]: CSharpClassInfo } = {};

    static addItem(clsInfo: CSharpClassInfo) {
        this.idxFullnames[clsInfo.getFullClassName()] = clsInfo;
    }

    static lookupFullname(fullname: string) {
        return this.idxFullnames[fullname];
    }

}
