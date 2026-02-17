export class ElementBuilder<TN extends keyof HTMLElementTagNameMap, T extends HTMLElementTagNameMap[TN]> {


    private readonly target:T;

    static start<TN extends keyof HTMLElementTagNameMap>(tagName:TN) {
        return new ElementBuilder(
            tagName
        );
    }

    private constructor(
        tagName:TN
    ) {
        this.target = document.createElement(tagName) as T;
    }

    setStyle<SN extends keyof CSSStyleDeclaration>(styleName:SN, value:CSSStyleDeclaration[SN]) {
        this.target.style[styleName] = value;
        return this;
    }

    do(action:(e:T)=>void) {
        action(this.target);
        return this;
    }

    build() {
        return this.target;
    }
}