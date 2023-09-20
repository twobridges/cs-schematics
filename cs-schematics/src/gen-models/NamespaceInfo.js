"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NamespaceInfo = void 0;
const CSharpClassInfo_1 = require("./CSharpClassInfo");
const model_utils_1 = require("./model-utils");
class NamespaceInfo {
    constructor() {
        this.namespaces = {};
        this.classes = {};
    }
    static create(seg, parent, level) {
        let nsi = new NamespaceInfo();
        nsi._seg = seg;
        nsi._level = level;
        nsi.parent = parent;
        if (parent) {
            nsi.namespace = `${seg}${parent.namespace ? '.' : parent.namespace}${parent.namespace}`;
        }
        return nsi;
    }
    static createRoot() {
        let nsi = NamespaceInfo.create("~", null, 0);
        nsi.namespace = ``;
        return nsi;
    }
    dump(prefix = '') {
        let lines = [];
        lines.push(`${prefix}* Namespace: ${this._seg} [${this.namespace}]`);
        lines.push(`${prefix}${model_utils_1.CODE_INDENT}* Classes:`);
        Object.values(this.classes).forEach(c => {
            lines.push(`${prefix}${model_utils_1.CODE_INDENT}${model_utils_1.CODE_INDENT}* ${c.classes[0].cls.fullName}`);
        });
        Object.values(this.namespaces).forEach(ns => {
            lines.push(ns.dump(`${prefix}${model_utils_1.CODE_INDENT}`));
        });
        return lines.join('\n');
    }
    static getFullNamespace(cs) {
        let parts = model_utils_1.getNamespaceParts(cs);
        return parts.join('.');
    }
    addClass(clsSource) {
        if (this.classes[clsSource.nameWithGeneric]) {
            this.classes[clsSource.nameWithGeneric].addPartial(clsSource);
        }
        else {
            this.classes[clsSource.nameWithGeneric] = CSharpClassInfo_1.CSharpClassInfo.Create(clsSource, this);
        }
    }
    getAllClasses() {
        let list = [
            ...Object.values(this.classes),
            ...Object.values(this.namespaces).reduce((memo, next) => {
                return [
                    ...memo,
                    ...next.getAllClasses(),
                ];
            }, [])
        ];
        return list;
    }
    getOrCreateNamespace(fullNamespace) {
        const nsSegments = `${fullNamespace !== null && fullNamespace !== void 0 ? fullNamespace : ''}`.split('.');
        const seg = nsSegments.shift();
        if (seg) {
            if (!this.namespaces[seg]) {
                this.namespaces[seg] = NamespaceInfo.create(seg, this, 1 + this._level);
            }
            let ns;
            if (nsSegments.length) {
                ns = this.namespaces[seg];
                ns = ns.getOrCreateNamespace(nsSegments.join('.'));
            }
            else {
                ns = this.namespaces[seg];
            }
            return ns;
        }
        return this;
    }
}
exports.NamespaceInfo = NamespaceInfo;
//# sourceMappingURL=NamespaceInfo.js.map