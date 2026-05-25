package liftoff.example

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.liftoff.LiftoffCollector

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
        },
    )
  }

  override fun onCreate() {
    // Canonical boot checkpoints — recorded around React Native host initialization.
    // Timestamps use SystemClock.elapsedRealtime() via LiftoffCollector.
    LiftoffCollector.mark("app:onCreate:start")
    super.onCreate()
    LiftoffCollector.mark("rn:host:willInit")
    loadReactNative(this)
    LiftoffCollector.mark("rn:host:didInit")
    LiftoffCollector.mark("app:onCreate:end")
  }
}
