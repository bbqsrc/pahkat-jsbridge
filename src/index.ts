(window as any).pahkatResponders = {}

const platform = (function() {
  const w = window as any

  try {
    if (typeof w.external.notify !== "function") {
      return "windows"
    }
  } catch (e) {}
  
  try {
    if (w.webkit.messageHandlers.pahkat != null) {
      return "macos"
    }
  } catch (e) {}
})()

interface IPahkatBridgeRpc {
  install(keys: PackageKey[]): Promise<null>;
  uninstall(keys: PackageKey[]): Promise<null>;
  searchByLanguage(query: string): Promise<LanguageResponse>;
  packages(keys: PackageKey[]): Promise<Package[]>;
  string(key: string, ...args: any): Promise<string>;
}

type LanguageResponse = { [bcp47Key: string]: LanguageResponseValue }

type LanguageResponseValue = {
  languageName: string;
  packages: { [packageKey: string]: PackageResponse }
}

type PackageResponse = {
  package: Package;
  status: PackageStatus;
  target: PackageTarget;
}

type PackageKey = string;

type Package = {

}

enum PackageStatus {
  NotInstalled = 0,
  UpToDate = 1,
  RequiresUpdate = 2,
  VersionSkipped = 3,
  ErrorNoPackage = -1,
  ErrorNoInstaller = -2,
  ErrorWrongInstallerType = -3,
  ErrorInvalidVersion = -4,
  ErrorInvalidInstallPath = -5,
  ErrorInvalidMetadata = -6
}

enum PackageTarget {
  System = "system",
  User = "user"
}

class Rpc implements IPahkatBridgeRpc {
  install(keys: string[]): Promise<null> {
    return Rpc.invoke("install", keys)
  }

  uninstall(keys: string[]): Promise<null> {
    return Rpc.invoke("uninstall", keys)
  }

  searchByLanguage(query: string): Promise<LanguageResponse> {
    return Rpc.invoke("searchByLanguage", [query])
  }

  packages(keys: string[]): Promise<Package[]> {
    return Rpc.invoke("packages", keys)
  }

  string(key: string, ...args: any): Promise<string> {
    return Rpc.invoke("string", [key, ...args])
  }

  static ids: number = 0

  private static postMessageWindows(message: any) {
    const payload = JSON.stringify(message, null, 0);
    (window as any).external.notify(payload)
    // location.href = encodeURI(`about:pahkat:${payload}`)
  }

  private static postMessageMacOS(message: any) {
    const channel = (window as any).webkit.messageHandlers.pahkat
    const payload = JSON.stringify(message, null, 0)
    channel.postMessage(payload)
  }

  private static postMessage(message: any) {
    // console.log(message)
    if (platform === "windows") {
      this.postMessageWindows(message)
    } else if (platform === "macos") {
      this.postMessageMacOS(message)
    }
  }

  private static invoke(method: string, args: any[] = []): Promise<any> {
    const id = Rpc.ids++
    const global = window as any

    // Leak the resolvers for the promise so our callback can have them
    let resolve: (arg: any) => any
    let reject: (arg: any) => any
    const deferred = new Promise((a, b) => {
      resolve = a
      reject = b
    })

    const callback = (message: string) => {
      try {
        const obj = JSON.parse(message)
        if (obj.error) {
          reject(obj)
        } else {
          resolve(obj)
        }
      } catch (e) {
        reject(e)
      } finally {
        global.pahkatResponders[`callback-${id}`] = null
        delete global.pahkatResponders[`callback-${id}`]
      }
    }

    global.pahkatResponders[`callback-${id}`] = callback
    this.postMessage({ id, method, args })

    return deferred
  }
  
  constructor() {
    const p = platform

    // if (p !== "windows" && p !== "macos") {
    //   throw new Error("Unsupported Pahkat platform: " + platform)
    // }
  }
}

export const rpc = new Rpc;


// class WindowsChannelHandler {
//   static ids: number = 0

//   constructor() {
//     const global = window as WindowsPahkatWindow

//     if (global.pahkatResponders == null) {
//       global.pahkatResponders = {}
//     }
//   }

//   private unsubscribe(id: number) {
//     this.postMessage({ id, method: "_unsubscribe" })
//   }


// }

// class CallbackHandler {
//   static ids: number = 0

//   private channel: {
//     postMessage: (message: any) => void
//   }

//   constructor() {
//     const global = window as MacOsPahkatWindow

//     if (global.pahkatResponders == null) {
//       global.pahkatResponders = {}
//     }

//     this.channel = global.webkit.messageHandlers.pahkat
//   }

