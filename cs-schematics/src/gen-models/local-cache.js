"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KnownClassInfos = exports.KnownClasses = void 0;
const CSharpClassSourceInfo_1 = require("./CSharpClassSourceInfo");
// dependency injection in node: https://medium.com/@lazlojuly/are-node-js-modules-singletons-764ae97519af
class KnownClasses {
    static addItem(a) {
        let parts = a.fullName.split('.');
        parts[parts.length - 1] = CSharpClassSourceInfo_1.CSharpClassSourceInfo.getNameWithGeneric(a.name, a.genericParameters);
        let fullnameWithGeneric = `${parts.join('.')}`;
        this.idxFullnames[fullnameWithGeneric] = a;
    }
    static lookupFullname(fullname) {
        return this.idxFullnames[fullname];
    }
}
exports.KnownClasses = KnownClasses;
KnownClasses.idxFullnames = {};
class KnownClassInfos {
    static addItem(clsInfo) {
        this.idxFullnames[clsInfo.getFullClassName()] = clsInfo;
    }
    static lookupFullname(fullname) {
        return this.idxFullnames[fullname];
    }
}
exports.KnownClassInfos = KnownClassInfos;
KnownClassInfos.idxFullnames = {};
//# sourceMappingURL=local-cache.js.map