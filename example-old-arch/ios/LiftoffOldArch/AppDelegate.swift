import UIKit
import React
import React_RCTAppDelegate
import ReactAppDependencyProvider

@main
class AppDelegate: RCTAppDelegate {
  override func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey : Any]? = nil) -> Bool {
    LiftoffCollector.mark("app:didFinishLaunching:start")

    self.moduleName = "LiftoffOldArch"
    self.dependencyProvider = RCTAppDependencyProvider()
    self.initialProps = [:]

    LiftoffCollector.mark("rn:factory:willStart")
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    LiftoffCollector.mark("app:didFinishLaunching:end")
    return result
  }

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    self.bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: "index")
#else
    Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}
