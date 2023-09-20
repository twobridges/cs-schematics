import { Result } from "../ddd/shared-kernel/functional-programming/result.model";
import { CSharpClassInfo } from "./CSharpClassInfo";
import { GenModelOptions } from "./schema";
import { CODE_INDENT, getNamespaceParts } from "./model-utils";
import { TsOutputFile } from "./TsOutputFile";
import { CSharpClassSourceInfo } from "./CSharpClassSourceInfo";
import { CSharpNamespace } from "@fluffy-spoon/csharp-parser";
import { CSharpClass, CSharpFile } from "@fluffy-spoon/csharp-to-typescript-generator";


export class NamespaceInfo {
    private _seg: string;
    private _level: number;
    private namespace: string;
    private parent: NamespaceInfo | null;
    namespaces: { [nsSegment: string]: NamespaceInfo; } = {};
    classes: { [className: string]: CSharpClassInfo; } = {};

    private constructor() { }

    static create(seg: string, parent: NamespaceInfo | null, level: number) {
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
        let lines = [] as string[];
        lines.push(`${prefix}* Namespace: ${this._seg} [${this.namespace}]`);

        lines.push(`${prefix}${CODE_INDENT}* Classes:`);
        Object.values(this.classes).forEach(c => {
            lines.push(`${prefix}${CODE_INDENT}${CODE_INDENT}* ${c.classes[0].cls.fullName}`);
        });
        Object.values(this.namespaces).forEach(ns => {
            lines.push(ns.dump(`${prefix}${CODE_INDENT}`));
        });
        return lines.join('\n');
    }

    static getFullNamespace(cs: CSharpClass | CSharpNamespace | CSharpFile): string {
        let parts = getNamespaceParts(cs);
        return parts.join('.');
    }

    addClass(clsSource: CSharpClassSourceInfo) {

        if (this.classes[clsSource.nameWithGeneric]) {
            this.classes[clsSource.nameWithGeneric].addPartial(clsSource);
        } else {
            this.classes[clsSource.nameWithGeneric] = CSharpClassInfo.Create(clsSource, this);
        }
    }

    getAllClasses(): CSharpClassInfo[] {
        let list: CSharpClassInfo[] = [
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

    getOrCreateNamespace(fullNamespace: string): NamespaceInfo {
        const nsSegments = `${fullNamespace ?? ''}`.split('.');
        const seg = nsSegments.shift();

        if (seg) {
            if (!this.namespaces[seg]) {
                this.namespaces[seg] = NamespaceInfo.create(seg, this, 1 + this._level);
            }

            let ns: NamespaceInfo;
            if (nsSegments.length) {
                ns = this.namespaces[seg];
                ns = ns.getOrCreateNamespace(nsSegments.join('.'));
            } else {
                ns = this.namespaces[seg];
            }

            return ns;
        }

        return this;
    }

}