//   private unsubscribe(id: number) {
//     this.channel.postMessage({ method: "_unsubscribe", id })
//   }

//   invoke(method: string, args?: any[]): Observable<string> {
//     const id = ChannelHandler.ids++

//     return Observable.create((observer: Observer<string>) => {
//       const global = window as MacOsPahkatWindow

//       // Create callback for Swift side
//       global.pahkatResponders[`callback-${id}`] = (message) => {
//         observer.next(message)
//       }

//       // Invoke the subscription
//       this.channel.postMessage(JSON.stringify({ method, args, id }, null, 0))

//       // Create unsubscriber that will cancel connection and remove callback
//       return () => {
//         this.unsubscribe(id)
//         delete global.pahkatResponders[`callback-${id}`]
//       }
//     })
//   }
// }

// enum PackageActionType {
//   INSTALL = "install",
//   UNINSTALL = "uninstall"
// }

// class Transaction<Target> {

// }

// class TransactionAction<Target> {
//   readonly id: AbsolutePackageKey
//   readonly action: PackageActionType
//   readonly target: Target

//   private constructor(id: AbsolutePackageKey, action: PackageActionType, target: Target) {
//     this.id = id
//     this.action = action
//     this.target = target
//   }

//   static install<Target>(id: AbsolutePackageKey, target: Target): TransactionAction<Target> {
//     return new TransactionAction(id, PackageActionType.INSTALL, target)
//   }

//   static uninstall<Target>(id: AbsolutePackageKey, target: Target): TransactionAction<Target> {
//     return new TransactionAction(id, PackageActionType.INSTALL, target)
//   }
// }


// enum InstallTarget {
//   SYSTEM = "system",
//   USER = "user"
// }

// type CancelCallback = () => void;

// interface IWindowsPahkatBridge {
//   isInstalled(packageKey: string, resultCallback: (result: boolean) => void): CancelCallback
//   requestTransaction(transaction: string, resultCallback: (result: TransactionRequestState) => void): CancelCallback
//   repos(resultCallback: (result: RepositoryIndex[]) => void): CancelCallback
// }

// enum TransactionRequestState {
//   NOT_STARTED = "notStarted",
//   PENDING = "pending",
//   REJECTED = "rejected",
//   ACCEPTED = "accepted",
//   COMPLETED = "completed"
// }

// type PackagesMeta = {
//   packages: { [key: string]: Package }
// }

// type VirtualsMeta = {
//   virtuals: { [key: string]: Package }
// }

// type RepositoryMeta = {
//   base: string
// }

// enum Channel {

// }

// type Package = {
//   id: string
// }

// type Virtual = {
//   id: string
// }


// type AbsolutePackageKey = string;


// class RepositoryIndex {
//   readonly meta!: RepositoryMeta
//   readonly channel!: Channel
//   readonly packagesMeta!: PackagesMeta
//   readonly virtualsMeta!: VirtualsMeta

//   static fromJson(json: any): RepositoryIndex {
//     return new RepositoryIndex(json)
//   }

//   private constructor(json: any) {
//     this.meta = json.meta
//     this.channel = json.channel
//     this.packagesMeta = json.packages
//     this.virtualsMeta = json.virtuals
//   }
  
//   get packages(): { [key: string]: Package } {
//     return this.packagesMeta.packages
//   }

//   get virtuals(): { [key: string]: Virtual } {
//     return this.virtualsMeta.virtuals
//   }

//   absolutePackageFor(pkg: Package): AbsolutePackageKey {
//     return `${this.meta.base}packages/${pkg.id}`
//   }

//   package(key: AbsolutePackageKey): Package | null {
//     return null
//   }
// }

// type MacOsPahkatWindow = {
//   pahkatResponders: { [key: string]: (message: string) => void }
//   webkit: any
// } & Window


// type WindowsPahkatWindow = {
//   pahkatResponders: { [key: string]: (message: string) => void }
// } & Window



// export class MacOsPahkatBridge implements IPahkatBridge<InstallTarget> {
//   private bridge: ChannelHandler;

//   constructor() {
//     this.bridge = new ChannelHandler();
//   }

//   isInstalled(packageKey: string): Observable<boolean> {
//     return this.bridge.invoke("isInstalled", [packageKey]).pipe(
//       map((message) => JSON.parse(message))
//     )
//   }

//   isNotInstalled(packageKey: string): Observable<boolean> {
//     return this.isInstalled(packageKey).pipe(map(x => !x))
//   }

