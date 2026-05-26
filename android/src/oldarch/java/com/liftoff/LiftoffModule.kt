package com.liftoff

import com.facebook.react.ReactApplication
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.LifecycleEventListener
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule
import com.facebook.react.modules.core.DeviceEventManagerModule

@ReactModule(name = LiftoffModule.NAME)
class LiftoffModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

  override fun getName() = NAME

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getCheckpoints(): WritableArray {
    val arr = Arguments.createArray()
    for (cp in LiftoffCollector.checkpoints()) {
      val map = Arguments.createMap()
      map.putString("name", cp["name"] as String)
      map.putDouble("timestamp", cp["timestamp"] as Double)
      arr.pushMap(map)
    }
    return arr
  }

  @ReactMethod fun mark(name: String) = LiftoffCollector.mark(name)
  @ReactMethod fun clear() = LiftoffCollector.clear()

  @ReactMethod(isBlockingSynchronousMethod = true)
  fun getAnchor(): WritableMap {
    val map = Arguments.createMap()
    map.putDouble("monotonicMs", LiftoffCollector.anchorMonotonicMs)
    map.putDouble("wallMs", LiftoffCollector.anchorWallMs)
    return map
  }

  // Required by NativeEventEmitter on the JS side.
  @ReactMethod fun addListener(eventType: String) {}
  @ReactMethod fun removeListeners(count: Double) {}

  override fun initialize() {
    super.initialize()
    if (!BuildConfig.DEBUG) return
    reactApplicationContext.addLifecycleEventListener(object : LifecycleEventListener {
      override fun onHostResume() {
        registerDevMenuItem()
        reactApplicationContext.removeLifecycleEventListener(this)
      }
      override fun onHostPause() {}
      override fun onHostDestroy() {}
    })
  }

  private fun registerDevMenuItem() {
    try {
      val app = reactApplicationContext.currentActivity?.application as? ReactApplication
      val dsm = app?.reactNativeHost?.reactInstanceManager?.devSupportManager ?: return
      dsm.addCustomDevOption("Show Liftoff Report") { emitLiftoffShowReport() }
    } catch (_: Exception) {}
  }

  private fun emitLiftoffShowReport() {
    reactApplicationContext
      .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
      .emit("LiftoffShowReport", null)
  }

  companion object {
    const val NAME = "Liftoff"
  }
}
