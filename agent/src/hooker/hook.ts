
enum HookState {
    HK_ATTACHED,
    HK_REPLACED,
    HK_DISABLE,
}

declare global {
    interface NativePointer {
        toInt(): number;
    }
}

NativePointer.prototype.toInt = function (): number {
    return parseInt(this.toString(16), 16);
}

export { };


export class Hook {
    private _hookTargetName: string | null = null;
    private _hookTargetAddr: number | null = null;
    private _hookTargetModuleName: string | null = null;
    private _hookStatus: HookState = HookState.HK_DISABLE;

    private _hookTargetFuncRetType: NativeType | null = null;
    private _hookTargetFuncParamterTyep: NativeType[] | null = null;
    private _invocationListener: InvocationListener | null = null; 

    constructor(
        moduleName: string | null = null,
        name: string | null = null,
        addr: number | null = null
    ) {
        this._hookTargetModuleName = moduleName;

        if (!name && !addr) throw new Error("The name or address that must be set!")

        this._hookTargetName = typeof name === 'string' ? name : 'sub_' + addr?.toString(16);
        try {
            this._hookTargetAddr = typeof addr === 'number' ? addr : Module.findExportByName(moduleName, name!)?.toInt()!;
        } catch (error) {
            throw new Error("Not found target func => " + name);
        }
    }

    set hookName(name: string) { this._hookTargetName = name; }
    get hookName() { return this._hookTargetName!; }

    set hookAddr(addr: number) { this._hookTargetAddr = addr; }
    get hookAddr() { return this._hookTargetAddr!; }

    set hookModuleName(moduleName: string) { this._hookTargetModuleName = moduleName; }
    get hookModuleName() { return this._hookTargetModuleName?this._hookTargetModuleName:"Null" ; }

    set targetFuncRetType(retType: NativeType) { this._hookTargetFuncRetType = retType; }
    set targetFuncParameterType(parameterType: NativeType[]) { this._hookTargetFuncParamterTyep = parameterType; }

    get hookStatus() { return this._hookStatus; }

    public hook(callBacks: InvocationListenerCallbacks) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                this._invocationListener = Interceptor.attach(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_ATTACHED;
                console.log(this._hookTargetName + ' is hooked!');
                return;
            }
        } else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public invoke(...args: NativeArgumentValue[]) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.getExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                if (this._hookTargetFuncRetType === null) {
                    console.error('funcation ret type must be set!');
                    return;
                }
                if (this._hookTargetFuncRetType !== null &&
                    this._hookTargetFuncParamterTyep !== null
                ) {
                    let nativeFunc = new NativeFunction(nativeFuncAddr, this._hookTargetFuncRetType, this._hookTargetFuncParamterTyep);
                    if (nativeFunc.isNull()) { console.log('NativeFunc is null!'); }
                    console.log("calling " + this._hookTargetName);
                    return nativeFunc(...args);
                }
            }
        }
    }

    public replace(callBacks: NativeCallback) {
        if (this._hookTargetName !== null) {
            let nativeFuncAddr = Module.findExportByName(this._hookTargetModuleName, this._hookTargetName);
            if (nativeFuncAddr === null) {
                if (this._hookTargetModuleName !== null) {
                    console.warn("Not found target func => " + this._hookTargetName + " in " + this._hookTargetModuleName);
                    return;
                } else {
                    console.warn("Not found target func => " + this._hookTargetName);
                    return;
                }
            } else {
                Interceptor.replace(nativeFuncAddr, callBacks);
                this._hookStatus = HookState.HK_REPLACED;
                console.log(this._hookTargetName + ' is replaced!');
                return;
            }
        } else {
            console.warn("hookTargetName must be set!");
            return;
        }
    }

    public detach() {
        if(this._invocationListener){ 
            this._invocationListener.detach() 
            this._hookStatus = HookState.HK_DISABLE;
        }
    }

}

