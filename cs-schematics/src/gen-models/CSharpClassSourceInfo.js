"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CSharpClassSourceInfo = void 0;
const CSharpClassInfo_1 = require("./CSharpClassInfo");
const local_cache_1 = require("./local-cache");
const NamespaceInfo_1 = require("./NamespaceInfo");
class CSharpClassSourceInfo {
    static Create(cls, fileName, fileRelPath, fileFullPath) {
        let info = new CSharpClassSourceInfo();
        info.cls = cls;
        info.namespace = CSharpClassInfo_1.CSharpClassInfo.getNamespace(cls);
        info.csFile = CSharpClassInfo_1.CSharpClassInfo.getCSharpFile(cls);
        info.fileName = fileName;
        info.fileRelPath = fileRelPath;
        info.fileFullPath = fileFullPath;
        info.nameWithGeneric = this.getNameWithGeneric(cls.name, cls.genericParameters);
        return info;
    }
    static getNameWithGeneric(clsName, genericParameters) {
        clsName = clsName === null || clsName === void 0 ? void 0 : clsName.split('<')[0];
        return `${clsName}${genericParameters.length ? '<' + genericParameters.length + '>' : ''}`;
    }
    getTypeFullname(typ) {
        let typName = CSharpClassSourceInfo.getNameWithGeneric(typ.name, typ.genericParameters);
        let potentials = this.csFile.usings.map(using => `${NamespaceInfo_1.NamespaceInfo.getFullNamespace(using.namespace)}.${typName}`);
        potentials.push(`${this.namespace}.${typName}`);
        let match = potentials.find(e => local_cache_1.KnownClasses.lookupFullname(e));
        return match;
    }
}
exports.CSharpClassSourceInfo = CSharpClassSourceInfo;
//# sourceMappingURL=CSharpClassSourceInfo.js.map