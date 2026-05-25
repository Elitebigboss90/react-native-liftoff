package com.liftoff

import com.facebook.react.bridge.ReactApplicationContext

class LiftoffModule(reactContext: ReactApplicationContext) :
  NativeLiftoffSpec(reactContext) {

  override fun multiply(a: Double, b: Double): Double {
    return a * b
  }

  companion object {
    const val NAME = NativeLiftoffSpec.NAME
  }
}
