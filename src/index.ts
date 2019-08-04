import { Observable, Observer, observable } from "rxjs"
import { map } from "rxjs/operators"

// This is injected by the external environment.
declare const PahkatBridge: any;

enum PackageActionType {
  INSTALL = "install",
  UNINSTALL = "uninstall"
}

class Transaction<Target> {

}

class TransactionAction<Target> {
  readonly id: AbsolutePackageKey
  readonly action: PackageActionType
  readonly target: Target

  private constructor(id: AbsolutePackageKey, action: PackageActionType, target: Target) {
    this.id = id
    this.action = action
    this.target = target
  }

  static install<Target>(id: AbsolutePackageKey, target: Target): TransactionAction<Target> {
    return new TransactionAction(id, PackageActionType.INSTALL, target)
  }

  static uninstall<Target>(id: AbsolutePackageKey, target: Target): TransactionAction<Target> {
    return new TransactionAction(id, PackageActionType.INSTALL, target)
  }
}

interface IPahkatBridge<Target> {
  isInstalled(packageKey: AbsolutePackageKey): Observable<boolean>
  isNotInstalled(packageKey: AbsolutePackageKey): Observable<boolean>
  requestTransaction(transaction: Transaction<Target>): Observable<TransactionRequestState>
  repos(): Observable<RepositoryIndex[]>
}

enum InstallTarget {
  SYSTEM = "system",
  USER = "user"
}

type CancelCallback = () => void;

interface IWindowsPahkatBridge {
  isInstalled(packageKey: string, resultCallback: (result: boolean) => void): CancelCallback
  requestTransaction(transaction: string, resultCallback: (result: TransactionRequestState) => void): CancelCallback
  repos(resultCallback: (result: RepositoryIndex[]) => void): CancelCallback
}

enum TransactionRequestState {
  NOT_STARTED = "notStarted",
  PENDING = "pending",
  REJECTED = "rejected",
  ACCEPTED = "accepted",
  COMPLETED = "completed"
}

type PackagesMeta = {
  packages: { [key: string]: Package }
}

type VirtualsMeta = {
  virtuals: { [key: string]: Package }
}

type RepositoryMeta = {
  base: string
}

enum Channel {

}

type Package = {
  id: string
}

type Virtual = {
  id: string
}


type AbsolutePackageKey = string;


class RepositoryIndex {
  readonly meta!: RepositoryMeta
  readonly channel!: Channel
  readonly packagesMeta!: PackagesMeta
  readonly virtualsMeta!: VirtualsMeta

  static fromJson(json: any): RepositoryIndex {
    return new RepositoryIndex(json)
  }

  private constructor(json: any) {
    this.meta = json.meta
    this.channel = json.channel
    this.packagesMeta = json.packages
    this.virtualsMeta = json.virtuals
  }
  
  get packages(): { [key: string]: Package } {
    return this.packagesMeta.packages
  }

  get virtuals(): { [key: string]: Virtual } {
    return this.virtualsMeta.virtuals
  }

  absolutePackageFor(pkg: Package): AbsolutePackageKey {
    return `${this.meta.base}packages/${pkg.id}`
  }

  package(key: AbsolutePackageKey): Package | null {
    return null
  }
}

type MacOsPahkatWindow = {
  pahkatResponders: { [key: string]: (message: string) => void }
  webkit: any
} & Window

class ChannelHandler {
  static ids: number = 0

  private channel: {
    postMessage: (message: any) => void
  }

  constructor() {
    const global = window as MacOsPahkatWindow

    if (global.pahkatResponders == null) {
      global.pahkatResponders = {}
    }

    this.channel = global.webkit.messageHandlers.pahkat
  }

  private unsubscribe(id: number) {
    this.channel.postMessage({ method: "_unsubscribe", id })
  }

  invoke(method: string, args?: any[]): Observable<string> {
    const id = ChannelHandler.ids++

    return Observable.create((observer: Observer<string>) => {
      const global = window as MacOsPahkatWindow

      // Create callback for Swift side
      global.pahkatResponders[`callback-${id}`] = (message) => {
        observer.next(message)
      }

      // Invoke the subscription
      this.channel.postMessage(JSON.stringify({ method, args, id }, null, 0))

      // Create unsubscriber that will cancel connection and remove callback
      return () => {
        this.unsubscribe(id)
        delete global.pahkatResponders[`callback-${id}`]
      }
    })
  }
}

class MacOsPahkatBridge implements IPahkatBridge<InstallTarget> {
  private bridge: ChannelHandler;

  constructor() {
    this.bridge = new ChannelHandler();
  }

  isInstalled(packageKey: string): Observable<boolean> {
    return this.bridge.invoke("isInstalled", [packageKey]).pipe(
      map((message) => JSON.parse(message))
    )
  }

  isNotInstalled(packageKey: string): Observable<boolean> {
    return this.isInstalled(packageKey).pipe(map(x => !x))
  }

  requestTransaction(transaction: Transaction<InstallTarget>): Observable<TransactionRequestState> {
    return this.bridge.invoke("requestTransaction", [transaction]).pipe(
      map((message) => JSON.parse(message))
    )
  }

  repos(): Observable<RepositoryIndex[]> {
    return this.bridge.invoke("repos").pipe(
      map((message) => JSON.parse(message)),
      map((list) => list.map((repoJson: any) => RepositoryIndex.fromJson(repoJson)))
    )
  }
}

class WindowsPahkatBridge implements IPahkatBridge<InstallTarget> {
  private bridge: IWindowsPahkatBridge

  constructor() {
    // Blindly attempt to get global bridge object
    this.bridge = PahkatBridge as IWindowsPahkatBridge
  }

  isInstalled(packageKey: AbsolutePackageKey): Observable<boolean> {
    return Observable.create((observer: Observer<boolean>) => {
      const cancelCallback = this.bridge.isInstalled(packageKey.toString(), (result) => observer.next(result))

      return function unsubscribe() {
        cancelCallback()
      }
    })
  }

  isNotInstalled(packageKey: AbsolutePackageKey): Observable<boolean> {
    return this.isInstalled(packageKey).pipe(map(x => !x))
  }

  requestTransaction(transaction: Transaction<InstallTarget>): Observable<TransactionRequestState> {
    return Observable.create((observer: Observer<TransactionRequestState>) => {
      const cancelCallback = this.bridge.requestTransaction(
        transaction.toString(),
        (result) => observer.next(result))

      return function unsubscribe() {
        cancelCallback()
      }
    })
  }
  
  repos(): Observable<RepositoryIndex[]> {
    return Observable.create((observer: Observer<RepositoryIndex[]>) => {
      const cancelCallback = this.bridge.repos((result) => observer.next(result))

      return function unsubscribe() {
        cancelCallback()
      }
    })
  }
}