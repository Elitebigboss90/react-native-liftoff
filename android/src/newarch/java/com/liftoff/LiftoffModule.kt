package com.liftoff

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.WritableArray
import com.facebook.react.bridge.WritableMap

class LiftoffModule(reactContext: ReactApplicationContext) : NativeLiftoffSpec(reactContext) {

  override fun mark(name: String): Double = LiftoffCollector.mark(name)

  override fun getCheckpoints(): WritableArray {
    val arr = Arguments.createArray()
    for (cp in LiftoffCollector.checkpoints()) {
      val map = Arguments.createMap()
      map.putString("name", cp["name"] as String)
      map.putDouble("timestamp", cp["timestamp"] as Double)
      arr.pushMap(map)
    }
    return arr
  }

  override fun clear() = LiftoffCollector.clear()

  override fun getAnchor(): WritableMap {
    val map = Arguments.createMap()
    map.putDouble("monotonicMs", LiftoffCollector.anchorMonotonicMs)
    map.putDouble("wallMs", LiftoffCollector.anchorWallMs)
    return map
  }

  companion object {
    const val NAME = NativeLiftoffSpec.NAME
  }
}