//   requestTransaction(transaction: Transaction<InstallTarget>): Observable<TransactionRequestState> {
//     return this.bridge.invoke("requestTransaction", [transaction]).pipe(
//       map((message) => JSON.parse(message))
//     )
//   }

//   repos(): Observable<RepositoryIndex[]> {
//     return this.bridge.invoke("repos").pipe(
//       map((message) => JSON.parse(message)),
//       map((list) => list.map((repoJson: any) => RepositoryIndex.fromJson(repoJson)))
//     )
//   }
// }

// class WindowsChannelHandler {
//   static ids: number = 0

//   constructor() {
//     const global = window as WindowsPahkatWindow

//     if (global.pahkatResponders == null) {
//       global.pahkatResponders = {}
//     }
//   }

//   private postMessage(message: any) {
//     const payload = JSON.stringify(message, null, 0)
//     location.href = encodeURI(`about:pahkat:${payload}`)
//   }

//   private unsubscribe(id: number) {
//     this.postMessage({ id, method: "_unsubscribe" })
//   }

//   invoke(method: string, args?: any[]): Observable<string> {
//     const id = ChannelHandler.ids++

//     return Observable.create((observer: Observer<string>) => {
//       const global = window as WindowsPahkatWindow

//       // Create callback for Swift side
//       global.pahkatResponders[`callback-${id}`] = createResponderProxy((message: any) => {
//         observer.next(message)
//       })

//       // Invoke the subscription
//       this.postMessage({ method, args, id })

//       // Create unsubscriber that will cancel connection and remove callback
//       return () => {
//         this.unsubscribe(id)
//         delete global.pahkatResponders[`callback-${id}`]
//       }
//     })
//   }
// }

// export class WindowsPahkatBridge implements IPahkatBridge<InstallTarget> {
//   private bridge: WindowsChannelHandler;

//   constructor() {
//     this.bridge = new WindowsChannelHandler();
//   }

//   isInstalled(packageKey: string): Observable<boolean> {
//     return this.bridge.invoke("isInstalled", [packageKey]).pipe(
//       map((message) => JSON.parse(message))
//     )
//   }

//   isNotInstalled(packageKey: string): Observable<boolean> {
//     return this.isInstalled(packageKey).pipe(map(x => !x))
//   }

//   requestTransaction(transaction: Transaction<InstallTarget>): Observable<TransactionRequestState> {
//     return this.bridge.invoke("requestTransaction", [transaction]).pipe(
//       map((message) => JSON.parse(message))
//     )
//   }

//   repos(): Observable<RepositoryIndex[]> {
//     return this.bridge.invoke("repos").pipe(
//       map((message) => JSON.parse(message)),
//       map((list) => list.map((repoJson: any) => RepositoryIndex.fromJson(repoJson)))
//     )
//   }
// }

// export function createResponderProxy(input: any) {
//   return new Proxy(input, {
//     get(target: Function, p: PropertyKey, receiver: any): any {
//       // Man, this is disgusting.
//       return target.bind(target, JSON.parse(p as string))
//     }
//   })
// }

// // export class WindowsPahkatBridge implements IPahkatBridge<InstallTarget> {
// //   private bridge: IWindowsPahkatBridge

// //   constructor() {
// //     // Blindly attempt to get global bridge object
// //     this.bridge = PahkatBridge as IWindowsPahkatBridge
// //   }

// //   isInstalled(packageKey: AbsolutePackageKey): Observable<boolean> {
// //     return Observable.create((observer: Observer<boolean>) => {
// //       const cancelCallback = this.bridge.isInstalled(packageKey.toString(), (result) => observer.next(result))

// //       return function unsubscribe() {
// //         cancelCallback()
// //       }
// //     })
// //   }

// //   isNotInstalled(packageKey: AbsolutePackageKey): Observable<boolean> {
// //     return this.isInstalled(packageKey).pipe(map(x => !x))
// //   }

// //   requestTransaction(transaction: Transaction<InstallTarget>): Observable<TransactionRequestState> {
// //     return Observable.create((observer: Observer<TransactionRequestState>) => {
// //       const cancelCallback = this.bridge.requestTransaction(
// //         transaction.toString(),
// //         (result) => observer.next(result))

// //       return function unsubscribe() {
// //         cancelCallback()
// //       }
// //     })
// //   }
  
// //   repos(): Observable<RepositoryIndex[]> {
// //     return Observable.create((observer: Observer<RepositoryIndex[]>) => {
// //       const cancelCallback = this.bridge.repos((result) => observer.next(result))

// //       return function unsubscribe() {
// //         cancelCallback()
// //       }
// //     })
// //   }
// // }