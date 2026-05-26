package com.liftoff

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap
import com.facebook.react.module.annotations.ReactModule

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

  companion object { const val NAME = "Liftoff" }
}
